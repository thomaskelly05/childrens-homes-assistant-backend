from __future__ import annotations

from typing import Any

from services.dynamic_child_risk_assessment_service import dynamic_child_risk_assessment_service
from services.exploitation_risk_intelligence_service import exploitation_risk_intelligence_service
from services.locality_risk_assessment_generator import locality_risk_assessment_generator
from services.missing_pattern_intelligence_service import missing_pattern_intelligence_service
from services.orb_risk_intelligence_service import orb_risk_intelligence_service
from services.practical_staff_guidance_service import practical_staff_guidance_service
from services.risk_intelligence_language import safe_payload


class RiskLocalityConnectionService:
    """Connects existing risk/locality services into operational metadata surfaces."""

    def build_operational_links(
        self,
        *,
        records: list[dict[str, Any]],
        young_person_id: int | str,
        home_id: int | str,
    ) -> dict[str, Any]:
        locality = locality_risk_assessment_generator.child_locality_overlay(
            young_person_id=young_person_id,
            home_id=home_id,
            records=records,
        )
        missing = missing_pattern_intelligence_service.analyse(
            missing_episodes=records,
            records=records,
            young_person_id=young_person_id,
            home_id=home_id,
        )
        exploitation = exploitation_risk_intelligence_service.analyse(
            records=records,
            young_person_id=young_person_id,
            home_id=home_id,
        )
        dynamic = dynamic_child_risk_assessment_service.suggest_updates(
            records=records,
            young_person_id=young_person_id,
            home_id=home_id,
        )
        orb = orb_risk_intelligence_service.answer(
            question="Summarise risk and locality prompts for staff review.",
            active_young_person_id=young_person_id,
            home_id=home_id,
            records=records,
        )
        guidance = practical_staff_guidance_service.generate(
            records=records,
            young_person_id=young_person_id,
            home_id=home_id,
        )
        return safe_payload(
            {
                "plans": dynamic.get("suggested_updates", []),
                "risk_assessments": dynamic,
                "daily_story": missing.get("continuity_summary") or missing.get("summary"),
                "handover": orb.get("answer"),
                "orb": orb,
                "inspection_readiness": {
                    "locality": locality.get("manager_review_prompts") or locality.get("locality_concerns"),
                    "missing": missing.get("manager_review_prompts") or missing.get("return_home_interview_gaps"),
                    "exploitation": exploitation.get("manager_review_prompts") or exploitation.get("concern_summary"),
                },
                "documents": ["Individual Risk Assessment", "Missing From Care Protocol", "Locality Risk Assessment", "Safety Plan"],
                "manager_qa": dynamic.get("manager_review_prompts", []),
                "staff_guidance": guidance,
                "language": ["records indicate", "pattern suggests", "possible indicator", "review recommended"],
            }
        )


risk_locality_connection_service = RiskLocalityConnectionService()
