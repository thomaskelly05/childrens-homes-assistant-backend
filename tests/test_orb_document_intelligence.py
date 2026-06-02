from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

import routers.orb_document_routes as document_routes
from schemas.orb_document_intelligence import OrbDocumentIntelligenceRequest
from services.orb_document_intelligence_service import (
    detect_document_kind,
    orb_document_intelligence_service,
)
from services.orb_knowledge_library_service import orb_knowledge_library_service
from services.orb_reg44_document_extraction import NOT_STATED, extract_reg44_report

SAMPLE_POLICY = (
    "Staff must record factual, child-centred daily notes. "
    "Escalate safeguarding concerns to the registered manager immediately. "
    "Managers must review recordings weekly."
)

REG44_SAMPLE = (
    "Regulation 44 independent visitor report\n"
    "Visit date: 12/03/2026\n"
    "Visitor: Jane Smith\n"
    "Children's home: Oak House\n"
    "Children spoke warmly about staff. Safeguarding records require updating. "
    "The registered manager must ensure supervision records are complete by 01/04/2026."
)

ACTION_SAMPLE = (
    "The team should review the behaviour support plan. "
    "Registered manager to audit daily notes within two weeks."
)


@pytest.fixture(autouse=True)
def memory_library(monkeypatch):
    svc = orb_knowledge_library_service
    svc._memory_sources = {}
    svc._memory_chunks = {}
    svc._seeded = False
    monkeypatch.setattr(svc, "_use_db", lambda: False)
    svc.seed_builtin_sources()


def test_intelligence_route_rejects_os_ids(fake_state):
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            document_routes.document_intelligence(
                OrbDocumentIntelligenceRequest(
                    document_text=SAMPLE_POLICY,
                    lens="policy_card",
                    context={"child_id": 99},
                ),
                current_user=fake_state["user"],
            )
        )
    assert exc.value.status_code == 400


def test_policy_card_includes_required_fields(fake_state):
    response = asyncio.run(
        document_routes.document_intelligence(
            OrbDocumentIntelligenceRequest(
                document_text=SAMPLE_POLICY,
                document_title="Recording policy",
                lens="policy_card",
            ),
            current_user=fake_state["user"],
        )
    )
    assert response["success"] is True
    data = response["data"]
    card = data["policy_card"]
    assert card["what_staff_must_know"]
    assert card["when_to_escalate"]
    assert card["what_to_record"]
    assert card["manager_responsibilities"]
    assert card["plain_english_summary"]
    assert card["who_this_matters_for"]
    assert card["key_staff_responsibilities"]
    assert card["what_good_practice_looks_like"]
    assert card["safeguarding_considerations"]
    assert card["recording_requirements"]
    assert card["manager_oversight_points"]
    assert card["ofsted_reg44_relevance"]
    assert card["common_mistakes_to_avoid"]
    assert card["staff_briefing_version"]
    assert card["legal_completeness_notice"]
    assert card["review_before_use"]
    assert "uploaded or pasted" in card["legal_completeness_notice"].lower()
    assert data["standalone"] is True
    assert data["os_records_accessed"] is False
    assert data["live_record_access"] is False
    assert data.get("risks_or_gaps") is not None
    assert data.get("suggested_next_actions") is not None
    assert data.get("source_document_title") == "Recording policy"
    brain = data.get("brain_metadata") or {}
    assert brain.get("product") == "ORB Residential"
    assert brain.get("powered_by") == "IndiCare Intelligence"
    assert brain.get("brain") == "orb_residential_intelligence"
    assert brain.get("feature") == "document_intelligence"
    assert brain.get("lens") == "policy_card"
    assert brain.get("standalone") is True
    assert brain.get("os_records_accessed") is False
    assert brain.get("live_record_access") is False


def test_policy_card_lens_registered():
    lenses = orb_document_intelligence_service.list_lenses()
    policy = next(item for item in lenses if item["id"] == "policy_card")
    assert policy["label"] == "Policy Card"


def test_reg44_does_not_invent_visit_details():
    minimal = "Staff training was discussed. No visit metadata in this snippet."
    result = extract_reg44_report(minimal)
    assert result["visit_date"] == NOT_STATED
    assert result["visitor"] == NOT_STATED


def test_reg44_extracts_actions_from_text():
    result = extract_reg44_report(REG44_SAMPLE)
    assert result["visit_date"] != NOT_STATED
    assert result["visitor"] != NOT_STATED
    assert result["actions_raised"]
    assert any("supervision" in a["action_text"].lower() for a in result["actions_raised"])


def test_reg44_action_plan_marks_not_stated_fields(fake_state):
    response = asyncio.run(
        document_routes.document_intelligence(
            OrbDocumentIntelligenceRequest(
                document_text=ACTION_SAMPLE,
                lens="actions",
            ),
            current_user=fake_state["user"],
        )
    )
    data = response["data"]
    for action in data.get("actions") or []:
        if not action.get("owner"):
            continue
        assert "not stated" in action["owner"].lower() or action["owner"]


def test_safeguarding_lens_deep_safety(fake_state):
    meta = orb_document_intelligence_service.list_lenses()
    safeguarding = next(item for item in meta if item["id"] == "safeguarding")
    assert safeguarding["safety_level"] == "critical"

    response = asyncio.run(
        document_routes.document_intelligence(
            OrbDocumentIntelligenceRequest(
                document_text="A child disclosed bruising. Staff notified the manager.",
                lens="safeguarding",
            ),
            current_user=fake_state["user"],
        )
    )
    assert response["data"]["standalone"] is True
    assert response["data"]["os_records_accessed"] is False


def test_ofsted_lens_sections(fake_state):
    response = asyncio.run(
        document_routes.document_intelligence(
            OrbDocumentIntelligenceRequest(
                document_text=SAMPLE_POLICY,
                lens="ofsted",
            ),
            current_user=fake_state["user"],
        )
    )
    headings = [s["heading"].lower() for s in response["data"]["sections"]]
    assert any("child" in h or "evidence" in h for h in headings)
    assert any("leadership" in h for h in headings)


def test_action_plan_includes_missing_information(fake_state):
    response = asyncio.run(
        document_routes.document_intelligence(
            OrbDocumentIntelligenceRequest(
                document_text=ACTION_SAMPLE,
                lens="actions",
            ),
            current_user=fake_state["user"],
        )
    )
    data = response["data"]
    assert data["standalone"] is True
    assert "action_plan_groups" in data or data.get("sections")


def test_reg44_intelligence_route(fake_state):
    response = asyncio.run(
        document_routes.document_intelligence(
            OrbDocumentIntelligenceRequest(
                document_text=REG44_SAMPLE,
                lens="reg44",
            ),
            current_user=fake_state["user"],
        )
    )
    data = response["data"]
    assert data["reg44"]
    assert data["os_records_accessed"] is False


def test_detect_document_kind():
    assert detect_document_kind(REG44_SAMPLE) == "reg44"
    assert detect_document_kind(SAMPLE_POLICY) == "policy"
    assert detect_document_kind("Daily note: child went to school.") == "incident_record"
