from __future__ import annotations

from typing import Any

from schemas.location_intelligence import DynamicRiskDomain, ReviewRiskLevel
from services.risk_intelligence_language import SAFE_DECISION_SUPPORT_NOTICE, citation, record_text, review_prompt, safe_payload, scope_records


RISK_DOMAINS: dict[str, tuple[str, ...]] = {
    "missing": ("missing", "absent", "returned"),
    "exploitation": ("exploitation", "cse", "cce", "county lines", "unknown adult", "gift"),
    "emotional wellbeing": ("anxious", "heightened", "withdrawn", "sleep", "tearful", "settled"),
    "self-harm": ("self-harm", "self harm", "suicidal", "overdose"),
    "aggression": ("aggression", "assault", "threw", "damage", "restraint"),
    "online safety": ("online", "phone", "social media", "message"),
    "family contact": ("family", "mum", "dad", "contact", "aunt"),
    "peer relationships": ("peer", "friend", "relationship", "argument"),
    "education": ("school", "education", "attendance", "timetable"),
    "medication": ("medication", "missed", "dose", "health"),
    "transport/community": ("transport", "taxi", "bus", "train", "route", "park"),
    "placement stability": ("placement", "move", "transition", "stability"),
}

AUTO_UPDATE_TRIGGERS = {
    "daily_note",
    "incident",
    "safeguarding_concern",
    "missing_episode",
    "keywork",
    "health_update",
    "family_contact",
    "education_update",
}


class DynamicChildRiskAssessmentService:
    """Suggests dynamic risk assessment updates; never finalises changes."""

    def suggest_updates(
        self,
        *,
        records: list[dict[str, Any]],
        young_person_id: int | str,
        home_id: int | str | None = None,
        existing_assessments: list[dict[str, Any]] | None = None,
    ) -> dict[str, Any]:
        scoped = scope_records(records, young_person_id=young_person_id, home_id=home_id)
        domains = [self._domain(domain, terms, scoped, existing_assessments or []) for domain, terms in RISK_DOMAINS.items()]
        changed = [domain for domain in domains if domain["evidence"]]
        payload = {
            "summary": "records indicate dynamic risk assessment suggestions are available for review.",
            "young_person_id": young_person_id,
            "domains": domains,
            "suggested_updates": [
                {
                    "domain": item["domain"],
                    "summary": f"review recommended: {item['domain']} assessment may need an evidence-linked update.",
                    "draft_only": True,
                    "auto_finalised": False,
                }
                for item in changed
            ],
            "auto_update_triggers": sorted(AUTO_UPDATE_TRIGGERS),
            "manager_review_prompts": [
                review_prompt("risk-draft-signoff", "review recommended: manager signoff is required before risk changes are finalised."),
                review_prompt("protective-factor-check", "consider checking protective factors are visible for each domain."),
            ],
            "decision_support_notice": SAFE_DECISION_SUPPORT_NOTICE,
        }
        return safe_payload(payload)

    def triggered_by_record(self, record: dict[str, Any]) -> bool:
        record_type = str(record.get("record_type") or record.get("recordType") or "").lower()
        return record_type in AUTO_UPDATE_TRIGGERS or any(term in record_text(record).lower() for terms in RISK_DOMAINS.values() for term in terms)

    def _domain(
        self,
        domain: str,
        terms: tuple[str, ...],
        records: list[dict[str, Any]],
        existing: list[dict[str, Any]],
    ) -> dict[str, Any]:
        evidence = [citation(record, reason=f"evidence found: {domain} term appears in visible record.") for record in records if any(term in record_text(record).lower() for term in terms)]
        existing_for_domain = [item for item in existing if str(item.get("category") or item.get("domain") or "").lower() == domain]
        level = ReviewRiskLevel.REVIEW.value if len(evidence) >= 2 else ReviewRiskLevel.MONITOR.value if evidence else ReviewRiskLevel.LOW.value
        trend = "pattern suggests increased review need" if len(evidence) >= 2 else "monitor"
        locations = sorted({str(record.get("location")) for record in records if record.get("location") and any(term in record_text(record).lower() for term in terms)})
        triggers = sorted({str(record.get("trigger")) for record in records if record.get("trigger") and any(term in record_text(record).lower() for term in terms)})
        payload = DynamicRiskDomain(
            domain=domain,
            current_level=existing_for_domain[0].get("riskLevel") if existing_for_domain else level,
            trend=trend,
            evidence=evidence,
            chronology_links=[item["record_id"] for item in evidence if item.get("record_id")],
            known_triggers=triggers,
            known_locations=locations,
            staff_guidance=[f"consider checking current {domain} guidance before shift handover."] if evidence else [],
            actions=[review_prompt(f"{domain}-review", f"review recommended: update {domain} risk assessment as draft only.")] if evidence else [],
            protective_factors=self._protective(records),
            last_reviewed=existing_for_domain[0].get("reviewDate") if existing_for_domain else None,
            review_required=bool(evidence),
        )
        return payload.model_dump()

    def _protective(self, records: list[dict[str, Any]]) -> list[str]:
        factors = []
        text = " ".join(record_text(record).lower() for record in records)
        if "key worker" in text or "familiar staff" in text:
            factors.append("records indicate familiar staff support is a protective factor.")
        if "school" in text or "education" in text:
            factors.append("records indicate education routines may provide structure.")
        if "settled" in text or "positive" in text:
            factors.append("evidence found: settled or positive presentation appears in records.")
        return factors


dynamic_child_risk_assessment_service = DynamicChildRiskAssessmentService()
