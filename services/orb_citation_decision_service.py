"""Select relevant source anchors for ORB answers by scenario family, role and output mode."""

from __future__ import annotations

from typing import Any

from services.orb_source_registry_service import orb_source_registry_service

FAMILY_SOURCE_MAP: dict[str, list[str]] = {
    "missing_from_care": [
        "missing_from_care_guidance",
        "working_together_safeguarding",
        "childrens_homes_regulations_2015",
        "ofsted_sccif_childrens_homes",
        "provider_missing_policy",
    ],
    "late_return": ["missing_from_care_guidance", "working_together_safeguarding", "childrens_homes_regulations_2015"],
    "repeated_missing": [
        "missing_from_care_guidance",
        "working_together_safeguarding",
        "ofsted_sccif_childrens_homes",
    ],
    "unknown_adult_vehicle": [
        "missing_from_care_guidance",
        "working_together_safeguarding",
        "childrens_homes_regulations_2015",
        "ofsted_sccif_childrens_homes",
    ],
    "cse_concern": ["working_together_safeguarding", "missing_from_care_guidance"],
    "cce_county_lines": ["working_together_safeguarding", "missing_from_care_guidance"],
    "online_grooming": ["working_together_safeguarding", "kcsie"],
    "disclosure_abuse": ["working_together_safeguarding", "provider_safeguarding_policy", "childrens_homes_regulations_2015"],
    "allegation_staff": ["working_together_safeguarding", "provider_safeguarding_policy"],
    "physical_intervention": [
        "dfe_childrens_homes_regulations_guide",
        "childrens_homes_regulations_2015",
        "provider_restraint_policy",
        "ofsted_sccif_childrens_homes",
    ],
    "restraint_injury_complaint": [
        "dfe_childrens_homes_regulations_guide",
        "childrens_homes_regulations_2015",
        "provider_restraint_policy",
        "ofsted_sccif_childrens_homes",
    ],
    "repeated_restraint_trend": [
        "dfe_childrens_homes_regulations_guide",
        "provider_restraint_policy",
        "ofsted_sccif_childrens_homes",
    ],
    "medication_refusal": ["provider_medication_policy", "childrens_homes_regulations_2015", "nice_looked_after_children"],
    "medication_error": ["provider_medication_policy", "childrens_homes_regulations_2015"],
    "controlled_drug_discrepancy": ["provider_medication_policy", "childrens_homes_regulations_2015"],
    "poor_daily_log": ["dfe_childrens_homes_regulations_guide", "ofsted_sccif_childrens_homes"],
    "weak_manager_oversight": ["childrens_homes_regulations_2015", "ofsted_sccif_childrens_homes"],
    "reg44_action_not_closed": ["childrens_homes_regulations_2015", "ofsted_sccif_childrens_homes", "dfe_childrens_homes_regulations_guide"],
    "reg45_weak_impact": ["childrens_homes_regulations_2015", "ofsted_sccif_childrens_homes"],
    "ri_governance_drift": ["ofsted_sccif_childrens_homes", "dfe_childrens_homes_regulations_guide"],
    "nvq_reflective_restraint": ["academy_nvq_source_pack", "provider_restraint_policy", "dfe_childrens_homes_regulations_guide"],
    "nvq_assessor_missing": ["academy_nvq_source_pack", "missing_from_care_guidance"],
    "level5_governance_evidence": ["academy_nvq_source_pack", "ofsted_sccif_childrens_homes"],
    "school_refusal": ["send_code_of_practice", "dfe_childrens_homes_regulations_guide"],
    "uasc_missing": ["missing_from_care_guidance", "working_together_safeguarding"],
    "lgbtq_support": ["equality_act_2010", "working_together_safeguarding"],
    "cultural_religious_need": ["equality_act_2010", "dfe_childrens_homes_regulations_guide"],
}

OUTPUT_MODE_EXTRA: dict[str, list[str]] = {
    "reg44_questions": ["childrens_homes_regulations_2015", "ofsted_sccif_childrens_homes", "dfe_childrens_homes_regulations_guide"],
    "reg45": ["childrens_homes_regulations_2015", "ofsted_sccif_childrens_homes"],
    "ofsted_lens": ["ofsted_sccif_childrens_homes", "dfe_childrens_homes_regulations_guide"],
    "safeguarding_lens": ["working_together_safeguarding", "childrens_homes_regulations_2015"],
    "nvq_evidence_mapping": ["academy_nvq_source_pack"],
    "ri_governance": ["ofsted_sccif_childrens_homes", "dfe_childrens_homes_regulations_guide"],
}

ROLE_PRIORITY: dict[str, list[str]] = {
    "reg44_visitor": ["childrens_homes_regulations_2015", "ofsted_sccif_childrens_homes"],
    "nvq_learner": ["academy_nvq_source_pack"],
    "nvq_assessor": ["academy_nvq_source_pack"],
    "responsible_individual": ["ofsted_sccif_childrens_homes", "dfe_childrens_homes_regulations_guide"],
}


class OrbCitationDecisionService:
    def select_sources(
        self,
        *,
        family_id: str,
        role: str | None = None,
        output_mode: str | None = None,
        answer_section: str | None = None,
        scenario_anchors: list[str] | None = None,
        max_sources: int = 6,
    ) -> list[dict[str, Any]]:
        del answer_section  # reserved for section-specific filtering
        ordered: list[str] = []
        if scenario_anchors:
            ordered.extend(scenario_anchors)
        ordered.extend(FAMILY_SOURCE_MAP.get(family_id, []))
        if output_mode:
            ordered.extend(OUTPUT_MODE_EXTRA.get(output_mode, []))
        if role:
            ordered.extend(ROLE_PRIORITY.get(role, []))

        seen: set[str] = set()
        unique_ids: list[str] = []
        for sid in ordered:
            if sid and sid not in seen:
                seen.add(sid)
                unique_ids.append(sid)

        decisions: list[dict[str, Any]] = []
        for sid in unique_ids[:max_sources]:
            payload = orb_source_registry_service.to_citation_payload(
                sid,
                why_cited=self._why_for_family(family_id, sid),
            )
            if payload:
                decisions.append(payload)
        return decisions

    def _why_for_family(self, family_id: str, source_id: str) -> str:
        if source_id == "missing_from_care_guidance" and "missing" in family_id:
            return "Relevant to missing episodes, return conversations and exploitation indicators."
        if source_id == "working_together_safeguarding":
            return "Relevant to safeguarding escalation, professional curiosity and multi-agency working."
        if source_id == "childrens_homes_regulations_2015" and source_id.endswith("2015"):
            return "Relevant to Reg 12 safeguarding duties and manager oversight (Reg 13)."
        if source_id == "ofsted_sccif_childrens_homes":
            return "Relevant to inspection evidence, child experience and leadership impact."
        if source_id == "provider_restraint_policy":
            return "Relevant where restraint or restrictive practice is in scope — cite only if uploaded."
        if source_id == "academy_nvq_source_pack":
            return "Relevant to NVQ/authenticity boundaries — not a legal source of truth."
        src = orb_source_registry_service.get_source(source_id)
        if src:
            when = src.get("when_to_cite") or []
            if when:
                return when[0]
        return "Relevant practice or regulatory basis for this scenario."


orb_citation_decision_service = OrbCitationDecisionService()
