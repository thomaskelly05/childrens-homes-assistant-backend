"""ORB Communicate backend convergence and support pack routes."""

from __future__ import annotations

import re

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from auth.orb_residential_dependencies import require_orb_residential_auth
from routers.orb_communicate_routes import router
from services.orb_communicate_support_pack_service import orb_communicate_support_pack_service


@pytest.fixture
def client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    app.dependency_overrides[require_orb_residential_auth] = lambda: {"user_id": 1}
    return TestClient(app)


def _post_support_pack(client: TestClient, payload: dict) -> dict:
    response = client.post("/orb/communicate/support-pack", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    return data


def test_communicate_converge_returns_orchestrator_metadata(client: TestClient):
    response = client.post(
        "/orb/communicate/converge",
        json={"text": "Easy read about CAMHS and child voice.", "workflow": "easy_read"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    convergence = data["brain_convergence"]
    assert convergence.get("active_final_domains")
    assert isinstance(data["public_source_chips"], list)


def test_contact_change_for_autistic_young_person(client: TestClient):
    data = _post_support_pack(
        client,
        {
            "situation": (
                "Contact with Mum has changed today and he usually struggles with changes."
            ),
            "person_context": "Autistic young person who uses a symbol board.",
            "communication_needs": "Short phrases, extra processing time, low sensory load.",
            "audience": "autism",
            "pack_goal": "Help him understand the contact change calmly.",
        },
    )
    assert data["intent"] == "contact_change"
    assert data["audience"] == "autism"
    assert "What is happening" in data["easy_read_explanation"]
    assert len(data["visual_card_suggestions"]) >= 4
    assert data["social_story_optional"] is None
    assert "processing time" in data["staff_delivery_guidance"].lower()
    assert "send_communication" in data["active_final_domains"]
    assert data["source_chips"]


def test_hospital_appointment_easy_read(client: TestClient):
    data = _post_support_pack(
        client,
        {
            "situation": "Hospital appointment on Tuesday morning for a blood test.",
            "audience": "young_person",
            "pack_goal": "Easy-read explanation before the appointment.",
        },
    )
    assert data["intent"] == "hospital_appointment"
    assert "easy-read" in data["easy_read_explanation"].lower()
    assert any(
        card.get("category") in {"health", "place"} for card in data["visual_card_suggestions"]
    )
    assert "health_wellbeing" in data["active_final_domains"]


def test_new_staff_member_social_story(client: TestClient):
    data = _post_support_pack(
        client,
        {
            "situation": "We have a new staff member starting on shift tonight.",
            "audience": "child",
            "pack_goal": "Prepare the child for meeting someone new.",
        },
    )
    assert data["intent"] == "new_staff_member"
    assert data["social_story_optional"]
    assert "trusted adult" in data["social_story_optional"].lower()
    assert data["visual_card_suggestions"]


def test_safe_unsafe_communication_support(client: TestClient):
    data = _post_support_pack(
        client,
        {
            "situation": "Support explaining safe and unsafe touch in an age-appropriate way.",
            "audience": "child",
            "pack_goal": "Body safety communication without frightening language.",
        },
    )
    assert data["intent"] == "safe_unsafe_communication"
    assert data["safeguarding_reminders_if_relevant"]
    assert any(card.get("label") == "Unsafe" for card in data["visual_card_suggestions"])
    combined = " ".join(
        [
            data["easy_read_explanation"],
            data["staff_delivery_guidance"],
            " ".join(data["safeguarding_reminders_if_relevant"]),
        ]
    )
    assert not orb_communicate_support_pack_service.text_contains_leading_questions(combined)
    assert "shame" not in combined.lower() or "must not shame" in combined.lower()


def test_medication_explanation(client: TestClient):
    data = _post_support_pack(
        client,
        {
            "situation": "Need to explain why evening medication is important.",
            "communication_needs": "Uses widget board and short sentences.",
            "audience": "learning_disability",
            "pack_goal": "Medication explanation without clinical advice.",
        },
    )
    assert data["intent"] == "medication_explanation"
    assert "SALT" in " ".join(data["safety_boundaries"])
    assert "clinical" in " ".join(data["safety_boundaries"]).lower()
    assert any(
        card.get("label") == "Medicine" for card in data["visual_card_suggestions"]
    )
    assert "health_wellbeing" in data["active_final_domains"]


def test_safeguarding_sensitive_concern(client: TestClient):
    data = _post_support_pack(
        client,
        {
            "situation": (
                "A young person told me something worrying and I need to support communication safely."
            ),
            "audience": "young_person",
            "pack_goal": "Support communication without leading questions.",
        },
    )
    assert data["intent"] == "safeguarding_disclosure"
    assert len(data["safeguarding_reminders_if_relevant"]) >= 3
    combined = " ".join(
        [
            data["staff_delivery_guidance"],
            data["reflective_record_starter"],
            " ".join(data["reflect_and_record_prompts"]),
            " ".join(data["safeguarding_reminders_if_relevant"]),
        ]
    )
    assert not re.search(r"\bwhy did you\b|\bwhy do you\b", combined, re.I)
    assert "local safeguarding" in combined.lower()


def test_reflect_and_record_output(client: TestClient):
    data = _post_support_pack(
        client,
        {
            "situation": "Explained a house meeting time change.",
            "audience": "young_person",
        },
    )
    assert len(data["reflect_and_record_prompts"]) >= 4
    assert data["reflective_record_starter"]
    assert "observable" in data["reflective_record_starter"].lower() or "staff" in data["reflective_record_starter"].lower()
    for prompt in data["reflect_and_record_prompts"]:
        assert not orb_communicate_support_pack_service.text_contains_leading_questions(prompt)


def test_source_chips_present(client: TestClient):
    data = _post_support_pack(
        client,
        {
            "situation": "Child voice and rights in a contact change conversation.",
            "person_context": "Young person with EHCP and communication differences.",
            "audience": "young_person",
        },
    )
    assert data["source_chips"]
    assert data["brain_convergence"]["orchestrator"] == "orb-brain-convergence-orchestrator-v1"
    assert data["brain_convergence"]["domain_convergence"] == "orb-domain-convergence-v1"
    for chip in data["source_chips"]:
        assert chip.get("type") == "source_family"
        assert chip.get("precision") == "source_family_anchor"


def test_relevant_domains_activate(client: TestClient):
    data = _post_support_pack(
        client,
        {
            "situation": (
                "Hospital appointment for CAMHS review — child voice, rights and multi-agency "
                "information sharing may be relevant."
            ),
            "person_context": "Autistic young person with SEND needs.",
            "communication_needs": "AAC and reasonable adjustments.",
            "audience": "autism",
        },
    )
    domains = set(data["active_final_domains"])
    assert "child_story" in domains
    assert "send_communication" in domains
    assert "health_wellbeing" in domains
    assert domains.intersection({"rights_corporate_parenting", "multi_agency", "guidance_source_spine"})


def test_support_pack_response_contract(client: TestClient):
    data = _post_support_pack(
        client,
        {
            "situation": "General communication support for a daily routine change.",
            "audience": "unknown",
        },
    )
    required_keys = {
        "success",
        "intent",
        "audience",
        "easy_read_explanation",
        "visual_card_suggestions",
        "social_story_optional",
        "staff_delivery_guidance",
        "regulation_support",
        "safeguarding_reminders_if_relevant",
        "reflect_and_record_prompts",
        "reflective_record_starter",
        "source_chips",
        "safety_boundaries",
        "active_final_domains",
        "brain_convergence",
        "standalone_boundary",
        "service",
    }
    assert required_keys.issubset(data.keys())
    assert data["standalone_boundary"] is True
    assert data["service"] == "orb-communicate-support-pack-v1"
    assert "childish" in " ".join(data["safety_boundaries"]).lower()


def test_communicate_remains_hidden_from_launch_nav():
    nav = open("/workspace/frontend-next/lib/orb/orb-navigation-convergence.ts", encoding="utf-8").read()
    names = open("/workspace/frontend-next/lib/orb/orb-user-facing-names.ts", encoding="utf-8").read()
    assert "ORB_HIDDEN_LAUNCH_STATION_IDS = ['orb_communicate']" in nav
    assert "'orb_communicate'" in names
    assert "'orb_communicate'" not in nav.split("ORB_VISIBLE_SIDEBAR_NAV_IDS")[1].split("]")[0]
