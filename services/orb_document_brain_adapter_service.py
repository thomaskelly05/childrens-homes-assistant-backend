"""Document brain adapter — converges Dictate and Write on the canonical ORB orchestrator.

Dictate/Write use specialised document generation paths (/orb/dictate/*) but share:
- orb_brain_convergence_orchestrator_service.build_brain_decision (canonical routing)
- indicare_intelligence_core_service.build_intelligence_packet (pre-LLM)
- orb_brain_metadata_service.build_brain_metadata (contract)
- orb_residential_quality_service (post-generation quality)

Open-ended conversational questions still route through askOrbBrain → standalone conversation.
"""

from __future__ import annotations

from typing import Any, Literal

from services.indicare_intelligence_core_service import indicare_intelligence_core_service
from services.indicare_intelligence_route_finalize_service import intelligence_context_summary
from services.orb_residential_finalization_service import finalize_orb_residential_answer
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_brain_metadata_service import build_brain_metadata
from services.orb_brain_visibility_service import build_public_explainability
from services.orb_recording_contract_service import build_recording_contract_prompt_block

OrbDocumentFeature = Literal["dictate", "write", "dictate_analyze", "dictate_edit"]

_FEATURE_ROUTES: dict[str, str] = {
    "dictate": "/orb/dictate/generate",
    "dictate_analyze": "/orb/dictate/analyze",
    "dictate_edit": "/orb/dictate/edit",
    "write": "/orb/dictate/prepare-write",
}


def build_document_brain_context(
    text: str,
    *,
    mode: str = "Ask ORB",
    feature: OrbDocumentFeature = "dictate",
    note_type: str | None = None,
) -> dict[str, Any]:
    """Shared pre-LLM intelligence packet + canonical brain convergence for document surfaces."""
    resolved_mode = mode or note_type or "Ask ORB"
    route = _FEATURE_ROUTES.get(feature, "/orb/dictate/generate")
    brain_convergence = orb_brain_convergence_orchestrator_service.build_brain_decision(
        text,
        mode=resolved_mode,
        feature=feature,
        note_type=note_type,
        document_type=note_type,
        source_surface=feature,
        route=route,
    )
    intel_packet = indicare_intelligence_core_service.build_intelligence_packet(text, mode=resolved_mode)
    brain_metadata = build_brain_metadata(
        mode=resolved_mode,
        feature="dictate" if feature.startswith("dictate") else "write",
        lens=note_type,
        extra={
            "brain_convergence": orb_brain_convergence_orchestrator_service.convergence_metadata(
                brain_convergence,
                route=route,
            ),
            "depth_tier": brain_convergence.depth_tier,
            "contract_mode": brain_convergence.contract_mode,
        },
    )
    recording_contract_block = build_recording_contract_prompt_block(text, note_type=note_type)
    convergence_block = orb_brain_convergence_orchestrator_service.build_convergence_prompt_block(
        brain_convergence
    )
    return {
        "intelligence_packet": intel_packet,
        "intelligence_summary": intelligence_context_summary(intel_packet),
        "brain_metadata": brain_metadata,
        "brain_convergence": brain_convergence,
        "convergence_block": convergence_block,
        "recording_contract_block": recording_contract_block,
        "public_explainability": build_public_explainability(
            {
                "standalone_only_reasoning": True,
                "public_considerations": brain_convergence.public_considerations,
            },
            mode=resolved_mode,
        ),
        "adapter": "orb_document_brain_adapter",
        "conversational_brain": "askOrbBrain via /orb/standalone/conversation/stream",
        "document_brain": route,
        "orchestrator": orb_brain_convergence_orchestrator_service.VERSION,
    }


def finalize_document_intelligence(
    *,
    indicare_intelligence: dict[str, Any] | None,
    document_text: str,
    source_text: str | None = None,
    mode: str | None = None,
    note_type: str | None = None,
    record_learning: bool = False,
) -> tuple[str, dict[str, Any]]:
    """Shared post-generation intelligence finalisation for Dictate/Write surfaces."""
    packet = dict(indicare_intelligence or {})
    if not packet:
        return document_text, {}
    user_input = (source_text or document_text).strip()
    return finalize_orb_residential_answer(
        document_text,
        user_input=user_input,
        record_type=note_type,
        surface="orb_residential",
        streaming=False,
        mode=mode or note_type or "Ask ORB",
        indicare_intelligence=packet,
        record_learning=record_learning,
        apply_gate_fixes=True,
    )


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
    payload["explainability"] = ctx.get("public_explainability")
    if "context_used" not in payload:
        payload["context_used"] = {}
    payload["context_used"]["brain_adapter"] = ctx["adapter"]
    payload["context_used"]["intelligence_summary"] = ctx["intelligence_summary"]
    payload["context_used"]["brain_convergence"] = orb_brain_convergence_orchestrator_service.convergence_metadata(
        ctx["brain_convergence"],
        route=ctx["document_brain"],
    )
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
