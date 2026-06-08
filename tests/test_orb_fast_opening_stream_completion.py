"""ORB standalone stream must not end on fast-opening placeholder alone."""

from __future__ import annotations

import asyncio
import json
import re
from unittest.mock import patch

import pytest

from routers import orb_standalone_routes
from services.orb_brain_route_service import decide_orb_brain_route
from services.orb_fast_opening_service import (
    STREAM_INCOMPLETE_FALLBACK_MESSAGE,
    fast_opening_for_message,
    is_fast_opening_only_answer,
    is_fast_opening_placeholder,
    merge_stream_answer,
)
from services.orb_standalone_brain_service import orb_standalone_brain_service

INCIDENT_PROMPT = (
    "Jamie was kicking off today following family contact, help me to write the incident report"
)

STRUCTURED_INCIDENT_MARKERS = (
    "incident",
    "summary",
    "what happened",
    "presentation",
    "staff response",
    "outcome",
    "child voice",
    "safeguarding",
    "follow-up",
    "missing",
)


def _parse_sse_events(body: str) -> list[tuple[str, dict]]:
    events: list[tuple[str, dict]] = []
    for block in body.split("\n\n"):
        if not block.strip():
            continue
        event_name = None
        payload = None
        for line in block.splitlines():
            if line.startswith("event: "):
                event_name = line[len("event: ") :].strip()
            elif line.startswith("data: "):
                payload = json.loads(line[len("data: ") :])
        if event_name and payload is not None:
            events.append((event_name, payload))
    return events


@pytest.mark.asyncio
async def test_incident_prompt_routes_document_or_residential_not_live_lookup():
    decision = decide_orb_brain_route(INCIDENT_PROMPT, mode="Ask ORB", source_surface="chat")
    assert decision.route in {"document_workspace", "residential_specialist"}
    frame = orb_standalone_brain_service.frame(INCIDENT_PROMPT, mode="Ask ORB")
    assert frame.dual_brain_route == "residential_specialist"


def test_incident_prompt_gets_incident_fast_opening_for_residential_depth():
    opening = fast_opening_for_message(
        INCIDENT_PROMPT,
        expert_depth="residential_deep",
    )
    assert opening
    assert "incident report" in opening.lower()


def test_merge_stream_answer_keeps_fast_opening_and_model_body():
    opening = fast_opening_for_message(INCIDENT_PROMPT, expert_depth="residential_deep")
    model = "### Draft incident report\n\n**Summary**\nJamie was dysregulated after family contact."
    merged = merge_stream_answer(
        fast_opening=opening,
        model_answer=model,
        streamed_text=f"{opening}\n\n{model}",
    )
    assert merged.startswith(opening)
    assert "Draft incident report" in merged


def test_fast_opening_only_detection():
    opening = fast_opening_for_message(INCIDENT_PROMPT, expert_depth="residential_deep")
    assert opening
    assert is_fast_opening_placeholder(opening)
    assert is_fast_opening_only_answer(
        fast_opening=opening,
        final_answer=opening,
        model_token_count=0,
    )
    assert not is_fast_opening_only_answer(
        fast_opening=opening,
        final_answer=f"{opening}\n\nFull guidance with incident structure.",
        model_token_count=3,
    )


@pytest.mark.asyncio
async def test_stream_emits_full_answer_after_fast_opening(fake_state, monkeypatch):
    opening = fast_opening_for_message(INCIDENT_PROMPT, expert_depth="residential_deep")
    full_answer = (
        "### Immediate safety\nCheck everyone is safe.\n\n"
        "### Incident report draft\n"
        "**Summary:** Jamie was dysregulated after family contact.\n"
        "**What happened:** Staff observed heightened behaviour following contact.\n"
        "**Child's presentation:** Elevated arousal; details to confirm.\n"
        "**Adult response:** Calm co-regulation and safe space offered.\n"
        "**Outcome:** Settled with support; manager notified.\n"
        "**Child voice:** Ask Jamie what contact felt like.\n"
        "**Safeguarding / risk:** Review contact plan if pattern emerges.\n"
        "**Follow-up actions:** Complete factual record; debrief with manager.\n"
        "**Missing information:** Exact time, location, who was present, injuries, restraint use."
    )

    async def stub_stream(*_args, **kwargs):
        stream_meta = kwargs.get("stream_meta")
        if stream_meta is not None:
            stream_meta.update(
                {
                    "answer": full_answer,
                    "sources": [],
                    "citations": [],
                    "context_used": {"model_routing": {"provider": "mock", "model": "mock-text"}},
                }
            )
        for chunk in ("### Immediate", " safety\n", full_answer[len("### Immediate safety\n") :]):
            yield chunk

    monkeypatch.setattr(
        orb_standalone_routes.orb_converged_general_assistant_service,
        "stream_answer",
        stub_stream,
    )
    monkeypatch.setattr(orb_standalone_routes, "_use_converged_runtime", lambda: True)
    monkeypatch.setattr(
        orb_standalone_routes.indicare_intelligence_core_service,
        "estimate_expert_depth",
        lambda *_args, **_kwargs: "residential_deep",
    )

    response = await orb_standalone_routes.standalone_orb_conversation_stream(
        orb_standalone_routes.OrbStandaloneConversationRequest(message=INCIDENT_PROMPT),
        current_user=fake_state["user"],
    )

    chunks: list[str] = []
    async for chunk in response.body_iterator:
        chunks.append(chunk.decode() if isinstance(chunk, bytes) else str(chunk))
    body = "".join(chunks)
    events = _parse_sse_events(body)

    token_deltas = [payload["delta"] for name, payload in events if name == "token"]
    assert token_deltas
    assert opening in "".join(token_deltas)
    metadata_events = [payload for name, payload in events if name == "metadata"]
    assert metadata_events
    final_answer = metadata_events[-1]["answer"]
    assert is_fast_opening_placeholder(final_answer) is False
    assert len(final_answer) > len(opening or "") + 40
    lowered = final_answer.lower()
    assert sum(1 for marker in STRUCTURED_INCIDENT_MARKERS if marker in lowered) >= 4


@pytest.mark.asyncio
async def test_context_build_failure_returns_fallback_not_placeholder_only(fake_state, monkeypatch):
    opening = fast_opening_for_message(INCIDENT_PROMPT, expert_depth="residential_deep")

    def boom(*_args, **_kwargs):
        raise RuntimeError("routing regression")

    monkeypatch.setattr(orb_standalone_routes, "_build_standalone_request_context", boom)
    monkeypatch.setattr(
        orb_standalone_routes.indicare_intelligence_core_service,
        "estimate_expert_depth",
        lambda *_args, **_kwargs: "residential_deep",
    )

    response = await orb_standalone_routes.standalone_orb_conversation_stream(
        orb_standalone_routes.OrbStandaloneConversationRequest(message=INCIDENT_PROMPT),
        current_user=fake_state["user"],
    )
    body = "".join(
        [
            chunk.decode() if isinstance(chunk, bytes) else str(chunk)
            async for chunk in response.body_iterator
        ]
    )
    events = _parse_sse_events(body)
    assert any(name == "error" for name, _ in events)
    metadata = next(payload for name, payload in events if name == "metadata")
    assert STREAM_INCOMPLETE_FALLBACK_MESSAGE in metadata["answer"]
    assert metadata.get("error_detail")
    assert is_fast_opening_placeholder(metadata["answer"]) is False


@pytest.mark.asyncio
async def test_empty_model_stream_after_fast_opening_surfaces_fallback(fake_state, monkeypatch):
    opening = fast_opening_for_message(INCIDENT_PROMPT, expert_depth="residential_deep")

    async def empty_stream(*_args, **_kwargs):
        if False:
            yield ""

    monkeypatch.setattr(
        orb_standalone_routes.orb_converged_general_assistant_service,
        "stream_answer",
        empty_stream,
    )
    monkeypatch.setattr(orb_standalone_routes, "_use_converged_runtime", lambda: True)
    monkeypatch.setattr(
        orb_standalone_routes.indicare_intelligence_core_service,
        "estimate_expert_depth",
        lambda *_args, **_kwargs: "residential_deep",
    )

    response = await orb_standalone_routes.standalone_orb_conversation_stream(
        orb_standalone_routes.OrbStandaloneConversationRequest(message=INCIDENT_PROMPT),
        current_user=fake_state["user"],
    )
    body = "".join(
        [
            chunk.decode() if isinstance(chunk, bytes) else str(chunk)
            async for chunk in response.body_iterator
        ]
    )
    events = _parse_sse_events(body)
    metadata = next(payload for name, payload in events if name == "metadata")
    assert any(name == "error" for name, _ in events)
    assert STREAM_INCOMPLETE_FALLBACK_MESSAGE in metadata["answer"]
    assert opening in metadata["answer"] or opening in "".join(
        payload["delta"] for name, payload in events if name == "token"
    )
    assert is_fast_opening_placeholder(metadata["answer"]) is False


def test_frontend_does_not_treat_fast_opening_as_complete_answer():
    from pathlib import Path

    companion = (
        Path(__file__).resolve().parents[1]
        / "frontend-next"
        / "components"
        / "orb-standalone"
        / "orb-care-companion.tsx"
    ).read_text(encoding="utf-8")
    assistant = (
        Path(__file__).resolve().parents[1]
        / "frontend-next"
        / "components"
        / "orb-standalone"
        / "orb-assistant-message.tsx"
    ).read_text(encoding="utf-8")
    assert "resolveOrbStreamedAnswer" in companion
    assert "isOrbFastOpeningOnlyCompletion" in companion
    assert re.search(r"showExplainability.*!streaming", assistant)


def test_frontend_action_bar_still_requires_complete_status():
    from pathlib import Path

    companion = (
        Path(__file__).resolve().parents[1]
        / "frontend-next"
        / "components"
        / "orb-standalone"
        / "orb-care-companion.tsx"
    ).read_text(encoding="utf-8")
    assert "entry.status === 'complete' || entry.status === 'stopped'" in companion
