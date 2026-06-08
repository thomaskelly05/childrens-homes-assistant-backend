"""ORB incident report generation must not invent facts."""

from __future__ import annotations

from services.orb_action_engine_service import orb_action_engine_service
from services.orb_dictate_service import _build_generate_prompt, _fallback_generate
from services.orb_fast_opening_service import fast_opening_for_message
from services.orb_recording_contract_service import (
    build_safe_incident_report_scaffold,
    detect_invented_incident_facts,
    extract_known_incident_facts,
    output_includes_required_placeholders,
    treats_kicking_off_as_shorthand,
)
from services.orb_recording_framework_service import build_structured_write_body, resolve_record_type
from services.orb_residential_quality_service import orb_residential_quality_service
from services.orb_standalone_brain_service import orb_standalone_brain_service
from schemas.orb_dictate import OrbDictateGenerateRequest

INCIDENT_PROMPT = (
    "Jamie was kicking off today following family contact, help me to write the incident report"
)

INVENTED_OUTPUT = """
Jamie returned from family contact visibly upset and kicked furniture.
Jamie shouted: "I don't want to talk about it!"
Staff used calm co-regulation phrases and moved Jamie to a quieter area.
Jamie later shared that contact brought up difficult emotions.
A team meeting will happen and a support plan review will be scheduled.
This will be added to chronology. Manager was notified and Jamie settled with support.
"""


def test_jamie_prompt_extracts_only_known_facts():
    facts = extract_known_incident_facts(INCIDENT_PROMPT)
    assert facts["young_person"] == "Jamie"
    assert facts["shorthand_behaviour"] == "kicking off"
    assert facts["followed_family_contact"] is True
    assert facts["happened_today"] is True
    assert facts["wants_incident_report"] is True


def test_safe_scaffold_does_not_invent_furniture_kicking():
    scaffold = build_safe_incident_report_scaffold(INCIDENT_PROMPT)
    assert "kicked furniture" not in scaffold.lower()
    assert "furniture" not in scaffold.lower() or "damaging property" in scaffold.lower()
    assert detect_invented_incident_facts(scaffold, INCIDENT_PROMPT) == []


def test_safe_scaffold_does_not_invent_direct_quotes():
    scaffold = build_safe_incident_report_scaffold(INCIDENT_PROMPT)
    assert '"' not in scaffold or "kicking off" in scaffold
    assert "I don't want to talk about it" not in scaffold
    assert detect_invented_incident_facts(scaffold, INCIDENT_PROMPT) == []


def test_safe_scaffold_does_not_invent_staff_dialogue():
    scaffold = build_safe_incident_report_scaffold(INCIDENT_PROMPT)
    lowered = scaffold.lower()
    assert "staff said" not in lowered
    assert "staff used" not in lowered
    assert "calm co-regulation" not in lowered


def test_safe_scaffold_does_not_invent_outcome():
    scaffold = build_safe_incident_report_scaffold(INCIDENT_PROMPT)
    lowered = scaffold.lower()
    assert "settled with support" not in lowered
    assert "later shared that" not in lowered
    assert "calmed down" not in lowered


def test_safe_scaffold_does_not_invent_follow_up_actions():
    scaffold = build_safe_incident_report_scaffold(INCIDENT_PROMPT)
    lowered = scaffold.lower()
    assert "team meeting will" not in lowered
    assert "support plan review will be scheduled" not in lowered
    assert "added to chronology" not in lowered


def test_safe_scaffold_includes_placeholders_for_missing_sections():
    scaffold = build_safe_incident_report_scaffold(INCIDENT_PROMPT)
    assert output_includes_required_placeholders(scaffold)
    lowered = scaffold.lower()
    assert "[add time]" in lowered
    assert "[add location]" in lowered
    assert "child's voice" in lowered
    assert "adult response" in lowered
    assert "outcome" in lowered
    assert "missing information" in lowered


def test_kicking_off_treated_as_shorthand_not_factual_behaviour():
    scaffold = build_safe_incident_report_scaffold(INCIDENT_PROMPT)
    assert treats_kicking_off_as_shorthand(scaffold)
    assert "described as" in scaffold.lower() or "shorthand" in scaffold.lower()


def test_invented_output_detector_flags_common_hallucinations():
    issues = detect_invented_incident_facts(INVENTED_OUTPUT, INCIDENT_PROMPT)
    assert "furniture kicking" in issues
    assert "fabricated direct quote" in issues or "direct quote" in issues
    assert "assumed outcome" in issues
    assert "fabricated follow-up plan" in issues


def test_dictate_generate_prompt_includes_no_invented_facts_contract():
    request = OrbDictateGenerateRequest(
        input_text=INCIDENT_PROMPT,
        note_type="incident_record",
    )
    system, user = _build_generate_prompt(request, "incident_record")
    combined = f"{system}\n{user}".lower()
    assert "never invent facts" in combined
    assert "no invented facts recording contract" in combined
    assert "kicking off" in combined
    assert "placeholder" in combined


def test_dictate_fallback_incident_record_uses_safe_scaffold():
    result = _fallback_generate(
        OrbDictateGenerateRequest(
            input_text=INCIDENT_PROMPT,
            note_type="incident_record",
        )
    )
    assert detect_invented_incident_facts(result.professional_note, INCIDENT_PROMPT) == []
    assert output_includes_required_placeholders(result.professional_note)


def test_write_auto_fill_uses_prompts_not_fabricated_content():
    record_type = resolve_record_type(note_type="incident_record")
    body = build_structured_write_body(
        record_type=record_type,
        note_type="incident_record",
        transcript=INCIDENT_PROMPT,
        professional_note="",
    )
    lowered = body.lower()
    assert "kicked furniture" not in lowered
    assert "[add" in lowered or "*what" in lowered or "sequence" in lowered
    assert detect_invented_incident_facts(body, INCIDENT_PROMPT) == []


def test_standalone_brain_frame_includes_incident_no_invent_contract():
    frame = orb_standalone_brain_service.frame(INCIDENT_PROMPT, mode="Ask ORB")
    contract_text = " ".join(frame.response_contract).lower()
    assert "never invent" in contract_text or "placeholders" in contract_text
    assert "kicking off" in contract_text or "shorthand" in contract_text
    block = orb_standalone_brain_service.build_prompt_block(INCIDENT_PROMPT, mode="Ask ORB")
    assert "NO INVENTED FACTS RECORDING CONTRACT" in block


def test_fast_opening_states_only_use_provided_facts():
    opening = fast_opening_for_message(INCIDENT_PROMPT, expert_depth="residential_deep")
    assert opening
    assert "only use what you've provided" in opening.lower()


def test_manager_oversight_action_prompt_does_not_invent_manager_actions():
    prompt = orb_action_engine_service._action_user_prompt(  # noqa: SLF001
        "create_manager_oversight_note",
        source_text=INCIDENT_PROMPT,
    )
    lowered = prompt.lower()
    assert "do not invent" in lowered
    assert "placeholder" in lowered


def test_residential_quality_includes_incident_missing_checklist():
    quality = orb_residential_quality_service.run_residential_quality_check(
        build_safe_incident_report_scaffold(INCIDENT_PROMPT),
        note_type="incident_record",
        surface="chat",
    )
    checklist = quality.get("incident_missing_checklist") or []
    assert checklist
    assert any("time" in item.lower() for item in checklist)
    assert any("location" in item.lower() for item in checklist)
