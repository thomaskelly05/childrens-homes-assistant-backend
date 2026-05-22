from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from services.inspection_intelligence_service import inspection_intelligence_service
from services.operational_feed_service import build_operational_feed


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class InspectionEvidencePackService:
    """Live inspection evidence pack with missing evidence warnings."""

    def build(self, conn: Any, *, home_id: int | None = None, limit: int = 50) -> dict[str, Any]:
        feed = build_operational_feed(conn, home_id=home_id, limit=limit)
        events = feed.get("events") or []
        inspection = feed.get("inspection_intelligence") or inspection_intelligence_service.analyse(
            events=events,
            manager_queue=feed.get("manager_queue"),
        )
        evidence_items = [
            {
                "source_type": event.get("source_table"),
                "source_id": event.get("event_id") or event.get("source_id"),
                "title": event.get("title"),
                "evidence_count": event.get("evidence_count"),
                "safeguarding": event.get("safeguarding"),
                "linked": int(event.get("evidence_count") or 0) > 0,
            }
            for event in events[:30]
        ]
        missing = [
            item
            for item in evidence_items
            if not item["linked"] and (item.get("safeguarding") or item.get("source_type") in {"incidents", "missing_episodes"})
        ]
        return {
            "ok": True,
            "generated_at": _now(),
            "home_id": home_id,
            "inspection_readiness": inspection.get("overall_readiness"),
            "evidence_pack": evidence_items,
            "missing_evidence_warnings": missing[:15],
            "weak_evidence_areas": inspection.get("weak_areas") or [],
            "quality_standard_mapping": {
                "safeguarding": "SCCIF Safeguarding",
                "child_voice": "Quality of care",
                "evidence": "Leadership and management",
            },
            "ofsted_challenge_preview": self._ofsted_preview(inspection, missing),
            "summary": (
                f"Evidence pack with {len(evidence_items)} item(s); "
                f"{len(missing)} missing linkage warning(s)."
            ),
        }

    def _ofsted_preview(self, inspection: dict[str, Any], missing: list[dict[str, Any]]) -> str:
        concerns = inspection.get("concerns") or []
        if concerns:
            return "Ofsted may challenge: " + concerns[0]
        if missing:
            return f"Ofsted may challenge weak evidence linkage on {len(missing)} record(s)."
        return "No immediate Ofsted challenge signals from current operational feed."


inspection_evidence_pack_service = InspectionEvidencePackService()
