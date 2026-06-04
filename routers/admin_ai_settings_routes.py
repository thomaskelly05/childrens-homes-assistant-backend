from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from auth.permissions import require_admin, require_manager_or_admin
from auth.rbac import StaffRole, normalise_role
from services.ai_usage_audit_service import ai_usage_audit_service
from services.provider_data_intelligence_settings_service import (
    RESTRICTED_AI_FEATURES,
    SETTINGS_ROW_KEYS,
    _filter_allowed_features,
    _normalise_redaction_mode,
    provider_data_intelligence_settings_service,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/admin", tags=["Admin AI Trust Settings"])

class AcknowledgementFlags(BaseModel):
    acknowledge_external_ai_processing: bool = False
    acknowledge_subprocessor_terms: bool = False
    acknowledge_prompt_storage: bool = False
    acknowledge_transcript_storage: bool = False
    acknowledge_redaction_off: bool = False
    acknowledge_premium_tts_external_provider: bool = False
    acknowledge_human_review_required: bool = False


class PatchAISettingsRequest(BaseModel):
    home_id: int | None = None
    external_ai_enabled: bool | None = None
    redaction_mode: str | None = None
    allowed_ai_features: list[str] | None = None
    prompt_storage: bool | None = None
    transcript_storage: bool | None = None
    realtime_voice_enabled: bool | None = None
    report_ai_drafting_enabled: bool | None = None
    premium_tts_enabled: bool | None = None
    data_retention_days: int | None = None
    local_policy_sources_enabled: bool | None = None
    acknowledgements: AcknowledgementFlags = Field(default_factory=AcknowledgementFlags)


def _user_id(user: dict[str, Any]) -> int | None:
    raw = user.get("user_id") or user.get("id")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _provider_id(user: dict[str, Any]) -> int | None:
    raw = user.get("provider_id")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _bundle_response(bundle) -> dict[str, Any]:
    return {
        "effective": bundle.effective.model_dump(),
        "provider_level": bundle.provider_level.model_dump() if bundle.provider_level else None,
        "home_override": bundle.home_override.model_dump() if bundle.home_override else None,
        "env_defaults": bundle.env_defaults.model_dump(),
        "sources": bundle.sources,
        "warnings": bundle.warnings,
        "db_available": bundle.db_available,
        "restricted_features_blocked": sorted(RESTRICTED_AI_FEATURES),
    }


@router.get("/ai-settings")
def get_ai_settings(
    home_id: int | None = Query(default=None),
    user: dict[str, Any] = Depends(require_manager_or_admin),
):
    provider_id = _provider_id(user)
    if provider_id is None:
        raise HTTPException(status_code=400, detail="Provider context required")
    bundle = provider_data_intelligence_settings_service.get_effective_bundle(
        provider_id=provider_id,
        home_id=home_id,
    )
    return _bundle_response(bundle)


@router.patch("/ai-settings")
def patch_ai_settings(
    body: PatchAISettingsRequest,
    user: dict[str, Any] = Depends(require_admin),
):
    provider_id = _provider_id(user)
    if provider_id is None:
        raise HTTPException(status_code=400, detail="Provider context required")

    ack = body.acknowledgements
    updates = body.model_dump(exclude={"acknowledgements", "home_id"}, exclude_none=True)
    if body.allowed_ai_features is not None:
        blocked = [f for f in body.allowed_ai_features if f in RESTRICTED_AI_FEATURES]
        if blocked:
            raise HTTPException(status_code=400, detail=f"Restricted features cannot be enabled: {', '.join(blocked)}")
        updates["allowed_ai_features"] = _filter_allowed_features(body.allowed_ai_features)

    if body.redaction_mode is not None:
        updates["redaction_mode"] = _normalise_redaction_mode(body.redaction_mode)

    if updates.get("external_ai_enabled") is True:
        if not (ack.acknowledge_external_ai_processing and ack.acknowledge_subprocessor_terms and ack.acknowledge_human_review_required):
            raise HTTPException(status_code=400, detail="External AI requires explicit acknowledgement flags")

    if updates.get("prompt_storage") is True and not ack.acknowledge_prompt_storage:
        raise HTTPException(status_code=400, detail="Prompt storage requires acknowledge_prompt_storage")

    if updates.get("transcript_storage") is True and not ack.acknowledge_transcript_storage:
        raise HTTPException(status_code=400, detail="Transcript storage requires acknowledge_transcript_storage")

    if updates.get("redaction_mode") == "off" and not ack.acknowledge_redaction_off:
        raise HTTPException(status_code=400, detail="Disabling redaction requires acknowledge_redaction_off")

    if updates.get("premium_tts_enabled") is True and not ack.acknowledge_premium_tts_external_provider:
        raise HTTPException(status_code=400, detail="Premium TTS requires acknowledge_premium_tts_external_provider")

    target_home_id = body.home_id
    if target_home_id is not None:
        bundle_before = provider_data_intelligence_settings_service.get_effective_bundle(
            provider_id=provider_id,
            home_id=target_home_id,
        )
        provider_effective = bundle_before.provider_level or bundle_before.env_defaults
        if updates.get("external_ai_enabled") is True and not provider_effective.external_ai_enabled:
            raise HTTPException(status_code=400, detail="Home cannot enable external AI when provider has disabled it")
        if updates.get("prompt_storage") is True and not provider_effective.prompt_storage:
            raise HTTPException(status_code=400, detail="Home cannot enable prompt storage when provider has disabled it")
        if updates.get("transcript_storage") is True and not provider_effective.transcript_storage:
            raise HTTPException(status_code=400, detail="Home cannot enable transcript storage when provider has disabled it")
        if updates.get("redaction_mode") and _normalise_redaction_mode(updates["redaction_mode"]) == "off":
            if _normalise_redaction_mode(provider_effective.redaction_mode) != "off":
                raise HTTPException(status_code=400, detail="Home cannot weaken redaction below provider level")

    before_bundle = provider_data_intelligence_settings_service.get_effective_bundle(
        provider_id=provider_id,
        home_id=target_home_id,
    )
    before = before_bundle.effective

    try:
        provider_data_intelligence_settings_service.upsert_settings(
            provider_id=provider_id,
            home_id=target_home_id,
            updates=updates,
            updated_by=_user_id(user),
        )
    except Exception:
        logger.warning("provider_ai_settings_upsert_failed", exc_info=True)
        raise HTTPException(status_code=503, detail="Could not save AI trust settings") from None

    after_bundle = provider_data_intelligence_settings_service.get_effective_bundle(
        provider_id=provider_id,
        home_id=target_home_id,
    )
    after = after_bundle.effective

    changes: list[tuple[str, Any, Any]] = []
    for key in SETTINGS_ROW_KEYS:
        prev = getattr(before, key, None)
        new = getattr(after, key, None)
        if key in updates and prev != new:
            changes.append((key, prev, new))

    provider_data_intelligence_settings_service.write_settings_audit(
        provider_id=provider_id,
        home_id=target_home_id,
        changed_by=_user_id(user),
        changes=changes,
        acknowledgement_flags=ack.model_dump(),
        metadata={"source": "admin_api"},
    )

    return _bundle_response(after_bundle)


@router.get("/ai-trust-status")
def get_ai_trust_status(
    home_id: int | None = Query(default=None),
    user: dict[str, Any] = Depends(require_manager_or_admin),
):
    provider_id = _provider_id(user)
    if provider_id is None:
        raise HTTPException(status_code=400, detail="Provider context required")
    bundle = provider_data_intelligence_settings_service.get_effective_bundle(
        provider_id=provider_id,
        home_id=home_id,
    )
    settings = bundle.effective
    primary_source = "home" if bundle.home_override else ("provider" if bundle.provider_level else "env")
    return {
        "external_ai": "on" if settings.external_ai_enabled else "off",
        "redaction": settings.redaction_mode,
        "prompt_storage": "on" if settings.prompt_storage else "off",
        "transcript_storage": "on" if settings.transcript_storage else "off",
        "report_drafting": "on" if settings.report_ai_drafting_enabled else "off",
        "realtime_voice": "on" if settings.realtime_voice_enabled else "off",
        "premium_voice_provider": "on" if settings.premium_tts_enabled else "off",
        "human_review": "required",
        "restricted_decisions": "blocked",
        "usage_audit": "enabled",
        "trusted_sources": "governed",
        "local_policy_sources": "enabled" if settings.local_policy_sources_enabled else "disabled",
        "settings_source": primary_source,
        "warnings": bundle.warnings,
        "db_available": bundle.db_available,
    }


@router.get("/ai-usage-audit")
def get_ai_usage_audit(
    home_id: int | None = Query(default=None),
    date_from: datetime | None = Query(default=None),
    date_to: datetime | None = Query(default=None),
    feature: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    user: dict[str, Any] = Depends(require_manager_or_admin),
):
    provider_id = _provider_id(user)
    if provider_id is None:
        raise HTTPException(status_code=400, detail="Provider context required")
    role = normalise_role(str(user.get("role") or ""))
    include_user_id = role == StaffRole.ADMIN.value
    events = ai_usage_audit_service.list_safe(
        provider_id=provider_id,
        home_id=home_id,
        date_from=date_from,
        date_to=date_to,
        feature=feature,
        limit=limit,
        include_user_id=include_user_id,
    )
    return {"events": events, "count": len(events)}
