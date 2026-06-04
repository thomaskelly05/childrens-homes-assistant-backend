from __future__ import annotations

import pytest

from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.indicare_intelligence_route_finalize_service import finalize_standalone_intelligence
from services.orb_dictate_service import _build_generate_prompt, _dictate_brain_metadata, generate_dictate_note
from schemas.orb_dictate import OrbDictateGenerateRequest


def test_voice_transcript_packet_quality_gate_and_answer():
    transcript = "Young person returned missing overnight smelling of cannabis — manager notified."
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        transcript,
        mode="Safeguarding Thinking",
    )
    assert packet["expert_depth"] in ("residential_deep", "safeguarding_critical", "residential_standard")
    answer, meta = finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer="Check immediate safety, inform your manager, and update the risk assessment.",
        prompt_text=transcript,
        mode="Safeguarding Thinking",
    )
    assert meta["answer_quality_gate"].get("passed") is not None
    assert answer


def test_safeguarding_critical_transcript_depth():
    packet = indicare_intelligence_core_service.build_intelligence_packet(
        "Immediate danger — allegation of sexual harm",
        mode="Ask ORB",
    )
    assert packet["expert_depth"] == "safeguarding_critical"


def test_dictate_generate_brain_metadata_includes_intelligence_core(monkeypatch):
    monkeypatch.delenv("OPENAI_API_KEY", raising=False)
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="Child became distressed at tea. Staff offered calm voice and space.",
            note_type="daily_record",
        )
    )
    meta = result.brain_metadata or {}
    core = meta.get("indicare_intelligence_core") or {}
    assert core.get("expert_depth")
    assert meta.get("feature") == "dictate"


def test_dictate_prompt_includes_intelligence_block():
    request = OrbDictateGenerateRequest(
        input_text="Incident with restraint — child dysregulated after contact.",
        note_type="incident_record",
    )
    system, user = _build_generate_prompt(request, "incident_record")
    assert "IndiCare Intelligence" in system or "intelligence" in user.lower()
    assert "transcript" in user.lower() or "Rough input" in user


def test_dictate_brain_metadata_from_transcript():
    meta = _dictate_brain_metadata(
        note_type="safeguarding_concern_record",
        transcript_text="Disclosure of peer-on-peer harm in the lounge.",
    )
    assert meta.get("indicare_intelligence_core", {}).get("expert_depth")
