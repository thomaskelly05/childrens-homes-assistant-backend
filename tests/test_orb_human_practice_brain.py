from __future__ import annotations

from pathlib import Path

import pytest

from services.orb_action_engine_service import (
    analyse_what_missing_gaps,
    orb_action_engine_service,
)
from services.orb_document_intelligence_service import orb_document_intelligence_service
from services.orb_human_practice_brain_service import orb_human_practice_brain_service

REPO_ROOT = Path(__file__).resolve().parents[1]
PROFILE_STORE = REPO_ROOT / "frontend-next" / "lib" / "orb" / "adult-profile-store.ts"
TOOLS_PANEL = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-tools-panel.tsx"


def test_nvq_roles_in_profile_options():
    text = PROFILE_STORE.read_text(encoding="utf-8")
    assert "'nvq_assessor'" in text
    assert "'nvq_learner'" in text
    assert "'diploma_learner'" in text


def test_academy_tools_in_tools_menu():
    text = TOOLS_PANEL.read_text(encoding="utf-8")
    assert "Learning / Academy" in text
    assert "map_to_nvq_evidence" in text
    assert "NVQ / Diploma helper" in text


def test_nvq_assessor_profile_priorities():
    profile = orb_human_practice_brain_service.get_profile("nvq_assessor")
    assert "evidence mapping" in profile.needs_from_orb.lower()
    assert "invented" in profile.avoid.lower()


def test_what_missing_differs_by_role():
    sw = analyse_what_missing_gaps("Staff noted concern.", profile_role="residential_support_worker")
    rm = analyse_what_missing_gaps("Staff noted concern.", profile_role="registered_manager")
    sw_ids = {g.id for g in sw}
    rm_ids = {g.id for g in rm}
    assert "sw_record_escalation" in sw_ids
    assert "rm_oversight_owner" in rm_ids


@pytest.mark.asyncio
async def test_map_to_nvq_evidence_does_not_invent(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, system_prompt: str, **_kwargs):
        captured["user"] = user_prompt
        captured["system"] = system_prompt
        return "Based only on what you have provided…\n\n## Authenticity warning\nDo not invent."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="map_to_nvq_evidence",
        source_answer="I supported a young person during contact — they were upset.",
        mode="Staff Coach",
        context={"profile_role": "nvq_learner"},
    )
    assert "do not invent" in captured["user"].lower()
    assert result["os_records_accessed"] is False


@pytest.mark.asyncio
async def test_reflective_account_plan_includes_authenticity_warning(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, **_kwargs):
        captured["user"] = user_prompt
        return "Based only on what you have provided…\n\n## Authenticity warning"

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    await orb_action_engine_service.run_action(
        action="create_reflective_account_plan",
        source_answer="During handover I noticed tension between peers.",
        mode="Staff Coach",
    )
    assert "authenticity" in captured["user"].lower()
    assert "do not invent" in captured["user"].lower()


@pytest.mark.asyncio
async def test_assessor_feedback_includes_strengths_gaps_questions(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, **_kwargs):
        captured["user"] = user_prompt
        return "Based only on what you have provided…\n\nDraft feedback."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    await orb_action_engine_service.run_action(
        action="assessor_feedback_draft",
        source_answer="Learner reflective draft on safeguarding.",
        mode="Staff Coach",
        context={"profile_role": "nvq_assessor"},
    )
    prompt = captured["user"].lower()
    assert "strengths" in prompt
    assert "gaps" in prompt
    assert "professional discussion" in prompt


def test_nvq_action_rejects_os_ids_route():
    from fastapi import HTTPException

    from routers.orb_standalone_routes import _reject_standalone_os_ids

    with pytest.raises(HTTPException):
        _reject_standalone_os_ids({"context": {"learner_id": 1, "staff_id": 2}})


def test_document_intelligence_lists_nvq_lenses():
    lenses = {item["id"] for item in orb_document_intelligence_service.list_lenses()}
    assert "nvq_evidence_map" in lenses
    assert "reflective_account_plan" in lenses
    assert "assessor_feedback" in lenses
