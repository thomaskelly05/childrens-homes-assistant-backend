from __future__ import annotations

from typing import Any

from services.dynamic_child_risk_assessment_service import dynamic_child_risk_assessment_service
from services.exploitation_risk_intelligence_service import exploitation_risk_intelligence_service
from services.locality_risk_assessment_generator import locality_risk_assessment_generator
from services.missing_pattern_intelligence_service import missing_pattern_intelligence_service
from services.practical_staff_guidance_service import practical_staff_guidance_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, safe_payload, scope_records


class OrbRiskIntelligenceService:
    """Conversational risk intelligence answers scoped to the active child only."""

    def answer(
        self,
        *,
        question: str,
        active_young_person_id: int | str,
        records: list[dict[str, Any]],
        missing_episodes: list[dict[str, Any]] | None = None,
        home_id: int | str | None = None,
    ) -> dict[str, Any]:
        scoped = scope_records(records, young_person_id=active_young_person_id, home_id=home_id)
        q = question.lower()
        if "look first" in q or "goes missing" in q or "known patterns" in q or "missing risk review" in q:
            data = missing_pattern_intelligence_service.analyse(
                missing_episodes=missing_episodes or scoped,
                records=scoped,
                young_person_id=active_young_person_id,
                home_id=home_id,
            )
            answer = data["orb_prompts"] or ["no evidence found: missing pattern evidence is not visible in the active child record."]
        elif "exploitation" in q or "indicators" in q:
            data = exploitation_risk_intelligence_service.analyse(records=scoped, young_person_id=active_young_person_id, home_id=home_id)
            answer = [item["summary"] for item in data["concern_summary"]] or ["no evidence found: exploitation indicators are not visible in the active child record."]
        elif "changed this week" in q or "current risks" in q:
            data = dynamic_child_risk_assessment_service.suggest_updates(records=scoped, young_person_id=active_young_person_id, home_id=home_id)
            answer = [item["summary"] for item in data["suggested_updates"]] or ["records indicate no draft risk updates from visible active child records."]
        elif "staff know tonight" in q:
            data = practical_staff_guidance_service.generate(records=scoped, young_person_id=active_young_person_id, home_id=home_id)
            answer = [item["prompt"] for item in data["prompts"]]
        elif "local risks" in q:
            data = locality_risk_assessment_generator.child_locality_overlay(young_person_id=active_young_person_id, records=scoped, home_id=home_id)
            answer = [item["summary"] for item in data["locality_concerns"]] or ["no evidence found: locality concerns are not visible in the active child record."]
        else:
            data = dynamic_child_risk_assessment_service.suggest_updates(records=scoped, young_person_id=active_young_person_id, home_id=home_id)
            answer = ["review recommended: ask about missing patterns, exploitation indicators, what changed, staff guidance or locality context."]
        payload = {
            "active_young_person_id": active_young_person_id,
            "answer": answer,
            "evidence_scope_count": len(scoped),
            "cross_child_records_excluded": len(records) - len(scoped),
            "limitations": [
                "records indicate Orb risk answers use the active child only.",
                "review recommended: staff should check source records before action.",
            ],
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
        }
        return safe_payload(payload)


orb_risk_intelligence_service = OrbRiskIntelligenceService()
