from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class EvidenceScore:
    area: str
    score: str
    rationale: str
    missing: tuple[str, ...] = field(default_factory=tuple)
    next_questions: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbInspectorEvidenceScoreService:
    """Inspection-style evidence strength scoring for standalone ORB.

    This is not an Ofsted grade predictor. It helps ORB talk about evidence quality:
    strong, emerging, weak, missing or contradictory.
    """

    SCORE_ORDER = ("strong", "emerging", "weak", "missing", "contradictory")

    EVIDENCE_MARKERS = {
        "child_voice": ("child said", "young person said", "yp said", "wishes", "feelings", "child voice", "told staff"),
        "adult_response": ("staff supported", "staff responded", "staff offered", "adult", "reassured", "de-escalated"),
        "manager_oversight": ("manager reviewed", "manager oversight", "signed off", "rm reviewed", "deputy reviewed"),
        "follow_up": ("follow up", "next step", "action", "review", "updated", "planned"),
        "impact": ("as a result", "this meant", "impact", "changed", "reduced", "improved", "safer"),
        "external_escalation": ("social worker", "lado", "police", "ofsted", "health", "placing authority", "safeguarding"),
        "plan_link": ("care plan", "risk assessment", "behaviour support plan", "placement plan", "safety plan"),
        "timing": ("at ", "am", "pm", "date", "time", "before", "after", "following"),
    }

    def score_text(self, text: str, *, context: str | None = None) -> list[EvidenceScore]:
        lower = str(text or "").lower()
        context_lower = str(context or "").lower()
        areas = [
            self._score_area("child_voice", lower),
            self._score_area("adult_response", lower),
            self._score_area("manager_oversight", lower),
            self._score_area("follow_up", lower),
            self._score_area("impact", lower),
            self._score_area("external_escalation", lower),
            self._score_area("plan_link", lower),
            self._score_area("timing", lower),
        ]
        if any(term in context_lower or term in lower for term in ("allegation", "safeguarding", "missing", "restraint", "incident")):
            areas.append(self._safeguarding_review_score(lower))
        return areas

    def prompt_addendum(self, text: str, *, context: str | None = None) -> str:
        scores = self.score_text(text, context=context)
        lines = [
            "Inspector evidence scoring lens:",
            "- Do not predict an Ofsted grade. Score evidence quality only: strong, emerging, weak, missing or contradictory.",
        ]
        for item in scores:
            lines.append(f"- {item.area}: {item.score} — {item.rationale}")
            if item.missing:
                lines.append("  Missing: " + "; ".join(item.missing))
            if item.next_questions:
                lines.append("  Next questions: " + "; ".join(item.next_questions))
        return "\n".join(lines)

    def context_payload(self, text: str, *, context: str | None = None) -> dict[str, Any]:
        return {"evidence_scores": [score.to_dict() for score in self.score_text(text, context=context)]}

    def _score_area(self, area: str, lower: str) -> EvidenceScore:
        markers = self.EVIDENCE_MARKERS[area]
        hits = [marker for marker in markers if marker in lower]
        if len(hits) >= 2:
            return EvidenceScore(area, "strong", "Multiple evidence markers are visible.")
        if len(hits) == 1:
            return EvidenceScore(
                area,
                "emerging",
                "Some evidence is visible but it may need strengthening.",
                next_questions=self._next_questions(area),
            )
        return EvidenceScore(
            area,
            "missing",
            "This evidence area is not clearly visible from the provided wording.",
            missing=self._missing(area),
            next_questions=self._next_questions(area),
        )

    def _safeguarding_review_score(self, lower: str) -> EvidenceScore:
        required = ("manager", "safeguarding", "social worker", "lado", "police", "risk", "safety")
        hits = [term for term in required if term in lower]
        if len(hits) >= 3:
            return EvidenceScore("safeguarding_review", "strong", "Safeguarding review/escalation evidence appears visible.")
        if hits:
            return EvidenceScore(
                "safeguarding_review",
                "emerging",
                "Some safeguarding review language is present but escalation/oversight may need clarifying.",
                missing=("who was informed", "what advice was given", "what protective action followed"),
            )
        return EvidenceScore(
            "safeguarding_review",
            "missing",
            "Safeguarding review/escalation is not visible from the provided wording.",
            missing=("manager/DSL consideration", "external consultation where relevant", "protective action", "follow-up"),
            next_questions=("Who was informed?", "What could not wait?", "What safety action was taken?"),
        )

    def _missing(self, area: str) -> tuple[str, ...]:
        return {
            "child_voice": ("child's words, wishes, feelings or observed communication",),
            "adult_response": ("what staff did", "why staff chose that response"),
            "manager_oversight": ("manager review", "sign-off", "oversight decision"),
            "follow_up": ("next step", "owner", "review point"),
            "impact": ("what changed for the child", "whether risk reduced or remained"),
            "external_escalation": ("who was informed", "advice received", "time of escalation"),
            "plan_link": ("care/risk/behaviour plan link", "whether plans need updating"),
            "timing": ("clear date/time/sequence",),
        }.get(area, ())

    def _next_questions(self, area: str) -> tuple[str, ...]:
        return {
            "child_voice": ("What did the child say, show or communicate?",),
            "adult_response": ("What did adults do and why?",),
            "manager_oversight": ("Who reviewed this and what did they decide?",),
            "follow_up": ("What happens next and who owns it?",),
            "impact": ("What changed afterwards?",),
            "external_escalation": ("Who needed to know and when?",),
            "plan_link": ("Which plan or assessment does this affect?",),
            "timing": ("Is the sequence clear enough for someone reviewing later?",),
        }.get(area, ())


orb_inspector_evidence_score_service = OrbInspectorEvidenceScoreService()
