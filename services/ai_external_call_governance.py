"""Shared governance helpers for external model calls (gateway + streaming)."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("indicare.ai_external_call_governance")

from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.ai_privacy_decision_service import (
    AIPrivacyDecisionRequest,
    ai_privacy_decision_service,
)
from services.ai_redaction_service import ai_redaction_service
from services.ai_usage_audit_service import ai_usage_audit_service


def governance_context_from_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    meta = metadata if isinstance(metadata, dict) else {}
    provider_id = meta.get("provider_id")
    home_id = meta.get("home_id")
    user_id = meta.get("user_id")
    return {
        "provider_id": provider_id if isinstance(provider_id, int) else None,
        "home_id": home_id if isinstance(home_id, int) else None,
        "user_id": int(user_id) if str(user_id or "").isdigit() else (user_id if isinstance(user_id, int) else None),
        "feature": str(meta.get("ai_feature") or meta.get("feature") or "orb_text_fallback"),
        "classification": meta.get("data_classification"),
    }


def _parse_classification(value: Any) -> DataClassification | None:
    if isinstance(value, DataClassification):
        return value
    if not value:
        return None
    try:
        return DataClassification(str(value))
    except ValueError:
        return None


def evaluate_external_call(
    *,
    feature: str,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
    data_classification: DataClassification | None = None,
    metadata: dict[str, Any] | None = None,
    local_fallback_available: bool = False,
) -> AIPrivacyDecision:
    ctx = governance_context_from_metadata(metadata)
    return ai_privacy_decision_service.decide(
        AIPrivacyDecisionRequest(
            provider_id=provider_id if provider_id is not None else ctx["provider_id"],
            home_id=home_id if home_id is not None else ctx["home_id"],
            user_id=user_id if user_id is not None else ctx["user_id"],
            feature=feature or ctx["feature"],
            data_classification=data_classification or _parse_classification(ctx.get("classification")),
            local_fallback_available=local_fallback_available,
            metadata=metadata or {},
        )
    )


def redact_chat_messages(
    messages: list[dict[str, str]],
    *,
    mode: str,
) -> tuple[list[dict[str, str]], bool]:
    redacted: list[dict[str, str]] = []
    applied = False
    for msg in messages:
        content = msg.get("content") or ""
        result = ai_redaction_service.redact_text(content, mode=mode)
        if result.replacements:
            applied = True
        redacted.append({"role": msg["role"], "content": result.text})
    return redacted, applied


def record_model_usage(
    *,
    feature: str,
    decision: AIPrivacyDecision,
    provider_id: int | None,
    home_id: int | None,
    user_id: int | None,
    model: str,
    input_tokens: int = 0,
    output_tokens: int = 0,
    cost_gbp: float = 0.0,
    redaction_applied: bool = False,
    metadata: dict[str, Any] | None = None,
) -> None:
    try:
        ai_usage_audit_service.record(
            {
                "provider_id": provider_id,
                "home_id": home_id,
                "user_id": user_id,
                "feature": feature,
                "model": model,
                "redaction_mode": decision.redaction_mode,
                "redaction_applied": redaction_applied,
                "estimated_input_tokens": input_tokens,
                "estimated_output_tokens": output_tokens,
                "estimated_cost_gbp": cost_gbp,
                "prompt_stored": decision.store_prompts,
                "transcript_stored": decision.store_transcripts,
                "metadata": {
                    "no_training_required": decision.no_training_required,
                    "decision_reason": decision.reason,
                    **(metadata or {}),
                },
            }
        )
    except Exception:
        logger.warning("Failed to persist model usage audit", exc_info=True)
