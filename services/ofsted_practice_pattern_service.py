"""Anonymised practice and risk markers from Ofsted report analysis."""

from __future__ import annotations

from typing import Any

PRACTICE_MARKERS: dict[str, str] = {
    "child_voice_changes_plans": "Child voice changes plans",
    "progress_from_starting_points": "Progress from starting points is evidenced",
    "leaders_know_home": "Leaders know the home and act before drift",
    "risk_plans_live": "Risk plans are live and updated after incidents",
    "staff_trauma_communication": "Staff understand communication and trauma",
    "safeguarding_timely": "Safeguarding action is timely and evidenced",
    "reg44_reg45_lead_change": "Reg 44 and Reg 45 lead to change",
    "supervision_improves_practice": "Staff supervision improves practice",
    "warm_boundaried_relationships": "Relationships are warm, boundaried and resilient",
    "records_show_impact": "Records show impact, not just activity",
}

RISK_MARKERS: dict[str, str] = {
    "repeated_incidents_no_analysis": "Repeated incidents without analysis",
    "missing_child_voice": "Missing child voice",
    "weak_manager_review": "Weak manager review",
    "plans_not_updated": "Plans not updated after incidents",
    "missing_without_exploitation_analysis": "Missing episodes without exploitation analysis",
    "restraint_no_debrief": "Restraints without debrief or plan review",
    "reg44_actions_overdue": "Reg 44 actions repeated or overdue",
    "adult_child_account_mismatch": "Adult records say settled but child says otherwise",
    "weak_education_health_contact": "Weak education/health/contact evidence",
    "punitive_staff_language": "Staff language becoming punitive",
}


class OfstedPracticePatternService:
    def markers_from_themes(self, themes: dict[str, bool]) -> dict[str, Any]:
        practice: list[str] = []
        risk: list[str] = []
        if themes.get("child_voice"):
            practice.append("child_voice_changes_plans")
        if themes.get("safeguarding"):
            practice.append("safeguarding_timely")
        if themes.get("leadership"):
            practice.append("leaders_know_home")
        if themes.get("reg44"):
            practice.append("reg44_reg45_lead_change")
        if themes.get("supervision"):
            practice.append("supervision_improves_practice")
        if themes.get("missing"):
            risk.append("missing_without_exploitation_analysis")
        if themes.get("restraint"):
            risk.append("restraint_no_debrief")
        if not themes.get("child_voice"):
            risk.append("missing_child_voice")
        return {
            "practice_marker_ids": practice,
            "risk_marker_ids": risk,
            "practice_labels": [PRACTICE_MARKERS[p] for p in practice if p in PRACTICE_MARKERS],
            "risk_labels": [RISK_MARKERS[r] for r in risk if r in RISK_MARKERS],
            "anonymised": True,
        }


ofsted_practice_pattern_service = OfstedPracticePatternService()
