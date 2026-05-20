from __future__ import annotations

from typing import Any


METADATA_KEYS = (
    "chronology_metadata",
    "evidence_metadata",
    "document_metadata",
    "risk_metadata",
    "regulatory_metadata",
    "workforce_metadata",
    "governance_metadata",
    "projection_metadata",
)


def _text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _count(collection: Any) -> int:
    return len(collection) if isinstance(collection, list) else 0


class OrbMetadataFirstContextService:
    """Builds low-cost ORB context from existing projections and record metadata."""

    def build(
        self,
        *,
        snapshots: list[dict[str, Any]],
        chronology: list[dict[str, Any]] | None = None,
        evidence: list[dict[str, Any]] | None = None,
        documents: list[dict[str, Any]] | None = None,
        actions: list[dict[str, Any]] | None = None,
        reports: list[dict[str, Any]] | None = None,
        workforce: dict[str, Any] | None = None,
        governance: dict[str, Any] | None = None,
        live_tables: list[str] | None = None,
        pool: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        snapshot_sources = [self._snapshot_source(row, index + 1) for index, row in enumerate(snapshots)]
        metadata_used = {
            "chronology_metadata": {
                "record_count": _count(chronology),
                "projection_count": sum(1 for row in snapshots if _text(row.get("projection_type")).startswith("chronology")),
                "deterministic": bool(chronology),
            },
            "evidence_metadata": {
                "record_count": _count(evidence),
                "link_count": sum(len(item.get("evidence_ids") or []) for item in chronology or [] if isinstance(item, dict)),
                "deterministic": bool(evidence),
            },
            "document_metadata": {
                "record_count": _count(documents),
                "review_states": sorted({_text(item.get("status"), "unknown") for item in documents or []})[:8],
                "deterministic": bool(documents),
            },
            "risk_metadata": {
                "safeguarding_record_count": sum(
                    1
                    for item in chronology or []
                    if "safeguarding" in _text(item.get("source_type") or item.get("category") or item.get("title")).lower()
                ),
                "deterministic": bool(chronology),
            },
            "regulatory_metadata": {
                "linked_record_count": sum(
                    1
                    for item in [*(chronology or []), *(evidence or []), *(documents or []), *(reports or [])]
                    if item.get("regulation_links") or item.get("sccif_links") or item.get("linked_regulation")
                ),
                "deterministic": bool(evidence or documents or reports),
            },
            "workforce_metadata": {
                "available": bool(workforce),
                "evidence_count": len((workforce or {}).get("evidence_sources") or []),
                "deterministic": bool(workforce),
            },
            "governance_metadata": {
                "available": bool(governance),
                "evidence_matrix_available": bool((governance or {}).get("evidence_matrix")),
                "deterministic": bool(governance),
            },
            "projection_metadata": {
                "snapshot_count": len(snapshots),
                "projection_keys": [_text(row.get("projection_key")) for row in snapshots if _text(row.get("projection_key"))],
                "snapshot_hit": bool(snapshots),
                "cache_first": True,
            },
        }
        cheap_record_count = len(snapshot_sources) + _count(chronology) + _count(evidence) + _count(documents)
        pool_saturated = bool((pool or {}).get("saturated"))
        return {
            "metadata_used": metadata_used,
            "snapshot_sources": snapshot_sources,
            "projection_keys": metadata_used["projection_metadata"]["projection_keys"],
            "deterministic_answer_possible": cheap_record_count > 0,
            "model_call_needed": False,
            "cost_strategy": {
                "order": [
                    "projection_snapshots",
                    "operational_metadata",
                    "regulatory_metadata",
                    "chronology_projection",
                    "evidence_links",
                    "live_delta_reads",
                    "model_call_if_useful",
                ],
                "live_delta_reads_skipped": pool_saturated,
                "live_tables": live_tables or [],
            },
        }

    def _snapshot_source(self, row: dict[str, Any], index: int) -> dict[str, Any]:
        payload = row.get("payload") if isinstance(row.get("payload"), dict) else {}
        domain = _text(row.get("domain"), "operational")
        title = _text(payload.get("title") or row.get("projection_type"), f"{domain.title()} projection snapshot")
        summary = _text(payload.get("summary") or payload.get("description") or payload, "Projection metadata available for review.")
        return {
            "title": title,
            "record_type": f"snapshot_{domain}",
            "record_id": _text(row.get("projection_key"), f"snapshot-{index}"),
            "route": payload.get("route"),
            "date": _text(row.get("updated_at") or row.get("generated_at")),
            "citation_ref": f"[{index}]",
            "summary": summary,
            "source_type": f"snapshot_{domain}",
            "source_id": _text(row.get("projection_key"), f"snapshot-{index}"),
            "projection_key": row.get("projection_key"),
        }


orb_metadata_first_context_service = OrbMetadataFirstContextService()
