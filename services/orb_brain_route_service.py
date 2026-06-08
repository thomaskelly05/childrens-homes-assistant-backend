"""Canonical ORB brain route decision — server-authoritative.

Frontend ``routeOrbBrainIntent`` is display metadata only. This module decides
model behaviour for Chat, Voice, Dictate, Write and template surfaces.
"""

from __future__ import annotations

import re
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

from services.orb_knowledge_retrieval_service import (
    LIVE_LOOKUP_INTENT_TERMS,
    orb_knowledge_retrieval_service,
)
from services.orb_standalone_brain_service import orb_standalone_brain_service

OrbBrainRoute = Literal["general_assistant", "residential_specialist", "live_lookup", "document_workspace"]
OrbBrainSourceSurface = Literal["voice", "chat", "dictate", "write", "template", "saved_output"]

_ROUTING_BLOCK_RE = re.compile(
    r"^\[ORB brain routing\]\s*\n(?:.*\n)*?\n",
    re.IGNORECASE,
)

DOCUMENT_SURFACE_SOURCES = frozenset({"dictate", "write", "template"})
DOCUMENT_WORKSPACE_TERMS = (
    "dictate",
    "voice note",
    "record this",
    "daily note",
    "daily record",
    "incident record",
    "incident report",
    "handover note",
    "draft a letter",
    "draft document",
    "orb write",
    "write a report",
)


@dataclass(frozen=True)
class OrbBrainRouteDecision:
    route: OrbBrainRoute
    dual_brain_route: str
    routing_hint: str
    reason: str
    tool_extension: str | None = None
    classification: dict[str, Any] = field(default_factory=dict)
    client_hint_ignored: bool = False
    authoritative: bool = True

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


def extract_user_message(message: str) -> str:
    """Strip legacy frontend ``[ORB brain routing]`` advisory blocks."""
    text = (message or "").strip()
    if not text.lower().startswith("[orb brain routing]"):
        return text
    stripped = _ROUTING_BLOCK_RE.sub("", text, count=1).strip()
    return stripped or text


def _resolve_tool_extension(text: str) -> str | None:
    lower = text.lower()
    if "weather" in lower or "forecast" in lower:
        return "weather"
    if any(term in lower for term in ("score", "sport", "fixture")):
        return "sports"
    if any(
        term in lower
        for term in ("nearby", "near me", "cinema", "what is on", "what's on", "whitley bay", "newcastle")
    ):
        return "local"
    if any(term in lower for term in LIVE_LOOKUP_INTENT_TERMS):
        return "web_search"
    return None


def _normalise_client_route_hint(hint: str | None) -> str | None:
    if not hint:
        return None
    return hint.strip().lower().replace("-", "_")


def _map_dual_to_route(
    dual: str,
    *,
    source_surface: str | None,
    text: str,
    classification: dict[str, Any],
) -> OrbBrainRoute:
    if source_surface in DOCUMENT_SURFACE_SOURCES:
        return "document_workspace"
    if classification.get("recording_intent"):
        return "document_workspace"
    if any(term in text for term in DOCUMENT_WORKSPACE_TERMS):
        return "document_workspace"
    if dual == "live_lookup" or classification.get("live_lookup_intent"):
        return "live_lookup"
    if dual == "residential_specialist":
        return "residential_specialist"
    return "general_assistant"


def decide_orb_brain_route(
    message: str,
    *,
    mode: str = "Ask ORB",
    source_surface: OrbBrainSourceSurface | str | None = None,
    client_route_hint: str | None = None,
    location_hint: str | None = None,
    requested_action: str | None = None,
    note_type: str | None = None,
    profile_context: bool = False,
) -> OrbBrainRouteDecision:
    """Single canonical ORB brain route decision."""
    user_message = extract_user_message(message)
    normalised_mode = orb_standalone_brain_service.normalise_mode(mode or "Ask ORB")
    classification = orb_knowledge_retrieval_service.classify_query(
        user_message,
        mode=normalised_mode,
        profile_context=profile_context,
    )
    frame = orb_standalone_brain_service.frame(user_message, mode=normalised_mode)
    text_lower = user_message.lower()

    route = _map_dual_to_route(
        frame.dual_brain_route,
        source_surface=source_surface,
        text=text_lower,
        classification=classification,
    )

    tool_extension: str | None = None
    if route == "live_lookup":
        tool_extension = _resolve_tool_extension(text_lower)
        if location_hint and not tool_extension:
            tool_extension = "local"

    if route == "document_workspace":
        reason = (
            "Structured recording or document workflow — Dictate, ORB Write or template pathway."
        )
    elif route == "live_lookup":
        reason = frame.intent_summary or "Live or location-specific lookup — do not invent current facts."
    elif route == "residential_specialist":
        reason = frame.intent_summary or "Residential children's homes specialist enrichment."
    else:
        reason = frame.intent_summary or "General assistant — no forced residential lens."

    if requested_action:
        reason = f"{reason} Requested action: {requested_action}."
    if note_type:
        reason = f"{reason} Record type: {note_type}."

    normalised_hint = _normalise_client_route_hint(client_route_hint)
    client_hint_ignored = bool(normalised_hint and normalised_hint != route)

    return OrbBrainRouteDecision(
        route=route,
        dual_brain_route=frame.dual_brain_route,
        routing_hint=str(classification.get("routing_hint", "general_assistant_brain")),
        reason=reason,
        tool_extension=tool_extension,
        classification=dict(classification),
        client_hint_ignored=client_hint_ignored,
    )


class OrbBrainRouteService:
    extract_user_message = staticmethod(extract_user_message)
    decide_orb_brain_route = staticmethod(decide_orb_brain_route)


orb_brain_route_service = OrbBrainRouteService()
