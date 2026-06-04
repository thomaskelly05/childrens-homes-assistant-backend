from __future__ import annotations

import os
from typing import Any

from schemas.data_intelligence import ProviderDataIntelligenceSettings


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _normalise_redaction_mode(value: str | None) -> str:
    mode = (value or "strict").strip().lower()
    return mode if mode in {"strict", "balanced", "off"} else "strict"


class ProviderDataIntelligenceSettingsService:
    """Typed safe defaults for provider/home AI and data intelligence controls.

    TODO(provider-admin-api): Persist per-provider/home overrides (external_ai_enabled,
    redaction_mode, allowed_ai_features, prompt_storage, transcript_storage,
    realtime_voice_enabled, report_ai_drafting_enabled, data_retention_days) via
    admin API + database. Today settings are env-driven with optional from_record().
    """

    def defaults(self, *, provider_id: int | None = None, home_id: int | None = None) -> ProviderDataIntelligenceSettings:
        external_ai_enabled = _env_bool("AI_EXTERNAL_PROCESSING_ENABLED", False)
        base_features = ["metadata", "orb_text_fallback", "orb_chat_stream"]
        if external_ai_enabled:
            base_features.extend(
                [
                    "report_drafting",
                    "risk_drafting",
                    "document_generation",
                    "document_ai_review",
                    "ai_notes",
                    "dictate",
                    "dictate_edit",
                    "knowledge_embedding",
                ]
            )
        return ProviderDataIntelligenceSettings(
            provider_id=provider_id,
            home_id=home_id,
            external_ai_enabled=external_ai_enabled,
            redaction_mode=_normalise_redaction_mode(os.getenv("AI_REDACTION_MODE", "strict")),
            allowed_ai_features=base_features,
            orb_enabled=_env_bool("ORB_ENABLED", True),
            realtime_voice_enabled=_env_bool("ORB_REALTIME_VOICE_ENABLED", False),
            report_ai_drafting_enabled=_env_bool("REPORT_AI_DRAFTING_ENABLED", False) and external_ai_enabled,
            transcript_storage=_env_bool("AI_STORE_TRANSCRIPTS", False),
            prompt_storage=_env_bool("AI_STORE_PROMPTS", False),
            demo_mode_disabled=not _env_bool("DEMO_MODE_ENABLED", False),
            inspection_readiness_enabled=_env_bool("INSPECTION_READINESS_ENABLED", True),
            metadata_extraction_enabled=True,
        )

    def from_record(self, record: dict[str, Any] | None) -> ProviderDataIntelligenceSettings:
        if not record:
            return self.defaults()
        base = self.defaults(provider_id=record.get("provider_id"), home_id=record.get("home_id"))
        data = base.model_dump()
        for key in data:
            if key in record and record[key] is not None:
                data[key] = record[key]
        data["external_ai_enabled"] = bool(data.get("external_ai_enabled"))
        data["redaction_mode"] = _normalise_redaction_mode(data.get("redaction_mode"))
        if not data["external_ai_enabled"]:
            data["report_ai_drafting_enabled"] = False
        return ProviderDataIntelligenceSettings(**data)


provider_data_intelligence_settings_service = ProviderDataIntelligenceSettingsService()
