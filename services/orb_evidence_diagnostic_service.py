"""Small diagnostic helper for ORB evidence collection.

This module keeps ORB evidence diagnostics separate from the large assistant and
collector services so changes can be reviewed safely. It does not query the
model. It only summarises what the evidence collector already returned.
"""

from __future__ import annotations

from typing import Any


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


class OrbEvidenceDiagnosticService:
    """Build compact diagnostic metadata for ORB evidence routing."""

    def from_universal_result(
        self,
        result: dict[str, Any] | None,
        *,
        scope: str | None = None,
        child_id: int | None = None,
        home_id: int | None = None,
        provider_id: int | None = None,
        message: str | None = None,
    ) -> dict[str, Any]:
        data = result or {}
        items = list(data.get("items") or [])
        counts = dict(data.get("counts") or {})
        table_counts: dict[str, int] = {}
        first_tables: list[str] = []
        first_types: list[str] = []

        for item in items:
            table = _text(item.get("source_table"), "unknown")
            source_type = _text(item.get("source_type"), "unknown")
            table_counts[table] = table_counts.get(table, 0) + 1
            if table and table not in first_tables and len(first_tables) < 12:
                first_tables.append(table)
            if source_type and source_type not in first_types and len(first_types) < 12:
                first_types.append(source_type)

        text = _text(message).lower()
        journey_question = any(
            term in text
            for term in (
                "journey",
                "recent",
                "what changed",
                "summarise",
                "summarize",
                "daily brief",
                "today",
            )
        )

        return {
            "scope": scope,
            "child_id": child_id,
            "home_id": home_id,
            "provider_id": provider_id,
            "journey_question": journey_question,
            "total_items": len(items),
            "surface_count": data.get("surface_count"),
            "type_counts": counts,
            "table_counts": table_counts,
            "first_tables": first_tables,
            "first_source_types": first_types,
            "errors": list(data.get("errors") or [])[:8],
        }


orb_evidence_diagnostic_service = OrbEvidenceDiagnosticService()
