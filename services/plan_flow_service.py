from __future__ import annotations

from typing import Any

from services.dynamic_child_risk_assessment_service import dynamic_child_risk_assessment_service
from services.exploitation_risk_intelligence_service import exploitation_risk_intelligence_service
from services.location_intelligence_service import location_intelligence_service
from services.regulatory_alignment_service import regulatory_alignment_service
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, citation, review_prompt, safe_payload


PLAN_TYPES = [
    "care plan",
    "placement plan",
    "behaviour support plan",
    "missing protocol",
    "education plan",
    "health plan",
    "family contact plan",
    "safety plan",
    "exploitation risk assessment",
    "online safety plan",
    "self-harm plan",
    "independence plan",
]


class PlanFlowService:
    """Event-driven metadata and draft plan review suggestions after record saves."""

    def after_record_saved(
        self,
        *,
        record: dict[str, Any],
        visible_records: list[dict[str, Any]],
        young_person_id: int | str | None = None,
        home_id: int | str | None = None,
    ) -> dict[str, Any]:
        all_records = [*visible_records, record]
        risk = (
            dynamic_child_risk_assessment_service.suggest_updates(records=all_records, young_person_id=young_person_id, home_id=home_id)
            if young_person_id is not None
            else {"suggested_updates": []}
        )
        exploitation = exploitation_risk_intelligence_service.analyse(records=all_records, young_person_id=young_person_id, home_id=home_id)
        locations = location_intelligence_service.build_locations(records=all_records, young_person_id=young_person_id, home_id=home_id)
        themes = self._themes(record)
        payload = {
            "draft_suggestions_only": True,
            "auto_finalised": False,
            "chronology_metadata": {"source": citation(record), "themes": themes},
            "risk_metadata": risk["suggested_updates"],
            "locality_context": locations[:6],
            "exploitation_indicators": exploitation["concern_summary"],
            "evidence_links": [citation(record, reason="evidence found: saved record created plan flow metadata.")],
            "suggested_document_updates": self._document_updates(themes),
            "suggested_plan_reviews": self._plan_reviews(themes),
            "suggested_risk_assessment_reviews": risk["suggested_updates"],
            "suggested_action_links": self._action_links(record),
            "handover_relevance": self._handover_relevance(record, themes),
            "report_evidence_relevance": self._report_relevance(themes),
            "suggested_manager_review": [
                review_prompt("manager-flow-review", "review recommended: manager should check draft plan and risk suggestions before signoff.")
            ],
            "regulatory_metadata": regulatory_alignment_service.align(themes=["protection of children", "care planning", "leadership and management"]),
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
        }
        return safe_payload(payload)

    def _themes(self, record: dict[str, Any]) -> list[str]:
        text = str(record).lower()
        themes = []
        for theme, terms in {
            "missing": ("missing", "absent"),
            "education": ("school", "education"),
            "health": ("health", "medication", "camhs"),
            "family contact": ("family", "contact", "mum", "dad"),
            "exploitation": ("exploitation", "cse", "cce", "unknown adult"),
            "online safety": ("online", "phone", "social media"),
            "self-harm": ("self-harm", "self harm", "overdose"),
            "behaviour support": ("incident", "aggression", "damage", "restraint"),
        }.items():
            if any(term in text for term in terms):
                themes.append(theme)
        return themes or ["care plan"]

    def _plan_reviews(self, themes: list[str]) -> list[dict[str, Any]]:
        mapping = {
            "missing": "missing protocol",
            "education": "education plan",
            "health": "health plan",
            "family contact": "family contact plan",
            "exploitation": "exploitation risk assessment",
            "online safety": "online safety plan",
            "self-harm": "self-harm plan",
            "behaviour support": "behaviour support plan",
            "care plan": "care plan",
        }
        reviews = []
        for theme in themes:
            plan_type = mapping.get(theme)
            if plan_type in PLAN_TYPES:
                reviews.append({"plan_type": plan_type, "summary": f"review recommended: consider draft updates to {plan_type}.", "draft_only": True})
        return reviews

    def _document_updates(self, themes: list[str]) -> list[dict[str, Any]]:
        updates = []
        for review in self._plan_reviews(themes):
            plan_type = review["plan_type"]
            updates.append(
                {
                    "document_type": plan_type,
                    "summary": f"review recommended: draft document update may be relevant to {plan_type}.",
                    "draft_only": True,
                    "evidence_language": "evidence found/no evidence found should be checked by staff before review.",
                }
            )
        return updates

    def _action_links(self, record: dict[str, Any]) -> list[dict[str, Any]]:
        text = str(record).lower()
        if not any(term in text for term in ("action", "follow", "review", "next", "due")):
            return []
        return [
            {
                "summary": "records indicate follow-up wording; review recommended before creating or assigning an action.",
                "draft_only": True,
            }
        ]

    def _handover_relevance(self, record: dict[str, Any], themes: list[str]) -> dict[str, Any]:
        text = str(record).lower()
        relevant = bool(themes) or any(term in text for term in ("handover", "next shift", "follow", "incident", "missing", "safeguarding"))
        return {
            "relevant": relevant,
            "summary": "pattern suggests this may be relevant to handover." if relevant else "no evidence found for handover relevance.",
            "draft_only": True,
        }

    def _report_relevance(self, themes: list[str]) -> dict[str, Any]:
        report_types = []
        if any(theme in themes for theme in ("missing", "exploitation", "self-harm", "behaviour support")):
            report_types.extend(["safeguarding chronology", "manager oversight report"])
        if any(theme in themes for theme in ("education", "health", "family contact", "care plan")):
            report_types.extend(["LAC review", "Reg 45 review"])
        return {
            "possible_reports": report_types or ["manager oversight report"],
            "summary": "possible indicator for report evidence; staff review recommended.",
            "draft_only": True,
        }


plan_flow_service = PlanFlowService()
