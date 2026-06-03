"""Detect missing elements in scenarios and draft answers."""

from __future__ import annotations

from typing import Any

GAP_CATALOGUE: dict[str, dict[str, Any]] = {
    "missing_child_voice": {"severity": "high", "qs": "qs2_child_voice", "lens": "child"},
    "missing_immediate_safety_check": {"severity": "critical", "qs": "qs7_protection", "lens": "registered_manager"},
    "missing_chronology": {"severity": "medium", "qs": "qs9_care_planning", "lens": "registered_manager"},
    "missing_social_worker_notification": {"severity": "high", "qs": "qs7_protection", "lens": "social_worker"},
    "missing_manager_review": {"severity": "high", "qs": "qs8_leadership", "lens": "registered_manager"},
    "missing_risk_assessment_update": {"severity": "high", "qs": "qs9_care_planning", "lens": "registered_manager"},
    "missing_care_plan_update": {"severity": "medium", "qs": "qs9_care_planning", "lens": "social_worker"},
    "missing_return_home_interview": {"severity": "high", "qs": "qs7_protection", "lens": "social_worker"},
    "missing_exploitation_indicators": {"severity": "high", "qs": "qs7_protection", "lens": "police"},
    "missing_lado_consideration": {"severity": "critical", "qs": "qs7_protection", "lens": "lado"},
    "missing_body_map_injury_check": {"severity": "medium", "qs": "qs5_health_wellbeing", "lens": "health_gp"},
    "missing_medication_health_advice": {"severity": "medium", "qs": "qs5_health_wellbeing", "lens": "health_gp"},
    "missing_education_follow_up": {"severity": "medium", "qs": "qs3_education", "lens": "virtual_school_sendco"},
    "missing_reg40_consideration": {"severity": "high", "qs": "qs7_protection", "lens": "registered_manager"},
    "missing_reg44_action_closure": {"severity": "medium", "qs": "qs8_leadership", "lens": "reg_44_visitor"},
    "missing_reg45_analysis": {"severity": "medium", "qs": "qs8_leadership", "lens": "reg_45_reviewer"},
    "missing_staff_debrief": {"severity": "medium", "qs": "qs6_positive_relationships", "lens": "registered_manager"},
    "missing_child_debrief": {"severity": "medium", "qs": "qs2_child_voice", "lens": "child"},
    "missing_evidence_of_impact": {"severity": "medium", "qs": "qs1_quality_and_purpose", "lens": "ofsted_inspector"},
}

_SCENARIO_GAP_HINTS: list[tuple[tuple[str, ...], list[str]]] = [
    (("missing", "returned", "absent"), ["missing_return_home_interview", "missing_exploitation_indicators", "missing_manager_review"]),
    (("allegation", "staff", "hurt"), ["missing_lado_consideration", "missing_child_voice"]),
    (("self-harm", "cut"), ["missing_immediate_safety_check", "missing_manager_review"]),
    (("restraint", "hold"), ["missing_staff_debrief", "missing_child_debrief", "missing_risk_assessment_update"]),
    (("ofsted", "inspection"), ["missing_evidence_of_impact", "missing_child_voice"]),
    (("rewrite", "record"), ["missing_child_voice"]),
    (("nobody listens", "settled"), ["missing_child_voice", "missing_care_plan_update"]),
]


class OrbGapDetectionService:
    def detect_from_message(self, message: str, *, context: dict[str, Any] | None = None) -> list[dict[str, Any]]:
        lower = str(message or "").lower()
        gap_ids: list[str] = []
        for triggers, gaps in _SCENARIO_GAP_HINTS:
            if any(t in lower for t in triggers):
                for g in gaps:
                    if g not in gap_ids:
                        gap_ids.append(g)
        return [self._gap_output(gid) for gid in gap_ids]

    def detect_from_answer(self, answer_text: str, *, expected_gaps: list[str] | None = None) -> list[dict[str, Any]]:
        lower = str(answer_text or "").lower()
        found_missing: list[str] = []
        checks = {
            "missing_child_voice": any(t in lower for t in ("child said", "child voice", "young person said")),
            "missing_manager_review": any(t in lower for t in ("manager", "oversight", "on-call")),
            "missing_exploitation_indicators": any(t in lower for t in ("exploit", "contextual", "cse", "cce")),
            "missing_immediate_safety_check": any(t in lower for t in ("safety", "safe", "immediate")),
        }
        for gap_id, present in checks.items():
            if expected_gaps and gap_id in expected_gaps and not present:
                found_missing.append(gap_id)
        return [self._gap_output(g) for g in found_missing]

    def _gap_output(self, gap_id: str) -> dict[str, Any]:
        meta = GAP_CATALOGUE.get(gap_id, {})
        return {
            "gap_id": gap_id,
            "severity": meta.get("severity", "medium"),
            "quality_standard": meta.get("qs"),
            "professional_lens": meta.get("lens"),
            "suggested_next_action": f"Address gap: {gap_id.replace('_', ' ')}",
            "manager_review_required": meta.get("severity") in ("high", "critical"),
        }


orb_gap_detection_service = OrbGapDetectionService()
