"""Shared governance helpers for external model calls (gateway + streaming)."""

from __future__ import annotations

import logging
import os
from typing import Any

from fastapi import HTTPException

from schemas.ai_models import AiProviderGovernanceContext
from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.ai_privacy_decision_service import (
    AIPrivacyDecisionRequest,
    ai_privacy_decision_service,
)
from services.ai_redaction_service import ai_redaction_service
from services.ai_usage_audit_service import ai_usage_audit_service
from services.openai_header_sanitisation import create_sync_openai_client

logger = logging.getLogger("indicare.ai_external_call_governance")

# Feature keys used by legacy route convergence (allowlisted when external AI is enabled).
FEATURE_DOCUMENT_GENERATION = "document_generation"
FEATURE_DOCUMENT_AI_REVIEW = "document_ai_review"
FEATURE_REPORT_DRAFTING = "report_drafting"
FEATURE_AI_NOTES = "ai_notes"
FEATURE_DICTATE = "dictate"
FEATURE_DICTATE_EDIT = "dictate_edit"
FEATURE_VOICE_TRANSCRIPTION = "voice_transcription"
FEATURE_VOICE_RESPOND = "voice_respond"
FEATURE_ORB_TTS = "orb_premium_tts"
FEATURE_KNOWLEDGE_EMBEDDING = "knowledge_embedding"
FEATURE_LEGACY_STREAMING = "legacy_assistant_stream"
# Model-router / ORB chat surfaces (provider-agnostic governed egress).
FEATURE_ORB_MODEL_ROUTER_CHAT = "orb_model_router_chat"
FEATURE_ORB_MODEL_ROUTER_OPERATIONAL = "orb_model_router_operational"
FEATURE_ORB_MODEL_ROUTER_AGENT = "orb_model_router_agent"
FEATURE_ORB_MODEL_ROUTER_DOCUMENT = "orb_model_router_document"
FEATURE_ORB_MODEL_ROUTER_ACTION = "orb_model_router_action"
FEATURE_ORB_MODEL_ROUTER_GUARDRAIL = "orb_model_router_guardrail"
FEATURE_ORB_REALTIME_VOICE_SESSION = "orb_realtime_voice_session"
FEATURE_ORB_REALTIME_TRANSCRIPTION_SESSION = "orb_realtime_transcription_session"
FEATURE_ORB_DICTATE_REALTIME_SESSION = "orb_dictate_realtime_session"

SURFACE_FEATURE_MAP: dict[str, str] = {
    "standalone_orb_ai": FEATURE_ORB_MODEL_ROUTER_CHAT,
    "standalone_orb": FEATURE_ORB_MODEL_ROUTER_CHAT,
    "operational_os": FEATURE_ORB_MODEL_ROUTER_OPERATIONAL,
    "operational_os_context": FEATURE_ORB_MODEL_ROUTER_OPERATIONAL,
    "orb_agent_orchestrator": FEATURE_ORB_MODEL_ROUTER_AGENT,
    "orb_document_understanding": FEATURE_ORB_MODEL_ROUTER_DOCUMENT,
    "orb_action_engine": FEATURE_ORB_MODEL_ROUTER_ACTION,
    "orb_live_guardrail_repair": FEATURE_ORB_MODEL_ROUTER_GUARDRAIL,
}


def feature_for_surface(surface: str, *, override: str | None = None) -> str:
    if override:
        return override.strip().lower()
    return SURFACE_FEATURE_MAP.get(str(surface or "").strip(), FEATURE_ORB_MODEL_ROUTER_CHAT)


def build_router_governance_context(
    *,
    surface: str,
    user: dict[str, Any] | None = None,
    feature: str | None = None,
    route: str | None = None,
    child_id: int | None = None,
    role: str | None = None,
    data_classification: DataClassification | None = None,
    local_fallback_available: bool = False,
    metadata: dict[str, Any] | None = None,
) -> AiProviderGovernanceContext:
    ids = governance_ids_from_user(user)
    resolved_role = role
    if not resolved_role and isinstance(user, dict):
        resolved_role = str(user.get("role") or user.get("user_role") or "").strip() or None
    return AiProviderGovernanceContext(
        feature=feature_for_surface(surface, override=feature),
        surface=str(surface or "standalone_orb_ai").strip(),
        provider_id=ids["provider_id"],
        home_id=ids["home_id"],
        user_id=ids["user_id"],
        child_id=child_id,
        role=resolved_role,
        route=route,
        data_classification=data_classification,
        local_fallback_available=local_fallback_available,
        metadata=metadata or {},
    )


def governance_ids_from_user(user: dict[str, Any] | None) -> dict[str, int | None]:
    if not isinstance(user, dict):
        return {"provider_id": None, "home_id": None, "user_id": None}

    def _safe_int(value: Any) -> int | None:
        try:
            if value is None or value == "":
                return None
            return int(value)
        except (TypeError, ValueError):
            return None

    return {
        "provider_id": _safe_int(user.get("provider_id") or user.get("providerId")),
        "home_id": _safe_int(user.get("home_id") or user.get("homeId")),
        "user_id": _safe_int(user.get("user_id") or user.get("id")),
    }


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


def redact_plain_text(text: str, *, mode: str) -> tuple[str, bool]:
    result = ai_redaction_service.redact_text(text or "", mode=mode)
    return result.text, bool(result.replacements)


def _blocked_detail(decision: AIPrivacyDecision, feature: str) -> str:
    return {
        "external_ai_disabled": "External AI processing is disabled for this provider or environment",
        "feature_not_allowlisted": f"AI feature is not enabled: {feature}",
        "classification_blocks_external_ai": "This data classification cannot be sent to external AI",
        "restricted_decision_feature": "This feature must remain human-led and cannot use external AI",
    }.get(decision.reason, "External AI request blocked by privacy policy")


def governed_draft_text(
    *,
    feature: str,
    prompt: str,
    system_prompt: str | None = None,
    model: str | None = None,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
    data_classification: DataClassification | None = None,
    external_ai_required: bool = True,
    local_fallback_available: bool = False,
    max_output_tokens: int | None = None,
    metadata: dict[str, Any] | None = None,
):
    """Run a governed non-streaming draft via the central AI gateway."""
    from services.ai_gateway_service import AIGatewayRequest, ai_gateway_service

    decision = evaluate_external_call(
        feature=feature,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=data_classification,
        metadata=metadata,
        local_fallback_available=local_fallback_available,
    )
    if external_ai_required and not decision.allowed:
        raise HTTPException(status_code=403, detail=_blocked_detail(decision, feature))

    return ai_gateway_service.draft_text(
        AIGatewayRequest(
            feature=feature,
            prompt=prompt,
            system_prompt=system_prompt,
            model=model or os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            provider_id=provider_id,
            home_id=home_id,
            user_id=user_id,
            external_ai_required=external_ai_required,
            max_output_tokens=max_output_tokens or int(os.getenv("AI_GATEWAY_MAX_OUTPUT_TOKENS", "1200")),
            metadata={
                **(metadata or {}),
                "data_classification": (data_classification or DataClassification.INTERNAL_OPERATIONAL).value,
                "draft_only": True,
                "human_review_required": True,
            },
        )
    )


def try_governed_draft_text(
    *,
    feature: str,
    prompt: str,
    system_prompt: str | None = None,
    model: str | None = None,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
    data_classification: DataClassification | None = None,
    local_fallback_available: bool = True,
    max_output_tokens: int | None = None,
    metadata: dict[str, Any] | None = None,
):
    """Return gateway response when allowed; None when blocked and a local fallback should be used."""
    decision = evaluate_external_call(
        feature=feature,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=data_classification,
        metadata=metadata,
        local_fallback_available=local_fallback_available,
    )
    if not decision.allowed:
        return None
    return governed_draft_text(
        feature=feature,
        prompt=prompt,
        system_prompt=system_prompt,
        model=model,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=data_classification,
        external_ai_required=True,
        local_fallback_available=False,
        max_output_tokens=max_output_tokens,
        metadata=metadata,
    )


def governed_embeddings_create(
    texts: list[str],
    *,
    feature: str = FEATURE_KNOWLEDGE_EMBEDDING,
    model: str | None = None,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
    data_classification: DataClassification | None = DataClassification.PUBLIC_SYSTEM,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Create embeddings after privacy decision and redaction."""
    decision = evaluate_external_call(
        feature=feature,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=data_classification,
        metadata=metadata,
        local_fallback_available=False,
    )
    embedding_model = model or os.getenv("EMBEDDING_MODEL") or os.getenv("OPENAI_EMBEDDING_MODEL") or "text-embedding-3-small"

    if not decision.allowed:
        return {
            "available": False,
            "embeddings": [],
            "model": embedding_model,
            "blocked": True,
            "reason": decision.reason,
        }

    cleaned = [str(t or "").strip() for t in texts if str(t or "").strip()]
    if not cleaned:
        return {"available": True, "embeddings": [], "model": embedding_model}

    redacted_inputs: list[str] = []
    redaction_applied = False
    for item in cleaned:
        redacted, applied = redact_plain_text(item, mode=decision.redaction_mode)
        redaction_applied = redaction_applied or applied
        redacted_inputs.append(redacted)

    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        return {
            "available": False,
            "embeddings": [],
            "model": embedding_model,
            "error": "external_ai_not_configured",
        }

    try:
        client = create_sync_openai_client(api_key=api_key)
        response = client.embeddings.create(model=embedding_model, input=redacted_inputs)
        ordered = sorted(response.data, key=lambda item: item.index)
        vectors = [list(item.embedding) for item in ordered]
        input_tokens = max(1, sum(len(t) for t in redacted_inputs) // 4)
        record_model_usage(
            feature=feature,
            decision=decision,
            provider_id=provider_id,
            home_id=home_id,
            user_id=user_id,
            model=embedding_model,
            input_tokens=input_tokens,
            output_tokens=0,
            redaction_applied=redaction_applied,
            metadata={**(metadata or {}), "embedding_count": len(vectors)},
        )
        return {"available": True, "embeddings": vectors, "model": embedding_model}
    except Exception as exc:
        logger.warning("Governed embedding request failed", exc_info=True)
        return {
            "available": False,
            "embeddings": [],
            "model": embedding_model,
            "error": str(exc)[:200],
        }


def governed_transcribe_audio_file(
    file_path: str,
    *,
    feature: str = FEATURE_AI_NOTES,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
    data_classification: DataClassification = DataClassification.CONFIDENTIAL_CHILD,
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Transcribe audio via external STT after privacy decision (no transcript storage by default)."""
    import mimetypes

    decision = evaluate_external_call(
        feature=feature,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=data_classification,
        metadata=metadata,
        local_fallback_available=False,
    )
    if not decision.allowed:
        raise RuntimeError(_blocked_detail(decision, feature))

    if not os.path.exists(file_path):
        raise RuntimeError("Audio file not found")

    api_key = (os.getenv("OPENAI_API_KEY") or "").strip()
    if not api_key:
        raise RuntimeError("External AI is not configured")

    filename = os.path.basename(file_path)
    mime_type = mimetypes.guess_type(filename)[0] or "audio/webm"

    client = create_sync_openai_client(api_key=api_key)
    with open(file_path, "rb") as audio_file:
        result = client.audio.transcriptions.create(
            model=os.getenv("AI_NOTES_TRANSCRIBE_MODEL", "gpt-4o-transcribe"),
            file=(filename, audio_file, mime_type),
        )

    result_dict = result.model_dump() if hasattr(result, "model_dump") else result
    transcript = str(result_dict.get("text") or "").strip()
    redacted, redaction_applied = redact_plain_text(transcript, mode=decision.redaction_mode)
    working_transcript = (
        transcript if feature in {FEATURE_DICTATE, FEATURE_VOICE_TRANSCRIPTION} else redacted
    )

    record_model_usage(
        feature=feature,
        decision=decision,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        model=os.getenv("AI_NOTES_TRANSCRIBE_MODEL", "gpt-4o-transcribe"),
        input_tokens=max(1, len(redacted) // 4),
        output_tokens=max(1, len(redacted) // 4),
        redaction_applied=redaction_applied,
        metadata={**(metadata or {}), "route": "governed_transcribe_audio_file"},
    )

    return {
        "transcript": working_transcript,
        "original_transcript": transcript,
        "redacted_transcript": redacted,
        "segments": [],
        "duration": result_dict.get("duration"),
        "redaction_applied": redaction_applied,
        "transcript_privacy_mode": (
            "internal_working"
            if feature == FEATURE_DICTATE
            else "session_only"
            if feature == FEATURE_VOICE_TRANSCRIPTION
            else "redacted_export"
        ),
    }
