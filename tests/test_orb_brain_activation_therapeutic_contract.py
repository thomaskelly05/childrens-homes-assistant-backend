"""Full ORB brain activation and therapeutic language contract tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from assistant.response_contracts import get_contract
from services.orb_action_engine_service import orb_action_engine_service
from services.orb_brain_route_service import decide_orb_brain_route
from services.orb_dictate_edit_service import _build_edit_prompt
from services.orb_dictate_service import _build_generate_prompt, _fallback_generate
from services.orb_fast_opening_service import fast_opening_for_message
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_recording_contract_service import (
    build_recording_contract_prompt_block,
    detect_invented_incident_facts,
)
from services.orb_residential_intelligence_service import orb_residential_intelligence_service
from services.orb_residential_quality_service import orb_residential_quality_service
from services.orb_standalone_brain_service import orb_standalone_brain_service
from services.orb_therapeutic_language_contract_service import (
    build_safe_residential_scenario_scaffold,
    is_residential_incident_scenario,
    response_meets_residential_scenario_contract,
    uses_weak_generic_phrasing,
)
from schemas.orb_dictate import OrbDictateEditRequest, OrbDictateGenerateRequest

JAMIE_SHORT = "Jamie kicked off today after family time"
JAMIE_INCIDENT = (
    "Jamie was kicking off today following family contact, help me write the incident report"
)
JAMIE_SCHOOL = "Young person refused school and kicked off"
JAMIE_MANAGER = "Create a manager oversight note for Jamie after family contact"
JAMIE_RECORDING = "Turn this into recording wording: Jamie played up after contact"
JAMIE_MISSING = "What am I missing from this incident record?"
GENERAL_QUANTUM = "Explain quantum computing simply"
GENERAL_EMAIL = "Write a friendly email"
GENERAL_WEEK = "Help me plan my week"

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def _read(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def _assert_residential_brain_active(message: str) -> None:
    frame = orb_standalone_brain_service.frame(message, mode="Ask ORB")
    decision = decide_orb_brain_route(message, mode="Ask ORB", source_surface="chat")
    assert frame.dual_brain_route == "residential_specialist", message
    assert decision.route in {"residential_specialist", "document_workspace"}, message
    assert decision.route != "general_assistant", message
    assert "recording_quality_brain" in frame.active_brains, message
    assert "therapeutic_language_brain" in frame.active_brains, message


def _assert_prompt_contracts(message: str) -> None:
    block = orb_standalone_brain_service.build_prompt_block(message, mode="Ask ORB")
    intel = orb_residential_intelligence_service.build_prompt_block(message, mode="Ask ORB")
    combined = f"{block}\n{intel}".lower()
    assert "therapeutic language contract" in combined, message
    assert "no invented facts" in combined, message
    assert "shorthand" in combined or "observable" in combined, message


def _assert_scaffold_quality(scaffold: str, source: str) -> None:
    contract = response_meets_residential_scenario_contract(scaffold, source)
    assert contract["no_weak_generic_phrasing"], scaffold
    assert contract["shorthand_treated_correctly"], scaffold
    assert contract["includes_therapeutic_prompts"], scaffold
    assert contract["includes_child_voice_prompt"], scaffold
    assert contract["includes_observable_prompt"], scaffold
    assert contract["includes_staff_response_prompt"], scaffold
    assert detect_invented_incident_facts(scaffold, source) == []


# --- Route activation ---


def test_jamie_short_prompt_activates_residential_specialist_brain():
    assert is_residential_incident_scenario(JAMIE_SHORT)
    _assert_residential_brain_active(JAMIE_SHORT)
    _assert_prompt_contracts(JAMIE_SHORT)


def test_jamie_incident_report_activates_document_or_residential_brain():
    decision = decide_orb_brain_route(JAMIE_INCIDENT, mode="Ask ORB", source_surface="chat")
    assert decision.route in {"document_workspace", "residential_specialist"}
    _assert_prompt_contracts(JAMIE_INCIDENT)


def test_jamie_school_refusal_activates_residential_brain():
    _assert_residential_brain_active(JAMIE_SCHOOL)


def test_general_prompts_remain_general_assistant():
    for message in (GENERAL_QUANTUM, GENERAL_EMAIL, GENERAL_WEEK):
        frame = orb_standalone_brain_service.frame(message, mode="Ask ORB")
        decision = decide_orb_brain_route(message, mode="Ask ORB")
        assert frame.dual_brain_route == "general_knowledge", message
        assert decision.route == "general_assistant", message
        assert not is_residential_incident_scenario(message), message


def test_voice_and_chat_route_identically_for_jamie_prompt():
    voice = decide_orb_brain_route(JAMIE_SHORT, mode="Ask ORB", source_surface="voice")
    chat = decide_orb_brain_route(JAMIE_SHORT, mode="Ask ORB", source_surface="chat")
    assert voice.route == chat.route
    assert voice.route in {"residential_specialist", "document_workspace"}


def test_knowledge_retrieval_flags_recording_intent_for_jamie_short():
    classification = orb_knowledge_retrieval_service.classify_query(JAMIE_SHORT, mode="Ask ORB")
    assert classification["recording_intent"] is True
    assert classification["intents"]["recording_quality"] is True


# --- Therapeutic scaffold (observed prompt fix) ---


def test_jamie_short_scaffold_avoids_weak_generic_phrasing():
    scaffold = build_safe_residential_scenario_scaffold(JAMIE_SHORT)
    assert not uses_weak_generic_phrasing(scaffold)
    assert "challenging moment" not in scaffold.lower()
    assert "being disruptive" not in scaffold.lower()
    _assert_scaffold_quality(scaffold, JAMIE_SHORT)


def test_jamie_short_scaffold_treats_kicked_off_as_shorthand():
    scaffold = build_safe_residential_scenario_scaffold(JAMIE_SHORT)
    lowered = scaffold.lower()
    assert "kicked off" in lowered
    assert "adult shorthand" in lowered or "clarif" in lowered
    assert "observable" in lowered
    assert "family time" in lowered or "unsettled" in lowered


def test_jamie_short_scaffold_does_not_invent_behaviour():
    scaffold = build_safe_residential_scenario_scaffold(JAMIE_SHORT)
    lowered = scaffold.lower()
    assert "shouted" not in lowered
    assert "kicked furniture" not in lowered
    assert "calmed down" not in lowered
    assert "frustrated" not in lowered


def test_fast_opening_for_jamie_short():
    opening = fast_opening_for_message(JAMIE_SHORT, expert_depth="residential_deep")
    assert opening
    assert "only use what you've provided" in opening.lower() or "clarif" in opening.lower()


# --- Dictate / Write parity ---


def test_dictate_generate_includes_therapeutic_contract_for_jamie_short():
    request = OrbDictateGenerateRequest(input_text=JAMIE_SHORT, note_type="incident_record")
    system, user = _build_generate_prompt(request, "incident_record")
    combined = f"{system}\n{user}".lower()
    assert "therapeutic language contract" in combined
    assert "shorthand" in combined
    assert "kicked off" in combined or "kicking off" in combined


def test_dictate_fallback_jamie_short_meets_contract():
    result = _fallback_generate(
        OrbDictateGenerateRequest(input_text=JAMIE_SHORT, note_type="incident_record")
    )
    _assert_scaffold_quality(result.professional_note, JAMIE_SHORT)


def test_dictate_edit_therapeutic_mode_includes_contract():
    request = OrbDictateEditRequest(
        document_text=JAMIE_SHORT,
        note_type="incident_record",
        edit_mode="therapeutic_rewrite",
    )
    system, user = _build_edit_prompt(request, "therapeutic_rewrite")
    combined = f"{system}\n{user}".lower()
    assert "therapeutic language contract" in combined
    assert "no invented facts" in combined


# --- Actions ---


@pytest.mark.parametrize(
    "action_id",
    [
        "convert_to_recording_wording",
        "create_manager_oversight_note",
        "what_am_i_missing",
        "add_safeguarding_lens",
    ],
)
def test_action_system_prompt_includes_therapeutic_contract(action_id: str):
    definition = orb_action_engine_service.get_action(action_id)
    assert definition is not None
    system = orb_action_engine_service._build_action_system_prompt(  # noqa: SLF001
        definition=definition,
        grounding_context="",
        operating_block="",
        mode="Ask ORB",
        prompt_tier="residential",
        source_text=JAMIE_SHORT,
    )
    assert "THERAPEUTIC LANGUAGE CONTRACT" in system


def test_manager_oversight_action_user_prompt_for_jamie():
    prompt = orb_action_engine_service._action_user_prompt(  # noqa: SLF001
        "create_manager_oversight_note",
        source_text=JAMIE_MANAGER,
    )
    lowered = prompt.lower()
    assert "do not invent" in lowered or "placeholder" in lowered


def test_recording_wording_action_rejects_shorthand_as_final_language():
    prompt = orb_action_engine_service._action_user_prompt(  # noqa: SLF001
        "convert_to_recording_wording",
        source_text=JAMIE_RECORDING,
    )
    assert "shorthand" in prompt.lower()
    assert "challenging moment" in prompt.lower()


# --- Response contracts ---


def test_incident_contract_forbids_weak_phrasing():
    forbidden = get_contract("incident").get("forbidden", [])
    assert "challenging moment" in forbidden


def test_residential_intelligence_uses_incident_contract_for_jamie_short():
    packet = orb_residential_intelligence_service.build_context_packet(JAMIE_SHORT, mode="Ask ORB")
    assert packet.contract_mode == "incident"


# --- Quality layer ---


def test_residential_quality_for_jamie_scaffold():
    scaffold = build_safe_residential_scenario_scaffold(JAMIE_SHORT)
    quality = orb_residential_quality_service.run_residential_quality_check(
        scaffold,
        note_type="incident_record",
        surface="chat",
    )
    checklist = quality["incident_missing_checklist"] or []
    assert checklist
    assert any("manager" in item.lower() for item in checklist)
    assert "manager oversight" in scaffold.lower() or "manager" in scaffold.lower()


# --- Frontend routing parity ---


def test_sse_fallback_preserves_brain_routing_hints():
    companion = _read("components/orb-standalone/orb-care-companion.tsx")
    assert "buildOrbBrainConversationRequest" in companion
    assert "brainRoutedRequest" in companion


def test_orb_brain_router_exports_build_request():
    router = _read("lib/orb/orb-brain-router.ts")
    assert "export function buildOrbBrainConversationRequest" in router


# --- Recording contract block ---


def test_recording_contract_block_for_jamie_short():
    block = build_recording_contract_prompt_block(JAMIE_SHORT)
    lowered = block.lower()
    assert "therapeutic language contract" in lowered
    assert "what is known" in lowered
    assert "recording wording scaffold" in lowered
