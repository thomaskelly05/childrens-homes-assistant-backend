"""Reduce operational context to minimum safe fields before AI model use."""

from __future__ import annotations

import copy
from typing import Any

from schemas.ai_privacy import (
    AiContextMinimisationRequest,
    AiContextMinimisationResult,
    AiDataClass,
    AiPrivacyAction,
)

DEFAULT_ALLOWED_FIELDS = frozenset(
    {
        "headline",
        "summary_lines",
        "themes",
        "attention_items",
        "record_quality_notes",
        "safeguarding_signals",
        "ofsted_evidence_notes",
        "staff_support_notes",
        "child_journey_notes",
        "governance_notes",
        "degraded",
        "unavailable",
        "permission_warnings",
        "count",
        "counts",
        "severity",
        "priority",
        "risk_level",
        "review_status",
        "action_status",
        "source_type",
        "source_label",
        "label",
        "route",
        "route_hint",
        "basis",
        "type",
        "mode",
        "scope",
    }
)

BLOCKED_FIELD_KEYS = frozenset(
    {
        "body",
        "raw_body",
        "narrative",
        "content",
        "content_markdown",
        "text",
        "transcript",
        "daily_note",
        "record_body",
        "full_address",
        "address",
        "dob",
        "date_of_birth",
        "nhs_number",
        "phone",
        "email",
        "family_member_names",
        "school_name",
        "body_map_detail",
        "raw_context",
        "prompt",
        "answer_text",
    }
)


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


class AiContextMinimisationService:
    def minimise_context(
        self,
        context: dict[str, Any],
        action: AiPrivacyAction = "send_to_model",
        data_classes: list[AiDataClass] | None = None,
        allowed_fields: list[str] | None = None,
    ) -> AiContextMinimisationResult:
        req = AiContextMinimisationRequest(
            context=context,
            action=action,
            data_classes=list(data_classes or []),
            allowed_fields=allowed_fields,
        )
        return self.minimise(req)

    def minimise(self, request: AiContextMinimisationRequest) -> AiContextMinimisationResult:
        original = copy.deepcopy(request.context or {})
        allowed = set(request.allowed_fields or DEFAULT_ALLOWED_FIELDS)
        minimised, blocked = self._minimise_value(original, allowed, path="")
        summary = self.build_minimisation_summary(original, minimised)
        return AiContextMinimisationResult(
            context=minimised,
            minimisation_applied=bool(blocked),
            blocked_fields=sorted(set(blocked)),
            summary=summary,
            warnings=[
                "Context minimised to summary-level fields before model use.",
            ],
        )

    def summarise_record_for_ai(self, record: dict[str, Any], purpose: str = "") -> dict[str, Any]:
        _ = purpose
        safe: dict[str, Any] = {}
        for key in ("record_type", "category", "severity", "review_status", "created_at", "themes"):
            if key in record:
                safe[key] = record[key]
        if record.get("summary"):
            safe["summary"] = _text(record.get("summary"))[:400]
        return safe

    def summarise_child_context(self, context: dict[str, Any], purpose: str = "") -> dict[str, Any]:
        result = self.minimise_context(context, action="use_child_context", data_classes=["child_record_summary"])
        result.context["purpose"] = purpose or "operational_summary"
        return result.context

    def summarise_staff_context(self, context: dict[str, Any], purpose: str = "") -> dict[str, Any]:
        result = self.minimise_context(context, action="use_staff_context", data_classes=["staff_record"])
        result.context["purpose"] = purpose or "workforce_summary"
        return result.context

    def strip_raw_bodies(self, context: dict[str, Any]) -> dict[str, Any]:
        return self.minimise_context(context).context

    def keep_allowed_fields(self, context: dict[str, Any], allowed_fields: list[str]) -> dict[str, Any]:
        return self.minimise_context(context, allowed_fields=allowed_fields).context

    def remove_unnecessary_identifiers(self, context: dict[str, Any]) -> dict[str, Any]:
        stripped = copy.deepcopy(context)
        for key in list(stripped.keys()):
            if key.lower() in BLOCKED_FIELD_KEYS:
                stripped.pop(key, None)
        return stripped

    def build_minimisation_summary(self, original: dict[str, Any], minimised: dict[str, Any]) -> str:
        orig_keys = len(self._flatten_keys(original))
        mini_keys = len(self._flatten_keys(minimised))
        return f"Minimised context from {orig_keys} to {mini_keys} field paths (summary-level only)."

    def _minimise_value(
        self,
        value: Any,
        allowed: set[str],
        *,
        path: str,
    ) -> tuple[Any, list[str]]:
        blocked: list[str] = []
        if isinstance(value, dict):
            out: dict[str, Any] = {}
            for key, item in value.items():
                key_lower = str(key).lower()
                child_path = f"{path}.{key}" if path else key
                if key_lower in BLOCKED_FIELD_KEYS:
                    blocked.append(child_path)
                    continue
                if key_lower in allowed or key_lower.endswith("_notes") or key_lower.endswith("_signals"):
                    cleaned, child_blocked = self._minimise_value(item, allowed, path=child_path)
                    out[key] = cleaned
                    blocked.extend(child_blocked)
                elif isinstance(item, (dict, list)):
                    cleaned, child_blocked = self._minimise_value(item, allowed, path=child_path)
                    if cleaned not in (None, {}, []):
                        out[key] = cleaned
                    blocked.extend(child_blocked)
                else:
                    blocked.append(child_path)
            return out, blocked
        if isinstance(value, list):
            out_list = []
            for index, item in enumerate(value[:20]):
                cleaned, child_blocked = self._minimise_value(
                    item, allowed, path=f"{path}[{index}]"
                )
                if cleaned not in (None, {}, []):
                    out_list.append(cleaned)
                blocked.extend(child_blocked)
            return out_list, blocked
        if isinstance(value, str) and len(value) > 1200:
            return value[:1200] + "…", blocked
        return value, blocked

    def _flatten_keys(self, value: Any, prefix: str = "") -> list[str]:
        keys: list[str] = []
        if isinstance(value, dict):
            for key, item in value.items():
                path = f"{prefix}.{key}" if prefix else str(key)
                keys.append(path)
                keys.extend(self._flatten_keys(item, path))
        elif isinstance(value, list):
            for index, item in enumerate(value[:10]):
                keys.extend(self._flatten_keys(item, f"{prefix}[{index}]"))
        return keys


ai_context_minimisation_service = AiContextMinimisationService()
