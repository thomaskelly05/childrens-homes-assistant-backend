from __future__ import annotations

from pathlib import Path
from unittest.mock import AsyncMock

import pytest
from fastapi import HTTPException

from routers import orb_standalone_routes
from routers.orb_standalone_routes import (
    FORBIDDEN_STANDALONE_OS_KEYS,
    OrbStandaloneActionRunRequest,
    standalone_orb_action_run,
    standalone_orb_actions_registry,
)
from services.orb_action_engine_service import (
    analyse_what_missing_gaps,
    orb_action_engine_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
ROUTES = REPO_ROOT / "routers" / "orb_standalone_routes.py"
CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"
ACTIONS_TS = REPO_ROOT / "frontend-next" / "lib" / "orb" / "orb-response-actions.ts"


def test_action_route_exists_in_router():
    text = ROUTES.read_text(encoding="utf-8")
    assert '@router.post("/actions/run")' in text
    assert "standalone_orb_action_run" in text
    assert "orb_action_engine_service" in text


def test_action_route_uses_premium_dependency():
    text = ROUTES.read_text(encoding="utf-8")
    block = text.split('async def standalone_orb_action_run')[1].split("async def ")[0]
    assert "require_standalone_orb_access" in block


def test_route_rejects_os_record_ids():
    with pytest.raises(HTTPException) as exc:
        orb_standalone_routes._reject_standalone_os_ids({"context": {"child_id": 9}})
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_what_am_i_missing_returns_missing_child_voice_when_absent(monkeypatch):
    async def stub_llm(**_kwargs):
        return (
            "Based only on what you have provided…\n\n"
            "## What may be missing\nChild voice may be missing."
        )

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    gaps = analyse_what_missing_gaps("Staff reported the young person was upset after contact.")
    assert any(g.id == "missing_child_voice" for g in gaps)
    result = await orb_action_engine_service.run_action(
        action="what_am_i_missing",
        source_answer="Staff reported the young person was upset after contact.",
        mode="Ask ORB",
    )
    assert result["action"] == "what_am_i_missing"
    assert "missing_child_voice" in (result.get("action_engine") or {}).get("heuristic_gaps", [])
    assert result.get("os_records_accessed") is False


@pytest.mark.asyncio
async def test_recording_wording_avoids_punitive_language(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, system_prompt: str, **_kwargs):
        captured["user"] = user_prompt
        captured["system"] = system_prompt
        return (
            "Based only on what you have provided…\n\n"
            "The young person became dysregulated. Staff offered co-regulation and space."
        )

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="convert_to_recording_wording",
        source_answer="The child was defiant and attention seeking.",
        mode="Record This Properly",
    )
    assert result["action"] == "convert_to_recording_wording"
    assert "non-punitive" in captured["user"].lower()
    assert "defiant" not in result["answer"].lower()


@pytest.mark.asyncio
async def test_manager_oversight_does_not_invent_facts(monkeypatch):
    async def stub_llm(*, user_prompt: str, system_prompt: str, **_kwargs):
        assert "never invent" in system_prompt.lower()
        assert "do not invent" in user_prompt.lower()
        return "Based only on what you have provided…\n\n## Record reviewed\nProvided notes only."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="create_manager_oversight_note",
        source_answer="Incident on unit; staff de-escalated.",
        mode="Manager Copilot",
    )
    assert result["title"] == "Manager oversight note"


@pytest.mark.asyncio
async def test_chronology_suggestion_includes_significance_and_boundary(monkeypatch):
    async def stub_llm(**_kwargs):
        return (
            "Based only on what you have provided…\n\n"
            "## Significance\nEscalation in behaviour.\n"
            "Draft suggestion only — not inserted into chronology."
        )

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="create_chronology_suggestion",
        source_answer="Argument between peers at 18:00.",
        mode="Ask ORB",
    )
    assert "chronology" in result["answer"].lower()
    assert result["standalone"] is True


@pytest.mark.asyncio
async def test_safeguarding_lens_forces_deep_mode(monkeypatch):
    tiers: list[str] = []

    async def stub_llm(*, prompt_tier: str, **_kwargs):
        tiers.append(prompt_tier)
        return "Based only on what you have provided…\n\nSafeguarding lens output."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    tier = orb_action_engine_service.resolve_prompt_tier(
        "add_safeguarding_lens",
        source_text="Concern about injury",
        mode="Ask ORB",
    )
    assert tier == "deep"
    await orb_action_engine_service.run_action(
        action="add_safeguarding_lens",
        source_answer="Bruise noted; cause unclear.",
        mode="Ask ORB",
    )
    assert tiers == ["deep"]


@pytest.mark.asyncio
async def test_ofsted_lens_includes_evidence_child_experience_leadership(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, **_kwargs):
        captured["prompt"] = user_prompt
        return "Based only on what you have provided…\n\nOfsted lens."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    await orb_action_engine_service.run_action(
        action="add_ofsted_lens",
        source_answer="Visit feedback notes.",
        mode="Ofsted Lens",
    )
    prompt = captured["prompt"].lower()
    assert "child experience" in prompt
    assert "evidence" in prompt
    assert "leadership" in prompt


@pytest.mark.asyncio
async def test_action_run_endpoint_returns_structured_payload(fake_state, monkeypatch):
    async def stub_run(**_kwargs):
        return {
            "action": "what_am_i_missing",
            "title": "What am I missing?",
            "answer": "Based only on what you have provided…",
            "sections": [],
            "checklist": [],
            "confidence": "medium",
            "sources": [],
            "standalone": True,
            "os_records_accessed": False,
            "suggested_next_actions": [],
        }

    monkeypatch.setattr(orb_standalone_routes.orb_action_engine_service, "run_action", stub_run)
    payload = OrbStandaloneActionRunRequest(
        action="what_am_i_missing",
        source_answer="Notes without child voice.",
        mode="Ask ORB",
    )
    result = await standalone_orb_action_run(payload, current_user=fake_state["user"])
    assert result["success"] is True
    assert result["data"]["standalone"] is True
    assert result["data"]["os_records_accessed"] is False


@pytest.mark.asyncio
async def test_action_run_rejects_forbidden_context_ids(fake_state):
    payload = OrbStandaloneActionRunRequest(
        action="what_am_i_missing",
        source_answer="text",
        context={"record_id": "abc"},
    )
    with pytest.raises(HTTPException) as exc:
        await standalone_orb_action_run(payload, current_user=fake_state["user"])
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_actions_registry_lists_backend_supported(fake_state):
    result = await standalone_orb_actions_registry(current_user=fake_state["user"])
    assert result["success"] is True
    assert "what_am_i_missing" in result["data"]["backend_supported_ids"]


def test_frontend_client_declares_actions_run():
    text = CLIENT.read_text(encoding="utf-8")
    assert "actionsRun: '/orb/standalone/actions/run'" in text
    assert "runStandaloneOrbAction" in text


def test_frontend_backend_supported_actions_mapping():
    text = ACTIONS_TS.read_text(encoding="utf-8")
    assert "what_missing: 'what_am_i_missing'" in text
    assert "BACKEND_SUPPORTED_ORB_RESPONSE_ACTIONS" in text
    assert "runStandaloneOrbAction" not in text  # lives in standalone-client


def test_forbidden_keys_include_chronology_id():
    assert "chronology_id" in FORBIDDEN_STANDALONE_OS_KEYS


@pytest.mark.asyncio
async def test_make_more_concise_preserves_safeguarding_boundary(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, system_prompt: str, **_kwargs):
        captured["user"] = user_prompt
        return (
            "Based only on what you have provided…\n\n"
            "Escalation to DSL considered. Injury noted — cause unclear."
        )

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="make_more_concise",
        source_answer="Long notes about injury and possible safeguarding escalation to DSL.",
        mode="Ask ORB",
    )
    assert result["action"] == "make_more_concise"
    assert "safeguarding" in captured["user"].lower()
    assert "escalation" in result["answer"].lower() or "dsl" in result["answer"].lower()


@pytest.mark.asyncio
async def test_make_more_detailed_adds_checks_without_inventing(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, system_prompt: str, **_kwargs):
        captured["user"] = user_prompt
        return "Based only on what you have provided…\n\n## Next steps\nConfirm timeline with on-call."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    await orb_action_engine_service.run_action(
        action="make_more_detailed",
        source_answer="Brief incident note.",
        mode="Ask ORB",
    )
    assert "do not invent" in captured["user"].lower()


@pytest.mark.asyncio
async def test_therapeutic_reframe_avoids_punitive_wording(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, **_kwargs):
        captured["prompt"] = user_prompt
        return (
            "Based only on what you have provided…\n\n"
            "Behaviour may communicate unmet need. Staff offered co-regulation."
        )

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="therapeutic_reframe",
        source_answer="The child was defiant and manipulative.",
        mode="Ask ORB",
    )
    assert "punitive" in captured["prompt"].lower()
    assert "defiant" not in result["answer"].lower()


@pytest.mark.asyncio
async def test_supervision_prompt_includes_staff_support_and_learning(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, **_kwargs):
        captured["prompt"] = user_prompt
        return (
            "Based only on what you have provided…\n\n"
            "## Staff support\nRest debrief.\n## Learning\nPACE refresher."
        )

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="supervision_prompt",
        source_answer="Difficult evening on unit.",
        mode="Staff Coach",
    )
    prompt = captured["prompt"].lower()
    assert "staff support" in prompt
    assert "learning" in prompt
    assert result["title"] == "Supervision prompts"


@pytest.mark.asyncio
async def test_shift_handover_includes_risks_actions_manager_missing(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, **_kwargs):
        captured["prompt"] = user_prompt
        return (
            "Based only on what you have provided…\n\n"
            "## Priority risks\nEscalation.\n## Manager attention\nRM brief.\n## Missing\nChild voice."
        )

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="shift_handover_summary",
        source_answer="End of shift notes.",
        mode="Record This Properly",
    )
    prompt = captured["prompt"].lower()
    assert "priority risks" in prompt
    assert "manager attention" in prompt
    assert "missing" in prompt
    assert result["os_records_accessed"] is False


@pytest.mark.asyncio
async def test_build_shift_plan_standalone_sections(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, **_kwargs):
        captured["prompt"] = user_prompt
        return "Based only on what you have provided…\n\n## Shift priorities\n1. Safety."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="build_shift_plan",
        source_answer="Shift notes for unit A.",
        mode="Ask ORB",
    )
    assert result["action"] == "build_shift_plan"
    assert "shift priorities" in captured["prompt"].lower()
    assert "no live" in captured["prompt"].lower() or "not live" in captured["prompt"].lower()


@pytest.mark.asyncio
async def test_child_voice_prompt_does_not_invent_views(monkeypatch):
    captured: dict = {}

    async def stub_llm(*, user_prompt: str, system_prompt: str, **_kwargs):
        captured["user"] = user_prompt
        assert "never invent" in user_prompt.lower()
        return "Based only on what you have provided…\n\nSuggest capturing child's words safely."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    result = await orb_action_engine_service.run_action(
        action="add_child_voice_prompt",
        source_answer="Staff reported upset after contact.",
        mode="Ask ORB",
    )
    assert result["action"] == "add_child_voice_prompt"


@pytest.mark.asyncio
async def test_high_risk_transform_uses_deep_tier(monkeypatch):
    tiers: list[str] = []

    async def stub_llm(*, prompt_tier: str, **_kwargs):
        tiers.append(prompt_tier)
        return "Based only on what you have provided…\n\nHandover."

    monkeypatch.setattr(orb_action_engine_service, "_llm_complete", stub_llm)
    tier = orb_action_engine_service.resolve_prompt_tier(
        "shift_handover_summary",
        source_text="Police attended after injury",
        mode="Ask ORB",
    )
    assert tier == "deep"
    await orb_action_engine_service.run_action(
        action="shift_handover_summary",
        source_answer="Police attended after injury",
        mode="Ask ORB",
    )
    assert tiers == ["deep"]


def test_transform_actions_are_backend_supported():
    for action_id in (
        "make_more_concise",
        "make_more_detailed",
        "therapeutic_reframe",
        "supervision_prompt",
        "shift_handover_summary",
        "build_shift_plan",
        "add_child_voice_prompt",
    ):
        assert orb_action_engine_service.is_backend_supported(action_id), action_id


def test_frontend_maps_shift_builder_to_build_shift_plan():
    text = ACTIONS_TS.read_text(encoding="utf-8")
    assert "shift_builder: 'build_shift_plan'" in text
    assert "more_concise: 'make_more_concise'" in text
    assert "child_voice: 'add_child_voice_prompt'" in text
