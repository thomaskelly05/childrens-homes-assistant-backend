from __future__ import annotations

from collections import Counter
from typing import Any


THEME_KEYWORDS = {
    "emotional stability": ("settled", "calm", "regulated", "routine", "predictable", "sleep"),
    "emotional pressure": ("upset", "anxious", "distressed", "angry", "overwhelmed", "dysregulated"),
    "relationship safety": ("trusted", "keyworker", "relationship", "repair", "family", "contact"),
    "voice and belonging": ("wishes", "feelings", "voice", "identity", "life story", "belonging"),
    "learning and engagement": ("school", "education", "pep", "attendance", "learning", "achievement"),
    "risk review": ("risk", "incident", "missing", "safeguarding", "harm", "police"),
    "management oversight": ("manager", "review", "signed", "approved", "oversight", "action"),
}

POSITIVE_TERMS = ("settled", "calm", "engaged", "positive", "improved", "attended", "trusted", "consistent")
PRESSURE_TERMS = ("incident", "missing", "risk", "upset", "distressed", "overdue", "review", "safeguarding")


def _text(value: Any) -> str:
    return str(value or "").strip()


def _record_text(record: dict[str, Any]) -> str:
    return " ".join(
        _text(record.get(key))
        for key in ("title", "summary", "description", "extracted_text", "status", "source_type", "document_type", "quality")
        if _text(record.get(key))
    ).lower()


class OrbOperationalCognitionService:
    """Turns existing ORB context into practical whole-home cognition.

    This does not create new facts. It summarises permitted live/projection context
    into themes, impact indicators, trajectory signals and RM review prompts.
    """

    def build(self, context: dict[str, Any]) -> dict[str, Any]:
        records = []
        for key in ("chronology", "safeguarding", "documents", "actions", "evidence", "reports"):
            records.extend(list(context.get(key) or []))

        theme_counts: Counter[str] = Counter()
        positive_count = 0
        pressure_count = 0
        for record in records:
            text = _record_text(record)
            for theme, keywords in THEME_KEYWORDS.items():
                if any(keyword in text for keyword in keywords):
                    theme_counts[theme] += 1
            if any(term in text for term in POSITIVE_TERMS):
                positive_count += 1
            if any(term in text for term in PRESSURE_TERMS):
                pressure_count += 1

        themes = [theme for theme, _count in theme_counts.most_common(6)]
        if not themes and context.get("sources"):
            themes = ["recording quality", "daily lived experience"]

        trajectory = self._trajectory(positive_count=positive_count, pressure_count=pressure_count, record_count=len(records))
        impact = self._impact_indicators(themes)
        rm_prompts = self._rm_prompts(themes=themes, context=context, pressure_count=pressure_count)

        return {
            "record_count": len(records),
            "themes": themes,
            "positive_signal_count": positive_count,
            "pressure_signal_count": pressure_count,
            "trajectory": trajectory,
            "impact_indicators": impact,
            "rm_review_prompts": rm_prompts,
            "cognition_summary": self._summary(themes, trajectory),
        }

    def _trajectory(self, *, positive_count: int, pressure_count: int, record_count: int) -> str:
        if record_count == 0:
            return "not enough live evidence to describe direction of travel"
        if pressure_count > positive_count and pressure_count >= 3:
            return "pressure appears more visible than stability in this evidence window"
        if positive_count > pressure_count and positive_count >= 3:
            return "stability or progress appears more visible than pressure in this evidence window"
        return "mixed or early evidence; direction of travel needs manager review"

    def _impact_indicators(self, themes: list[str]) -> list[str]:
        indicators: list[str] = []
        if "emotional stability" in themes:
            indicators.append("look for whether routines and adult consistency are improving the child’s daily experience")
        if "learning and engagement" in themes:
            indicators.append("check whether education evidence shows attendance, engagement or progress from starting points")
        if "relationship safety" in themes:
            indicators.append("check whether trusted relationships and repair work are improving emotional safety")
        if "voice and belonging" in themes:
            indicators.append("check whether the child’s wishes and feelings are influencing care planning")
        if "risk review" in themes:
            indicators.append("check whether risk plans, chronology and actions are aligned and recently reviewed")
        return indicators[:5] or ["strengthen records so they show what changed for the child, not only what adults completed"]

    def _rm_prompts(self, *, themes: list[str], context: dict[str, Any], pressure_count: int) -> list[str]:
        prompts = ["Can the record show what changed for the child after adult support?"]
        if "risk review" in themes or pressure_count:
            prompts.append("Are current plans and actions updated against the latest chronology?")
        if "management oversight" not in themes:
            prompts.append("Is manager review or sign-off visible enough in the evidence?")
        if "voice and belonging" not in themes:
            prompts.append("Is the child’s voice visible in daily care, keywork or review records?")
        if context.get("degraded"):
            prompts.append("ORB used partial/projection context because live reads were degraded; review again when stable.")
        return prompts[:5]

    def _summary(self, themes: list[str], trajectory: str) -> str:
        if not themes:
            return "No clear operational cognition themes were available from the current context."
        return f"Visible themes: {', '.join(themes[:4])}. Direction: {trajectory}."


orb_operational_cognition_service = OrbOperationalCognitionService()
