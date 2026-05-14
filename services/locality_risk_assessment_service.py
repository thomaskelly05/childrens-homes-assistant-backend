from __future__ import annotations

from typing import Any

from schemas.location_intelligence import LocalityAssessment
from services.locality_review_scheduler import locality_review_scheduler
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, evidence_gap, now_iso, safe_payload


class LocalityRiskAssessmentService:
    """Turns location intelligence into practical locality review support."""

    def assess(
        self,
        *,
        locations: list[dict[str, Any]],
        scope: dict[str, Any],
        local_authority_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        protective_resources = self._protective_resources(locations)
        concerns = self._concerns(locations)
        gaps = self._evidence_gaps(locations, local_authority_context=local_authority_context)
        schedule = locality_review_scheduler.schedule(locations=locations)
        payload = LocalityAssessment(
            assessment_type="locality risk assessment",
            scope=scope,
            generated_at=now_iso(),
            summary="records indicate locality context is available for professional review; pattern suggests staff should focus on evidence links, transport, safe spaces and review gaps.",
            locations=locations,
            protective_resources=protective_resources,
            locality_concerns=concerns,
            evidence_gaps=gaps,
            manager_review_prompts=locality_review_scheduler.prompts(locations=locations),
            review_schedule=schedule,
            limitations=[
                "records indicate this assessment uses visible records and cached locality context only.",
                "review recommended before relying on any location note for operational decisions.",
                "no evidence found should be treated as a recording gap, not proof that context is absent.",
            ],
            decision_support_notice=SAFE_DECISION_SUPPORT_NOTICE,
        )
        return safe_payload(payload.model_dump())

    def _protective_resources(self, locations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        resources = []
        for location in locations:
            if location.get("protective_value") or location.get("category") in {"school", "GP surgery", "hospital", "CAMHS", "youth centre", "known safe location"}:
                resources.append(
                    {
                        "location_id": location.get("location_id"),
                        "name": location.get("name"),
                        "category": location.get("category"),
                        "summary": location.get("protective_value") or "records indicate this may be a protective resource if staff verify current access.",
                        "evidence_refs": location.get("evidence_refs", [])[:3],
                    }
                )
        return resources

    def _concerns(self, locations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        concerns = []
        for location in locations:
            if location.get("risk_level") in {"review", "priority_review"} or location.get("linked_missing_episodes"):
                concerns.append(
                    {
                        "location_id": location.get("location_id"),
                        "name": location.get("name"),
                        "summary": "possible indicator: records indicate this location links to missing, safeguarding or transport context.",
                        "protective_factors": [location.get("protective_value")] if location.get("protective_value") else [],
                        "evidence_refs": location.get("evidence_refs", [])[:5],
                        "review_required": True,
                    }
                )
        return concerns

    def _evidence_gaps(self, locations: list[dict[str, Any]], *, local_authority_context: dict[str, Any] | None) -> list[dict[str, Any]]:
        gaps = []
        categories = {location.get("category") for location in locations}
        for category, prompt in {
            "transport route": "no evidence found: transport routes need recording or review.",
            "school": "no evidence found: education context needs linking to locality assessment.",
            "GP surgery": "no evidence found: health access needs locality evidence.",
            "known safe location": "no evidence found: safe spaces/resources need staff-confirmed notes.",
        }.items():
            if category not in categories:
                gaps.append(evidence_gap(category.replace(" ", "-"), prompt))
        if not local_authority_context:
            gaps.append(evidence_gap("local-authority-context", "no evidence found: local authority context has not been attached."))
        return gaps


locality_risk_assessment_service = LocalityRiskAssessmentService()
