from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from services.reg44_intelligence_service import reg44_intelligence_service


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Reg45GenerationService:
    """Regulation 45 report draft generation from live inspection intelligence."""

    def generate(self, conn: Any, *, home_id: int | None = None, limit: int = 50) -> dict[str, Any]:
        intelligence = reg44_intelligence_service.build(conn, home_id=home_id, limit=limit)
        sections = {
            "executive_summary": {
                "content": intelligence.get("summary"),
                "status": "draft",
                "human_review_required": True,
            },
            "safeguarding": {
                "content": "Safeguarding oversight section to be reviewed against live chronology and Reg 40 records.",
                "regulation_links": ["reg_12", "reg_40"],
            },
            "leadership_and_management": {
                "content": "; ".join(intelligence.get("leadership_challenge_areas") or []) or "No leadership challenges flagged.",
                "regulation_links": ["reg_13", "reg_44"],
            },
            "quality_of_care": {
                "content": "Quality mapping derived from operational feed child voice and workflow signals.",
                "quality_standards": list((intelligence.get("quality_standard_mapping") or {}).values()),
            },
        }
        return {
            "ok": True,
            "status": "draft",
            "generated_at": _now(),
            "home_id": home_id,
            "editable": True,
            "human_review_required": True,
            "sections": sections,
            "inspection_readiness": intelligence.get("inspection_readiness"),
            "regulation_mapping": intelligence.get("regulation_mapping"),
        }


reg45_generation_service = Reg45GenerationService()
