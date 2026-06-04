from __future__ import annotations

import json
import logging
import os
from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection
from schemas.data_intelligence import (
    ProviderAISettingsSourceBundle,
    ProviderDataIntelligenceSettings,
)

logger = logging.getLogger("indicare.provider_ai_settings")

RESTRICTED_AI_FEATURES = frozenset(
    {
        "safeguarding_decision",
        "lado_decision",
        "police_decision",
        "medical_diagnosis",
        "legal_decision",
    }
)

REDACTION_STRICTNESS = {"strict": 0, "balanced": 1, "off": 2}

SETTINGS_ROW_KEYS = (
    "external_ai_enabled",
    "redaction_mode",
    "allowed_ai_features",
    "prompt_storage",
    "transcript_storage",
    "realtime_voice_enabled",
    "report_ai_drafting_enabled",
    "premium_tts_enabled",
    "data_retention_days",
    "local_policy_sources_enabled",
)


def _env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _normalise_redaction_mode(value: str | None) -> str:
    mode = (value or "strict").strip().lower()
    return mode if mode in REDACTION_STRICTNESS else "strict"


def _strictest_redaction(*modes: str | None) -> str:
    ranked = [_normalise_redaction_mode(m) for m in modes if m is not None]
    if not ranked:
        return "strict"
    return min(ranked, key=lambda m: REDACTION_STRICTNESS[m])


def _filter_allowed_features(features: list[str] | None) -> list[str]:
    cleaned = []
    seen: set[str] = set()
    for feature in features or []:
        name = str(feature or "").strip().lower()
        if not name or name in seen:
            continue
        if name in RESTRICTED_AI_FEATURES or any(name.startswith(f"{r}_") for r in RESTRICTED_AI_FEATURES):
            continue
        seen.add(name)
        cleaned.append(name)
    return cleaned


class ProviderDataIntelligenceSettingsService:
    """Provider/home AI trust settings with env fallback and DB persistence."""

    def env_defaults(
        self,
        *,
        provider_id: int | None = None,
        home_id: int | None = None,
    ) -> ProviderDataIntelligenceSettings:
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
            allowed_ai_features=_filter_allowed_features(base_features),
            orb_enabled=_env_bool("ORB_ENABLED", True),
            realtime_voice_enabled=_env_bool("ORB_REALTIME_VOICE_ENABLED", False),
            report_ai_drafting_enabled=_env_bool("REPORT_AI_DRAFTING_ENABLED", False) and external_ai_enabled,
            premium_tts_enabled=False,
            transcript_storage=_env_bool("AI_STORE_TRANSCRIPTS", False),
            prompt_storage=_env_bool("AI_STORE_PROMPTS", False),
            local_policy_sources_enabled=False,
            demo_mode_disabled=not _env_bool("DEMO_MODE_ENABLED", False),
            inspection_readiness_enabled=_env_bool("INSPECTION_READINESS_ENABLED", True),
            metadata_extraction_enabled=True,
        )

    def defaults(self, *, provider_id: int | None = None, home_id: int | None = None) -> ProviderDataIntelligenceSettings:
        """Effective settings (DB + env). Prefer get_effective_bundle for admin source metadata."""
        return self.get_effective_settings(provider_id=provider_id, home_id=home_id)

    def get_effective_settings(
        self,
        *,
        provider_id: int | None = None,
        home_id: int | None = None,
    ) -> ProviderDataIntelligenceSettings:
        return self.get_effective_bundle(provider_id=provider_id, home_id=home_id).effective

    def get_effective_bundle(
        self,
        *,
        provider_id: int | None = None,
        home_id: int | None = None,
    ) -> ProviderAISettingsSourceBundle:
        env = self.env_defaults(provider_id=provider_id, home_id=home_id)
        if provider_id is None:
            return ProviderAISettingsSourceBundle(
                effective=env,
                env_defaults=env,
                sources={key: "env" for key in SETTINGS_ROW_KEYS},
                warnings=[],
                db_available=True,
            )
        try:
            provider_row, home_row = self._fetch_settings_rows(provider_id, home_id)
        except Exception:
            logger.warning(
                "provider_ai_settings_db_unavailable",
                extra={"provider_id": provider_id, "home_id": home_id},
            )
            safe = self._fail_safe_settings(provider_id=provider_id, home_id=home_id)
            return ProviderAISettingsSourceBundle(
                effective=safe,
                env_defaults=env,
                sources={key: "default" for key in SETTINGS_ROW_KEYS},
                warnings=["Database settings could not be loaded; safe restrictive defaults applied."],
                db_available=False,
            )

        provider_level = self._settings_from_row(provider_row, env, provider_id=provider_id, home_id=None) if provider_row else None
        home_override = self._settings_from_row(home_row, env, provider_id=provider_id, home_id=home_id) if home_row else None
        effective, sources = self._merge_strictest(env, provider_level, home_override)
        warnings = self._build_warnings(effective)
        return ProviderAISettingsSourceBundle(
            effective=effective,
            provider_level=provider_level,
            home_override=home_override,
            env_defaults=env,
            sources=sources,
            warnings=warnings,
            db_available=True,
        )

    def from_record(self, record: dict[str, Any] | None) -> ProviderDataIntelligenceSettings:
        if not record:
            return self.env_defaults()
        base = self.env_defaults(
            provider_id=record.get("provider_id"),
            home_id=record.get("home_id"),
        )
        data = base.model_dump()
        for key in data:
            if key in record and record[key] is not None:
                data[key] = record[key]
        data["external_ai_enabled"] = bool(data.get("external_ai_enabled"))
        data["redaction_mode"] = _normalise_redaction_mode(data.get("redaction_mode"))
        data["allowed_ai_features"] = _filter_allowed_features(data.get("allowed_ai_features"))
        if not data["external_ai_enabled"]:
            data["report_ai_drafting_enabled"] = False
        return ProviderDataIntelligenceSettings(**data)

    def _fail_safe_settings(
        self,
        *,
        provider_id: int | None,
        home_id: int | None,
    ) -> ProviderDataIntelligenceSettings:
        env = self.env_defaults(provider_id=provider_id, home_id=home_id)
        env_external = _env_bool("AI_EXTERNAL_PROCESSING_ENABLED", False)
        return ProviderDataIntelligenceSettings(
            provider_id=provider_id,
            home_id=home_id,
            external_ai_enabled=env_external and env.external_ai_enabled,
            redaction_mode="strict",
            allowed_ai_features=["metadata", "orb_text_fallback", "orb_chat_stream"]
            if not env_external
            else env.allowed_ai_features,
            orb_enabled=env.orb_enabled,
            realtime_voice_enabled=False,
            report_ai_drafting_enabled=False,
            premium_tts_enabled=False,
            transcript_storage=False,
            prompt_storage=False,
            local_policy_sources_enabled=False,
            demo_mode_disabled=env.demo_mode_disabled,
            inspection_readiness_enabled=env.inspection_readiness_enabled,
            metadata_extraction_enabled=env.metadata_extraction_enabled,
        )

    def _settings_from_row(
        self,
        row: dict[str, Any],
        env: ProviderDataIntelligenceSettings,
        *,
        provider_id: int,
        home_id: int | None,
    ) -> ProviderDataIntelligenceSettings:
        features = row.get("allowed_ai_features")
        if isinstance(features, str):
            try:
                features = json.loads(features)
            except json.JSONDecodeError:
                features = []
        merged = self.from_record(
            {
                "provider_id": provider_id,
                "home_id": home_id,
                "external_ai_enabled": row.get("external_ai_enabled"),
                "redaction_mode": row.get("redaction_mode"),
                "allowed_ai_features": features,
                "prompt_storage": row.get("prompt_storage"),
                "transcript_storage": row.get("transcript_storage"),
                "realtime_voice_enabled": row.get("realtime_voice_enabled"),
                "report_ai_drafting_enabled": row.get("report_ai_drafting_enabled"),
                "premium_tts_enabled": row.get("premium_tts_enabled"),
                "data_retention_days": row.get("data_retention_days"),
                "local_policy_sources_enabled": row.get("local_policy_sources_enabled"),
                "orb_enabled": env.orb_enabled,
                "demo_mode_disabled": env.demo_mode_disabled,
                "inspection_readiness_enabled": env.inspection_readiness_enabled,
                "metadata_extraction_enabled": env.metadata_extraction_enabled,
            }
        )
        return merged

    def _merge_strictest(
        self,
        env: ProviderDataIntelligenceSettings,
        provider_level: ProviderDataIntelligenceSettings | None,
        home_override: ProviderDataIntelligenceSettings | None,
    ) -> tuple[ProviderDataIntelligenceSettings, dict[str, str]]:
        base = provider_level or env
        base_source = "provider" if provider_level else "env"
        sources: dict[str, str] = {}

        def _bool_strict(*, provider_val: bool, home_val: bool | None) -> tuple[bool, str]:
            if home_override is not None:
                effective = provider_val and bool(home_val)
                if effective != provider_val:
                    return effective, "home"
                if not provider_val:
                    return effective, base_source
                return effective, "home" if home_val is False else base_source
            return provider_val, base_source

        external_ai, ext_src = _bool_strict(
            provider_val=base.external_ai_enabled,
            home_val=home_override.external_ai_enabled if home_override else None,
        )

        provider_redaction = base.redaction_mode
        home_redaction = home_override.redaction_mode if home_override else None
        redaction = _strictest_redaction(provider_redaction, home_redaction) if home_override else provider_redaction
        if home_override and redaction == home_redaction:
            red_src = "home"
        else:
            red_src = base_source

        prompt, prompt_src = _bool_strict(
            provider_val=base.prompt_storage,
            home_val=home_override.prompt_storage if home_override else None,
        )
        transcript, transcript_src = _bool_strict(
            provider_val=base.transcript_storage,
            home_val=home_override.transcript_storage if home_override else None,
        )
        voice, voice_src = _bool_strict(
            provider_val=base.realtime_voice_enabled,
            home_val=home_override.realtime_voice_enabled if home_override else None,
        )
        report_draft, report_src = _bool_strict(
            provider_val=base.report_ai_drafting_enabled,
            home_val=home_override.report_ai_drafting_enabled if home_override else None,
        )
        premium, premium_src = _bool_strict(
            provider_val=base.premium_tts_enabled,
            home_val=home_override.premium_tts_enabled if home_override else None,
        )
        local_policy, local_src = _bool_strict(
            provider_val=base.local_policy_sources_enabled,
            home_val=home_override.local_policy_sources_enabled if home_override else None,
        )

        provider_features = set(_filter_allowed_features(base.allowed_ai_features))
        if home_override:
            home_features = set(_filter_allowed_features(home_override.allowed_ai_features))
            allowed = sorted(provider_features & home_features) if home_features else sorted(provider_features)
            feat_src = "home" if allowed != sorted(provider_features) else base_source
        else:
            allowed = sorted(provider_features)
            feat_src = base_source

        if not external_ai:
            allowed = [f for f in allowed if f in {"metadata", "orb_text_fallback", "orb_chat_stream"}]
            report_draft = False

        retention = base.data_retention_days
        ret_src = base_source
        if home_override and home_override.data_retention_days is not None:
            home_days = home_override.data_retention_days
            if retention is None or home_days < retention:
                retention = home_days
                ret_src = "home"

        effective = ProviderDataIntelligenceSettings(
            provider_id=base.provider_id,
            home_id=home_override.home_id if home_override else base.home_id,
            external_ai_enabled=external_ai,
            redaction_mode=redaction,
            allowed_ai_features=allowed,
            orb_enabled=base.orb_enabled,
            realtime_voice_enabled=voice and external_ai,
            report_ai_drafting_enabled=report_draft and external_ai,
            premium_tts_enabled=premium and external_ai,
            data_retention_days=retention,
            local_policy_sources_enabled=local_policy,
            transcript_storage=transcript,
            prompt_storage=prompt,
            demo_mode_disabled=base.demo_mode_disabled,
            inspection_readiness_enabled=base.inspection_readiness_enabled,
            metadata_extraction_enabled=base.metadata_extraction_enabled,
        )

        sources.update(
            {
                "external_ai_enabled": ext_src,
                "redaction_mode": red_src,
                "allowed_ai_features": feat_src,
                "prompt_storage": prompt_src,
                "transcript_storage": transcript_src,
                "realtime_voice_enabled": voice_src,
                "report_ai_drafting_enabled": report_src,
                "premium_tts_enabled": premium_src,
                "local_policy_sources_enabled": local_src,
                "data_retention_days": ret_src,
            }
        )
        return effective, sources

    def _build_warnings(self, settings: ProviderDataIntelligenceSettings) -> list[str]:
        warnings: list[str] = []
        if settings.external_ai_enabled:
            warnings.append("External AI processing is enabled. Draft outputs require human review before records are finalised.")
        if settings.redaction_mode == "off":
            warnings.append("Redaction is disabled. Identifiers may be sent to external processors.")
        if settings.prompt_storage:
            warnings.append("Prompt storage is enabled. Conversation prompts may be retained.")
        if settings.transcript_storage:
            warnings.append("Transcript storage is enabled. Voice transcripts may be retained.")
        if settings.premium_tts_enabled:
            warnings.append("Premium voice uses an external provider for synthesis.")
        return warnings

    def _fetch_settings_rows(
        self,
        provider_id: int,
        home_id: int | None,
    ) -> tuple[dict[str, Any] | None, dict[str, Any] | None]:
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT *
                    FROM provider_ai_settings
                    WHERE provider_id = %s AND home_id IS NULL
                    LIMIT 1
                    """,
                    (provider_id,),
                )
                provider_row = cur.fetchone()
                home_row = None
                if home_id is not None:
                    cur.execute(
                        """
                        SELECT *
                        FROM provider_ai_settings
                        WHERE provider_id = %s AND home_id = %s
                        LIMIT 1
                        """,
                        (provider_id, home_id),
                    )
                    home_row = cur.fetchone()
            return (
                dict(provider_row) if provider_row else None,
                dict(home_row) if home_row else None,
            )
        finally:
            release_db_connection(conn)

    def upsert_settings(
        self,
        *,
        provider_id: int,
        home_id: int | None,
        updates: dict[str, Any],
        updated_by: int | None,
    ) -> dict[str, Any]:
        if not updates:
            return {}
        conn = get_db_connection()
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    SELECT id FROM provider_ai_settings
                    WHERE provider_id = %s AND home_id IS NOT DISTINCT FROM %s
                    LIMIT 1
                    """,
                    (provider_id, home_id),
                )
                existing = cur.fetchone()
                payload: dict[str, Any] = {}
                for key in SETTINGS_ROW_KEYS:
                    if key not in updates:
                        continue
                    val = updates[key]
                    if key == "allowed_ai_features":
                        val = _filter_allowed_features(val if isinstance(val, list) else [])
                    payload[key] = val

                if existing:
                    set_parts = [f"{col} = %s" for col in payload]
                    set_parts.append("updated_at = NOW()")
                    set_parts.append("updated_by = %s")
                    cur.execute(
                        f"""
                        UPDATE provider_ai_settings
                        SET {", ".join(set_parts)}
                        WHERE provider_id = %s AND home_id IS NOT DISTINCT FROM %s
                        RETURNING *
                        """,
                        (*payload.values(), updated_by, provider_id, home_id),
                    )
                else:
                    cols = ["provider_id", "home_id", *payload.keys(), "updated_by"]
                    placeholders = ", ".join(["%s"] * len(cols))
                    cur.execute(
                        f"""
                        INSERT INTO provider_ai_settings ({", ".join(cols)}, updated_at)
                        VALUES ({placeholders}, NOW())
                        RETURNING *
                        """,
                        (provider_id, home_id, *payload.values(), updated_by),
                    )
                row = cur.fetchone()
            conn.commit()
            return dict(row) if row else {}
        except Exception:
            conn.rollback()
            raise
        finally:
            release_db_connection(conn)

    def write_settings_audit(
        self,
        *,
        provider_id: int,
        home_id: int | None,
        changed_by: int | None,
        changes: list[tuple[str, Any, Any]],
        acknowledgement_flags: dict[str, Any],
        metadata: dict[str, Any] | None = None,
    ) -> None:
        if not changes:
            return
        conn = get_db_connection()
        try:
            with conn.cursor() as cur:
                for setting_key, previous_value, new_value in changes:
                    cur.execute(
                        """
                        INSERT INTO provider_ai_settings_audit (
                            provider_id, home_id, changed_by, setting_key,
                            previous_value, new_value, acknowledgement_flags, metadata
                        ) VALUES (%s, %s, %s, %s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb)
                        """,
                        (
                            provider_id,
                            home_id,
                            changed_by,
                            setting_key,
                            json.dumps(previous_value),
                            json.dumps(new_value),
                            json.dumps(acknowledgement_flags or {}),
                            json.dumps(metadata or {}),
                        ),
                    )
            conn.commit()
        except Exception:
            conn.rollback()
            logger.warning("provider_ai_settings_audit_write_failed", exc_info=True)
        finally:
            release_db_connection(conn)


provider_data_intelligence_settings_service = ProviderDataIntelligenceSettingsService()
