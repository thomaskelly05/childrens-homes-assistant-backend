from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class CognitiveStateSignal:
    area: str
    level: str
    summary: str
    indicators: tuple[str, ...] = field(default_factory=tuple)
    questions: tuple[str, ...] = field(default_factory=tuple)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbCognitiveStateEngineService:
    """Standalone ORB cognitive state engine.

    This does not access live records. It infers a practice-state lens from user-provided text only:
    emotional temperature, safeguarding pressure, oversight weakness, evidence confidence,
    relational instability, staff pressure and inspection vulnerability.
    """

    SIGNAL_GROUPS = {
        "safeguarding_pressure": {
            "high": ("allegation", "police", "exploitation", "missing", "harm", "unsafe", "abuse", "disclosure"),
            "watch": ("concern", "risk", "worried", "not sure", "incident"),
        },
        "emotional_temperature": {
            "high": ("chaotic", "out of control", "screaming", "violent", "aggressive", "panic"),
            "watch": ("upset", "dysregulated", "withdrawn", "angry", "distressed", "tearful"),
            "protective": ("calm", "settled", "reassured", "repaired", "regulated"),
        },
        "staff_pressure": {
            "high": ("burnout", "exhausted", "short staffed", "no staff", "unsafe staffing"),
            "watch": ("tired", "stressed", "overwhelmed", "frustrated", "agency staff"),
        },
        "oversight_visibility": {
            "high": ("not signed off", "no manager", "no review", "missed", "overdue"),
            "watch": ("manager", "review", "action", "audit", "sign off"),
            "protective": ("manager reviewed", "signed off", "action completed", "reviewed"),
        },
        "evidence_confidence": {
            "high": ("can't evidence", "no record", "missing record", "not recorded", "unclear"),
            "watch": ("record", "evidence", "chronology", "daily note", "incident form"),
            "protective": ("child said", "staff recorded", "manager reviewed", "follow up", "outcome"),
        },
        "relational_stability": {
            "high": ("refuses staff", "doesn't trust", "relationship breakdown", "isolated", "rejected"),
            "watch": ("argument", "conflict", "rupture", "won't engage", "avoidant"),
            "protective": ("trusted adult", "repair", "reconnected", "key worker", "positive relationship"),
        },
        "inspection_vulnerability": {
            "high": ("repeat finding", "reg 44", "reg 45", "ofsted", "inspection", "complaint", "whistleblowing"),
            "watch": ("evidence gap", "audit", "quality assurance", "drift", "pattern"),
        },
    }

    def analyse(self, text: str) -> dict[str, Any]:
        lower = str(text or "").lower()
        signals = [self._signal(area, config, lower) for area, config in self.SIGNAL_GROUPS.items()]
        headline = self._headline(signals)
        return {
            "context_type": "standalone_orb_cognitive_state",
            "headline": headline,
            "signals": [signal.to_dict() for signal in signals],
            "practice_state_summary": self._summary(signals),
            "boundaries": {
                "based_on_user_text_only": True,
                "not_live_record_analysis": True,
                "not_a_threshold_decision": True,
            },
        }

    def prompt_addendum(self, text: str) -> str:
        state = self.analyse(text)
        lines = ["Cognitive state engine:", f"- Headline: {state['headline']}", f"- Summary: {state['practice_state_summary']}"]
        for signal in state["signals"]:
            lines.append(f"- {signal['area']}: {signal['level']} — {signal['summary']}")
            if signal["questions"]:
                lines.append("  Questions: " + "; ".join(signal["questions"][:3]))
        return "\n".join(lines)

    def _signal(self, area: str, config: dict[str, tuple[str, ...]], lower: str) -> CognitiveStateSignal:
        high = [term for term in config.get("high", ()) if term in lower]
        watch = [term for term in config.get("watch", ()) if term in lower]
        protective = [term for term in config.get("protective", ()) if term in lower]
        if high:
            level = "high"
            summary = self._summary_for(area, "high")
            indicators = tuple(high[:6])
        elif watch:
            level = "watch"
            summary = self._summary_for(area, "watch")
            indicators = tuple(watch[:6])
        elif protective:
            level = "protective"
            summary = self._summary_for(area, "protective")
            indicators = tuple(protective[:6])
        else:
            level = "unclear"
            summary = "Not enough information to infer this state from the user text."
            indicators = ()
        return CognitiveStateSignal(area=area, level=level, summary=summary, indicators=indicators, questions=self._questions_for(area, level))

    def _headline(self, signals: list[CognitiveStateSignal]) -> str:
        high = [signal.area for signal in signals if signal.level == "high"]
        if high:
            return "High-attention practice state: " + ", ".join(high[:4])
        watch = [signal.area for signal in signals if signal.level == "watch"]
        if watch:
            return "Watch state: " + ", ".join(watch[:4])
        protective = [signal.area for signal in signals if signal.level == "protective"]
        if protective:
            return "Protective signals visible: " + ", ".join(protective[:4])
        return "Insufficient practice-state signal from the user text."

    def _summary(self, signals: list[CognitiveStateSignal]) -> str:
        high_count = sum(1 for signal in signals if signal.level == "high")
        watch_count = sum(1 for signal in signals if signal.level == "watch")
        if high_count:
            return "ORB should answer with safety, escalation, evidence and oversight clearly foregrounded."
        if watch_count:
            return "ORB should answer with reflective curiosity and practical evidence prompts."
        return "ORB should answer normally while staying alert to missing context."

    def _summary_for(self, area: str, level: str) -> str:
        summaries = {
            ("safeguarding_pressure", "high"): "Potential high safeguarding pressure is visible.",
            ("safeguarding_pressure", "watch"): "Safeguarding curiosity may be needed.",
            ("emotional_temperature", "high"): "The emotional temperature may be high and adults may need to prioritise regulation.",
            ("emotional_temperature", "watch"): "The child or home may be emotionally unsettled.",
            ("emotional_temperature", "protective"): "There are signs of emotional containment or regulation.",
            ("staff_pressure", "high"): "Staff pressure may be affecting safety, consistency or reflection.",
            ("staff_pressure", "watch"): "Staff support or debrief may be needed.",
            ("oversight_visibility", "high"): "Leadership oversight may be missing or delayed.",
            ("oversight_visibility", "watch"): "Oversight should be clarified.",
            ("oversight_visibility", "protective"): "Manager oversight appears visible.",
            ("evidence_confidence", "high"): "Evidence confidence may be weak or missing.",
            ("evidence_confidence", "watch"): "Evidence quality should be considered.",
            ("evidence_confidence", "protective"): "Some useful evidence markers are visible.",
            ("relational_stability", "high"): "Relational stability may be fragile.",
            ("relational_stability", "watch"): "Relationship repair or engagement may be needed.",
            ("relational_stability", "protective"): "Protective relationship signals are visible.",
            ("inspection_vulnerability", "high"): "This may be inspection-relevant and should be evidenced carefully.",
            ("inspection_vulnerability", "watch"): "Potential evidence or governance vulnerability should be explored.",
        }
        return summaries.get((area, level), "Practice-state signal detected.")

    def _questions_for(self, area: str, level: str) -> tuple[str, ...]:
        if level == "unclear":
            return ()
        return {
            "safeguarding_pressure": ("What is known, unknown and time-critical?", "Who needs to be informed?", "What protective action is needed now?"),
            "emotional_temperature": ("What does the child need to regulate?", "How regulated are the adults?", "What repair is needed afterwards?"),
            "staff_pressure": ("Do staff need debrief or immediate support?", "Could fatigue affect judgement?", "Who is overseeing the shift?"),
            "oversight_visibility": ("Who has reviewed this?", "What decision was made?", "What action is owned and by whom?"),
            "evidence_confidence": ("What evidence is missing?", "Does the record show impact?", "Is child voice visible?"),
            "relational_stability": ("What relationship has been ruptured?", "Who is the trusted adult?", "What repair can happen?"),
            "inspection_vulnerability": ("Would this withstand scrutiny?", "What pattern might be visible?", "What has leadership done about it?"),
        }.get(area, ())


orb_cognitive_state_engine_service = OrbCognitiveStateEngineService()
