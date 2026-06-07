"""ORB Residential convergence — brain, voice, dictate, write, quality, memory."""

from __future__ import annotations

from pathlib import Path

import pytest

from assistant.user_memory_policy import FORBIDDEN_MEMORY_TERMS, SAFE_MEMORY_KEYS, assess_memory_candidates
from services.orb_document_brain_adapter_service import orb_document_brain_adapter_service
from services.orb_dictate_service import analyze_dictate_session, generate_dictate_note
from services.orb_knowledge_retrieval_service import LIVE_LOOKUP_NOTE, orb_knowledge_retrieval_service
from services.orb_residential_quality_service import (
    SHARED_CAPTURE_PROMPTS,
    orb_residential_quality_service,
)
from services.orb_standalone_brain_service import orb_standalone_brain_service
from schemas.orb_dictate import OrbDictateAnalyzeRequest, OrbDictateGenerateRequest
from services.orb_brain_metadata_service import assert_standalone_brain_contract

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def _read(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


# --- Brain convergence ---


def test_voice_and_chat_share_ask_orb_brain():
    router = _read("lib/orb/orb-brain-router.ts")
    companion = _read("components/orb-standalone/orb-care-companion.tsx")
    assert "export async function askOrbBrain" in router
    assert "askOrbBrain" in companion
    assert "source: voiceOriginatedSend ? 'voice' : 'chat'" in companion


def test_minimal_chat_uses_ask_orb_brain():
    minimal = _read("components/orb-standalone/orb-minimal-chat.tsx")
    assert "askOrbBrain" in minimal
    assert "queryStandaloneOrbConversation" not in minimal


def test_dictate_routes_through_document_brain_adapter():
    ctx = orb_document_brain_adapter_service.build_document_brain_context(
        "Young person settled after tea.",
        mode="daily_record",
        feature="dictate",
        note_type="daily_record",
    )
    assert ctx["adapter"] == "orb_document_brain_adapter"
    assert "intelligence_packet" in ctx
    assert_standalone_brain_contract(ctx["brain_metadata"])


def test_dictate_generate_includes_brain_metadata_via_adapter():
    result = generate_dictate_note(
        OrbDictateGenerateRequest(
            input_text="Young person settled after tea.",
            note_type="daily_record",
        )
    )
    assert result.brain_metadata is not None
    assert result.brain_metadata.get("brain_adapter") == "orb_document_brain_adapter"
    assert_standalone_brain_contract(result.brain_metadata)


def test_general_prompts_use_general_assistant_default():
    frame = orb_standalone_brain_service.frame("Help me plan a birthday party.", mode="Ask ORB")
    assert frame.dual_brain_route == "general_knowledge"
    classification = orb_knowledge_retrieval_service.classify_query("Help me plan a birthday party.")
    assert classification["routing_hint"] == "general_assistant_brain"


def test_residential_prompts_use_specialist_enrichment():
    frame = orb_standalone_brain_service.frame(
        "What should I record when a young person returns from missing?",
        mode="Ask ORB",
    )
    assert frame.dual_brain_route == "residential_specialist"


def test_live_lookup_routes_without_hallucination_note():
    classification = orb_knowledge_retrieval_service.classify_query("What is the weather in Newcastle?")
    assert classification["live_lookup_intent"] is True
    assert classification["live_lookup_note"] == LIVE_LOOKUP_NOTE


# --- Voice transcript ---


def test_voice_station_two_sided_transcript_sync():
    station = _read("components/orb-standalone/orb-voice-station.tsx")
    assert "lastSyncedReplyKeyRef" in station
    assert "role: 'assistant'" in station
    assert "provider: 'orb_brain'" in station
    assert "formatVoiceTurnsPlainText" in station


def test_voice_transcript_actions_include_handoffs():
    station = _read("components/orb-standalone/orb-voice-station.tsx")
    actions = _read("components/orb-standalone/orb-voice-transcript-actions.tsx")
    assert "data-orb-voice-to-dictate" in actions
    assert "data-orb-voice-to-write" in station
    assert "data-orb-voice-manager-oversight" in station
    assert "data-orb-voice-action-list" in station
    assert "Copy full conversation" in actions


def test_voice_preserves_transcript_on_brain_failure():
    companion = _read("components/orb-standalone/orb-care-companion.tsx")
    assert "preserve it if the brain request fails" in companion


# --- Dictate ---


def test_dictate_template_aware_missing_prompts():
    result = analyze_dictate_session(
        OrbDictateAnalyzeRequest(
            input_text="Staff supported the young person after contact.",
            note_type="incident_record",
        )
    )
    assert result.detected_record_type
    assert result.quality_checks is not None
    assert any("child" in p.lower() or "safeguard" in p.lower() for p in result.missing_information)


def test_dictate_prompts_missing_child_voice():
    result = orb_residential_quality_service.run_residential_quality_check(
        "Staff supported the young person after contact.",
        note_type="daily_record",
        surface="dictate",
    )
    assert result["child_centred"] is False
    assert any("child" in p.lower() for p in result["missing_prompts"])


def test_dictate_prompts_safeguarding_for_incident():
    result = orb_residential_quality_service.run_residential_quality_check(
        "There was a physical altercation in the lounge.",
        note_type="incident_record",
        surface="dictate",
    )
    assert result["manager_oversight_prompt"] is not None or any(
        "safeguard" in p.lower() or "manager" in p.lower() for p in result["missing_prompts"]
    )


# --- Write ---


def test_write_receives_voice_handoff():
    companion = _read("components/orb-standalone/orb-care-companion.tsx")
    assert "onOpenWrite" in companion
    assert "openOrbWriteWithContent" in companion


def test_write_therapeutic_actions_exist():
    edit = (REPO_ROOT / "services" / "orb_dictate_edit_service.py").read_text(encoding="utf-8")
    assert "therapeutic_rewrite" in edit
    assert "ofsted_ready" in edit


# --- Quality layer ---


def test_shared_capture_prompts_defined():
    assert len(SHARED_CAPTURE_PROMPTS) >= 10
    assert "What did the child say?" in SHARED_CAPTURE_PROMPTS


def test_quality_layer_callable_from_dictate():
    result = orb_residential_quality_service.run_residential_quality_check(
        "At 14:30 the young person said they felt anxious.",
        note_type="daily_record",
        surface="dictate",
    )
    assert "quality_checks" in result
    assert "ofsted_readiness" in result


def test_ofsted_readiness_check_for_write_surface():
    result = orb_residential_quality_service.run_residential_quality_check(
        'At 14:30 observed calm presentation. Young person said "I wanted space."',
        note_type="daily_record",
        surface="write",
    )
    ofsted = result["ofsted_readiness"]
    assert ofsted["recording_quality"] in {"good", "needs_review"}
    assert isinstance(ofsted["strengths"], list)
    assert isinstance(ofsted["gaps"], list)


def test_manager_oversight_prompt_for_incident():
    result = orb_residential_quality_service.run_residential_quality_check(
        "Physical incident in lounge — staff intervened.",
        note_type="incident_record",
        surface="write",
    )
    assert result["manager_oversight_prompt"] is not None


# --- Memory / context safety ---


def test_user_preference_memory_whitelist():
    result = assess_memory_candidates(
        [{"key": "preferred_tone", "value": "calm and professional", "reason": "User style preference"}]
    )
    assert len(result.safe_to_store) == 1
    assert result.safe_to_store[0].key == "preferred_tone"
    assert "preferred_tone" in SAFE_MEMORY_KEYS


def test_child_specific_memory_rejected_in_standalone_policy():
    result = assess_memory_candidates(
        [{"key": "child_name", "value": "Alex", "reason": "Child context"}]
    )
    assert len(result.safe_to_store) == 0
    assert len(result.rejected) == 1
    assert any("child name" in term for term in FORBIDDEN_MEMORY_TERMS)


def test_quality_check_route_registered():
    routes = (REPO_ROOT / "routers" / "orb_standalone_routes.py").read_text(encoding="utf-8")
    assert "/quality-check" in routes
    assert "orb_residential_quality_service" in routes
