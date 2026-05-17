from __future__ import annotations

from services.document_linking_service import document_linking_service
from services.document_rendering_service import document_rendering_service
from services.document_review_service import document_review_service
from services.document_signature_service import document_signature_service
from services.document_template_service import document_template_service


MANAGER = {"id": "m1", "role": "registered_manager", "home_id": "h1", "provider_id": "p1", "allowed_home_ids": ["h1"]}


def test_create_save_reopen_review_signoff_contract_for_template_document():
    template = document_template_service.get_template("key_work_session")
    initial_sections = {"planned_purpose_or_emerging_theme": "Jamie asked to talk after school."}
    document = document_rendering_service.new_instance(template=template, current_user=MANAGER, child_id="c1", home_id="h1", sections=initial_sections).model_dump(mode="json")

    assert document["status"] == "draft"
    assert document["sections"]["planned_purpose_or_emerging_theme"] == "Jamie asked to talk after school."

    saved = {**document, "sections": {**document["sections"], "therapeutic_response": "Staff paced the conversation and offered a sensory break."}, "version_number": 2}
    reopened = document_rendering_service.render_editor_payload(instance=saved, template=template)

    assert reopened["completion"]["completed"] == 2
    assert any(section["section_id"] == "therapeutic_response" and section["content"] for section in reopened["editor_sections"])

    review = document_review_service.transition(document={**saved, "status": "draft"}, target_status="submit", current_user=MANAGER, comment="Submitted for manager review.")
    assert review["status"] == "submitted"

    signature = document_signature_service.sign(document={**saved, "status": "submitted"}, payload={"signed_name": "Registered Manager", "role": "registered_manager", "meaning": "reviewed"}, current_user=MANAGER)
    assert signature["immutable"] is True
    assert signature["content_hash"]


def test_document_evidence_and_chronology_links_are_scope_checked():
    template = document_template_service.get_template("safeguarding_concern")
    document = document_rendering_service.new_instance(template=template, current_user=MANAGER, child_id="c1", home_id="h1").model_dump(mode="json")

    chronology_link = document_linking_service.prepare_link(document=document, link={"link_type": "chronology", "record_id": "ch-1", "child_id": "c1", "title": "Safeguarding chronology marker"}, current_user=MANAGER)
    evidence_link = document_linking_service.prepare_link(document=document, link={"link_type": "evidence", "record_id": "ev-1", "child_id": "c1", "title": "Manager oversight note"}, current_user=MANAGER)

    assert chronology_link["link_type"] == "chronology"
    assert evidence_link["link_type"] == "evidence"
    assert chronology_link["document_id"] == document["document_id"]
