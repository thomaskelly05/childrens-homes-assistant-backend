"""Unified ORB brain gateway — single internal contract for generation across surfaces.

Dictate generate, edit/improve and Write brain context converge here.
Chat and Voice continue through their route handlers but share orchestrator metadata.
"""

from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from typing import Any, Literal

from schemas.ai_models import AiModelCapability, AiQualityTier
from schemas.data_protection import DataClassification
from schemas.orb_dictate import OrbDictateEditRequest, OrbDictateGenerateRequest, OrbDictatePrepareWriteRequest
from services.ai_external_call_governance import (
    FEATURE_DICTATE,
    FEATURE_DICTATE_EDIT,
    redact_plain_text,
    try_governed_draft_text,
)
from services.ai_provider_registry import ai_provider_registry
from services.orb_brain_convergence_orchestrator_service import orb_brain_convergence_orchestrator_service
from services.orb_document_brain_adapter_service import orb_document_brain_adapter_service
from services.orb_prompt_registry import PROMPT_REGISTRY_VERSION, orb_prompt_registry

logger = logging.getLogger(__name__)

OrbBrainSurface = Literal["chat", "dictate", "voice", "write"]
OrbBrainResponseFormat = Literal["text", "structured", "stream"]
GATEWAY_VERSION = "orb-unified-brain-gateway-v1"


@dataclass
class OrbUnifiedBrainRequest:
    surface: OrbBrainSurface
    mode: str
    user_text: str
    child_context: dict[str, Any] | None = None
    home_context: dict[str, Any] | None = None
    recording_context: dict[str, Any] | None = None
    session_id: str | None = None
    user_id: int | None = None
    role: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)
    response_format: OrbBrainResponseFormat = "text"
    note_type: str | None = None


@dataclass
class OrbUnifiedBrainResponse:
    text: str | None = None
    structured: dict[str, Any] | None = None
    brain_decision: dict[str, Any] = field(default_factory=dict)
    model_used: str | None = None
    knowledge_used: list[str] = field(default_factory=list)
    safety_flags: list[str] = field(default_factory=list)
    redactions_applied: bool = False
    prompt_version: str = PROMPT_REGISTRY_VERSION
    surface: str = "dictate"
    mode: str = ""
    metadata: dict[str, Any] = field(default_factory=dict)
    brain_metadata: dict[str, Any] = field(default_factory=dict)
    blocked: bool = False


def resolve_dictate_model(*, depth_tier: str, note_type: str) -> tuple[str, dict[str, Any]]:
    """Resolve Dictate model via central registry; env override is temporary fallback."""
    env_override = (os.environ.get("ORB_DICTATE_MODEL") or "").strip()
    if env_override:
        return env_override, {
            "source": "env_override",
            "ORB_DICTATE_MODEL": env_override,
            "temporary": True,
            "depth_tier": depth_tier,
            "note_type": note_type,
        }

    if depth_tier in {"enhanced", "mandatory"} or note_type in {
        "investigation_meeting",
        "incident_record",
        "strategy_multi_agency_prep",
    }:
        quality = AiQualityTier.HIGH
    elif depth_tier == "light":
        quality = AiQualityTier.FAST
    else:
        quality = AiQualityTier.BALANCED

    _provider, model = ai_provider_registry.choose_default_model_for_capability(
        AiModelCapability.TEXT,
        quality_tier=quality,
    )
    return model, {
        "source": "ai_provider_registry",
        "quality_tier": quality.value,
        "depth_tier": depth_tier,
        "note_type": note_type,
        "temporary": False,
    }


def _brain_metadata_from_context(
    ctx: dict[str, Any],
    *,
    note_type: str,
    mode: str | None,
    model_policy: dict[str, Any],
    prompt_version: str,
) -> dict[str, Any]:
    meta = dict(ctx["brain_metadata"])
    meta["feature"] = "dictate"
    meta["output_type"] = note_type
    meta["indicare_intelligence_core"] = ctx["intelligence_summary"]
    meta["brain_adapter"] = "orb_document_brain_adapter"
    meta["unified_brain_gateway"] = GATEWAY_VERSION
    meta["brain_decision_used_for_generation"] = True
    meta["prompt_version"] = prompt_version
    meta["model_policy"] = model_policy
    if mode:
        meta["mode"] = mode
    return meta


class OrbUnifiedBrainGateway:
    """Future single entry point for ORB Residential generation."""

    def build_write_brain_context(
        self,
        request: OrbDictatePrepareWriteRequest,
        *,
        source_text: str,
    ) -> dict[str, Any]:
        """Write prepare — orchestrator metadata without LLM generation."""
        note_type = request.note_type
        ctx = orb_document_brain_adapter_service.build_document_brain_context(
            source_text or "write preparation",
            mode=note_type,
            feature="write",
            note_type=note_type,
        )
        brain_convergence = ctx["brain_convergence"]
        brain_decision = orb_brain_convergence_orchestrator_service.convergence_metadata(
            brain_convergence,
            route="/orb/dictate/prepare-write",
        )
        meta = dict(ctx["brain_metadata"])
        meta.update(
            {
                "feature": "write",
                "output_type": note_type,
                "indicare_intelligence_core": ctx["intelligence_summary"],
                "brain_adapter": ctx["adapter"],
                "unified_brain_gateway": GATEWAY_VERSION,
                "brain_decision_used_for_generation": True,
                "brain_convergence": brain_decision,
                "public_source_chips": brain_decision.get("public_source_chips") or [],
            }
        )
        return {
            "brain_metadata": meta,
            "brain_decision": brain_decision,
            "document_context": ctx,
        }

    def edit_dictate_draft(
        self,
        *,
        system_prompt: str,
        user_prompt: str,
        note_type: str,
        mode: str,
        document_text: str,
        provider_id: int | None = None,
        home_id: int | None = None,
        user_id: int | None = None,
        privacy_mode: str = "internal_working",
    ) -> tuple[str | None, dict[str, Any]]:
        """Dictate edit/improve — brain decision first, then governed draft generation."""
        ctx = orb_document_brain_adapter_service.build_document_brain_context(
            document_text,
            mode=note_type,
            feature="dictate_edit",
            note_type=note_type,
        )
        brain_convergence = ctx["brain_convergence"]
        brain_decision = orb_brain_convergence_orchestrator_service.convergence_metadata(
            brain_convergence,
            route="/orb/dictate/edit",
        )
        model, model_policy = resolve_dictate_model(
            depth_tier=brain_convergence.depth_tier,
            note_type=note_type,
        )
        if privacy_mode == "internal_working":
            redacted_user = user_prompt
        else:
            redacted_user, _ = redact_plain_text(user_prompt, mode="strict")

        gateway_response = try_governed_draft_text(
            feature=FEATURE_DICTATE_EDIT,
            system_prompt=system_prompt,
            prompt=redacted_user,
            model=model,
            provider_id=provider_id,
            home_id=home_id,
            user_id=user_id,
            data_classification=DataClassification.CONFIDENTIAL_CHILD,
            metadata={
                "route": "orb_unified_brain_gateway.edit_dictate_draft",
                "note_type": note_type,
                "surface": "dictate",
                "mode": mode,
                "brain_convergence": brain_decision,
                "model_policy": model_policy,
                "unified_brain_gateway": GATEWAY_VERSION,
            },
        )
        meta = {
            "brain_decision": brain_decision,
            "model_policy": model_policy,
            "gateway_version": GATEWAY_VERSION,
            "brain_metadata": _brain_metadata_from_context(
                ctx,
                note_type=note_type,
                mode=mode,
                model_policy=model_policy,
                prompt_version=PROMPT_REGISTRY_VERSION,
            ),
        }
        if gateway_response is None:
            meta["blocked"] = True
            return None, meta
        meta["blocked"] = False
        meta["model_used"] = gateway_response.model
        meta["governance"] = gateway_response.governance
        return gateway_response.text, meta

    def generate_dictate_draft(
        self,
        request: OrbDictateGenerateRequest,
        *,
        note_type: str,
        transcript_text: str,
        provider_id: int | None = None,
        home_id: int | None = None,
        user_id: int | None = None,
    ) -> OrbUnifiedBrainResponse:
        """Dictate generate — brain decision first, then governed draft generation."""
        resolved_mode = request.mode or note_type
        ctx = orb_document_brain_adapter_service.build_document_brain_context(
            transcript_text or "dictate recording",
            mode=resolved_mode,
            feature="dictate",
            note_type=note_type,
        )
        brain_convergence = ctx["brain_convergence"]
        brain_decision = orb_brain_convergence_orchestrator_service.convergence_metadata(
            brain_convergence,
            route="/orb/dictate/generate",
        )

        prompt_bundle = orb_prompt_registry.build_dictate_generate_prompt(request, note_type)
        model, model_policy = resolve_dictate_model(
            depth_tier=brain_convergence.depth_tier,
            note_type=note_type,
        )

        redacted_user, _redaction_meta = redact_plain_text(prompt_bundle.user, mode="strict")
        gateway_response = try_governed_draft_text(
            feature=FEATURE_DICTATE,
            system_prompt=prompt_bundle.system,
            prompt=redacted_user,
            model=model,
            provider_id=provider_id,
            home_id=home_id,
            user_id=user_id,
            data_classification=DataClassification.CONFIDENTIAL_CHILD,
            metadata={
                "route": "orb_unified_brain_gateway.generate_dictate_draft",
                "note_type": note_type,
                "surface": "dictate",
                "mode": resolved_mode,
                "brain_convergence": brain_decision,
                "model_policy": model_policy,
                "prompt_version": prompt_bundle.prompt_version,
                "unified_brain_gateway": GATEWAY_VERSION,
            },
        )

        knowledge_used = list(brain_convergence.knowledge_vaults or [])
        safety_flags: list[str] = []
        if brain_convergence.mandatory_contracts:
            safety_flags.append("mandatory_contracts_active")
        risk = brain_decision.get("risk_level")
        if risk and str(risk).lower() not in {"low", "none", ""}:
            safety_flags.append(f"risk_level:{risk}")

        brain_metadata = _brain_metadata_from_context(
            ctx,
            note_type=note_type,
            mode=request.mode,
            model_policy=model_policy,
            prompt_version=prompt_bundle.prompt_version,
        )

        if gateway_response is None:
            return OrbUnifiedBrainResponse(
                text=None,
                brain_decision=brain_decision,
                model_used=model,
                knowledge_used=knowledge_used,
                safety_flags=safety_flags,
                prompt_version=prompt_bundle.prompt_version,
                surface="dictate",
                mode=resolved_mode,
                metadata={
                    "blocked": True,
                    "model_policy": model_policy,
                    "gateway_version": GATEWAY_VERSION,
                },
                brain_metadata=brain_metadata,
                blocked=True,
            )

        brain_metadata["model_used"] = gateway_response.model
        return OrbUnifiedBrainResponse(
            text=gateway_response.text,
            brain_decision=brain_decision,
            model_used=gateway_response.model,
            knowledge_used=knowledge_used,
            safety_flags=safety_flags,
            redactions_applied=bool(gateway_response.redaction_applied),
            prompt_version=prompt_bundle.prompt_version,
            surface="dictate",
            mode=resolved_mode,
            metadata={
                "blocked": False,
                "model_policy": model_policy,
                "gateway_version": GATEWAY_VERSION,
                "governance": gateway_response.governance,
                "external_ai_used": gateway_response.external_ai_used,
            },
            brain_metadata=brain_metadata,
            blocked=False,
        )


orb_unified_brain_gateway = OrbUnifiedBrainGateway()
