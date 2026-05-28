from __future__ import annotations

"""Safeguarding thinking intelligence for ORB Residential.

Separates facts, concerns, gaps and escalation considerations.
Does not make threshold or statutory decisions.
"""

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class SafeguardingIntelligenceResult:
    facts: list[str]
    concerns: list[str]
    evidence_gaps: list[str]
    escalation_considerations: list[str]
    safe_wording_notes: list[str]
    guardrails: list[str] = field(
        default_factory=lambda: [
            "ORB does not decide safeguarding thresholds.",
            "Follow local safeguarding procedures and designated safeguarding lead guidance.",
            "Escalate immediately where a child may be at risk of significant harm.",
        ]
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class SafeguardingIntelligenceService:
    def analyse(self, notes: str, *, mode: str | None = None) -> SafeguardingIntelligenceResult:
        text = str(notes or "").strip()
        lowered = text.lower()

        facts: list[str] = []
        concerns: list[str] = []
        gaps: list[str] = []
        escalation: list[str] = []
        wording: list[str] = []

        if text:
            facts.append("User-supplied notes provided — treat these as the working factual basis only.")
        else:
            gaps.append("No notes supplied — safeguarding reflection cannot proceed without user-provided detail.")

        concern_markers = (
            "bruise",
            "injury",
            "missing",
            "disclosure",
            "allegation",
            "exploitation",
            "self-harm",
            "weapon",
            "sexual",
            "neglect",
            "abscond",
        )
        for marker in concern_markers:
            if marker in lowered:
                concerns.append(f"Notes mention '{marker}' — consider whether further factual detail and chronology are needed.")

        if "who" not in lowered and text:
            gaps.append("Clarify who was present, who observed, and who was informed.")
        if "when" not in lowered and text:
            gaps.append("Clarify precise timings and sequence of events.")
        if "action" not in lowered and "inform" not in lowered and text:
            gaps.append("Clarify what actions were taken and who was notified.")

        if concerns:
            escalation.append("Consider prompt discussion with the designated safeguarding lead using factual notes only.")
            escalation.append("Do not delay immediate emergency response where a child may be at imminent risk.")
            wording.append("Use objective, observable language; avoid opinion, diagnosis or threshold language.")

        return SafeguardingIntelligenceResult(
            facts=facts,
            concerns=concerns,
            evidence_gaps=gaps,
            escalation_considerations=escalation,
            safe_wording_notes=wording,
        )

    def build_prompt_block(self, notes: str) -> str:
        result = self.analyse(notes)
        lines = [
            "SAFEGUARDING THINKING FRAME (standalone — no live records):",
            "Separate: facts | concerns | evidence gaps | escalation considerations.",
            "",
            "Facts:",
            *[f"- {item}" for item in result.facts],
            "",
            "Concerns to explore:",
            *([f"- {item}" for item in result.concerns] or ["- None flagged from supplied text"]),
            "",
            "Evidence gaps:",
            *(
                [f"- {item}" for item in result.evidence_gaps]
                or ["- Review whether timing, witnesses and actions are clear"]
            ),
            "",
            "Escalation considerations (not decisions):",
            *(
                [f"- {item}" for item in result.escalation_considerations]
                or ["- Follow local procedures if concerns remain"]
            ),
        ]
        return "\n".join(lines)


safeguarding_intelligence_service = SafeguardingIntelligenceService()
