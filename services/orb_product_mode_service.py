from __future__ import annotations

from typing import Any

from schemas.orb_identity import OrbProductMode


OS_CONTEXT_KEYS = {
    "home_id",
    "home_scope",
    "selected_young_person_id",
    "selected_young_person_key",
    "selected_record_id",
    "selected_record_type",
    "current_record_summary",
    "current_child",
    "child_context_lock",
    "current_shift",
    "operational_memory",
    "assistant_context",
}


class OrbProductModeService:
    """Separates embedded OS ORB from standalone ORB before retrieval is considered."""

    def normalise(self, product_mode: OrbProductMode | str | None, route: str | None = None) -> OrbProductMode:
        if product_mode:
            return OrbProductMode(str(product_mode))
        if route and route.startswith("/assistant"):
            return OrbProductMode.STANDALONE
        return OrbProductMode.OS_EMBEDDED

    def standalone_context_violations(self, context: dict[str, Any] | Any) -> list[str]:
        data = context.model_dump() if hasattr(context, "model_dump") else dict(context or {})
        violations: list[str] = []
        for key in OS_CONTEXT_KEYS:
            if data.get(key) not in (None, "", [], {}):
                violations.append(key)
        return violations

    def sanitize_for_standalone(self, context: dict[str, Any] | Any) -> dict[str, Any]:
        data = context.model_dump() if hasattr(context, "model_dump") else dict(context or {})
        for key in OS_CONTEXT_KEYS:
            if isinstance(data.get(key), list):
                data[key] = []
            elif isinstance(data.get(key), dict):
                data[key] = {}
            else:
                data[key] = None
        data["product_mode"] = OrbProductMode.STANDALONE.value
        data["route"] = "/assistant"
        data["workspace"] = "standalone_orb"
        return data

    def retrieval_allowed(self, *, product_mode: OrbProductMode | str, tool_category: str) -> bool:
        mode = OrbProductMode(str(product_mode))
        if mode == OrbProductMode.OS_EMBEDDED:
            return True
        return tool_category in {"general_model", "static_sector_knowledge", "uploads", "web_lookup_if_configured"}


orb_product_mode_service = OrbProductModeService()

