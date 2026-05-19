from __future__ import annotations

from typing import Any


def _text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _bullets(items: list[Any], fallback: str) -> list[str]:
    values = [_text(item.get("reason") if isinstance(item, dict) else item) for item in items if _text(item.get("reason") if isinstance(item, dict) else item)]
    return [f"- {item}" for item in values[:5]] or [f"- {fallback}"]


class OrbResponseComposer:
    """Composes ORB's operational answer from care, regulatory and therapeutic reasoning."""

    def compose(
        self,
        *,
        context: dict[str, Any],
        care_journey: dict[str, Any],
        regulatory: dict[str, Any],
        therapeutic: dict[str, Any],
        guardrails: list[str],
    ) -> tuple[str, str, str]:
        sources = list(context.get("sources") or [])
        if not sources:
            answer = "I could not find live records for that area yet."
            if context.get("errors"):
                answer += " Some live sources were unavailable, so this should be checked again before operational use."
            answer += " No safeguarding, inspection or workforce conclusion has been made. Manager review remains required."
            return answer, "No citable live records were found in the permitted scope.", "low"

        child_name = self._child_name(context)
        cited = sources[:5]
        cited_lines = [f"- {item['citation_ref']} {item['title']}: {_text(item.get('summary'), 'Record available for review.')}" for item in cited]
        themes = care_journey.get("emotional_themes") or ["daily lived experience"]
        strengths = care_journey.get("strengths") or care_journey.get("protective_factors") or []
        review_areas = care_journey.get("review_areas") or care_journey.get("support_needs") or []
        reg_links = regulatory.get("inspection_relevance") or []

        answer = "\n".join(
            [
                "Short operational summary",
                f"{child_name}'s care journey is best understood through the chronology, plans, actions and evidence returned in this permitted context. {care_journey.get('progress')}",
                "",
                "Child-centred narrative",
                self._narrative(child_name, themes, therapeutic),
                "",
                "Key strengths/protective factors",
                *_bullets(strengths or care_journey.get("protective_factors") or [], "No clear protective factors were returned; review the wider record before relying on this."),
                "",
                "Areas requiring review/support",
                *_bullets(review_areas or care_journey.get("evidence_gaps") or [], "Strengthen the evidence base before drawing operational conclusions."),
                "",
                "Inspection/regulatory relevance",
                *[f"- {item['label']}: {item['reason']}" for item in reg_links[:4]],
                "",
                "Suggested management considerations",
                *_bullets(regulatory.get("management_considerations") or [], "Use manager judgement to test the evidence against the full chronology."),
                "",
                "Evidence sources",
                *cited_lines,
                "",
                "Guardrail",
                f"{guardrails[0]} ORB is highlighting themes and evidence gaps; it is not making a final safeguarding, clinical or inspection judgement.",
            ]
        )
        confidence = "high" if len(sources) >= 5 and not context.get("errors") else "medium"
        summary = " ".join(
            [
                f"{len(sources)} live source(s) cited.",
                f"Themes: {', '.join(themes[:3])}.",
                f"Evidence gaps: {len(regulatory.get('evidence_gaps') or [])}.",
            ]
        )
        return answer, summary, confidence

    def _child_name(self, context: dict[str, Any]) -> str:
        profile = context.get("child_profile") or {}
        for key in ("preferred_name", "preferredName", "display_name", "displayName", "first_name", "firstName", "name"):
            if profile.get(key):
                return str(profile[key]).strip()
        return "This child"

    def _narrative(self, child_name: str, themes: list[str], therapeutic: dict[str, Any]) -> str:
        theme_text = ", ".join(themes[:4])
        observations = therapeutic.get("therapeutic_observations") or []
        observation = observations[0] if observations else "the records should be read through the child's lived experience."
        return f"{child_name}'s records point towards {theme_text}. In practice, {observation} This should be tested against staff knowledge and the full chronology."
