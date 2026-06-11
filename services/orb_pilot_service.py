"""ORB Residential closed-pilot feedback service."""

from __future__ import annotations

from typing import Any

from db.orb_pilot_feedback_db import create_pilot_feedback, list_pilot_feedback_admin
from schemas.orb_pilot import OrbPilotFeedbackCreate, OrbPilotFeedbackResponse


class OrbPilotService:
    def submit_feedback(
        self,
        conn,
        *,
        user_id: int | None,
        role: str | None,
        payload: OrbPilotFeedbackCreate,
    ) -> OrbPilotFeedbackResponse:
        row = create_pilot_feedback(
            conn,
            user_id=user_id,
            role=role,
            payload=payload.model_dump(by_alias=True),
        )
        if not row:
            raise RuntimeError("Pilot feedback storage is unavailable.")
        return OrbPilotFeedbackResponse.model_validate(row)

    def list_admin(self, conn, *, limit: int = 200) -> list[OrbPilotFeedbackResponse]:
        rows = list_pilot_feedback_admin(conn, limit=limit)
        return [OrbPilotFeedbackResponse.model_validate(row) for row in rows]

    def build_summary(self, conn) -> dict[str, Any]:
        rows = list_pilot_feedback_admin(conn, limit=500)
        feedback_count = len(rows)

        if feedback_count == 0:
            return {
                "feedbackCount": 0,
                "themes": [],
                "limitations": ["No pilot feedback submitted yet. Metrics unavailable."],
                "safetyConcernCount": 0,
                "frictionThemes": [],
                "childHelpThemes": [],
                "evidenceLabel": "unavailable",
            }

        def _avg(values: list[int | None]) -> float | None:
            nums = [v for v in values if isinstance(v, int)]
            if not nums:
                return None
            return round(sum(nums) / len(nums), 1)

        would_use = [row.would_use_again for row in rows if row.would_use_again is not None]
        would_use_yes = sum(1 for value in would_use if value)
        would_use_percent = round((would_use_yes / len(would_use)) * 100) if would_use else None

        child_themes = [
            row.what_helped_the_child
            for row in rows
            if row.what_helped_the_child and not row.what_helped_the_child.startswith("[redacted")
        ]
        friction_entries = [
            entry
            for row in rows
            for entry in (
                row.what_felt_unsafe_or_unhelpful,
                row.bug_or_friction,
                row.improvement_suggestion,
            )
            if entry and not entry.startswith("[redacted")
        ]
        positive_entries = [
            row.what_worked_well
            for row in rows
            if row.what_worked_well and not row.what_worked_well.startswith("[redacted")
        ]

        safety_concern_count = sum(1 for row in rows if row.what_felt_unsafe_or_unhelpful)

        limitations = ["Manual staff feedback — not verified external evidence."]
        evidence_label = "manual-feedback"
        if feedback_count < 5:
            limitations.insert(0, "Early signal only — not enough responses for reliable evidence.")
            evidence_label = "early-signal-only"

        return {
            "feedbackCount": feedback_count,
            "averageTimeSavedMinutes": _avg([row.time_saved_minutes for row in rows]),
            "averageRecordQualityRating": _avg([row.record_quality_rating for row in rows]),
            "averageChildVoiceRating": _avg([row.child_voice_rating for row in rows]),
            "averageTherapeuticLanguageRating": _avg([row.therapeutic_language_rating for row in rows]),
            "averageStaffConfidenceRating": _avg([row.staff_confidence_rating for row in rows]),
            "wouldUseAgainPercent": would_use_percent,
            "wouldUseAgainCount": would_use_yes,
            "themes": positive_entries[:5],
            "limitations": limitations,
            "safetyConcernCount": safety_concern_count,
            "frictionThemes": friction_entries[:5],
            "childHelpThemes": child_themes[:5],
            "evidenceLabel": evidence_label,
        }


orb_pilot_service = OrbPilotService()
