"""Founder/admin analytics foundation — anonymised aggregates by default."""

from __future__ import annotations

import re
from typing import Any

BLOCKED_ANALYTICS_KEYS = frozenset({
    "child_name",
    "child_id",
    "young_person_name",
    "staff_name",
    "staff_id",
    "user_name",
    "email",
    "phone",
    "address",
    "postcode",
    "nhs_number",
    "date_of_birth",
    "body",
    "record_body",
    "transcript",
})

IDENTIFIER_PATTERNS = (
    re.compile(r"\b[A-Z]{1,2}\d{6,}\b"),  # common ID-like tokens
    re.compile(r"\b\d{1,2}/\d{1,2}/\d{2,4}\b"),  # dates that may be DOB
)

FOUNDER_ANALYTICS_DISCLAIMER = (
    "Founder analytics use anonymised and aggregated operational metadata by default. "
    "Child and staff identifiers are redacted. Founder access to child-level records "
    "requires explicit authorisation and must be legally appropriate."
)


def redact_founder_analytics_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Redact identifiable fields from founder analytics payloads."""

    def _walk(value: Any) -> Any:
        if isinstance(value, dict):
            return {
                k: "[REDACTED]"
                if k.lower() in BLOCKED_ANALYTICS_KEYS
                else _walk(v)
                for k, v in value.items()
            }
        if isinstance(value, list):
            return [_walk(item) for item in value]
        if isinstance(value, str):
            redacted = value
            for pattern in IDENTIFIER_PATTERNS:
                redacted = pattern.sub("[REDACTED]", redacted)
            return redacted
        return value

    return _walk(payload)


class OrbFounderAnalyticsFoundationService:
    def disclaimer(self) -> str:
        return FOUNDER_ANALYTICS_DISCLAIMER

    def redact_identifiers_by_default(self, payload: dict[str, Any]) -> dict[str, Any]:
        return redact_founder_analytics_payload(payload)

    def aggregate_template_usage(
        self, events: list[dict[str, Any]], *, redact: bool = True
    ) -> dict[str, Any]:
        counts: dict[str, int] = {}
        for event in events:
            data = redact_founder_analytics_payload(event) if redact else event
            template_id = data.get("template_id") or data.get("metadata", {}).get("template_id")
            if template_id:
                counts[str(template_id)] = counts.get(str(template_id), 0) + 1
        top = sorted(counts.items(), key=lambda x: x[1], reverse=True)[:20]
        return {
            "total_events": len(events),
            "unique_templates": len(counts),
            "most_used_templates": [{"template_id": t, "count": c} for t, c in top],
            "identifiers_redacted": redact,
            "disclaimer": self.disclaimer(),
        }

    def founder_console_capabilities(self) -> dict[str, Any]:
        return {
            "visibility": [
                "users",
                "organisations_homes",
                "uploads",
                "document_processing_status",
                "template_usage",
                "category_usage",
                "questions_asked_privacy_controls",
                "answer_quality_flags",
                "safety_flags",
                "guardrail_events",
                "feedback",
                "exports",
                "saved_records_count",
                "usage_trends",
                "most_used_templates",
                "failed_responses",
                "provider_errors",
                "latency",
                "pilot_feedback",
                "anonymised_market_research_reports",
                "investor_traction_reports",
            ],
            "actions": [
                "add_user",
                "disable_user",
                "reset_mfa_invite_user",
                "assign_role",
                "view_audit_logs",
                "view_aggregated_analytics",
                "generate_anonymised_report",
                "export_pilot_evidence_pack",
            ],
            "governance": [
                "role_based_access",
                "admin_actions_audited",
                "identifiers_redacted_by_default",
                "no_child_level_records_without_authorisation",
                "operational_admin_separate_from_product_analytics",
            ],
            "existing_routes": {
                "founder_os": "/founder-os/*",
                "founder_telemetry": "/founder-os/telemetry/*",
                "admin_users": "/admin/*",
                "orb_admin": "/orb/admin/*",
            },
        }


orb_founder_analytics_foundation_service = OrbFounderAnalyticsFoundationService()
