from __future__ import annotations

from collections import Counter
from typing import Any

from services.evidence_quality_service import evidence_quality_service


class InspectionIntelligenceService:
    """Predictive inspection readiness support with cautious, explainable outputs."""

    def readiness(self, *, evidence: dict[str, Any], workspace: dict[str, Any] | None = None) -> dict[str, Any]:
        quality = evidence_quality_service.analyse(evidence=evidence, workspace=workspace or {})
        patterns = quality["patterns"]
        weak_sections = [
            {"section": key, **value}
            for key, value in quality["heatmap"].items()
            if value.get("quality") == "weak"
        ]
        return {
            "status": "review_recommended" if quality["review_required"] or weak_sections else "monitor",
            "review_required": quality["review_required"],
            "patterns": patterns,
            "weak_sections": weak_sections,
            "summary": quality["summary"],
        }

    def analyse(
        self,
        *,
        events: list[dict[str, Any]],
        manager_queue: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        manager_queue = manager_queue or {}
        queue_items = manager_queue.get("items") or []

        safeguarding_events = [event for event in events if event.get("safeguarding")]
        child_voice_gaps = [item for item in queue_items if item.get("child_voice_gap")]
        evidence_gaps = [item for item in queue_items if item.get("evidence_gap")]
        workflow_gaps = [item for item in queue_items if item.get("category") == "workflow"]
        review_gaps = [item for item in queue_items if item.get("category") == "manager_review"]

        emotional_counter: Counter[str] = Counter()
        risk_counter: Counter[str] = Counter()
        for event in events:
            emotional_counter.update(event.get("emotional_tags") or [])
            risk_counter.update(event.get("risk_tags") or [])

        overall_readiness = self._overall_readiness(
            safeguarding_events=safeguarding_events,
            child_voice_gaps=child_voice_gaps,
            evidence_gaps=evidence_gaps,
            workflow_gaps=workflow_gaps,
            review_gaps=review_gaps,
        )

        concerns: list[str] = []
        if safeguarding_events:
            concerns.append(f"{len(safeguarding_events)} safeguarding-linked operational event(s) require oversight.")
        if child_voice_gaps:
            concerns.append(f"{len(child_voice_gaps)} record(s) appear to have weak or missing child voice.")
        if evidence_gaps:
            concerns.append(f"{len(evidence_gaps)} inspection-relevant record(s) have no linked evidence.")
        if workflow_gaps:
            concerns.append(f"{len(workflow_gaps)} workflow item(s) are incomplete or awaiting progression.")
        if review_gaps:
            concerns.append(f"{len(review_gaps)} record(s) are awaiting management review or oversight.")

        missing_evidence = [
            "Manager sign-off",
            "Restorative follow-up",
            "Child voice",
            "Linked chronology evidence",
        ] if evidence_gaps else []

        weak_areas: list[str] = []
        if child_voice_gaps:
            weak_areas.append("Child voice consistency")
        if evidence_gaps:
            weak_areas.append("Evidence linkage")
        if review_gaps:
            weak_areas.append("Management oversight")
        if workflow_gaps:
            weak_areas.append("Workflow completion")

        sccif_domains = {
            "children_experiences": self._domain_score(total=len(events), penalties=len(child_voice_gaps) + len(evidence_gaps)),
            "help_and_protection": self._domain_score(total=max(1, len(events)), penalties=len(safeguarding_events)),
            "leadership_and_management": self._domain_score(total=max(1, len(queue_items)), penalties=len(review_gaps) + len(workflow_gaps)),
            "workforce_practice": self._domain_score(total=max(1, len(events)), penalties=len(child_voice_gaps)),
        }

        return {
            "ok": True,
            "overall_readiness": overall_readiness,
            "concerns": concerns,
            "missing_evidence": missing_evidence,
            "weak_areas": weak_areas,
            "sccif_domains": sccif_domains,
            "ofsted_challenge_questions": self._challenge_questions(
                child_voice_gaps=child_voice_gaps,
                evidence_gaps=evidence_gaps,
                safeguarding_events=safeguarding_events,
                review_gaps=review_gaps,
                risk_counter=risk_counter,
                emotional_counter=emotional_counter,
            ),
            "operational_summary": self._summary(overall_readiness, concerns),
        }

    def _overall_readiness(
        self,
        *,
        safeguarding_events: list[dict[str, Any]],
        child_voice_gaps: list[dict[str, Any]],
        evidence_gaps: list[dict[str, Any]],
        workflow_gaps: list[dict[str, Any]],
        review_gaps: list[dict[str, Any]],
    ) -> str:
        pressure = (
            len(safeguarding_events)
            + len(child_voice_gaps)
            + len(evidence_gaps)
            + len(workflow_gaps)
            + len(review_gaps)
        )
        if pressure >= 12:
            return "requires_immediate_attention"
        if pressure >= 6:
            return "watching"
        return "good"

    def _domain_score(self, *, total: int, penalties: int) -> dict[str, Any]:
        score = max(0, min(100, int(100 - ((penalties / max(1, total)) * 35))))
        grade = "strong" if score >= 80 else "developing" if score >= 55 else "weak"
        return {"score": score, "grade": grade}

    def _challenge_questions(
        self,
        *,
        child_voice_gaps: list[dict[str, Any]],
        evidence_gaps: list[dict[str, Any]],
        safeguarding_events: list[dict[str, Any]],
        review_gaps: list[dict[str, Any]],
        risk_counter: Counter[str],
        emotional_counter: Counter[str],
    ) -> list[str]:
        questions: list[str] = []

        if child_voice_gaps:
            questions.append("How do leaders ensure children's wishes and feelings are consistently reflected in records?")
        if evidence_gaps:
            questions.append("Can leaders demonstrate clear evidence linkage and oversight for significant events?")
        if safeguarding_events:
            questions.append("How are safeguarding patterns identified, escalated and reviewed by leaders?")
        if review_gaps:
            questions.append("How do managers maintain effective oversight of operational records and decision making?")
        if risk_counter:
            top_risk = risk_counter.most_common(1)[0][0]
            questions.append(f"What action is being taken to reduce repeated {top_risk} indicators?")
        if emotional_counter:
            top_emotion = emotional_counter.most_common(1)[0][0]
            questions.append(f"How are staff responding to repeated emotional presentation themes such as {top_emotion}?")
        if not questions:
            questions.append("What evidence best demonstrates positive experiences and progress for children?")
        return questions

    def _summary(self, readiness: str, concerns: list[str]) -> str:
        if not concerns:
            return "Inspection intelligence found no immediate operational concerns from the supplied evidence."
        return f"Inspection readiness is currently '{readiness}' with {len(concerns)} identified operational concern(s)."


inspection_intelligence_service = InspectionIntelligenceService()
