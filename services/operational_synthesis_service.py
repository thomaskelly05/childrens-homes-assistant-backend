from __future__ import annotations

from collections import Counter
from typing import Any


class OperationalSynthesisService:
    """Deterministic review suggestions over schema-backed operational records."""

    def safeguarding_patterns(self, records: list[Any]) -> dict[str, Any]:
        by_child = Counter(getattr(record, "young_person_id", None) for record in records)
        by_category = Counter(getattr(record, "concern_category", "safeguarding") for record in records)
        unresolved = [record for record in records if getattr(record, "lifecycle_state", "") not in {"resolved", "archived"}]
        return {
            "review_suggestions": [
                {
                    "type": "repeated_safeguarding_concerns",
                    "young_person_id": child_id,
                    "reason": "Repeated safeguarding concerns require human review.",
                    "count": count,
                }
                for child_id, count in by_child.items()
                if child_id is not None and count >= 3
            ],
            "pattern_summary": {
                "total_records": len(records),
                "unresolved_records": len(unresolved),
                "concern_categories": dict(by_category),
            },
            "guardrails": [
                "This is deterministic pattern surfacing, not predictive scoring.",
                "Care plans, risk assessments and safeguarding plans require human review before change.",
            ],
        }

    def missing_patterns(self, records: list[Any]) -> dict[str, Any]:
        by_child = Counter(getattr(record, "young_person_id", None) for record in records)
        unresolved = [record for record in records if getattr(record, "lifecycle_state", "") not in {"closed", "RHI_completed"}]
        overdue_rhi = [record for record in records if getattr(record, "lifecycle_state", "") == "RHI_required"]
        return {
            "review_suggestions": [
                {
                    "type": "repeated_missing_pattern",
                    "young_person_id": child_id,
                    "reason": "Repeated missing episodes require human review of push/pull factors and follow-up.",
                    "count": count,
                }
                for child_id, count in by_child.items()
                if child_id is not None and count >= 3
            ],
            "pattern_summary": {
                "total_records": len(records),
                "unresolved_records": len(unresolved),
                "return_home_interviews_required": len(overdue_rhi),
            },
            "guardrails": [
                "This is deterministic operational synthesis, not predictive risk scoring.",
                "Safeguarding escalation and plan changes remain human decisions.",
            ],
        }


operational_synthesis_service = OperationalSynthesisService()
