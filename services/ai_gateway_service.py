from __future__ import annotations

import json
import logging
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from openai import OpenAI

from schemas.data_protection import DataClassification
from services.ai_external_call_governance import record_model_usage
from services.ai_privacy_decision_service import AIPrivacyDecisionRequest, ai_privacy_decision_service
from services.ai_redaction_service import ai_redaction_service
from services.provider_data_intelligence_settings_service import provider_data_intelligence_settings_service

logger = logging.getLogger("indicare.ai_gateway")

APPROX_CHARS_PER_TOKEN = 4
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
DEFAULT_MAX_OUTPUT_TOKENS = int(os.getenv("AI_GATEWAY_MAX_OUTPUT_TOKENS", "1200"))
DEFAULT_DAILY_SOFT_LIMIT_GBP = float(os.getenv("AI_DAILY_SOFT_LIMIT_GBP", "5.00"))
DEFAULT_FEATURE_SOFT_LIMIT_TOKENS = int(os.getenv("AI_FEATURE_SOFT_LIMIT_TOKENS", "12000"))

# Conservative configurable defaults. These are estimates for governance and
# warnings only; provider invoices remain the source of truth.
MODEL_COSTS_PER_1K_TOKENS: dict[str, dict[str, float]] = {
    "gpt-4o-mini": {"input": 0.00012, "output": 0.00048},
    "gpt-4o": {"input": 0.004, "output": 0.012},
}

@dataclass
class AIGatewayRequest:
    feature: str
    prompt: str
    system_prompt: str | None = None
    model: str = DEFAULT_MODEL
    provider_id: int | None = None
    home_id: int | None = None
    user_id: int | None = None
    redaction_mode: str | None = None
    external_ai_required: bool = True
    max_output_tokens: int = DEFAULT_MAX_OUTPUT_TOKENS
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class AIGatewayResponse:
    ok: bool
    text: str
    model: str
    feature: str
    external_ai_used: bool
    redaction_applied: bool
    estimated_input_tokens: int
    estimated_output_tokens: int
    estimated_cost_gbp: float
    governance: dict[str, Any]
    metadata: dict[str, Any] = field(default_factory=dict)

    def model_dump(self) -> dict[str, Any]:
        return {
            "ok": self.ok,
            "text": self.text,
            "model": self.model,
            "feature": self.feature,
            "external_ai_used": self.external_ai_used,
            "redaction_applied": self.redaction_applied,
            "estimated_input_tokens": self.estimated_input_tokens,
            "estimated_output_tokens": self.estimated_output_tokens,
            "estimated_cost_gbp": self.estimated_cost_gbp,
            "governance": self.governance,
            "metadata": self.metadata,
        }


class AIGatewayService:
    """Single outbound AI gateway for data protection, cost control and audit.

    All new AI features should call this service instead of constructing an
    OpenAI client directly. The core IndiCare logic should remain deterministic
    wherever possible; this gateway is for optional drafting and summarisation.
    """

    def __init__(self) -> None:
        self._client: OpenAI | None = None

    def governance_status(self, *, provider_id: int | None = None, home_id: int | None = None) -> dict[str, Any]:
        settings = provider_data_intelligence_settings_service.defaults(provider_id=provider_id, home_id=home_id)
        return {
            "external_ai_enabled": settings.external_ai_enabled,
            "redaction_mode": settings.redaction_mode,
            "allowed_ai_features": settings.allowed_ai_features,
            "report_ai_drafting_enabled": settings.report_ai_drafting_enabled,
            "prompt_storage": settings.prompt_storage,
            "transcript_storage": settings.transcript_storage,
            "model_default": DEFAULT_MODEL,
            "max_output_tokens_default": DEFAULT_MAX_OUTPUT_TOKENS,
            "daily_soft_limit_gbp": DEFAULT_DAILY_SOFT_LIMIT_GBP,
            "feature_soft_limit_tokens": DEFAULT_FEATURE_SOFT_LIMIT_TOKENS,
            "deterministic_core_required": True,
            "draft_only_outputs": True,
            "human_signoff_required": True,
        }

    def estimate_tokens(self, text: str | None) -> int:
        return max(1, int(len(str(text or "")) / APPROX_CHARS_PER_TOKEN))

    def estimate_cost(self, *, model: str, input_tokens: int, output_tokens: int) -> float:
        costs = MODEL_COSTS_PER_1K_TOKENS.get(model, MODEL_COSTS_PER_1K_TOKENS.get(DEFAULT_MODEL, {"input": 0.0, "output": 0.0}))
        return round((input_tokens / 1000 * costs["input"]) + (output_tokens / 1000 * costs["output"]), 6)

    def estimate_request(self, *, prompt: str, system_prompt: str | None = None, model: str = DEFAULT_MODEL, max_output_tokens: int = DEFAULT_MAX_OUTPUT_TOKENS) -> dict[str, Any]:
        input_tokens = self.estimate_tokens(f"{system_prompt or ''}\n{prompt or ''}")
        estimated_cost = self.estimate_cost(model=model, input_tokens=input_tokens, output_tokens=max_output_tokens)
        return {
            "model": model,
            "estimated_input_tokens": input_tokens,
            "estimated_output_tokens": max_output_tokens,
            "estimated_total_tokens": input_tokens + max_output_tokens,
            "estimated_cost_gbp": estimated_cost,
            "within_feature_soft_limit": input_tokens + max_output_tokens <= DEFAULT_FEATURE_SOFT_LIMIT_TOKENS,
        }

    def _client_or_error(self) -> OpenAI:
        if not os.getenv("OPENAI_API_KEY"):
            raise HTTPException(status_code=503, detail="External AI is not configured")
        if self._client is None:
            self._client = OpenAI()
        return self._client

    def _govern_request(self, request: AIGatewayRequest) -> tuple[dict[str, Any], Any]:
        classification = None
        raw_class = (request.metadata or {}).get("data_classification")
        if raw_class:
            try:
                classification = DataClassification(str(raw_class))
            except ValueError:
                classification = None

        decision = ai_privacy_decision_service.decide(
            AIPrivacyDecisionRequest(
                provider_id=request.provider_id,
                home_id=request.home_id,
                user_id=request.user_id,
                feature=request.feature,
                data_classification=classification,
                redaction_mode=request.redaction_mode,
                metadata={"model": request.model, "route": "ai_gateway"},
            )
        )
        settings = provider_data_intelligence_settings_service.defaults(
            provider_id=request.provider_id,
            home_id=request.home_id,
        )
        governance = settings.model_dump()
        governance["privacy_decision"] = decision.model_dump()

        if request.external_ai_required and not decision.allowed:
            detail = {
                "external_ai_disabled": "External AI processing is disabled for this environment/provider",
                "restricted_decision_feature": "This feature must remain human-led and cannot be delegated to external AI",
                "feature_not_allowlisted": f"AI feature is not enabled: {request.feature}",
                "classification_blocks_external_ai": "This data classification cannot be sent to external AI",
                "export_restricted_blocks_external_ai": "Export-restricted data cannot be sent to external AI",
            }.get(decision.reason, "External AI request blocked by privacy policy")
            raise HTTPException(status_code=403, detail=detail)

        return governance, decision

    def draft_text(self, request: AIGatewayRequest) -> AIGatewayResponse:
        governance, decision = self._govern_request(request)
        mode = request.redaction_mode or decision.redaction_mode or governance.get("redaction_mode") or "strict"
        redacted_prompt = ai_redaction_service.redact_text(request.prompt, mode=mode)
        redacted_system = ai_redaction_service.redact_text(request.system_prompt or "", mode=mode)

        input_text = f"{redacted_system.text}\n{redacted_prompt.text}"
        input_tokens = self.estimate_tokens(input_text)
        output_tokens = max(1, request.max_output_tokens)
        estimated_cost = self.estimate_cost(model=request.model, input_tokens=input_tokens, output_tokens=output_tokens)

        if input_tokens + output_tokens > DEFAULT_FEATURE_SOFT_LIMIT_TOKENS:
            raise HTTPException(status_code=413, detail="AI request exceeds configured token safety limit")

        client = self._client_or_error()
        messages: list[dict[str, str]] = []
        if redacted_system.text.strip():
            messages.append({"role": "system", "content": redacted_system.text})
        messages.append({"role": "user", "content": redacted_prompt.text})

        started = datetime.now(timezone.utc)
        response = client.chat.completions.create(
            model=request.model,
            messages=messages,
            max_tokens=request.max_output_tokens,
            temperature=float(os.getenv("AI_GATEWAY_TEMPERATURE", "0.2")),
        )
        text = response.choices[0].message.content or ""
        actual_output_tokens = self.estimate_tokens(text)
        actual_cost = self.estimate_cost(model=request.model, input_tokens=input_tokens, output_tokens=actual_output_tokens)

        audit = {
            "feature": request.feature,
            "provider_id": request.provider_id,
            "home_id": request.home_id,
            "user_id": request.user_id,
            "model": request.model,
            "redaction_mode": mode,
            "redaction_applied": mode != "off",
            "estimated_input_tokens": input_tokens,
            "estimated_output_tokens": actual_output_tokens,
            "estimated_cost_gbp": actual_cost,
            "prompt_stored": decision.store_prompts,
            "transcript_stored": decision.store_transcripts,
            "started_at": started.isoformat(),
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "metadata": {**(request.metadata or {}), "no_training_required": decision.no_training_required},
        }
        logger.info("ai_gateway_request %s", json.dumps({k: v for k, v in audit.items() if k != "metadata"}, default=str))
        record_model_usage(
            feature=request.feature,
            decision=decision,
            provider_id=request.provider_id,
            home_id=request.home_id,
            user_id=request.user_id,
            model=request.model,
            input_tokens=input_tokens,
            output_tokens=actual_output_tokens,
            cost_gbp=actual_cost,
            redaction_applied=mode != "off",
            metadata=audit.get("metadata"),
        )

        return AIGatewayResponse(
            ok=True,
            text=text,
            model=request.model,
            feature=request.feature,
            external_ai_used=True,
            redaction_applied=mode != "off",
            estimated_input_tokens=input_tokens,
            estimated_output_tokens=actual_output_tokens,
            estimated_cost_gbp=actual_cost,
            governance={**governance, "draft_only": True, "human_review_required": True},
            metadata={"audit": audit, "redaction_count": len(redacted_prompt.replacements) + len(redacted_system.replacements)},
        )


ai_gateway_service = AIGatewayService()
