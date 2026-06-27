"""Central privacy decision for proposed external AI calls.

Uses existing data protection / intelligence schemas and provider settings.
All outbound model paths should consult this service before calling a provider.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

from schemas.data_protection import AIPrivacyDecision, DataClassification
from schemas.data_intelligence import ProviderDataIntelligenceSettings
from services.ai_usage_audit_service import ai_usage_audit_service
from services.provider_data_intelligence_settings_service import (
    provider_data_intelligence_settings_service,
)

logger = logging.getLogger("indicare.ai_privacy_decision")

RESTRICTED_FEATURE_PREFIXES = (
    "safeguarding_decision",
    "lado_decision",
    "police_decision",
    "medical_diagnosis",
    "legal_decision",
)

STRICT_CLASSIFICATIONS = frozenset(
    {
        DataClassification.CONFIDENTIAL_CHILD,
        DataClassification.SAFEGUARDING_SENSITIVE,
        DataClassification.HEALTH_SENSITIVE,
        DataClassification.LEGAL_REGULATORY,
        DataClassification.HIGHLY_SENSITIVE,
    }
)

SAFEGUARDING_STRICT_CLASSIFICATIONS = frozenset(
    {
        DataClassification.SAFEGUARDING_SENSITIVE,
        DataClassification.HIGHLY_SENSITIVE,
    }
)


@dataclass
class AIPrivacyDecisionRequest:
    provider_id: int | None = None
    home_id: int | None = None
    user_id: int | None = None
    feature: str = "orb_text_fallback"
    data_classification: DataClassification | None = None
    redaction_mode: str | None = None
    external_ai_enabled: bool | None = None
    prompt_storage: bool | None = None
    transcript_storage: bool | None = None
    allowed_ai_features: list[str] | None = None
    no_training_required: bool = True
    local_fallback_available: bool = False
    explicit_restricted_class_override: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


class AIPrivacyDecisionService:
    def resolve_settings(
        self,
        request: AIPrivacyDecisionRequest,
    ) -> ProviderDataIntelligenceSettings:
        settings = provider_data_intelligence_settings_service.get_effective_settings(
            provider_id=request.provider_id,
            home_id=request.home_id,
        )
        if request.external_ai_enabled is not None:
            settings = settings.model_copy(update={"external_ai_enabled": request.external_ai_enabled})
        if request.allowed_ai_features is not None:
            settings = settings.model_copy(update={"allowed_ai_features": request.allowed_ai_features})
        if request.prompt_storage is not None:
            settings = settings.model_copy(update={"prompt_storage": request.prompt_storage})
        if request.transcript_storage is not None:
            settings = settings.model_copy(update={"transcript_storage": request.transcript_storage})
        if request.redaction_mode is not None:
            settings = settings.model_copy(update={"redaction_mode": request.redaction_mode})
        return settings

    def decide(self, request: AIPrivacyDecisionRequest) -> AIPrivacyDecision:
        settings = self.resolve_settings(request)
        feature = (request.feature or "").strip().lower()
        classification = request.data_classification or DataClassification.INTERNAL_OPERATIONAL

        if any(feature.startswith(prefix) for prefix in RESTRICTED_FEATURE_PREFIXES):
            decision = self._blocked(
                "restricted_decision_feature",
                classification,
                settings,
                request,
            )
            self._audit_decision(request, decision, settings, blocked=True)
            return decision

        if not settings.external_ai_enabled:
            if request.local_fallback_available:
                decision = self._local_only(classification, settings, request)
            else:
                decision = self._blocked("external_ai_disabled", classification, settings, request)
            self._audit_decision(request, decision, settings, blocked=not decision.allowed)
            return decision

        if classification in {DataClassification.AI_RESTRICTED, DataClassification.EXPORT_RESTRICTED}:
            if not request.explicit_restricted_class_override:
                decision = self._blocked(
                    "classification_blocks_external_ai",
                    classification,
                    settings,
                    request,
                )
                self._audit_decision(request, decision, settings, blocked=True)
                return decision

        if feature not in {f.lower() for f in settings.allowed_ai_features}:
            legacy = {
                "risk_drafting",
                "report_drafting",
                "document_generation",
                "document_ai_review",
                "ai_notes",
                "dictate",
                "dictate_edit",
                "voice_transcription",
                "voice_respond",
                "knowledge_embedding",
                "orb_text_fallback",
                "metadata",
                "orb_chat_stream",
                "orb_model_router_chat",
                "orb_model_router_operational",
                "orb_model_router_agent",
                "orb_model_router_document",
                "orb_model_router_action",
                "orb_model_router_guardrail",
            }
            if feature not in legacy:
                decision = self._blocked("feature_not_allowlisted", classification, settings, request)
                self._audit_decision(request, decision, settings, blocked=True)
                return decision

        if not request.no_training_required:
            decision = self._blocked("no_training_not_confirmed", classification, settings, request)
            self._audit_decision(request, decision, settings, blocked=True)
            return decision

        redaction_mode = self._resolve_redaction_mode(classification, settings, request)
        decision = AIPrivacyDecision(
            allowed=True,
            reason="external_ai_allowed_with_governance",
            mode="external_redacted",
            redaction_mode=redaction_mode,
            no_training_required=request.no_training_required,
            store_prompts=bool(settings.prompt_storage),
            store_transcripts=bool(settings.transcript_storage),
            audit_prompts=True,
            classification=classification,
        )
        self._audit_decision(request, decision, settings, blocked=False)
        return decision

    def _resolve_redaction_mode(
        self,
        classification: DataClassification,
        settings: ProviderDataIntelligenceSettings,
        request: AIPrivacyDecisionRequest,
    ) -> str:
        if request.redaction_mode:
            mode = request.redaction_mode.strip().lower()
            if mode in {"strict", "safeguarding_strict", "standard", "balanced", "off"}:
                return mode
        if classification in SAFEGUARDING_STRICT_CLASSIFICATIONS:
            return "safeguarding_strict"
        if classification in STRICT_CLASSIFICATIONS:
            return "strict"
        base = (settings.redaction_mode or "strict").strip().lower()
        return base if base in {"strict", "safeguarding_strict", "standard", "balanced", "off"} else "strict"

    def _blocked(
        self,
        reason: str,
        classification: DataClassification,
        settings: ProviderDataIntelligenceSettings,
        request: AIPrivacyDecisionRequest,
    ) -> AIPrivacyDecision:
        return AIPrivacyDecision(
            allowed=False,
            reason=reason,
            mode="local_safe_fallback",
            redaction_mode=self._resolve_redaction_mode(classification, settings, request),
            no_training_required=request.no_training_required,
            store_prompts=False,
            store_transcripts=False,
            audit_prompts=True,
            classification=classification,
        )

    def _local_only(
        self,
        classification: DataClassification,
        settings: ProviderDataIntelligenceSettings,
        request: AIPrivacyDecisionRequest,
    ) -> AIPrivacyDecision:
        return AIPrivacyDecision(
            allowed=False,
            reason="external_ai_disabled_local_fallback",
            mode="local_safe_fallback",
            redaction_mode=self._resolve_redaction_mode(classification, settings, request),
            no_training_required=request.no_training_required,
            store_prompts=False,
            store_transcripts=False,
            audit_prompts=True,
            classification=classification,
        )

    def _audit_decision(
        self,
        request: AIPrivacyDecisionRequest,
        decision: AIPrivacyDecision,
        settings: ProviderDataIntelligenceSettings,
        *,
        blocked: bool,
    ) -> None:
        payload = {
            "provider_id": request.provider_id,
            "home_id": request.home_id,
            "user_id": request.user_id,
            "feature": request.feature,
            "model": request.metadata.get("model"),
            "redaction_mode": decision.redaction_mode,
            "redaction_applied": decision.allowed and decision.redaction_mode != "off",
            "estimated_input_tokens": 0,
            "estimated_output_tokens": 0,
            "estimated_cost_gbp": 0.0,
            "prompt_stored": decision.store_prompts,
            "transcript_stored": decision.store_transcripts,
            "metadata": {
                "decision": decision.model_dump(),
                "blocked": blocked,
                "external_ai_enabled": settings.external_ai_enabled,
                "no_training_required": decision.no_training_required,
                **(request.metadata or {}),
            },
        }
        logger.info(
            "ai_privacy_decision %s",
            json.dumps(
                {
                    "feature": request.feature,
                    "allowed": decision.allowed,
                    "reason": decision.reason,
                    "classification": str(decision.classification),
                    "blocked": blocked,
                },
                default=str,
            ),
        )
        if decision.audit_prompts:
            try:
                ai_usage_audit_service.record(payload)
            except Exception:
                logger.warning("Failed to persist AI privacy decision audit", exc_info=True)

    def assert_allowed_or_raise(self, request: AIPrivacyDecisionRequest) -> AIPrivacyDecision:
        decision = self.decide(request)
        if not decision.allowed:
            raise RuntimeError(decision.reason)
        return decision


ai_privacy_decision_service = AIPrivacyDecisionService()
