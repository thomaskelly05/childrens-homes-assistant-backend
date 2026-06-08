"""Document brain adapter — converges Dictate and Write on shared intelligence metadata.

Dictate/Write use specialised document generation paths (/orb/dictate/*) but share:
- indicare_intelligence_core_service.build_intelligence_packet (pre-LLM)
- orb_brain_metadata_service.build_brain_metadata (contract)
- orb_residential_quality_service (post-generation quality)

Open-ended conversational questions still route through askOrbBrain → standalone conversation.
"""

from __future__ import annotations

from typing import Any, Literal

from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.indicare_intelligence_route_finalize_service import (
    finalize_standalone_intelligence,
    intelligence_context_summary,
)
from services.orb_brain_metadata_service import build_brain_metadata

OrbDocumentFeature = Literal["dictate", "write", "dictate_analyze", "dictate_edit"]


def build_document_brain_context(
    text: str,
    *,
    mode: str = "Ask ORB",
    feature: OrbDocumentFeature = "dictate",
    note_type: str | None = None,
) -> dict[str, Any]:
    """Shared pre-LLM intelligence packet + brain metadata for document surfaces."""
    intel_packet = indicare_intelligence_core_service.build_intelligence_packet(text, mode=mode or note_type or "Ask ORB")
    brain_metadata = build_brain_metadata(
        mode=mode,
        feature="dictate" if feature.startswith("dictate") else "write",
        lens=note_type,
    )
    return {
        "intelligence_packet": intel_packet,
        "intelligence_summary": intelligence_context_summary(intel_packet),
        "brain_metadata": brain_metadata,
        "adapter": "orb_document_brain_adapter",
        "conversational_brain": "askOrbBrain via /orb/standalone/conversation/stream",
        "document_brain": "/orb/dictate/*",
    }


def finalize_document_intelligence(
    *,
    indicare_intelligence: dict[str, Any] | None,
    document_text: str,
    mode: str | None = None,
    note_type: str | None = None,
    record_learning: bool = False,
) -> tuple[str, dict[str, Any]]:
    """Shared post-generation intelligence finalisation for Dictate/Write surfaces."""
    packet = dict(indicare_intelligence or {})
    if not packet:
        return document_text, {}
    answer, meta = finalize_standalone_intelligence(
        indicare_intelligence=packet,
        answer=document_text,
        prompt_text=document_text,
        message=document_text,
        mode=mode or note_type or "Ask ORB",
        record_learning=record_learning,
        apply_gate_fixes=True,
    )
    return answer, meta


def attach_document_brain_metadata(
    payload: dict[str, Any],
    text: str,
    *,
    mode: str = "Ask ORB",
    feature: OrbDocumentFeature = "dictate",
    note_type: str | None = None,
) -> dict[str, Any]:
    """Merge document brain context into an existing response payload."""
    ctx = build_document_brain_context(text, mode=mode, feature=feature, note_type=note_type)
    payload = dict(payload)
    payload["brain_metadata"] = ctx["brain_metadata"]
    if "context_used" not in payload:
        payload["context_used"] = {}
    payload["context_used"]["brain_adapter"] = ctx["adapter"]
    payload["context_used"]["intelligence_summary"] = ctx["intelligence_summary"]
    return payload


orb_document_brain_adapter_service = type(
    "OrbDocumentBrainAdapterService",
    (),
    {
        "build_document_brain_context": staticmethod(build_document_brain_context),
        "attach_document_brain_metadata": staticmethod(attach_document_brain_metadata),
        "finalize_document_intelligence": staticmethod(finalize_document_intelligence),
    },
)()
