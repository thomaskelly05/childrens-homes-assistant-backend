"""Product boundary enforcement for OS Orb and standalone assistant surfaces."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from schemas.standalone_assistant import AssistantProductMode


OS_RETRIEVAL_TOOLS = {
    "assistant_retrieval",
    "chronology_retrieval",
    "young_person_records",
    "home_records",
    "staff_records",
    "actions_retrieval",
    "evidence_retrieval",
    "os_citations",
}

STATIC_KNOWLEDGE_SOURCE_TYPES = {
    "static_regulation",
    "static_framework",
    "static_guidance",
    "uploaded_source",
}

UNSAFE_CONTEXT_KEYS = {
    "home_id",
    "home_scope",
    "allowed_home_ids",
    "selected_young_person_id",
    "selected_record_id",
    "selected_record_type",
    "selected_report_id",
    "selected_document_id",
    "visible_chronology_ids",
    "visible_action_ids",
    "visible_evidence_ids",
    "selected_record_summary",
    "current_child",
    "current_record_summary",
    "young_person_id",
    "young_person_name",
    "child_id",
    "child_name",
    "evidence_index",
    "sources",
    "recent_records",
}


@dataclass(frozen=True)
class AssistantBoundaryDecision:
    product_mode: AssistantProductMode
    retrieval_policy: str
    memory_store: str
    audit_event_type: str
    allowed_tool_categories: tuple[str, ...]
    violations: tuple[str, ...] = field(default_factory=tuple)

    @property
    def ok(self) -> bool:
        return not self.violations


def _context_value(context: Any, key: str) -> Any:
    if isinstance(context, dict):
        return context.get(key)
    return getattr(context, key, None)


def _context_has_value(context: Any, key: str) -> bool:
    value = _context_value(context, key)
    return value not in (None, "", [], {})


def infer_assistant_product_mode(context: Any = None, mode: str | None = None) -> AssistantProductMode:
    explicit = str(_context_value(context, "assistant_product_mode") or _context_value(context, "product_mode") or "").strip().lower()
    if explicit in {item.value for item in AssistantProductMode}:
        return AssistantProductMode(explicit)

    assistant_mode = str(mode or _context_value(context, "assistant_mode") or "").strip().lower()
    route = str(_context_value(context, "current_route") or _context_value(context, "route") or "").strip().lower()
    workspace = str(_context_value(context, "current_workspace_type") or _context_value(context, "workspace") or "").strip().lower()

    if assistant_mode == "standalone" or route == "/assistant" or route.startswith("/assistant/") or workspace == "standalone_assistant":
        return AssistantProductMode.STANDALONE_ASSISTANT

    return AssistantProductMode.OS_ORB


def build_product_boundary_decision(context: Any = None, mode: str | None = None) -> AssistantBoundaryDecision:
    product_mode = infer_assistant_product_mode(context, mode)
    violations: list[str] = []

    if product_mode == AssistantProductMode.STANDALONE_ASSISTANT:
        if str(_context_value(context, "current_route") or "").startswith("/os/"):
            violations.append("standalone_assistant_cannot_access_os_route")
        if any(_context_has_value(context, key) for key in UNSAFE_CONTEXT_KEYS):
            violations.append("standalone_assistant_received_os_context")
        return AssistantBoundaryDecision(
            product_mode=product_mode,
            retrieval_policy="static_sector_and_general_only",
            memory_store="standalone_assistant_memory",
            audit_event_type="standalone_assistant.query",
            allowed_tool_categories=("general_model", "static_sector_knowledge", "uploads", "web_lookup_if_configured"),
            violations=tuple(violations),
        )

    return AssistantBoundaryDecision(
        product_mode=AssistantProductMode.OS_ORB,
        retrieval_policy="rbac_home_child_scoped_os_retrieval",
        memory_store="os_orb_session_memory",
        audit_event_type="os_orb.query",
        allowed_tool_categories=("general_model", "static_sector_knowledge", "scoped_os_retrieval"),
        violations=tuple(violations),
    )


def sanitize_standalone_context(context: Any) -> Any:
    """Return a copy of a shared context with OS scope removed for standalone mode."""

    data = context.model_dump() if hasattr(context, "model_dump") else dict(context or {})
    for key in UNSAFE_CONTEXT_KEYS:
        if isinstance(data.get(key), list):
            data[key] = []
        elif isinstance(data.get(key), dict):
            data[key] = {}
        else:
            data[key] = None
    data["assistant_product_mode"] = AssistantProductMode.STANDALONE_ASSISTANT.value
    data["current_route"] = "/assistant"
    data["current_workspace_type"] = "standalone_assistant"

    if hasattr(context, "model_copy"):
        return context.model_copy(update=data)
    return data


def clear_unsafe_context_on_switch(target_mode: AssistantProductMode | str, context: dict[str, Any]) -> dict[str, Any]:
    product_mode = AssistantProductMode(str(target_mode))
    if product_mode != AssistantProductMode.STANDALONE_ASSISTANT:
        return dict(context)
    return sanitize_standalone_context(context)


def assert_tool_allowed(product_mode: AssistantProductMode | str, tool_name: str) -> None:
    mode = AssistantProductMode(str(product_mode))
    if mode == AssistantProductMode.STANDALONE_ASSISTANT and tool_name in OS_RETRIEVAL_TOOLS:
        raise PermissionError(f"{tool_name} is not available to standalone assistant")


def assert_citations_allowed(product_mode: AssistantProductMode | str, citations: list[dict[str, Any]]) -> None:
    mode = AssistantProductMode(str(product_mode))
    if mode != AssistantProductMode.STANDALONE_ASSISTANT:
        return
    blocked = [
        citation
        for citation in citations
        if str(citation.get("source_type") or "") not in STATIC_KNOWLEDGE_SOURCE_TYPES
        or str(citation.get("route") or "").startswith(("/young-people", "/chronology", "/actions", "/evidence", "/os"))
        or citation.get("young_person_name")
    ]
    if blocked:
        raise PermissionError("standalone_assistant_cannot_use_os_citations")
