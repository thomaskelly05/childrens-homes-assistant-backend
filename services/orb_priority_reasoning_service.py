from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class PrioritySignal:
    priority: str
    level: str
    reason: str
    indicators: tuple[str, ...] = field(default_factory=tuple)
    immediate_focus: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbPriorityReasoningService:
    """Practice judgement weighting for ORB.

    ORB should not treat all issues equally. Safeguarding, child safety, repeated
    patterns, emotional instability and weak oversight must rise above convenience
    or ordinary administration.
    """

    PRIORITY_RULES = {
        "safeguarding_first": {
            "level": "critical",
            "terms": ("allegation", "abuse", "harm", "unsafe", "police", "exploitation", "missing", "disclosure", "lado"),
            "focus": ("immediate safety", "who must be informed", "what cannot wait", "protective action", "evidence preservation"),
        },
        "child_lived_experience": {
            "level": "high",
            "terms": ("child voice", "wishes", "feelings", "scared", "alone", "upset", "withdrawn", "not listened"),
            "focus": ("what life feels like for the child", "voice", "belonging", "trust", "emotional safety"),
        },
        "emotional_instability": {
            "level": "high",
            "terms": ("dysregulated", "chaotic", "violent", "screaming", "distressed", "panic", "meltdown"),
            "focus": ("co-regulation", "calm adults", "emotional containment", "repair", "debrief"),
        },
        "repeated_pattern": {
            "level": "high",
            "terms": ("again", "repeated", "pattern", "keeps", "ongoing", "regular", "every night", "multiple times"),
            "focus": ("pattern review", "plan effectiveness", "risk update", "manager oversight", "learning"),
        },
        "weak_oversight": {
            "level": "high",
            "terms": ("not signed off", "no manager", "overdue", "not reviewed", "missed", "no action"),
            "focus": ("manager review", "action ownership", "governance", "evidence gap", "drift"),
        },
        "recording_evidence_gap": {
            "level": "medium",
            "terms": ("not recorded", "unclear", "can't evidence", "weak record", "missing detail", "no chronology"),
            "focus": ("record quality", "child voice", "adult response", "impact", "evidence lineage"),
        },
        "staff_pressure": {
            "level": "medium",
            "terms": ("burnout", "exhausted", "short staffed", "overwhelmed", "tired", "agency"),
            "focus": ("staff support", "safe staffing", "debrief", "supervision", "emotional climate"),
        },
    }

    def prioritise(self, text: str) -> dict[str, Any]:
        lower = str(text or "").lower()
        signals: list[PrioritySignal] = []
        for priority, rule in self.PRIORITY_RULES.items():
            hits = tuple(term for term in rule["terms"] if term in lower)
            if hits:
                signals.append(
                    PrioritySignal(
                        priority=priority,
                        level=str(rule["level"]),
                        reason=self._reason(priority),
                        indicators=hits,
                        immediate_focus=tuple(rule["focus"]),
                    )
                )
        if not signals:
            signals.append(
                PrioritySignal(
                    priority="normal_practice_support",
                    level="normal",
                    reason="No high-attention priority signal is clearly visible from the user text.",
                    immediate_focus=("answer the user clearly", "stay alert to missing context", "offer practical next steps"),
                )
            )
        ordered = sorted(signals, key=lambda signal: self._rank(signal.level))
        return {
            "top_priority": ordered[0].priority,
            "top_level": ordered[0].level,
            "signals": [signal.to_dict() for signal in ordered],
            "rule": "Safeguarding and child safety override convenience, speed and administrative completion.",
        }

    def prompt_addendum(self, text: str) -> str:
        data = self.prioritise(text)
        lines = [
            "Priority reasoning:",
            f"- Top priority: {data['top_priority']} ({data['top_level']})",
            f"- Rule: {data['rule']}",
        ]
        for signal in data["signals"]:
            lines.append(f"- {signal['priority']}: {signal['level']} — {signal['reason']}")
            if signal["immediate_focus"]:
                lines.append("  Focus: " + "; ".join(signal["immediate_focus"][:5]))
        return "\n".join(lines)

    def _rank(self, level: str) -> int:
        return {"critical": 0, "high": 1, "medium": 2, "normal": 3}.get(level, 4)

    def _reason(self, priority: str) -> str:
        return {
            "safeguarding_first": "Potential safeguarding or child-safety signal must be considered before ordinary advice.",
            "child_lived_experience": "The child’s lived experience and voice may need to be brought forward.",
            "emotional_instability": "High emotional temperature can affect safety, decision-making and relational repair.",
            "repeated_pattern": "Repeated themes are more significant than isolated events and may show drift.",
            "weak_oversight": "Missing oversight can allow risk, poor practice or weak evidence to continue.",
            "recording_evidence_gap": "Weak evidence reduces reviewability and inspection confidence.",
            "staff_pressure": "Staff pressure can affect emotional availability, consistency and safeguarding curiosity.",
        }.get(priority, "Practice support priority identified.")


orb_priority_reasoning_service = OrbPriorityReasoningService()
