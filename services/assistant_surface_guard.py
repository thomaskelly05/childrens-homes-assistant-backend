from __future__ import annotations

"""Hard boundary rules between standalone assistant and OS-embedded assistant.

This module is intentionally small and dependency-light so every assistant
entrypoint can call it before prompt construction, model calls or response
post-processing.

Hard rule:
- Standalone assistant must never receive, request, use or imply access to
  IndiCare OS records.
- OS-embedded assistants must never fall back to standalone/general-chat record
  reasoning. Record-specific answers require scoped OS evidence or an explicit
  missing-evidence response.
"""

from dataclasses import dataclass, field
from typing import Any


OS_ASSISTANT_TYPES = {
    "young_people_os",
    "home_os",
    "quality_os",
    "ofsted_os",
    "manager_os",
}

OS_SCOPE_TYPES = {
    "young_person",
    "child",
    "home",
    "quality",
}

OS_CONTEXT_KEYS = {
    "young_person",
    "young_person_id",
    "young_person_name",
    "home",
    "home_id",
    "home_name",
    "scope",
    "scope_type",
    "allowed_home_ids",
    "provider_id",
    "access_level",
    "evidence_index",
    "sources",
    "report_snapshot",
    "recent_records",
    "active_work",
    "incidents",
    "safeguarding_summary",
    "incident_summary",
    "compliance_summary",
    "staffing_summary",
    "supervision_summary",
    "management_summary",
    "inspection_actions",
    "inspection_lines",
    "audits",
    "compliance_items",
    "children_outcomes",
}

RECORD_SPECIFIC_TERMS = {
    "record",
    "records",
    "child file",
    "young person's file",
    "young persons file",
    "whole scoped record",
    "across all records",
    "full record",
    "chronology",
    "timeline",
    "handover",
    "daily note",
    "daily log",
    "incident",
    "risk assessment",
    "care plan",
    "placement plan",
    "reg 45",
    "reg45",
    "quality of care review",
    "inspection evidence",
    "what does the record show",
    "what do the records show",
}


@dataclass(frozen=True)
class SurfaceBoundaryResult:
    assistant_surface: str
    assistant_type: str
    requires_evidence_grounding: bool
    has_os_context: bool
    has_evidence: bool
    record_specific_request: bool
    violations: list[str] = field(default_factory=list)

    @property
    def ok(self) -> bool:
        return not self.violations


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_surface(value: Any) -> str:
    text = _safe_string(value).lower()
    if text in {"standalone", "os_embedded"}:
        return text
    return ""


def _normalise_assistant_type(value: Any) -> str:
    return _safe_string(value).lower() or "standalone"


def _scope_type_from_context(user_context: dict[str, Any]) -> str:
    scope_type = _safe_string(user_context.get("scope_type")).lower()
    if scope_type:
        return scope_type

    scope = user_context.get("scope")
    if isinstance(scope, dict):
        return _safe_string(scope.get("scope_type") or scope.get("scope")).lower()

    return _safe_string(scope).lower()


def infer_assistant_surface(user_context: dict[str, Any] | None) -> str:
    context = user_context or {}
    explicit = _normalise_surface(context.get("assistant_surface"))
    if explicit:
        return explicit

    assistant_type = _normalise_assistant_type(context.get("assistant_type"))
    if assistant_type in OS_ASSISTANT_TYPES or assistant_type.endswith("_os"):
        return "os_embedded"

    scope_type = _scope_type_from_context(context)
    if scope_type in OS_SCOPE_TYPES:
        return "os_embedded"

    if has_os_context(context):
        return "os_embedded"

    return "standalone"


def has_os_context(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict) or not user_context:
        return False

    if any(key in user_context and user_context.get(key) not in (None, "", [], {}) for key in OS_CONTEXT_KEYS):
        return True

    nested = user_context.get("context")
    if isinstance(nested, dict):
        return has_os_context(nested)

    runtime = user_context.get("runtime")
    if isinstance(runtime, dict):
        return has_os_context(runtime)

    return False


def has_visible_evidence(user_context: dict[str, Any] | None) -> bool:
    if not isinstance(user_context, dict):
        return False

    for key in ("evidence_index", "sources"):
        value = user_context.get(key)
        if isinstance(value, list) and len(value) > 0:
            return True

    for key in ("context", "runtime"):
        nested = user_context.get(key)
        if isinstance(nested, dict) and has_visible_evidence(nested):
            return True

    return False


def is_record_specific_request(message: str) -> bool:
    text = _safe_string(message).lower()
    return any(term in text for term in RECORD_SPECIFIC_TERMS)


def build_surface_boundary_result(
    *,
    message: str,
    user_context: dict[str, Any] | None = None,
) -> SurfaceBoundaryResult:
    context = user_context or {}
    assistant_type = _normalise_assistant_type(context.get("assistant_type"))
    assistant_surface = infer_assistant_surface(context)
    context_has_os_data = has_os_context(context)
    context_has_evidence = has_visible_evidence(context)
    record_specific = is_record_specific_request(message)

    violations: list[str] = []

    if assistant_surface == "standalone" and context_has_os_data:
        violations.append("standalone_received_os_context")

    if assistant_surface == "standalone" and assistant_type in OS_ASSISTANT_TYPES:
        violations.append("standalone_declared_with_os_assistant_type")

    if assistant_surface == "os_embedded" and assistant_type == "standalone":
        violations.append("os_surface_declared_with_standalone_type")

    if assistant_surface == "os_embedded" and record_specific and not context_has_evidence:
        violations.append("os_record_specific_request_without_visible_evidence")

    return SurfaceBoundaryResult(
        assistant_surface=assistant_surface,
        assistant_type=assistant_type,
        requires_evidence_grounding=assistant_surface == "os_embedded",
        has_os_context=context_has_os_data,
        has_evidence=context_has_evidence,
        record_specific_request=record_specific,
        violations=violations,
    )


def enforce_surface_boundary(
    *,
    message: str,
    user_context: dict[str, Any] | None = None,
    raise_on_violation: bool = True,
) -> SurfaceBoundaryResult:
    result = build_surface_boundary_result(
        message=message,
        user_context=user_context,
    )

    if raise_on_violation and result.violations:
        raise ValueError(
            "Assistant surface boundary violation: " + ", ".join(result.violations)
        )

    return result


def enrich_with_surface_boundary(
    *,
    message: str,
    user_context: dict[str, Any] | None = None,
    raise_on_violation: bool = False,
) -> dict[str, Any]:
    context = dict(user_context or {})
    result = enforce_surface_boundary(
        message=message,
        user_context=context,
        raise_on_violation=raise_on_violation,
    )

    context["assistant_surface"] = result.assistant_surface
    context["assistant_type"] = result.assistant_type
    context["requires_evidence_grounding"] = result.requires_evidence_grounding
    context["surface_boundary"] = {
        "assistant_surface": result.assistant_surface,
        "assistant_type": result.assistant_type,
        "requires_evidence_grounding": result.requires_evidence_grounding,
        "has_os_context": result.has_os_context,
        "has_evidence": result.has_evidence,
        "record_specific_request": result.record_specific_request,
        "violations": result.violations,
    }

    return context
