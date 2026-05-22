from __future__ import annotations

from typing import Any

from services.inspection_intelligence_service import inspection_intelligence_service
from services.operational_feed_service import build_operational_feed


class Reg44IntelligenceService:
    """Regulation 44 visit intelligence from live operational and inspection signals."""

    def build(self, conn: Any, *, home_id: int | None = None, limit: int = 50) -> dict[str, Any]:
        feed = build_operational_feed(conn, home_id=home_id, limit=limit)
        events = feed.get("events") or []
        inspection = feed.get("inspection_intelligence") or inspection_intelligence_service.analyse(
            events=events,
            manager_queue=feed.get("manager_queue"),
        )
        weak_areas = inspection.get("weak_areas") or []
        concerns = inspection.get("concerns") or []

        return {
            "ok": True,
            "home_id": home_id,
            "inspection_readiness": inspection.get("overall_readiness"),
            "reg44_focus_areas": weak_areas[:8] or concerns[:8],
            "leadership_challenge_areas": self._leadership_challenges(inspection, feed),
            "quality_standard_mapping": {
                "safeguarding": "SCCIF — Safeguarding",
                "child_voice": "Quality of care — Child voice",
                "evidence": "Leadership and management — Evidence",
                "workflow": "Quality of care — Care planning",
            },
            "regulation_mapping": {
                "reg_12": "Protection of children",
                "reg_13": "Leadership and management",
                "reg_44": "Visits by responsible person",
            },
            "summary": inspection.get("operational_summary") or "Reg 44 intelligence derived from live operational feed.",
        }

    def _leadership_challenges(self, inspection: dict[str, Any], feed: dict[str, Any]) -> list[str]:
        challenges = list(inspection.get("concerns") or [])[:5]
        climate = (feed.get("home_operational_intelligence") or {}).get("home_climate") or {}
        if (climate.get("safeguarding_pressure") or {}).get("state") not in {None, "stable"}:
            challenges.append("Safeguarding pressure requires visible management response.")
        if (climate.get("workforce_pressure") or {}).get("state") not in {None, "manageable"}:
            challenges.append("Workforce pressure may challenge supervision and oversight quality.")
        return challenges[:8]


reg44_intelligence_service = Reg44IntelligenceService()
