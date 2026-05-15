from __future__ import annotations

import re
from typing import Any


PROMPTS = [
    "Were there sensory triggers?",
    "Was the child given processing time?",
    "Did a routine change affect presentation?",
    "What communication approach helped?",
    "Could this have been distress rather than defiance?",
    "What adjustments supported regulation?",
    "Was the environment too noisy/bright/busy?",
    "Was a predictable routine used?",
]

SUPPORT_NEEDS = re.compile(r"\b(sensory|processing time|routine|transition|communication|visual timetable|quiet space|shutdown|meltdown|masking|sleep|food routine|school anxiety)\b", re.I)
LABELS = re.compile(r"\b(autistic|adhd|neurodivergent|demand avoidant|pathological demand avoidance)\b", re.I)
UNSAFE_LABELS = re.compile(r"\b(defiant|lazy|attention seeking|manipulative|choosing to be difficult)\b", re.I)


class NeurodiversitySupportService:
    """Prompts for adjustments without diagnosing or labelling children."""

    def analyse(self, *, text: str | None = None, record: dict[str, Any] | None = None, known_needs: list[str] | None = None) -> dict[str, Any]:
        record = record or {}
        known_needs = known_needs or []
        combined = self._text(text, record)
        support_markers = sorted({match.lower() for match in SUPPORT_NEEDS.findall(combined)})
        flags: list[dict[str, str]] = []
        if support_markers and not re.search(r"\b(adjust|supported|helped|processing time|quiet|visual|predictable|choice)\b", combined, re.I):
            flags.append(self._flag("adjustment_not_visible", "possible sensory factor or support need mentioned; review recommended for adjustments tried."))
        if UNSAFE_LABELS.search(combined):
            flags.append(self._flag("unsafe_or_labelling_language", "consider replacing labels with observable presentation and support offered."))
        if LABELS.search(combined) and not known_needs:
            flags.append(self._flag("diagnostic_language_without_recorded_need", "do not assume autism/ADHD unless recorded; use known support need or records indicate."))
        if "routine" in combined.lower() and "change" in combined.lower() and "transition" not in combined.lower():
            flags.append(self._flag("transition_support_not_visible", "consider adding transition support or predictable routine evidence."))
        return {
            "known_support_needs": known_needs,
            "support_markers": support_markers,
            "prompts": PROMPTS,
            "flags": flags,
            "safe_phrasing": [
                "known support need",
                "possible sensory factor",
                "records indicate",
                "review recommended",
            ],
            "diagnosis_made": False,
            "labels_applied": False,
            "guardrails": [
                "Do not diagnose.",
                "Do not label.",
                "Do not assume autism or ADHD unless already recorded.",
            ],
        }

    def _text(self, text: str | None, record: dict[str, Any]) -> str:
        values = [text or ""]
        for key in ("title", "summary", "narrative", "description", "presentation", "trigger", "outcome", "staff_support", "communication_preferences"):
            values.append(str(record.get(key) or ""))
        return " ".join(values)

    def _flag(self, key: str, summary: str) -> dict[str, str]:
        return {"key": key, "summary": summary, "language": "review recommended"}


neurodiversity_support_service = NeurodiversitySupportService()
