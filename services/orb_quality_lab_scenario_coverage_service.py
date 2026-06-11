"""ORB Quality Lab — GOLD scenario bank coverage audit for launch verification."""

from __future__ import annotations

from typing import Any

from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service

# Minimum launch-verification topics mapped to family IDs and/or prompt keywords.
REQUIRED_GOLD_TOPICS: list[dict[str, Any]] = [
    {"topic": "missing from home", "families": ["missing_from_care", "repeated_missing"], "keywords": ["missing", "absent"]},
    {"topic": "return home conversation", "families": ["late_return"], "keywords": ["return", "where they were"]},
    {"topic": "self-harm disclosure", "families": ["self_harm_disclosure"], "keywords": ["self-harm", "self harm", "cutting"]},
    {"topic": "suicidal ideation", "families": ["ligature_concern"], "keywords": ["suicid", "end my life", "ligature"]},
    {"topic": "child sexual exploitation", "families": ["cse_concern"], "keywords": ["cse", "sexual exploitation"]},
    {"topic": "criminal exploitation", "families": ["cce_county_lines"], "keywords": ["county lines", "criminal exploitation", "cce"]},
    {"topic": "online harm", "families": ["online_grooming"], "keywords": ["online", "grooming", "digital"]},
    {"topic": "cannabis/substance misuse", "families": [], "keywords": ["cannabis", "substance", "intoxicat", "drug"]},
    {"topic": "physical intervention", "families": ["physical_intervention", "repeated_restraint_trend"], "keywords": ["restraint", "physical intervention"]},
    {"topic": "allegation against staff", "families": ["allegation_staff"], "keywords": ["allegation", "staff conduct"]},
    {"topic": "complaint", "families": ["advocacy_complaint", "community_complaint", "parent_complaint_restraint"], "keywords": ["complaint"]},
    {"topic": "whistleblowing", "families": ["whistleblowing"], "keywords": ["whistleblow", "not to log", "suppress"]},
    {"topic": "bullying", "families": ["peer_on_peer_harm", "allegation_peer"], "keywords": ["bully", "peer"]},
    {"topic": "family contact", "families": ["family_contact_distress"], "keywords": ["family contact", "contact session"]},
    {"topic": "medication recording", "families": ["medication_refusal", "medication_error", "controlled_drug_discrepancy"], "keywords": ["medication", "mar sheet"]},
    {"topic": "education concern", "families": ["school_refusal"], "keywords": ["school", "education", "pep"]},
    {"topic": "health appointment", "families": [], "keywords": ["health", "gp", "appointment", "camhs"]},
    {
        "topic": "key work session",
        "families": ["poor_daily_log", "child_not_feeling_safe"],
        "keywords": ["key work", "keywork", "key-worker", "therapeutic", "direct work session"],
    },
    {"topic": "daily record", "families": ["poor_daily_log"], "keywords": ["daily log", "daily record", "daily note"]},
    {"topic": "incident report", "families": ["assault_staff", "property_damage", "restraint_injury_complaint"], "keywords": ["incident report", "incident record"]},
    {"topic": "risk assessment", "families": ["outdated_risk_plans"], "keywords": ["risk assessment", "risk plan"]},
    {"topic": "chronology", "families": ["no_chronology_entry"], "keywords": ["chronology"]},
    {"topic": "Regulation 44", "families": ["reg44_triangulation", "reg44_action_not_closed"], "keywords": ["reg 44", "reg44"]},
    {"topic": "Regulation 45", "families": ["reg45_weak_impact"], "keywords": ["reg 45", "reg45"]},
    {"topic": "management oversight", "families": ["weak_manager_oversight", "rm_action_owner"], "keywords": ["manager oversight", "oversight", "reg 13"]},
    {"topic": "child voice", "families": ["missing_child_voice", "child_not_feeling_safe"], "keywords": ["child voice", "young person's words"]},
    {"topic": "emergency escalation", "families": ["weapon_disclosure", "ligature_concern", "unknown_adult_vehicle"], "keywords": ["999", "emergency", "immediate risk"]},
    {"topic": "police/social worker notification", "families": ["missing_from_care", "disclosure_abuse"], "keywords": ["police", "social worker", "children's services"]},
    {
        "topic": "local policy/professional judgement caveat",
        "families": ["weak_manager_oversight", "whistleblowing", "disclosure_abuse"],
        "keywords": [
            "local policy",
            "professional judgement",
            "professional judgment",
            "your local protocol",
            "local protocol",
            "professional curiosity",
            "in line with your",
        ],
    },
]


def _scenario_matches_topic(scenario: dict[str, Any], topic: dict[str, Any]) -> bool:
    family = str(scenario.get("family") or "")
    if family in (topic.get("families") or []):
        return True
    haystack = " ".join(
        [
            str(scenario.get("title") or ""),
            str(scenario.get("prompt") or ""),
            " ".join(scenario.get("expected_markers") or []),
        ]
    ).lower()
    return any(str(kw).lower() in haystack for kw in (topic.get("keywords") or []))


class OrbQualityLabScenarioCoverageService:
    def audit_gold_coverage(self) -> dict[str, Any]:
        scenarios = orb_expert_scenario_bank_service.list_gold_scenarios()
        covered: list[dict[str, Any]] = []
        missing: list[str] = []
        for topic in REQUIRED_GOLD_TOPICS:
            matches = [s for s in scenarios if _scenario_matches_topic(s, topic)]
            if matches:
                covered.append(
                    {
                        "topic": topic["topic"],
                        "scenario_ids": [str(s.get("scenario_id")) for s in matches[:5]],
                        "count": len(matches),
                    }
                )
            else:
                missing.append(str(topic["topic"]))

        whistleblowing_covered = any(
            item["topic"] == "whistleblowing" for item in covered
        )

        return {
            "gold_scenario_count": len(scenarios),
            "required_topic_count": len(REQUIRED_GOLD_TOPICS),
            "covered_topics": covered,
            "missing_topics": missing,
            "whistleblowing_covered": whistleblowing_covered,
            "coverage_complete": len(missing) == 0,
        }


orb_quality_lab_scenario_coverage_service = OrbQualityLabScenarioCoverageService()
