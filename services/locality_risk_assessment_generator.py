from __future__ import annotations

from typing import Any

from services.location_context_cache_service import location_context_cache_service
from services.location_intelligence_service import location_intelligence_service
from services.locality_risk_assessment_service import locality_risk_assessment_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, safe_payload, scope_records


class LocalityRiskAssessmentGenerator:
    """Generates home and child locality overlays from cached deterministic context."""

    def home_locality_assessment(
        self,
        *,
        home_id: int | str,
        records: list[dict[str, Any]],
        manual_locations: list[dict[str, Any]] | None = None,
        local_authority_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        locations = location_intelligence_service.build_locations(
            records=records,
            home_id=home_id,
            manual_locations=manual_locations,
        )
        assessment = locality_risk_assessment_service.assess(
            locations=locations,
            scope={"home_id": home_id},
            local_authority_context=local_authority_context,
        )
        cached = location_context_cache_service.get_or_set(
            scope={"home_id": home_id},
            context_type="home_locality_assessment",
            value=assessment,
        )
        return safe_payload({**assessment, "cache": {"key": cached["key"], "cache_hit": cached["cache_hit"]}})

    def child_locality_overlay(
        self,
        *,
        young_person_id: int | str,
        records: list[dict[str, Any]],
        home_id: int | str | None = None,
        manual_locations: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        child_records = scope_records(records, young_person_id=young_person_id, home_id=home_id)
        locations = location_intelligence_service.build_locations(
            records=child_records,
            young_person_id=young_person_id,
            home_id=home_id,
            manual_locations=manual_locations,
        )
        assessment = locality_risk_assessment_service.assess(
            locations=locations,
            scope={"young_person_id": young_person_id, "home_id": home_id},
        )
        overlay = {
            **assessment,
            "assessment_type": "child locality overlay",
            "known_child_specific_locations": locations,
            "peer_associate_areas": [item for item in locations if item.get("category") == "peer/associate area"],
            "safe_spaces_resources": assessment["protective_resources"],
            "manager_review_prompts": [
                *assessment["manager_review_prompts"],
                {
                    "prompt_id": "active-child-only",
                    "priority": "review",
                    "prompt": "review recommended: confirm this overlay only uses active child records.",
                    "language": "review recommended",
                },
            ],
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
        }
        cached = location_context_cache_service.get_or_set(
            scope={"young_person_id": young_person_id, "home_id": home_id},
            context_type="child_locality_overlay",
            value=overlay,
        )
        return safe_payload({**overlay, "cache": {"key": cached["key"], "cache_hit": cached["cache_hit"]}})


locality_risk_assessment_generator = LocalityRiskAssessmentGenerator()
