"""ORB brain routing — general assistant default, specialist enrichment, live lookup safety."""

from __future__ import annotations

from pathlib import Path

import pytest

from services.orb_general_assistant_service import GENERAL_ORB_SYSTEM_PROMPT
from services.orb_knowledge_retrieval_service import LIVE_LOOKUP_NOTE, orb_knowledge_retrieval_service
from services.orb_standalone_brain_service import orb_standalone_brain_service

REPO_ROOT = Path(__file__).resolve().parents[1]
STANDALONE_ROUTES = REPO_ROOT / "routers" / "orb_standalone_routes.py"
CARE_COMPANION = REPO_ROOT / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
BRAIN_ROUTER = REPO_ROOT / "frontend-next" / "lib" / "orb" / "orb-brain-router.ts"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


@pytest.mark.parametrize(
    "message",
    [
        "Explain quantum computing simply.",
        "Help me plan a birthday party.",
        "What is the capital of France?",
        "asdkjhasdkjh random unclear question",
    ],
)
def test_general_questions_use_fast_prompt_tier(message: str):
    tier = orb_knowledge_retrieval_service.resolve_prompt_tier(message, mode="Ask ORB")
    assert tier == "fast"


def test_residential_question_uses_residential_tier():
    tier = orb_knowledge_retrieval_service.resolve_prompt_tier(
        "What should I record for Regulation 44?",
        mode="Ask ORB",
    )
    assert tier == "residential"


def test_live_lookup_uses_fast_tier_without_hallucination_note():
    classification = orb_knowledge_retrieval_service.classify_query(
        "What is the weather in Whitley Bay?"
    )
    tier = orb_knowledge_retrieval_service.resolve_prompt_tier(
        "What is the weather in Whitley Bay?",
        classification=classification,
    )
    assert classification["live_lookup_intent"] is True
    assert classification["live_lookup_note"] == LIVE_LOOKUP_NOTE
    assert tier == "fast"


def test_live_lookup_brain_contract_forbids_inventing_facts():
    frame = orb_standalone_brain_service.frame("What is the England score?", mode="Ask ORB")
    assert frame.dual_brain_route == "live_lookup"
    assert any("Do not invent" in item for item in frame.response_contract)


def test_residential_brain_enriches_specialist_questions():
    frame = orb_standalone_brain_service.frame(
        "A young person has returned from missing smelling of cannabis, what should I do?",
        mode="Ask ORB",
    )
    assert frame.dual_brain_route == "residential_specialist"
    assert "residential_specialist_brain" in frame.active_brains


def test_general_brain_route_for_broad_questions():
    frame = orb_standalone_brain_service.frame("Write me a polite email.", mode="Ask ORB")
    assert frame.dual_brain_route == "general_knowledge"
    assert "general_knowledge_brain" in frame.active_brains


def test_unknown_intent_routes_to_general_not_blocked():
    frame = orb_standalone_brain_service.frame("Tell me something interesting about music theory", mode="Ask ORB")
    assert frame.dual_brain_route == "general_knowledge"
    classification = orb_knowledge_retrieval_service.classify_query(
        "Tell me something interesting about music theory"
    )
    assert classification["routing_hint"] == "general_assistant_brain"


def test_system_prompt_does_not_restrict_to_childrens_homes_only():
    routes = _read(STANDALONE_ROUTES)
    prompt = GENERAL_ORB_SYSTEM_PROMPT.lower()
    restrictive = [
        "only answer children's homes",
        "only respond using children's homes",
        "redirect all unrelated questions",
        "you are only a residential childcare assistant",
    ]
    for phrase in restrictive:
        assert phrase not in prompt
        assert phrase not in routes.lower()
    assert "general assistant" in prompt
    assert "not limited to care questions" in prompt
    assert "do not decline unrelated questions" in prompt


def test_voice_and_chat_share_ask_orb_brain_entrypoint():
    router = _read(BRAIN_ROUTER)
    companion = _read(CARE_COMPANION)
    assert "export async function askOrbBrain" in router
    assert "source: voiceOriginatedSend ? 'voice' : 'chat'" in companion
    assert "askOrbBrain" in companion


def test_voice_preserves_transcript_when_brain_response_fails():
    companion = _read(CARE_COMPANION)
    assert "preserve it if the brain request fails" in companion
    assert "voice.clearTranscript()" in companion
    # clearTranscript runs on success path inside finalizeAssistantFromResponse, not in catch block
    success_idx = companion.find("if (STANDALONE_ORB_VOICE_CAPTURE_ENABLED && voiceOriginatedSend)")
    catch_idx = companion.find("} catch (caught)")
    clear_on_success = companion.find("voice.clearTranscript()", success_idx)
    assert clear_on_success != -1
    assert clear_on_success < catch_idx or companion.find("voice.clearTranscript()", catch_idx) == -1


def test_routing_hint_defaults_to_general_assistant_brain():
    classification = orb_knowledge_retrieval_service.classify_query("Help me with Excel formulas")
    assert classification["routing_hint"] == "general_assistant_brain"
