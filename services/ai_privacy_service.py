from __future__ import annotations

from typing import Any

from fastapi import Request

from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.ai_provider_policy import AIProviderPolicy, current_ai_provider_policy
from services.ai_redaction_service import ai_redaction_service
from services.audit_event_service import record_audit_event
from services.data_classification_service import AI_RESTRICTED_CLASSIFICATIONS, highest_classification


class AIPrivacyService:
    def __init__(self, policy: AIProviderPolicy | None = None) -> None:
        self.policy = policy or current_ai_provider_policy()

    def decide_external_processing(
        self,
        *,
        current_user: dict[str, Any],
        classifications: list[DataClassification] | None = None,
        requires_identifiable_data: bool = False,
    ) -> AIPrivacyDecision:
        classification = highest_classification(*(classifications or []))
        if not self.policy.external_processing_enabled:
            return self._decision(False, "external_ai_disabled", classification)
        if not self.policy.no_training_required:
            return self._decision(False, "provider_no_training_not_confirmed", classification)
        if classification in AI_RESTRICTED_CLASSIFICATIONS and requires_identifiable_data and not self.policy.allow_identifiable_data:
            return self._decision(False, "identifiable_ai_restricted_data_not_allowed", classification)
        if not self._has_ai_permission(current_user):
            return self._decision(False, "user_lacks_ai_permission", classification)
        return self._decision(True, "external_ai_allowed_with_minimisation", classification)

    def prepare_payload(
        self,
        *,
        prompt: str,
        records: list[dict[str, Any]] | None,
        current_user: dict[str, Any],
        classifications: list[DataClassification] | None = None,
        request: Request | None = None,
        requires_identifiable_data: bool = False,
    ) -> dict[str, Any]:
        decision = self.decide_external_processing(
            current_user=current_user,
            classifications=classifications,
            requires_identifiable_data=requires_identifiable_data,
        )
        if not decision.allowed:
            self.audit_external_ai(decision=decision, current_user=current_user, request=request, outcome="blocked")
            return {"ok": False, "decision": decision.model_dump(), "prompt": None, "records": []}

        prompt_result = ai_redaction_service.redact_text(prompt, mode=self.policy.redaction_mode)
        redacted_records, mapping = ai_redaction_service.redact_records((records or [])[:8], mode=self.policy.redaction_mode)
        self.audit_external_ai(decision=decision, current_user=current_user, request=request, outcome="allowed")
        return {
            "ok": True,
            "decision": decision.model_dump(),
            "prompt": prompt_result.text,
            "records": redacted_records,
            "citation_mapping": {**prompt_result.replacements, **mapping},
        }

    def audit_external_ai(
        self,
        *,
        decision: AIPrivacyDecision,
        current_user: dict[str, Any],
        request: Request | None = None,
        outcome: str,
    ) -> None:
        if not self.policy.audit_prompts:
            return
        record_audit_event(
            event_type="ai.external_provider_call",
            action="ai_external_processing",
            outcome=outcome,
            request=request,
            actor=current_user,
            resource_type="ai_provider",
            metadata={
                "reason": decision.reason,
                "mode": decision.mode,
                "redaction_mode": decision.redaction_mode,
                "classification": str(decision.classification.value if decision.classification else ""),
                "prompt_stored": False,
                "no_training_required": decision.no_training_required,
            },
        )

    def _decision(self, allowed: bool, reason: str, classification: DataClassification) -> AIPrivacyDecision:
        return AIPrivacyDecision(
            allowed=allowed,
            reason=reason,
            mode="external" if allowed else "local_safe_fallback",
            redaction_mode=self.policy.redaction_mode,
            no_training_required=self.policy.no_training_required,
            store_prompts=self.policy.store_prompts,
            store_transcripts=self.policy.store_transcripts,
            audit_prompts=self.policy.audit_prompts,
            classification=classification,
        )

    def _has_ai_permission(self, current_user: dict[str, Any]) -> bool:
        permissions = current_user.get("permissions") or []
        return "assistant:access" in permissions or "ai:use" in permissions


ai_privacy_service = AIPrivacyService()
