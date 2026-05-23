"""Retention policy foundation for AI artefacts — notices only in this pass."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from schemas.ai_privacy import AiDataClass, AiPrivacySurface, AiRetentionPolicy

SURFACE_RETENTION: dict[str, tuple[int | None, str, bool]] = {
    "standalone_orb": (None, "Standalone chats are user-controlled in the client session.", True),
    "operational_orb": (90, "Operational ORB context summaries follow OS retention policies.", False),
    "record_hub": (90, "Recording support drafts follow care record retention.", False),
    "care_hub": (90, "Care Hub intelligence summaries follow OS retention.", False),
    "intelligence_spine": (365, "Intelligence spine metadata retained per governance policy.", False),
    "governance_dashboard": (365, "Governance telemetry metadata retained for oversight.", False),
    "knowledge_library": (None, "Knowledge sources retained until archived or reviewed.", True),
    "operational_outputs": (365, "Operational outputs follow OS artefact retention.", False),
    "saved_outputs": (None, "Standalone saved outputs are user-controlled.", True),
}

DATA_CLASS_RETENTION: dict[str, str] = {
    "child_record_raw": "Do not persist raw child record text in AI telemetry.",
    "safeguarding_raw": "Escalate and retain only redacted summaries in AI audit metadata.",
    "health_medication": "Health data in AI context should be ephemeral unless policy allows.",
    "body_map": "Body-map references must not be stored in governance events.",
    "AI_governance_metadata": "Governance events: metadata only, aligned with audit retention.",
}


class AiRetentionPolicyService:
    def retention_for_surface(self, surface: AiPrivacySurface | str) -> AiRetentionPolicy:
        days, notice, user_controlled = SURFACE_RETENTION.get(
            str(surface),
            (90, "Default OS AI metadata retention applies.", False),
        )
        return AiRetentionPolicy(
            surface=surface,  # type: ignore[arg-type]
            retention_days=days,
            notice=notice,
            user_controlled=user_controlled,
            ephemeral=days is not None and days <= 7,
        )

    def retention_for_data_class(self, data_class: AiDataClass | str) -> AiRetentionPolicy:
        notice = DATA_CLASS_RETENTION.get(
            str(data_class),
            "Apply minimum necessary retention for this data class.",
        )
        return AiRetentionPolicy(
            surface="operational_orb",
            data_classes=[data_class],  # type: ignore[list-item]
            retention_days=30 if "raw" in str(data_class) else 90,
            notice=notice,
            ephemeral="raw" in str(data_class),
        )

    def retention_for_output_type(self, output_type: str) -> AiRetentionPolicy:
        if output_type.startswith("safeguarding"):
            return AiRetentionPolicy(
                surface="operational_outputs",
                retention_days=365,
                notice="Safeguarding operational outputs require manager review and longer retention.",
            )
        return AiRetentionPolicy(
            surface="operational_outputs",
            retention_days=180,
            notice="Operational outputs follow home retention schedule.",
        )

    def should_expire_temp_context(self, created_at: datetime | str | None) -> bool:
        if created_at is None:
            return False
        if isinstance(created_at, str):
            try:
                created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except ValueError:
                return False
        else:
            created = created_at
        if created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        return datetime.now(timezone.utc) - created > timedelta(hours=24)

    def retention_notice(
        self,
        surface: AiPrivacySurface | str,
        data_classes: list[AiDataClass] | None = None,
    ) -> str:
        base = self.retention_for_surface(surface).notice
        if not data_classes:
            return base
        extras = [DATA_CLASS_RETENTION.get(dc, "") for dc in data_classes if dc in DATA_CLASS_RETENTION]
        if extras:
            return base + " " + " ".join(extras)
        return base


ai_retention_policy_service = AiRetentionPolicyService()
