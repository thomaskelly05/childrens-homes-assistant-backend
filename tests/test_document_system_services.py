from __future__ import annotations

import pytest
from fastapi import HTTPException

from services.document_autosave_service import document_autosave_service
from services.document_export_service import document_export_service
from services.document_intelligence_service import document_intelligence_service
from services.document_linking_service import document_linking_service
from services.document_permission_service import document_permission_service
from services.document_prompt_service import document_prompt_service
from services.document_rendering_service import document_rendering_service
from services.document_review_service import document_review_service
from services.document_signature_service import document_signature_service
from services.document_template_service import document_template_service
from services.document_version_service import document_version_service


MANAGER = {"id": 1, "role": "manager", "home_id": 10, "provider_id": 20, "allowed_home_ids": [10]}
STAFF = {"id": 2, "role": "support_worker", "home_id": 10, "provider_id": 20}


def _document(template_id: str = "child_care_plan", child_id: str = "100") -> dict:
    template = document_template_service.get_template(template_id)
    return document_rendering_service.new_instance(
        template=template,
        current_user=MANAGER,
        child_id=child_id,
        home_id=10,
        sections={"child_voice_and_wishes": "Jamie said he felt safer after keywork because staff listened."},
    ).model_dump(mode="json")


def test_template_registry_contains_requested_child_home_and_staff_documents():
    templates = document_template_service.list_templates()

    assert len(document_template_service.list_templates(scope="child")) == 19
    assert len(document_template_service.list_templates(scope="home")) == 22
    assert len(document_template_service.list_templates(scope="staff")) == 9
    assert {item.title for item in templates} >= {"Care Plan", "Reg 45 Review", "Safer Recruitment Checklist"}
    assert document_template_service.get_template("child_care_plan").child_voice_prompts


def test_document_instance_is_editable_and_versions_preserve_previous_content():
    document = _document()
    before = {**document, "version_number": 1}
    after = {**before, "sections": {**before["sections"], "actions_evidence_and_review": "Manager to review on Friday."}}

    version = document_version_service.snapshot(document=before, reason="before_update", current_user=MANAGER, version_number=1)

    assert document_version_service.changed(before=before, after=after) is True
    assert version["snapshot"]["sections"] != after["sections"]
    assert version["immutable"] is True


def test_autosave_detects_conflict_and_does_not_silently_overwrite():
    document = {**_document(), "version_number": 4, "status": "draft"}
    envelope = document_autosave_service.build_autosave(
        document=document,
        sections={"child_voice_and_wishes": "Changed locally"},
        current_user=STAFF,
        client_token="client-1",
        base_version=3,
    )

    assert envelope["ok"] is False
    assert envelope["state"] == "review_before_save"
    assert "Review the draft" in envelope["message"]


def test_child_document_cannot_link_another_child():
    document = _document(child_id="100")

    with pytest.raises(HTTPException):
        document_permission_service.validate_link_scope(document=document, link={"link_type": "chronology", "record_id": "c-2", "child_id": "101"})


def test_linking_allows_active_child_evidence_and_actions():
    document = _document(child_id="100")
    link = document_linking_service.prepare_link(
        document=document,
        link={"link_type": "evidence", "record_id": "ev-1", "child_id": "100", "title": "Keywork note"},
        current_user=MANAGER,
    )

    assert link["child_id"] == "100"
    assert link["link_type"] == "evidence"


def test_staff_document_access_denied_to_unauthorised_users():
    document = _document("staff_supervision_record")
    document["scope"] = "staff"
    document["staff_id"] = "99"

    assert document_permission_service.can_read(current_user=STAFF, document=document) is False


def test_export_requires_permission_and_pdf_generates_real_payload():
    document = _document("home_statement_of_purpose")
    document["scope"] = "home"
    document["home_id"] = 10

    document_permission_service.assert_can_export(current_user=MANAGER, document=document)
    result = document_export_service.export(document=document, profile="pdf")

    assert result["ok"] is True
    assert result["media_type"] == "application/pdf"
    assert result["content_base64"]
    assert result["byte_length"] > 1000


def test_signature_audit_is_hash_bound_and_immutable():
    document = _document()
    signature = document_signature_service.sign(document=document, payload={"signed_name": "Manager", "role": "manager", "meaning": "approved"}, current_user=MANAGER)

    assert signature["immutable"] is True
    assert signature["content_hash"]
    assert document_signature_service.verify(document=document, signature=signature)["valid"] is True
    changed = {**document, "title": "Changed title"}
    assert document_signature_service.verify(document=changed, signature=signature)["valid"] is False


def test_orb_suggestions_do_not_modify_document_until_accepted():
    draft = "Jamie has improved."
    suggestion = document_prompt_service.suggestion(request="strengthen child voice", draft_text=draft, template_id="child_care_plan")

    assert suggestion["draft_text_unchanged"] == draft
    assert "Do not fabricate evidence." in suggestion["guardrails"]


def test_review_flow_supports_manager_amendment_and_approval():
    document = {**_document(), "status": "submitted", "review": {}}
    amendment = document_review_service.transition(document=document, target_status="request_amendment", current_user=MANAGER, comment="Please add child voice.")

    assert amendment["status"] == "amendment_requested"
    assert amendment["review"]["comments"]


def test_document_intelligence_flags_reflective_quality_gaps():
    quality = document_intelligence_service.analyse_quality(text="Jamie is better and staff will continue to monitor.", document_type="care_plan")
    keys = {item["key"]: item["status"] for item in quality["indicators"]}

    assert keys["child_voice"] == "needs_review"
    assert keys["unsupported_claims"] == "needs_review"
    assert keys["weak_outcomes"] == "needs_review"
    assert quality["reflective_writing_prompts"]


def test_standalone_assistant_boundary_is_no_os_document_access():
    prompts = document_prompt_service.prompts_for(template_id="child_care_plan")

    assert "Suggestions only; do not silently rewrite records." in prompts["guardrails"]
