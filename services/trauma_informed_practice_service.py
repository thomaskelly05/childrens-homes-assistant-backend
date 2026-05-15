from __future__ import annotations

import re
from typing import Any


PROMPTS = [
    "What might the behaviour be communicating?",
    "What helped the child regulate?",
    "How was emotional safety restored?",
    "Was repair offered after the incident?",
    "How did adults respond relationally?",
    "What helped the child feel safe?",
    "What strengths were noticed?",
    "What support should continue?",
]

SUPPORT_TERMS = re.compile(r"\b(emotional safety|predictable|trusted|repair|restorative|debrief|regulated|choice|reassured|strength|protective)\b", re.I)
PUNITIVE_TERMS = re.compile(r"\b(manipulative|attention seeking|naughty|defiant|refused to comply|kicked off|bad behaviour|consequence only)\b", re.I)
ASSUMPTION_TERMS = re.compile(r"\b(deliberately|for no reason|just wanted|clearly trying|definitely)\b", re.I)
CHILD_VOICE_TERMS = re.compile(r"\b(child said|young person said|said|told|wishes|feelings|voice|chose)\b", re.I)
RECOVERY_TERMS = re.compile(r"\b(debrief|repair|restored|settled|regulated|reassured|checked in)\b", re.I)


class TraumaInformedPracticeService:
    """Checks recording for trauma-informed evidence and gentle strengthening prompts."""

    def analyse(self, *, text: str | None = None, record: dict[str, Any] | None = None) -> dict[str, Any]:
        record = record or {}
        combined = self._text(text, record)
        flags: list[dict[str, str]] = []
        if PUNITIVE_TERMS.search(combined):
            flags.append(self._flag("punitive_wording", "this could be strengthened by shame-sensitive, non-punitive language."))
        if ASSUMPTION_TERMS.search(combined):
            flags.append(self._flag("unsupported_assumption", "consider adding observable evidence or using more cautious wording."))
        if not CHILD_VOICE_TERMS.search(combined):
            flags.append(self._flag("missing_child_voice", "limited evidence found for the child's voice."))
        if self._incident_context(record, combined) and not RECOVERY_TERMS.search(combined):
            flags.append(self._flag("missing_recovery_or_debrief", "review may be helpful: recovery, debrief or repair is not visible."))
        if self._incident_context(record, combined) and "repair" not in combined.lower():
            flags.append(self._flag("missing_relational_repair", "consider adding whether relational repair was offered."))
        if re.search(r"\b(monitored|settled|resolved)\b", combined, re.I) and not re.search(r"\b(because|shown by|evidenced|recorded|after)\b", combined, re.I):
            flags.append(self._flag("vague_outcome", "this could be strengthened by what changed for the child."))
        if re.search(r"\bstaff\b", combined, re.I) and not CHILD_VOICE_TERMS.search(combined):
            flags.append(self._flag("adult_centric_narrative", "consider adding what the child experienced, wanted or felt."))
        return {
            "support_markers": sorted(set(SUPPORT_TERMS.findall(combined))),
            "prompts": PROMPTS,
            "flags": flags,
            "recording_guidance": [
                "Use curiosity around behaviour and describe observable presentation.",
                "Name regulation support, repair and emotional safety where known.",
                "Avoid shame-sensitive or unsupported labels.",
            ],
            "safe_language": ["consider adding", "this could be strengthened by", "limited evidence found", "review may be helpful"],
            "diagnosis_or_decision_made": False,
        }

    def _text(self, text: str | None, record: dict[str, Any]) -> str:
        values = [text or ""]
        for key in ("title", "summary", "narrative", "description", "presentation", "outcome", "actions_required", "staff_support", "child_voice"):
            values.append(str(record.get(key) or ""))
        return " ".join(values)

    def _incident_context(self, record: dict[str, Any], text: str) -> bool:
        record_type = str(record.get("record_type") or record.get("type") or "").lower()
        return record_type in {"incident", "missing_episode", "safeguarding_concern"} or bool(re.search(r"\b(incident|restraint|heightened|missing|police)\b", text, re.I))

    def _flag(self, key: str, summary: str) -> dict[str, str]:
        return {"key": key, "summary": summary, "language": "review recommended"}


trauma_informed_practice_service = TraumaInformedPracticeService()
