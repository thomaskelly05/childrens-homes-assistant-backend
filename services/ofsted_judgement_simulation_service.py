from __future__ import annotations

from typing import Any

from schemas.indicare_intelligence import EvidenceStrength, OfstedJudgementSimulation
from services.risk_intelligence_language import field

DISCLAIMER = (
    "Simulation of evidence strength only. This does not provide an Ofsted grade, "
    "inspection outcome or safeguarding decision. Manager review and source records remain required."
)

JUDGEMENT_AREAS = (
    "overall_experiences_and_progress",
    "help_and_protection",
    "effectiveness_of_leaders_and_managers",
)

TYPE_BUCKETS: dict[str, str] = {
    "daily_note": "experiences",
    "child_voice": "experiences",
    "education": "experiences",
    "health": "experiences",
    "family_contact": "experiences",
    "keywork": "experiences",
    "positive_outcome": "experiences",
    "safeguarding_concern": "protection",
    "missing_episode": "protection",
    "incident": "protection",
    "restraint": "protection",
    "risk_assessment": "protection",
    "manager_review": "protection",
    "reg44": "leadership",
    "reg45": "leadership",
    "action": "leadership",
    "staff_supervision": "leadership",
    "training_record": "leadership",
    "audit": "leadership",
    "oversight_note": "leadership",
}


def _norm_type(record: dict[str, Any]) -> str:
    return str(field(record, "record_type", "type") or "unknown").lower().strip()


def _has_child_voice(records: list[dict[str, Any]]) -> bool:
    for record in records:
        if field(record, "child_voice_present") is True:
            return True
        blob = " ".join(
            str(field(record, k) or "")
            for k in ("summary", "notes", "content", "child_voice", "child_voice_text")
        ).lower()
        if any(m in blob for m in ("child said", "wishes", "feelings", "child voice")):
            return True
    return False


def _manager_reviews_visible(records: list[dict[str, Any]]) -> int:
    count = 0
    for record in records:
        if field(record, "manager_reviewed", "manager_review") is True:
            count += 1
            continue
        status = str(field(record, "manager_review_status") or "").lower()
        if status in {"complete", "reviewed", "signed_off"}:
            count += 1
    return count


def _risk_updates(records: list[dict[str, Any]]) -> int:
    return sum(1 for r in records if _norm_type(r) in {"risk_assessment", "risk"})


def _overdue_actions(records: list[dict[str, Any]]) -> int:
    overdue = 0
    for record in records:
        if _norm_type(record) != "action":
            continue
        status = str(field(record, "status") or "").lower()
        if status not in {"completed", "closed", "done"} and field(record, "overdue") is True:
            overdue += 1
    return overdue


class OfstedJudgementSimulationService:
    """Evidence-strength simulation across SCCIF judgement areas — no grades."""

    def simulate(self, records: list[dict[str, Any]] | None = None) -> list[OfstedJudgementSimulation]:
        items = list(records or [])
        buckets = {area: [] for area in JUDGEMENT_AREAS}
        typed_counts: dict[str, int] = {}
        for record in items:
            raw = _norm_type(record)
            typed_counts[raw] = typed_counts.get(raw, 0) + 1
            bucket = TYPE_BUCKETS.get(raw)
            if bucket == "experiences":
                buckets["overall_experiences_and_progress"].append(record)
            elif bucket == "protection":
                buckets["help_and_protection"].append(record)
            elif bucket == "leadership":
                buckets["effectiveness_of_leaders_and_managers"].append(record)

        child_voice = _has_child_voice(items)
        manager_reviews = _manager_reviews_visible(items)
        risk_count = _risk_updates(items)
        overdue = _overdue_actions(items)

        return [
            self._experiences(
                buckets["overall_experiences_and_progress"],
                child_voice=child_voice,
                typed_counts=typed_counts,
            ),
            self._protection(
                buckets["help_and_protection"],
                manager_reviews=manager_reviews,
                risk_count=risk_count,
                typed_counts=typed_counts,
            ),
            self._leadership(
                buckets["effectiveness_of_leaders_and_managers"],
                overdue=overdue,
                manager_reviews=manager_reviews,
                typed_counts=typed_counts,
            ),
        ]

    def _strength_label(self, score: int) -> EvidenceStrength:
        if score >= 6:
            return "strong"
        if score >= 4:
            return "moderate"
        if score >= 2:
            return "emerging"
        return "limited"

    def _experiences(
        self,
        records: list[dict[str, Any]],
        *,
        child_voice: bool,
        typed_counts: dict[str, int],
    ) -> OfstedJudgementSimulation:
        score = 0
        strengths: list[str] = []
        challenges: list[str] = []
        missing: list[str] = []
        contradictions: list[str] = []
        to_review: list[str] = []
        actions: list[str] = []
        questions: list[str] = []

        for key in ("daily_note", "education", "health", "family_contact", "keywork", "child_voice"):
            if typed_counts.get(key, 0):
                score += 1
                strengths.append(f"Records indicate {key.replace('_', ' ')} evidence is present for review.")
                to_review.append(key)

        if child_voice:
            score += 2
            strengths.append("Current evidence appears to include child voice themes in some records.")
        else:
            challenges.append("Child voice may be limited across recent records.")
            missing.append("child voice in daily notes and keywork")
            actions.append("Manager review recommended: sample records for lived experience evidence.")

        if typed_counts.get("education", 0) == 0:
            missing.append("education progress evidence")
        if typed_counts.get("health", 0) == 0:
            missing.append("health and wellbeing evidence")

        questions.extend(
            [
                "Inspectors may ask how children's daily experiences show progress from starting points.",
                "Inspectors may ask how adults capture and respond to children's wishes and feelings.",
            ]
        )

        return OfstedJudgementSimulation(
            judgement_area="overall_experiences_and_progress",
            evidence_strength=self._strength_label(score),
            likely_strengths=strengths[:6],
            likely_challenges=challenges[:6],
            missing_evidence=missing[:6],
            contradictions=contradictions,
            records_to_review=to_review[:8],
            manager_actions=actions[:6],
            inspection_questions=questions[:6],
            disclaimer=DISCLAIMER,
        )

    def _protection(
        self,
        records: list[dict[str, Any]],
        *,
        manager_reviews: int,
        risk_count: int,
        typed_counts: dict[str, int],
    ) -> OfstedJudgementSimulation:
        score = 0
        strengths: list[str] = []
        challenges: list[str] = []
        missing: list[str] = []
        contradictions: list[str] = []
        to_review: list[str] = []
        actions: list[str] = []
        questions: list[str] = []

        for key in ("safeguarding_concern", "missing_episode", "incident", "restraint", "risk_assessment"):
            count = typed_counts.get(key, 0)
            if count:
                score += 1
                strengths.append(f"Records indicate {key.replace('_', ' ')} entries exist for professional review.")
                to_review.append(key)

        if manager_reviews:
            score += 1
            strengths.append("Manager review evidence appears visible in some records.")
        else:
            challenges.append("Manager oversight may not be consistently visible on significant events.")
            missing.append("manager review on incidents and safeguarding")
            actions.append("Manager oversight required: confirm review trails in source records.")

        if risk_count:
            score += 1
        else:
            missing.append("current risk assessment evidence")
            challenges.append("Risk assessment updates may need source review.")

        if typed_counts.get("incident", 0) >= 3 and manager_reviews == 0:
            contradictions.append(
                "Records indicate several incidents but limited visible manager review — this may need escalation to oversight review."
            )

        questions.extend(
            [
                "Inspectors may ask how risks are understood and reduced over time.",
                "Inspectors may ask how missing episodes, return interviews and actions are connected.",
            ]
        )

        return OfstedJudgementSimulation(
            judgement_area="help_and_protection",
            evidence_strength=self._strength_label(score),
            likely_strengths=strengths[:6],
            likely_challenges=challenges[:6],
            missing_evidence=missing[:6],
            contradictions=contradictions[:4],
            records_to_review=to_review[:8],
            manager_actions=actions[:6],
            inspection_questions=questions[:6],
            disclaimer=DISCLAIMER,
        )

    def _leadership(
        self,
        records: list[dict[str, Any]],
        *,
        overdue: int,
        manager_reviews: int,
        typed_counts: dict[str, int],
    ) -> OfstedJudgementSimulation:
        score = 0
        strengths: list[str] = []
        challenges: list[str] = []
        missing: list[str] = []
        contradictions: list[str] = []
        to_review: list[str] = []
        actions: list[str] = []
        questions: list[str] = []

        for key in ("reg44", "reg45", "action", "staff_supervision", "training_record", "audit", "oversight_note"):
            if typed_counts.get(key, 0):
                score += 1
                strengths.append(f"Records indicate {key} evidence may support leadership review.")
                to_review.append(key)

        if manager_reviews:
            score += 1
        if typed_counts.get("reg44", 0) == 0:
            missing.append("Reg 44 visit evidence and actions")
        if typed_counts.get("reg45", 0) == 0:
            missing.append("Reg 45 quality of care review evidence")

        if overdue:
            score = max(0, score - 1)
            challenges.append(f"Records indicate {overdue} overdue actions; review recommended.")
            actions.append("Manager review recommended: check action ownership, due dates and outcomes.")

        questions.extend(
            [
                "Inspectors may ask how leaders know the home is improving and what impact actions have had.",
                "Inspectors may ask how Reg 44 and Reg 45 findings drive practice change.",
            ]
        )

        return OfstedJudgementSimulation(
            judgement_area="effectiveness_of_leaders_and_managers",
            evidence_strength=self._strength_label(score),
            likely_strengths=strengths[:6],
            likely_challenges=challenges[:6],
            missing_evidence=missing[:6],
            contradictions=contradictions,
            records_to_review=to_review[:8],
            manager_actions=actions[:6],
            inspection_questions=questions[:6],
            disclaimer=DISCLAIMER,
        )


ofsted_judgement_simulation_service = OfstedJudgementSimulationService()
