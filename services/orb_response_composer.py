from __future__ import annotations

from typing import Any


def _text(value: Any, fallback: str = "") -> str:
    text = str(value or "").strip()
    return text or fallback


def _bullets(items: list[Any], fallback: str) -> list[str]:
    values = [_text(item.get("reason") if isinstance(item, dict) else item) for item in items if _text(item.get("reason") if isinstance(item, dict) else item)]
    return [f"- {item}" for item in values[:5]] or [f"- {fallback}"]


class OrbResponseComposer:
    """Composes ORB's operational answer from existing ORB reasoning layers."""

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
            answer += " No operational conclusion has been made. Manager review remains required."
            return answer, "No citable live records were found in the permitted scope.", "low"

        child_name = self._child_name(context)
        intent = str(context.get("intent") or "general_operational")
        scope = str(context.get("scope") or "home")
        cited = sources[:5]
        cited_lines = [f"- {item['citation_ref']} {item['title']}: {_text(item.get('summary'), 'Record available for review.')}" for item in cited]
        themes = care_journey.get("emotional_themes") or ["daily lived experience"]
        strengths = care_journey.get("strengths") or care_journey.get("protective_factors") or []
        review_areas = list(care_journey.get("review_areas") or care_journey.get("support_needs") or [])
        reg_links = regulatory.get("inspection_relevance") or []
        emotional_state = context.get("emotional_state") or {}
        emotional_safety = context.get("emotional_safety") or {}
        risk_intelligence = context.get("risk_intelligence") or {}
        review_areas = [*self._risk_lines(risk_intelligence), *review_areas]

        answer = "\n".join(
            [
                "Short operational summary",
                self._intro_for_intent(intent=intent, scope=scope, child_name=child_name, care_journey=care_journey),
                "",
                "Child-centred narrative",
                self._narrative(child_name, themes, therapeutic, emotional_state, emotional_safety),
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
                self._guardrail(guardrails, emotional_safety),
            ]
        )
        confidence = "high" if len(sources) >= 5 and not context.get("errors") else "medium"
        summary = " ".join(
            [
                f"{len(sources)} live source(s) cited.",
                f"Themes: {', '.join(themes[:3])}.",
                f"Evidence gaps: {len(regulatory.get('evidence_gaps') or [])}.",
                f"Pacing: {_text(emotional_state.get('recommended_pacing'), 'steady')}.",
            ]
        )
        return answer, summary, confidence

    def _child_name(self, context: dict[str, Any]) -> str:
        profile = context.get("child_profile") or {}
        if isinstance(profile, dict):
            for key in ("preferred_name", "preferredName", "display_name", "displayName", "first_name", "firstName", "name"):
                if profile.get(key):
                    return str(profile[key]).strip()
        return "This child"

    def _intro_for_intent(self, *, intent: str, scope: str, child_name: str, care_journey: dict[str, Any]) -> str:
        progress = _text(care_journey.get("progress"), "The visible records need reviewing alongside staff knowledge and the full chronology.")
        if intent == "inspection_sccif" or scope in {"inspection", "governance", "provider"}:
            return "Inspection readiness should be treated as evidence-led preparation, not a predicted outcome. The key question is whether records show what happened, what adults did, what changed for children, and how managers followed this up."
        if intent == "safeguarding_risk":
            return "Risk information should be reviewed calmly, with facts separated from interpretation and source records checked before action."
        if intent == "child_chronology" or scope == "child":
            return f"{child_name}'s care journey is best understood through lived experience, relationships, routines and the quality of adult response. {progress}"
        if intent == "workforce" or scope == "workforce":
            return "Workforce information should be read through supervision, training, recording quality, consistency and the impact adults have on children’s day-to-day experience."
        return "I have reviewed the permitted operational context and pulled together the themes that matter for care, oversight and next-step manager review."

    def _narrative(self, child_name: str, themes: list[str], therapeutic: dict[str, Any], emotional_state: dict[str, Any], emotional_safety: dict[str, Any]) -> str:
        theme_text = ", ".join(themes[:4])
        observations = therapeutic.get("therapeutic_observations") or []
        observation = observations[0] if observations else "the records should be read through the child's lived experience."
        pacing = _text(emotional_state.get("recommended_pacing"), "steady")
        safe_phrase = _text(emotional_safety.get("safe_phrase"), "I can stay with the task.")
        return f"{child_name}'s records point towards {theme_text}. In practice, {observation} ORB is using a {pacing} response style here: {safe_phrase} This should be tested against staff knowledge and the full chronology."

    def _risk_lines(self, risk_intelligence: dict[str, Any]) -> list[str]:
        answer = risk_intelligence.get("answer") if isinstance(risk_intelligence, dict) else None
        if not isinstance(answer, list):
            return []
        return [_text(item) for item in answer if _text(item)][:4]

    def _guardrail(self, guardrails: list[str], emotional_safety: dict[str, Any]) -> str:
        base = guardrails[0] if guardrails else "ORB supports review; it does not replace professional judgement."
        return f"{base} ORB is highlighting themes and evidence gaps; final operational decisions remain with the appropriate adults and managers."
