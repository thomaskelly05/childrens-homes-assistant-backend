from __future__ import annotations

from typing import Any

from services.dynamic_child_risk_assessment_service import dynamic_child_risk_assessment_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, review_prompt, safe_payload


class RiskAssessmentFlowService:
    """Routes care records into draft risk assessment suggestions."""

    def suggest_for_saved_record(
        self,
        *,
        record: dict[str, Any],
        visible_records: list[dict[str, Any]],
        young_person_id: int | str,
        home_id: int | str | None = None,
        existing_assessments: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        triggered = dynamic_child_risk_assessment_service.triggered_by_record(record)
        suggestions = dynamic_child_risk_assessment_service.suggest_updates(
            records=[*visible_records, record],
            young_person_id=young_person_id,
            home_id=home_id,
            existing_assessments=existing_assessments or [],
        )
        payload = {
            "triggered": triggered,
            "trigger_record_id": record.get("id") or record.get("record_id"),
            "draft_suggestions_only": True,
            "auto_finalised": False,
            "risk_update_suggestions": suggestions["suggested_updates"] if triggered else [],
            "manager_review_prompts": [
                review_prompt("risk-flow-human-review", "review recommended: staff or manager must accept, edit or reject suggested risk updates."),
            ],
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
        }
        return safe_payload(payload)


risk_assessment_flow_service = RiskAssessmentFlowService()
