from __future__ import annotations

"""Recording intelligence for ORB Residential.

Factual rewrite support, child voice prompts, evidence gaps, professional language.
"""

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class RecordingIntelligenceResult:
    factual_rewrite_prompts: list[str]
    child_voice_prompts: list[str]
    evidence_gaps: list[str]
    professional_language_notes: list[str]
    chronology_ready_prompts: list[str]
    guardrails: list[str] = field(
        default_factory=lambda: [
            "Records must be factual, attributable and child-centred.",
            "Do not include opinion, diagnosis or threshold language in formal records.",
        ]
    )

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class RecordingIntelligenceService:
    def analyse(self, notes: str) -> RecordingIntelligenceResult:
        text = str(notes or "").strip()
        lowered = text.lower()

        rewrite = [
            "Convert opinions into observable facts (what was seen/heard, by whom, when).",
            "Use child's name or agreed identifier consistently; include direct quotes where appropriate.",
        ]
        child_voice = [
            "Include the child's words where known — use quotation marks for direct speech.",
            "Note the child's stated wishes or feelings if shared.",
        ]
        gaps: list[str] = []
        language = [
            "Prefer precise verbs (said, observed, reported) over vague terms (was disruptive).",
            "Separate facts from professional analysis — analysis belongs in reflection sections if required.",
        ]
        chronology = [
            "Order events chronologically with times where possible.",
            "Record who was informed and any immediate actions taken.",
        ]

        if text and "said" not in lowered and '"' not in text:
            gaps.append("Consider whether the child's voice is represented in the record.")
        if text and not any(char.isdigit() for char in text):
            gaps.append("Add approximate or exact times to strengthen chronology readiness.")
        if "felt" in lowered or "seemed" in lowered:
            language.append("Replace 'seemed/felt' with observed behaviour unless recording a child's stated feeling.")

        return RecordingIntelligenceResult(
            factual_rewrite_prompts=rewrite,
            child_voice_prompts=child_voice,
            evidence_gaps=gaps,
            professional_language_notes=language,
            chronology_ready_prompts=chronology,
        )

    def build_prompt_block(self, notes: str) -> str:
        result = self.analyse(notes)
        lines = [
            "RECORD THIS PROPERLY FRAME (supplied notes only):",
            "",
            "Factual rewrite prompts:",
            *[f"- {item}" for item in result.factual_rewrite_prompts],
            "",
            "Child voice prompts:",
            *[f"- {item}" for item in result.child_voice_prompts],
            "",
            "Evidence gaps:",
            *(
                [f"- {item}" for item in result.evidence_gaps]
                or ["- Review times, witnesses and child's voice"]
            ),
        ]
        return "\n".join(lines)


recording_intelligence_service = RecordingIntelligenceService()
