"""ORB Voice TTS intent gating and route-level privacy decision (NR-1 Phase 2A)."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import StrEnum

from fastapi import HTTPException

from schemas.ai_tts import FEATURE_ORB_PREMIUM_TTS, AiTtsGovernanceContext
from schemas.data_protection import AIPrivacyDecision, DataClassification
from services.ai_external_call_governance import (
    FEATURE_ORB_TTS,
    evaluate_external_call,
    record_model_usage,
    redact_plain_text,
)
from services.provider_data_intelligence_settings_service import (
    provider_data_intelligence_settings_service,
)

logger = logging.getLogger("indicare.orb_voice_tts_intent")

SETTINGS_PREVIEW_PHRASE = (
    "Hello, I'm ORB. I'll speak calmly and clearly while helping you with residential childcare practice."
)
SETTINGS_PREVIEW_TEST_PHRASE = "Service check only."
SETTINGS_PREVIEW_MAX_CHARS = 200


class OrbVoiceTtsSource(StrEnum):
    MANUAL_SPEAK = "manual_speak"
    VOICE_MODE = "voice_mode"
    SETTINGS_PREVIEW = "settings_preview"
    ACCESSIBILITY_READ_ALOUD = "accessibility_read_aloud"


ALLOWED_TTS_SOURCES = frozenset(member.value for member in OrbVoiceTtsSource)
EXPLICIT_SPEAK_SOURCES = frozenset(
    {
        OrbVoiceTtsSource.MANUAL_SPEAK.value,
        OrbVoiceTtsSource.ACCESSIBILITY_READ_ALOUD.value,
    }
)


@dataclass(frozen=True)
class OrbVoiceTtsGateResult:
    source: str
    text_len: int
    redacted_text: str
    redaction_applied: bool
    decision: AIPrivacyDecision


class OrbVoiceTtsGateError(Exception):
    def __init__(self, code: str, message: str, *, status_code: int = 422) -> None:
        super().__init__(message)
        self.code = code
        self.message = message
        self.status_code = status_code


def normalise_tts_source(raw: str | None) -> str:
    return str(raw or "").strip().lower()


def _is_settings_preview_text(text: str) -> bool:
    cleaned = (text or "").strip()
    if not cleaned:
        return False
    if cleaned in {SETTINGS_PREVIEW_PHRASE, SETTINGS_PREVIEW_TEST_PHRASE}:
        return True
    if len(cleaned) > SETTINGS_PREVIEW_MAX_CHARS:
        return False
    return cleaned.startswith("Hello, I'm ORB.")


def validate_tts_source_rules(
    *,
    source: str,
    text: str,
    context: str | None,
    expert_depth: str | None,
    privacy_mode: bool = False,
    low_sensory_mode: bool = False,
) -> None:
    if source not in ALLOWED_TTS_SOURCES:
        raise OrbVoiceTtsGateError(
            "tts_source_invalid",
            "TTS source is not recognised.",
            status_code=422,
        )

    depth = (expert_depth or "general_light").strip().lower()
    if depth == "safeguarding_critical" and source not in EXPLICIT_SPEAK_SOURCES:
        raise OrbVoiceTtsGateError(
            "tts_safeguarding_blocked",
            "Spoken reply paused for privacy or safeguarding. Use Speak again when appropriate.",
            status_code=403,
        )

    if (privacy_mode or low_sensory_mode) and source not in EXPLICIT_SPEAK_SOURCES:
        raise OrbVoiceTtsGateError(
            "tts_privacy_mode_blocked",
            "Spoken reply paused in privacy mode — text answer shown below.",
            status_code=403,
        )

    if source == OrbVoiceTtsSource.VOICE_MODE.value:
        if (context or "").strip().lower() != "live_voice":
            raise OrbVoiceTtsGateError(
                "tts_voice_mode_context_invalid",
                "Voice-mode TTS requires an active voice workflow context.",
                status_code=422,
            )

    if source == OrbVoiceTtsSource.SETTINGS_PREVIEW.value and not _is_settings_preview_text(text):
        raise OrbVoiceTtsGateError(
            "tts_settings_preview_invalid",
            "Settings preview is limited to the approved preview phrase.",
            status_code=422,
        )


def gate_orb_voice_tts_request(
    *,
    source: str | None,
    text: str,
    context: str | None = None,
    expert_depth: str | None = None,
    privacy_mode: bool = False,
    low_sensory_mode: bool = False,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
    route: str,
) -> OrbVoiceTtsGateResult:
    """Validate TTS intent and privacy decision before any external provider call."""
    normalised_source = normalise_tts_source(source)
    if not normalised_source:
        raise OrbVoiceTtsGateError(
            "tts_source_required",
            "TTS source is required.",
            status_code=422,
        )

    spoken = (text or "").strip()
    if not spoken:
        raise OrbVoiceTtsGateError("empty_text", "Spoken text is required.", status_code=400)

    validate_tts_source_rules(
        source=normalised_source,
        text=spoken,
        context=context,
        expert_depth=expert_depth,
        privacy_mode=privacy_mode,
        low_sensory_mode=low_sensory_mode,
    )

    if provider_id is not None:
        settings = provider_data_intelligence_settings_service.get_effective_settings(
            provider_id=provider_id,
            home_id=home_id,
        )
        if not settings.premium_tts_enabled:
            raise OrbVoiceTtsGateError(
                "tts_premium_disabled",
                "Premium TTS is not enabled for this provider.",
                status_code=403,
            )

    manual_speak = normalised_source in EXPLICIT_SPEAK_SOURCES
    decision = evaluate_external_call(
        feature=FEATURE_ORB_TTS,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=DataClassification.INTERNAL_OPERATIONAL,
        metadata={
            "source": normalised_source,
            "intent": normalised_source,
            "route": route,
            "expert_depth": (expert_depth or "general_light").strip().lower(),
            "manual_speak": manual_speak,
            "text_len": len(spoken),
        },
        local_fallback_available=False,
    )
    if not decision.allowed:
        logger.info(
            "orb_voice_tts_blocked source=%s route=%s reason=%s text_len=%s user_id=%s",
            normalised_source,
            route,
            decision.reason,
            len(spoken),
            user_id,
        )
        raise OrbVoiceTtsGateError(
            decision.reason or "external_processing_blocked",
            "External TTS is blocked by privacy policy.",
            status_code=403,
        )

    redacted_text, redaction_applied = redact_plain_text(spoken, mode=decision.redaction_mode)
    if not redacted_text.strip():
        raise OrbVoiceTtsGateError(
            "tts_text_redacted_empty",
            "Spoken text cannot be sent to an external provider after redaction.",
            status_code=403,
        )

    return OrbVoiceTtsGateResult(
        source=normalised_source,
        text_len=len(spoken),
        redacted_text=redacted_text,
        redaction_applied=redaction_applied,
        decision=decision,
    )


def build_tts_governance_context(
    *,
    gate: OrbVoiceTtsGateResult,
    provider_id: int | None,
    home_id: int | None,
    user_id: int | None,
    route: str,
    surface: str = "standalone_orb",
    voice_id: str | None = None,
    voice_style: str | None = None,
    model: str | None = None,
    provider_preference: str | None = None,
    context: str | None = None,
    expert_depth: str | None = None,
) -> AiTtsGovernanceContext:
    """Build safe TTS governance context from a Phase 2A gate result."""
    return AiTtsGovernanceContext(
        feature=FEATURE_ORB_PREMIUM_TTS,
        surface=surface,
        route=route,
        source=gate.source,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        text_len=gate.text_len,
        redaction_applied=gate.redaction_applied,
        privacy_decision=gate.decision,
        provider_preference=provider_preference,
        voice_id=voice_id,
        voice_style=voice_style,
        model=model,
        metadata={
            "context": (context or "").strip().lower() or None,
            "expert_depth": (expert_depth or "general_light").strip().lower(),
            "route_gate_passed": True,
        },
    )


def record_orb_voice_tts_usage(
    *,
    gate: OrbVoiceTtsGateResult,
    provider_id: int | None,
    home_id: int | None,
    user_id: int | None,
    route: str,
    provider: str | None = None,
    voice_id: str | None = None,
) -> None:
    record_model_usage(
        feature=FEATURE_ORB_TTS,
        decision=gate.decision,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        model=provider or "orb_tts",
        input_tokens=max(1, gate.text_len // 4),
        output_tokens=0,
        redaction_applied=gate.redaction_applied,
        metadata={
            "route": route,
            "source": gate.source,
            "intent": gate.source,
            "text_len": gate.text_len,
            "voice_id": voice_id,
            "governed_tts_route_gate": True,
        },
    )


def tts_gate_http_exception(exc: OrbVoiceTtsGateError) -> HTTPException:
    return HTTPException(
        status_code=exc.status_code,
        detail={"error": exc.code, "message": exc.message},
    )
