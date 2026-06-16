"""ORB Residential route finalisation contract — every record-generation path must repair."""

from __future__ import annotations

import inspect
import re

import pytest

from assistant.knowledge.adult_identity_language import sanitize_live_record_output
from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.orb_dictate_service import _finalize_dictate_text
from services.orb_final_answer_repair_service import repair_and_validate_final_answer
from services.orb_residential_finalization_service import finalize_orb_residential_answer

MANUAL_REGRESSION_DAILY_RECORD_PROMPT = (
    "Create a daily record. Keep it factual, warm, therapeutic, child-centred and suitable for a "
    "children's home record.\n\n"
    "Child A came back quieter after school. Adult TK gave Child A space. Adult JS checked in later. "
    'Child A said, "I\'m just annoyed about school." Adult JS offered toast and sat nearby while '
    "Child A watched TV. Child A ate the toast and appeared calmer before bedtime. Adult TK handed "
    "over that tomorrow's adults should check in gently about school if Child A wishes to talk."
)

RAW_FAILURE_MARKERS = (
    "Daily Record\n\n"
    "Adult JS sat nearby while Child A watched television Child A accepted the toast and appeared calmer. "
    "Before bedtime, Child A appeared calmer.\n\n"
    "Next Steps:\n- Monitor Child A's mood\n\n"
    "[End of record]\n\n"
    "DSL reviewed the record. Staff on Duty noted the evening.\n\n"
    "This record captures Child A's experience. This indicates some frustration. "
    "Child A appeared to feel safe and comfortable. There was a positive shift in mood."
)


def _intel_packet(message: str, *, mode: str = "Record This Properly") -> dict:
    return indicare_intelligence_core_service.build_intelligence_packet(message, mode=mode)


def test_finalize_orb_residential_answer_repairs_known_failure_markers():
    repaired, meta = finalize_orb_residential_answer(
        RAW_FAILURE_MARKERS,
        user_input=MANUAL_REGRESSION_DAILY_RECORD_PROMPT,
        record_type="daily_record",
        surface="orb_residential",
        mode="Record This Properly",
        indicare_intelligence=_intel_packet(MANUAL_REGRESSION_DAILY_RECORD_PROMPT),
        record_learning=False,
    )
    lowered = repaired.lower()
    assert "watched television child a" not in lowered
    assert "watched television. child a" in lowered or "watched tv. child a" in lowered
    assert "[end of record]" not in lowered
    assert "staff on duty" not in lowered
    assert "this record captures" not in lowered
    assert "this indicates" not in lowered
    assert "feel safe and comfortable" not in lowered
    assert "positive shift in mood" not in lowered
    assert "next steps" not in lowered or "monitor child a's mood" not in lowered
    assert meta.get("orb_residential_finalization", {}).get("pipeline") == "finalize_orb_residential_answer"


def test_repair_preserves_adult_initials_and_quote():
    repaired, _ = finalize_orb_residential_answer(
        RAW_FAILURE_MARKERS,
        user_input=MANUAL_REGRESSION_DAILY_RECORD_PROMPT,
        surface="orb_residential",
        mode="Record This Properly",
        indicare_intelligence=_intel_packet(MANUAL_REGRESSION_DAILY_RECORD_PROMPT),
        record_learning=False,
    )
    lowered = repaired.lower()
    assert "adult tk" in lowered or "adult js" in lowered
    assert "appeared calmer" in lowered


def test_sanitize_live_record_output_joined_sentence_repair():
    source = MANUAL_REGRESSION_DAILY_RECORD_PROMPT
    rough = (
        "Daily Record\n\n"
        "Adult JS sat nearby while Child A watched television Child A accepted the toast."
    )
    cleaned = sanitize_live_record_output(rough, source_text=source)
    assert "watched television Child A" not in cleaned
    assert "watched television. Child A" in cleaned or "watched TV. Child A" in cleaned


def test_dictate_finalize_path_uses_residential_pipeline():
    rough = (
        "Daily Record\n\n"
        "Staff on Duty noted Child A watched television Child A accepted toast and appeared calmer."
    )
    finalized, meta = _finalize_dictate_text(
        text=rough,
        note_type="daily_record",
        mode="Record This Properly",
        intel_packet=_intel_packet(MANUAL_REGRESSION_DAILY_RECORD_PROMPT),
        source_text=MANUAL_REGRESSION_DAILY_RECORD_PROMPT,
    )
    assert "staff on duty" not in finalized.lower()
    assert "watched television child a" not in finalized.lower()
    assert meta.get("orb_residential_finalization") or meta.get("answer_repaired") is not None


@pytest.mark.parametrize(
    "module_path,handler_name",
    [
        ("routers.orb_standalone_routes", "standalone_orb_conversation"),
        ("routers.orb_standalone_routes", "standalone_orb_conversation_stream"),
        ("routers.orb_residential_premium_routes", "orb_residential_conversation"),
    ],
)
def test_conversation_routes_call_residential_finalizer(module_path: str, handler_name: str):
    import importlib

    mod = importlib.import_module(module_path)
    source = inspect.getsource(getattr(mod, handler_name))
    assert "finalize_orb_residential_answer" in source


def test_stream_route_finalizes_before_metadata_event():
    from routers import orb_standalone_routes

    source = inspect.getsource(orb_standalone_routes.standalone_orb_conversation_stream)
    finalize_idx = source.index("finalize_orb_residential_answer(")
    metadata_idx = source.index('yield _sse_event("metadata"')
    assert finalize_idx < metadata_idx


def test_stream_metadata_includes_repair_flags():
    from routers import orb_standalone_routes

    source = inspect.getsource(orb_standalone_routes.standalone_orb_conversation_stream)
    assert '"answer_repaired"' in source
    assert '"final_answer_repair_applied"' in source


def test_dictate_routes_finalize_through_document_adapter():
    from services import orb_dictate_service as mod

    source = inspect.getsource(mod._finalize_dictate_text)
    assert "finalize_document_intelligence" in source


def test_document_adapter_delegates_to_residential_finalizer():
    from services import orb_document_brain_adapter_service as mod

    source = inspect.getsource(mod.finalize_document_intelligence)
    assert "finalize_orb_residential_answer" in source


def test_action_engine_uses_finalize_standalone_for_care_actions():
    from services import orb_action_engine_service as mod

    source = inspect.getsource(mod.orb_action_engine_service.run_action)
    assert "finalize_standalone_intelligence" in source


@pytest.mark.parametrize(
    "note_type",
    [
        "daily_record",
        "incident_reflection",
        "safeguarding_concern",
        "handover",
        "meeting_minutes",
        "regulation_evidence",
        "management_oversight",
    ],
)
def test_repair_and_validate_for_record_types(note_type: str):
    prompt = f"Create a {note_type.replace('_', ' ')} from these notes: Child A settled after tea."
    rough = (
        f"# {note_type.replace('_', ' ').title()}\n\n"
        "Staff on Duty watched television Child A appeared calmer. "
        "This record captures the evening. DSL notified."
    )
    repaired, meta = repair_and_validate_final_answer(
        rough,
        contract_family=None,
        message=prompt,
        mode="Record This Properly",
    )
    assert repaired
    if note_type in {"daily_record", "handover", "incident_reflection"}:
        assert "watched television child a" not in repaired.lower()
    if note_type == "daily_record":
        assert "staff on duty" not in repaired.lower()


def test_manual_regression_daily_record_route_level_fixture():
    """Route-level regression: repaired output must satisfy live review criteria."""
    repaired, _ = finalize_orb_residential_answer(
        RAW_FAILURE_MARKERS,
        user_input=MANUAL_REGRESSION_DAILY_RECORD_PROMPT,
        record_type="daily_record",
        surface="orb_standalone",
        streaming=True,
        mode="Record This Properly",
        indicare_intelligence=_intel_packet(MANUAL_REGRESSION_DAILY_RECORD_PROMPT),
        record_learning=False,
    )
    lowered = repaired.lower()
    assert re.search(r"daily\s+record", lowered)
    assert "dsl" not in lowered or "designated safeguarding lead" not in lowered
    assert "safeguarding note" not in lowered
    assert "mood improved" not in lowered
    assert "seemed more relaxed" not in lowered
    assert "as the evening progressed" not in lowered
    appearances = len(re.findall(r"appeared calmer", lowered))
    assert appearances <= 2
