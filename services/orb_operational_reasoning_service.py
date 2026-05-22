from __future__ import annotations

from typing import Any

from services.orb_operational_cognition_service import OrbOperationalCognitionService


class OrbOperationalReasoningService:
    """ORB operational reasoning across chronology, incidents, safeguarding and workforce signals."""

    def __init__(self) -> None:
        self._cognition = OrbOperationalCognitionService()

    def reason(
        self,
        *,
        feed: dict[str, Any],
        chronology_patterns: dict[str, Any] | None = None,
        workflow: dict[str, Any] | None = None,
        alerts: dict[str, Any] | None = None,
        question: str | None = None,
    ) -> dict[str, Any]:
        chronology_patterns = chronology_patterns or {}
        workflow = workflow or {}
        alerts = alerts or {}
        events = feed.get("events") or []
        orb_memory = feed.get("orb_operational_memory") or {}

        cognition_context = {
            "chronology": events,
            "safeguarding": [event for event in events if event.get("safeguarding")],
            "actions": (feed.get("manager_queue") or {}).get("items") or [],
            "evidence": [event for event in events if int(event.get("evidence_count") or 0) == 0],
        }
        cognition = self._cognition.build(cognition_context)

        operational_summary = self._operational_summary(feed, workflow, alerts)
        inspection_summary = self._inspection_summary(feed)
        answer = self._answer_question(
            question=question,
            feed=feed,
            chronology_patterns=chronology_patterns,
            orb_memory=orb_memory,
            events=events,
        )

        return {
            "ok": True,
            "operational_summary": operational_summary,
            "inspection_summary": inspection_summary,
            "cognition": cognition,
            "chronology_reasoning": {
                "patterns_before_incidents": chronology_patterns.get("orb_questions", {}).get("patterns_before_incidents"),
                "patterns_before_missing": chronology_patterns.get("orb_questions", {}).get("patterns_before_missing"),
                "interventions_for_dysregulation": chronology_patterns.get("orb_questions", {}).get(
                    "interventions_reduce_dysregulation"
                ),
            },
            "emotional_patterns": (orb_memory.get("memory_summary") or {}).get("emotional_patterns") or [],
            "safeguarding_patterns": (orb_memory.get("memory_summary") or {}).get("risk_patterns") or [],
            "workforce_interventions": (feed.get("manager_queue") or {}).get("summary"),
            "provider_level_ready": True,
            "question": question,
            "answer": answer,
            "conversation_summary": orb_memory.get("conversation_summary") or operational_summary,
        }

    def _operational_summary(
        self,
        feed: dict[str, Any],
        workflow: dict[str, Any],
        alerts: dict[str, Any],
    ) -> str:
        home_summary = (feed.get("home_operational_intelligence") or {}).get("summary") or ""
        workflow_summary = workflow.get("summary") or ""
        alert_summary = alerts.get("summary") or ""
        return " ".join(part for part in [home_summary, workflow_summary, alert_summary] if part).strip()

    def _inspection_summary(self, feed: dict[str, Any]) -> str:
        inspection = feed.get("inspection_intelligence") or {}
        return str(inspection.get("operational_summary") or "No inspection summary available.")

    def _answer_question(
        self,
        *,
        question: str | None,
        feed: dict[str, Any],
        chronology_patterns: dict[str, Any],
        orb_memory: dict[str, Any],
        events: list[dict[str, Any]],
    ) -> str:
        if not question:
            return (orb_memory.get("conversation_summary") or "Operational reasoning is available for review.").strip()

        lowered = question.lower()
        orb_questions = chronology_patterns.get("orb_questions") or {}

        if "before incident" in lowered or "patterns exist" in lowered:
            return orb_questions.get("patterns_before_incidents", "No pre-incident pattern summary available.")
        if "before missing" in lowered or "missing episode" in lowered:
            return orb_questions.get("patterns_before_missing", "No pre-missing pattern summary available.")
        if "dysregulation" in lowered or "intervention" in lowered:
            return orb_questions.get(
                "interventions_reduce_dysregulation",
                "Review restorative practice and regulation support in recent records.",
            )
        if "provider" in lowered or "across homes" in lowered:
            return (
                f"Provider-level reasoning can be generated from {len(events)} operational event(s) "
                "using the provider intelligence convergence layer."
            )
        if "safeguarding risk" in lowered or "emerging" in lowered:
            forecasts = chronology_patterns.get("repeat_safeguarding_themes") or []
            if forecasts:
                themes = ", ".join(str(item.get("theme", "")) for item in forecasts[:3])
                return f"Emerging safeguarding themes in operational scope: {themes}."
            return chronology_patterns.get("summary") or "Review predictive safeguarding forecasts from the operational feed."
        if "escalat" in lowered or "pattern" in lowered:
            return chronology_patterns.get("summary") or orb_questions.get("patterns_before_incidents", "No escalating patterns summary available.")
        if "intervention" in lowered and "risk" in lowered:
            return orb_questions.get(
                "interventions_reduce_dysregulation",
                "Review prior restorative interventions linked in chronology before significant events.",
            )
        if "ofsted" in lowered or "challenge" in lowered or ("evidence" in lowered and "weak" in lowered):
            weak = (feed.get("inspection_intelligence") or {}).get("weak_areas") or []
            if weak:
                return f"Inspection intelligence flags weak areas: {', '.join(str(item) for item in weak[:4])}."
            return self._inspection_summary(feed)
        if "highest risk" in lowered and "home" in lowered:
            return (
                "Use provider command centre home comparison scoring to identify highest-risk homes "
                "from cross-home safeguarding and workforce pressure."
            )

        return (orb_memory.get("conversation_summary") or "Review operational feed signals for context.").strip()


orb_operational_reasoning_service = OrbOperationalReasoningService()
