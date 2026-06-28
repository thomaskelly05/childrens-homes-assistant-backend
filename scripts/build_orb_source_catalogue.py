#!/usr/bin/env python3
"""One-off builder for ORB Residential source catalogue JSON. Run to regenerate catalogue.json."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[1]
OUT_PATH = REPO_ROOT / "data" / "orb_source_catalogue" / "catalogue.json"

LAST_VERIFIED = "2026-06-28"

QS = {
    "qs1": "qs1_quality_and_purpose",
    "qs2": "qs2_child_voice",
    "qs3": "qs3_education",
    "qs4": "qs4_enjoyment_achievement",
    "qs5": "qs5_health_wellbeing",
    "qs6": "qs6_positive_relationships",
    "qs7": "qs7_protection",
    "qs8": "qs8_leadership",
    "qs9": "qs9_care_planning",
}

SCCIF = {
    "overall": "overall_experiences_progress",
    "protected": "helped_and_protected",
    "leadership": "leadership_management",
}


def src(
    source_id: str,
    title: str,
    official_url: str,
    source_type: str,
    tier: int,
    publisher: str,
    statutory_status: str,
    citation_authority: str,
    *,
    should_cite: bool = True,
    quote_allowed_default: bool = False,
    update_check_required: bool = True,
    related_quality_standards: list[str] | None = None,
    related_sccif_judgement_areas: list[str] | None = None,
    related_regulations: list[str] | None = None,
    related_workflow_domains: list[str] | None = None,
    escalation_triggers: list[str] | None = None,
    safer_recording_behaviours: list[str] | None = None,
    manager_oversight_triggers: list[str] | None = None,
    child_voice_prompts: list[str] | None = None,
    professional_judgement_boundary: str = (
        "ORB supports professional judgement; adults and managers remain accountable for decisions."
    ),
    not_to_be_used_for: list[str] | None = None,
    requires_local_policy: bool = False,
    duplicate_url_justification: str | None = None,
    jurisdiction: str = "England",
) -> dict[str, Any]:
    default_not_to_be_used_for = [
        "guaranteeing compliance",
        "replacing safeguarding threshold decisions",
        "substituting for local policy or LSCP procedures",
    ]
    merged_ntb = list(
        dict.fromkeys((not_to_be_used_for or []) + default_not_to_be_used_for)
    )
    return {
        "source_id": source_id,
        "title": title,
        "official_url": official_url,
        "source_type": source_type,
        "tier": tier,
        "jurisdiction": jurisdiction,
        "publisher": publisher,
        "statutory_status": statutory_status,
        "citation_authority": citation_authority,
        "should_cite": should_cite,
        "quote_allowed_default": quote_allowed_default,
        "last_verified_date": LAST_VERIFIED,
        "update_check_required": update_check_required,
        "related_quality_standards": related_quality_standards or [],
        "related_sccif_judgement_areas": related_sccif_judgement_areas or [],
        "related_regulations": related_regulations or [],
        "related_workflow_domains": related_workflow_domains or [],
        "escalation_triggers": escalation_triggers or [],
        "safer_recording_behaviours": safer_recording_behaviours or [],
        "manager_oversight_triggers": manager_oversight_triggers or [],
        "child_voice_prompts": child_voice_prompts or [],
        "professional_judgement_boundary": professional_judgement_boundary,
        "not_to_be_used_for": merged_ntb,
        "requires_local_policy": requires_local_policy,
        "duplicate_url_justification": duplicate_url_justification,
    }


def build_sources() -> list[dict[str, Any]]:
    common_boundary = (
        "ORB supports professional judgement; adults and managers remain accountable for decisions."
    )
    no_compliance = [
        "guaranteeing compliance",
        "replacing safeguarding threshold decisions",
        "substituting for local policy or LSCP procedures",
    ]
    reflective_only_boundary = (
        "Inform reflective practice only; verify against statutory sources and local policy."
    )

    sources: list[dict[str, Any]] = []

    # --- Tier 1: Core statutory and inspection spine ---
    sources.extend(
        [
            src(
                "childrens_homes_regulations_2015",
                "The Children's Homes (England) Regulations 2015",
                "https://www.legislation.gov.uk/uksi/2015/541/contents",
                "legislation",
                1,
                "UK Parliament",
                "primary_legislation",
                "authoritative_statute",
                quote_allowed_default=True,
                related_quality_standards=[QS["qs1"], QS["qs8"], QS["qs9"]],
                related_sccif_judgement_areas=[SCCIF["leadership"]],
                related_regulations=["SI 2015/541"],
                related_workflow_domains=[
                    "daily_recording",
                    "management_oversight",
                    "inspection_readiness",
                ],
                safer_recording_behaviours=["cite regulation numbers", "distinguish duty from practice"],
                professional_judgement_boundary=common_boundary,
                not_to_be_used_for=no_compliance,
            ),
            src(
                "dfe_childrens_homes_regulations_guide",
                "Guide to the Children's Homes Regulations including the Quality Standards",
                "https://www.gov.uk/government/publications/childrens-homes-regulations-including-quality-standards-guide",
                "statutory_guidance",
                1,
                "Department for Education",
                "statutory_guidance",
                "authoritative_guidance",
                related_quality_standards=list(QS.values()),
                related_sccif_judgement_areas=list(SCCIF.values()),
                related_workflow_domains=[
                    "daily_recording",
                    "incident_recording",
                    "inspection_readiness",
                    "report_writing",
                ],
                child_voice_prompts=["What does the guide expect about children's views and participation?"],
                professional_judgement_boundary=common_boundary,
                not_to_be_used_for=no_compliance,
            ),
            src(
                "ofsted_sccif_childrens_homes",
                "Social care common inspection framework (SCCIF): children's homes",
                "https://www.gov.uk/government/publications/social-care-common-inspection-framework-sccif-childrens-homes",
                "inspection_framework",
                1,
                "Ofsted",
                "inspection_framework",
                "authoritative_inspection",
                related_sccif_judgement_areas=list(SCCIF.values()),
                related_workflow_domains=["inspection_readiness", "report_writing", "management_oversight"],
                not_to_be_used_for=[
                    "predicting inspection grades or outcomes",
                    "guaranteeing compliance",
                ],
                professional_judgement_boundary="Evidence preparation only; never predict Ofsted judgement.",
            ),
            src(
                "children_act_1989_vol2_care_planning",
                "Children Act 1989 guidance and regulations Volume 2: care planning, placement and case review",
                "https://www.gov.uk/government/publications/children-act-1989-care-planning-placement-and-case-review",
                "statutory_guidance",
                1,
                "Department for Education",
                "statutory_guidance",
                "authoritative_guidance",
                related_quality_standards=[QS["qs2"], QS["qs9"]],
                related_workflow_domains=["key_work", "leaving_care", "family_time", "report_writing"],
                child_voice_prompts=["How is the child's plan reviewed and how is their voice recorded?"],
                professional_judgement_boundary=common_boundary,
                not_to_be_used_for=no_compliance,
            ),
            src(
                "care_planning_placement_case_review_regs_2010",
                "The Care Planning, Placement and Case Review (England) Regulations 2010",
                "https://www.legislation.gov.uk/uksi/2010/959/contents",
                "legislation",
                1,
                "UK Parliament",
                "secondary_legislation",
                "authoritative_statute",
                quote_allowed_default=True,
                related_quality_standards=[QS["qs9"]],
                related_workflow_domains=["key_work", "leaving_care", "family_time"],
                professional_judgement_boundary=common_boundary,
                not_to_be_used_for=no_compliance,
            ),
            src(
                "working_together_safeguarding",
                "Working Together to Safeguard Children",
                "https://www.gov.uk/government/publications/working-together-to-safeguard-children--2",
                "statutory_guidance",
                1,
                "HM Government",
                "statutory_guidance",
                "authoritative_guidance",
                related_quality_standards=[QS["qs7"]],
                related_sccif_judgement_areas=[SCCIF["protected"]],
                related_workflow_domains=[
                    "safeguarding_concern",
                    "allegation",
                    "exploitation_concern",
                    "management_oversight",
                ],
                escalation_triggers=["multi-agency escalation", "LADO route per local procedures"],
                not_to_be_used_for=["making safeguarding threshold decisions alone"],
                professional_judgement_boundary="Support multi-agency thinking; DSL/manager decides thresholds.",
            ),
            src(
                "children_social_care_national_framework",
                "Children's social care: national framework",
                "https://www.gov.uk/government/publications/childrens-social-care-national-framework",
                "government_practice_guidance",
                1,
                "Department for Education",
                "policy_framework",
                "authoritative_guidance",
                related_quality_standards=[QS["qs1"], QS["qs9"]],
                related_workflow_domains=["key_work", "leaving_care", "management_oversight"],
                professional_judgement_boundary=common_boundary,
                not_to_be_used_for=no_compliance,
            ),
            src(
                "iro_handbook",
                "Independent Reviewing Officers' handbook",
                "https://www.gov.uk/government/publications/independent-reviewing-officers-handbook",
                "statutory_guidance",
                1,
                "Department for Education",
                "statutory_guidance",
                "authoritative_guidance",
                related_quality_standards=[QS["qs2"], QS["qs9"]],
                related_workflow_domains=["key_work", "leaving_care", "family_time"],
                child_voice_prompts=["What should the IRO expect to see about the child's voice?"],
                professional_judgement_boundary=common_boundary,
                not_to_be_used_for=no_compliance,
            ),
            src(
                "ofsted_serious_incident_notification",
                "Ofsted: notifying of a serious incident at a children's home",
                "https://www.gov.uk/government/publications/notify-ofsted-of-a-serious-incident-at-a-childrens-home",
                "inspection_framework",
                1,
                "Ofsted",
                "statutory_guidance",
                "authoritative_inspection",
                related_regulations=["Reg 40"],
                related_workflow_domains=["reg_40_notification", "incident_recording", "allegation"],
                escalation_triggers=["serious incident notification to Ofsted", "manager sign-off"],
                manager_oversight_triggers=["notification decision", "chronology review"],
                not_to_be_used_for=[
                    "deciding whether an incident is notifiable without manager review",
                    "guaranteeing compliance",
                ],
                professional_judgement_boundary="Prompt notification considerations; manager confirms threshold.",
            ),
            src(
                "regulation_40_childrens_homes",
                "Regulation 40 — Notification of serious events (Children's Homes Regulations 2015)",
                "https://www.legislation.gov.uk/uksi/2015/541/regulation/40",
                "legislation",
                1,
                "UK Parliament",
                "primary_legislation",
                "authoritative_statute",
                quote_allowed_default=True,
                related_regulations=["Reg 40"],
                related_workflow_domains=["reg_40_notification", "incident_recording", "allegation"],
                escalation_triggers=["Ofsted notification", "placing authority"],
                manager_oversight_triggers=["notification decision within required timescales"],
                professional_judgement_boundary="Clarify duties; manager confirms notifiability.",
                not_to_be_used_for=no_compliance,
            ),
            src(
                "regulation_44_childrens_homes",
                "Regulation 44 — Independent visitor (Children's Homes Regulations 2015)",
                "https://www.legislation.gov.uk/uksi/2015/541/regulation/44",
                "legislation",
                1,
                "UK Parliament",
                "primary_legislation",
                "authoritative_statute",
                quote_allowed_default=True,
                related_regulations=["Reg 44"],
                related_quality_standards=[QS["qs8"]],
                related_workflow_domains=["reg_44_preparation", "management_oversight", "inspection_readiness"],
                manager_oversight_triggers=["Reg 44 visit preparation", "action on visit themes"],
                professional_judgement_boundary=common_boundary,
                not_to_be_used_for=no_compliance,
            ),
            src(
                "regulation_45_childrens_homes",
                "Regulation 45 — Review of quality of care (Children's Homes Regulations 2015)",
                "https://www.legislation.gov.uk/uksi/2015/541/regulation/45",
                "legislation",
                1,
                "UK Parliament",
                "primary_legislation",
                "authoritative_statute",
                quote_allowed_default=True,
                related_regulations=["Reg 45"],
                related_quality_standards=[QS["qs8"], QS["qs9"]],
                related_workflow_domains=["reg_45_preparation", "management_oversight", "inspection_readiness"],
                manager_oversight_triggers=["quarterly quality review", "improvement actions"],
                professional_judgement_boundary=common_boundary,
                not_to_be_used_for=no_compliance,
            ),
        ]
    )

    # --- Tier 2: Safeguarding, risk and child protection ---
    sources.extend(
        [
            src(
                "what_to_do_if_worried_child_abused",
                "What to do if you're worried a child is being abused",
                "https://www.gov.uk/government/publications/what-to-do-if-youre-worried-a-child-is-being-abused--2",
                "statutory_guidance",
                2,
                "Department for Education",
                "statutory_guidance",
                "authoritative_guidance",
                related_quality_standards=[QS["qs7"]],
                related_workflow_domains=["safeguarding_concern", "allegation"],
                escalation_triggers=["DSL contact", "immediate danger — emergency services"],
                professional_judgement_boundary="Prompts early help and escalation; does not decide threshold.",
                not_to_be_used_for=["replacing DSL judgement"],
            ),
            src(
                "information_sharing_safeguarding",
                "Information sharing advice for safeguarding practitioners",
                "https://www.gov.uk/government/publications/information-sharing-advice-for-safeguarding-practitioners",
                "statutory_guidance",
                2,
                "HM Government",
                "statutory_guidance",
                "authoritative_guidance",
                related_workflow_domains=["safeguarding_concern", "allegation", "exploitation_concern"],
                safer_recording_behaviours=["record what was shared, with whom, and lawful basis if known"],
                not_to_be_used_for=["providing legal advice on data sharing", "guaranteeing compliance"],
            ),
            src(
                "serious_child_safeguarding_incident_notification",
                "Child safeguarding practice review and serious incident notification",
                "https://www.gov.uk/government/publications/child-safeguarding-practice-review-and-relevant-agency-notifications",
                "statutory_guidance",
                2,
                "Department for Education",
                "statutory_guidance",
                "authoritative_guidance",
                related_workflow_domains=["safeguarding_concern", "allegation", "management_oversight"],
                escalation_triggers=["serious incident notification to safeguarding partners"],
                manager_oversight_triggers=["partnership notification decisions"],
            ),
            src(
                "missing_from_care_guidance",
                "Children who run away or go missing from home or care",
                "https://www.gov.uk/government/publications/children-who-run-away-or-go-missing-from-home-or-care",
                "statutory_guidance",
                2,
                "Department for Education",
                "statutory_guidance",
                "authoritative_guidance",
                related_workflow_domains=["missing_from_care", "exploitation_concern"],
                escalation_triggers=["police notification per local protocol", "return interview"],
                child_voice_prompts=["What did the child say on return?"],
            ),
            src(
                "child_sexual_exploitation_guidance",
                "Child sexual exploitation: definition and guide for practitioners",
                "https://www.gov.uk/government/publications/child-sexual-exploitation-definition-and-a-guide-for-practitioners",
                "government_practice_guidance",
                2,
                "Department for Education",
                "practice_guidance",
                "informative_practice",
                related_workflow_domains=["exploitation_concern", "safeguarding_concern", "missing_from_care"],
                escalation_triggers=["DSL", "police where indicators present"],
            ),
            src(
                "county_lines_criminal_exploitation",
                "Criminal exploitation of children and vulnerable adults: county lines",
                "https://www.gov.uk/government/publications/criminal-exploitation-of-children-and-vulnerable-adults-county-lines",
                "government_practice_guidance",
                2,
                "Home Office",
                "practice_guidance",
                "informative_practice",
                related_workflow_domains=["exploitation_concern", "safeguarding_concern", "online_safety"],
                escalation_triggers=["National Referral Mechanism where modern slavery indicators"],
            ),
            src(
                "modern_slavery_guidance",
                "Modern slavery: how to identify and support victims",
                "https://www.gov.uk/government/publications/modern-slavery-how-to-identify-and-support-victims",
                "government_practice_guidance",
                2,
                "Home Office",
                "practice_guidance",
                "informative_practice",
                related_workflow_domains=["exploitation_concern", "safeguarding_concern"],
                escalation_triggers=["NRM referral route", "DSL"],
            ),
            src(
                "uasc_trafficked_children_guidance",
                "Care of unaccompanied migrant children and child victims of modern slavery",
                "https://www.gov.uk/government/publications/care-of-unaccompanied-migrant-children-and-child-victims-of-modern-slavery",
                "statutory_guidance",
                2,
                "Department for Education",
                "statutory_guidance",
                "authoritative_guidance",
                related_workflow_domains=["safeguarding_concern", "exploitation_concern", "equality_identity_culture"],
                child_voice_prompts=["Age assessment and voice — sensitivity to trauma and language needs"],
            ),
            src(
                "domestic_abuse_guidance",
                "Domestic abuse: how to get help",
                "https://www.gov.uk/guidance/domestic-abuse-how-to-get-help",
                "government_practice_guidance",
                2,
                "Home Office",
                "practice_guidance",
                "informative_practice",
                related_workflow_domains=["safeguarding_concern", "family_time"],
                escalation_triggers=["DSL where child affected", "MARAC where applicable locally"],
            ),
            src(
                "deprivation_of_liberty_court_orders",
                "Deprivation of liberty: children and young people",
                "https://www.gov.uk/government/publications/deprivation-of-liberty-court-orders",
                "statutory_guidance",
                2,
                "Department for Education",
                "statutory_guidance",
                "authoritative_guidance",
                related_workflow_domains=["physical_intervention", "risk_assessment", "health"],
                escalation_triggers=["legal advice", "court authorisation where required"],
                not_to_be_used_for=["authorising deprivation of liberty without legal review"],
            ),
            src(
                "mental_capacity_act_code_of_practice",
                "Mental Capacity Act 2005: code of practice",
                "https://www.gov.uk/government/publications/mental-capacity-act-code-of-practice",
                "statutory_guidance",
                2,
                "Ministry of Justice",
                "statutory_guidance",
                "authoritative_guidance",
                related_workflow_domains=["health", "medication", "risk_assessment"],
                professional_judgement_boundary="Applies to 16+ where relevant; seek legal advice on capacity.",
            ),
            src(
                "positive_environments_children_flourish",
                "Positive environments where children can flourish",
                "https://www.gov.uk/government/publications/positive-environments-where-children-can-flourish",
                "statutory_guidance",
                2,
                "Department for Education",
                "statutory_guidance",
                "authoritative_guidance",
                related_quality_standards=[QS["qs1"], QS["qs6"]],
                related_workflow_domains=["behaviour_support", "daily_recording", "physical_intervention"],
                safer_recording_behaviours=["therapeutic language", "least restrictive approaches"],
            ),
            src(
                "online_safety_ceop",
                "CEOP Education: online child safety",
                "https://www.ceopeducation.co.uk/",
                "professional_guidance",
                2,
                "National Crime Agency / CEOP",
                "professional_guidance",
                "informative_practice",
                should_cite=True,
                related_workflow_domains=["online_safety", "exploitation_concern", "safeguarding_concern"],
                escalation_triggers=["Report to CEOP where appropriate", "DSL"],
                professional_judgement_boundary=reflective_only_boundary,
                not_to_be_used_for=["statutory authority on placement duties", "guaranteeing compliance"],
            ),
            src(
                "ofcom_online_safety",
                "Ofcom: protecting children online",
                "https://www.ofcom.org.uk/online-safety/protecting-children/",
                "professional_guidance",
                2,
                "Ofcom",
                "professional_guidance",
                "informative_practice",
                related_workflow_domains=["online_safety"],
                professional_judgement_boundary=reflective_only_boundary,
                not_to_be_used_for=["treated as statutory authority", "guaranteeing compliance"],
            ),
        ]
    )

    # --- Tier 3: Whole-child development, health, education and SEND ---
    tier3 = [
        (
            "promoting_health_wellbeing_looked_after",
            "Promoting the health and well-being of looked-after children",
            "https://www.gov.uk/government/publications/promoting-the-health-and-well-being-of-looked-after-children",
            ["health", "medication", "mental_health_self_harm"],
        ),
        (
            "nice_ng205_looked_after_children",
            "NICE guideline NG205: Looked-after children and young people",
            "https://www.nice.org.uk/guidance/ng205",
            ["health", "mental_health_self_harm", "key_work"],
        ),
        (
            "nice_ng225_self_harm",
            "NICE guideline NG225: Self-harm",
            "https://www.nice.org.uk/guidance/ng225",
            ["mental_health_self_harm", "incident_recording"],
        ),
        (
            "education_looked_after_children",
            "Promoting the education of looked-after and previously looked-after children",
            "https://www.gov.uk/government/publications/promoting-the-education-of-looked-after-children",
            ["education", "key_work"],
        ),
        (
            "designated_teacher_guidance",
            "Designated teacher for looked-after and previously looked-after children",
            "https://www.gov.uk/government/publications/designated-teacher-for-looked-after-and-previously-looked-after-children",
            ["education"],
        ),
        (
            "keeping_children_safe_in_education",
            "Keeping children safe in education",
            "https://www.gov.uk/government/publications/keeping-children-safe-in-education--2",
            ["education", "online_safety", "safeguarding_concern"],
        ),
        (
            "children_missing_education",
            "Children missing education",
            "https://www.gov.uk/government/publications/children-missing-education",
            ["education"],
        ),
        (
            "school_attendance_guidance",
            "Working together to improve school attendance",
            "https://www.gov.uk/government/publications/working-together-to-improve-school-attendance",
            ["education"],
        ),
        (
            "exclusions_suspensions_guidance",
            "Suspension and permanent exclusion from maintained schools, academies and pupil referral units",
            "https://www.gov.uk/government/publications/school-exclusion",
            ["education", "behaviour_support"],
        ),
        (
            "send_code_of_practice",
            "Special educational needs and disability code of practice: 0 to 25 years",
            "https://www.gov.uk/government/publications/send-code-of-practice-0-to-25",
            ["send_disability_autism", "education"],
        ),
        (
            "equality_act_2010",
            "Equality Act 2010",
            "https://www.legislation.gov.uk/ukpga/2010/15/contents",
            ["equality_identity_culture", "send_disability_autism"],
        ),
        (
            "children_and_families_act_2014",
            "Children and Families Act 2014",
            "https://www.legislation.gov.uk/ukpga/2014/6/contents",
            ["send_disability_autism", "education", "leaving_care"],
        ),
        (
            "autism_strategy",
            "National strategy for autistic children, young people and adults",
            "https://www.gov.uk/government/publications/national-strategy-for-autistic-children-young-people-and-adults-2021-to-2026",
            ["send_disability_autism", "behaviour_support"],
        ),
    ]
    for sid, title, url, domains in tier3:
        stype = "clinical_guidance" if sid.startswith("nice_") else (
            "legislation" if "act_201" in sid else "statutory_guidance"
        )
        stat = (
            "clinical_guidance"
            if sid.startswith("nice_")
            else ("primary_legislation" if "act_201" in sid else "statutory_guidance")
        )
        cite_auth = (
            "clinical_guidance"
            if sid.startswith("nice_")
            else ("authoritative_statute" if "act_201" in sid else "authoritative_guidance")
        )
        sources.append(
            src(
                sid,
                title,
                url,
                stype,
                3,
                "NICE" if sid.startswith("nice_") else ("UK Parliament" if "act_201" in sid else "Department for Education"),
                stat,
                cite_auth,
                related_workflow_domains=domains,
                not_to_be_used_for=["diagnosis", "guaranteeing compliance"] if sid.startswith("nice_") else no_compliance,
                professional_judgement_boundary=(
                    "Clinical framing only; ORB does not diagnose or prescribe."
                    if sid.startswith("nice_")
                    else common_boundary
                ),
            )
        )

    # --- Tier 4: Rights, identity, advocacy, family and journey through care ---
    tier4 = [
        ("advocacy_services_statutory", "Statutory advocacy services for children", "https://www.gov.uk/government/publications/statutory-advocacy-services-for-children", "government_practice_guidance"),
        ("children_social_care_complaints", "Children's social care: getting the best from complaints", "https://www.gov.uk/government/publications/childrens-social-care-getting-the-best-from-complaints", "statutory_guidance"),
        ("childrens_commissioner", "Children's Commissioner for England", "https://www.childrenscommissioner.gov.uk/", "third_sector"),
        ("uncrc", "UN Convention on the Rights of the Child", "https://www.ohchr.org/en/instruments-mechanisms/instruments/convention-rights-child", "professional_guidance"),
        ("human_rights_act_1998", "Human Rights Act 1998", "https://www.legislation.gov.uk/ukpga/1998/42/contents", "legislation"),
        ("public_sector_equality_duty", "Public sector equality duty", "https://www.equalityhumanrights.com/guidance/public-sector-equality-duty", "professional_guidance"),
        ("family_friends_care", "Family and friends care: statutory guidance", "https://www.gov.uk/government/publications/family-and-friends-care", "statutory_guidance"),
        ("family_rights_group", "Family Rights Group", "https://frg.org.uk/", "third_sector"),
        ("lifelong_links", "Lifelong Links", "https://frg.org.uk/involving-families/lifelong-links/", "third_sector"),
        ("children_act_1989_vol1_court_orders", "Children Act 1989: court orders", "https://www.gov.uk/government/publications/children-act-1989-court-orders", "statutory_guidance"),
        ("children_act_1989_vol3_transition", "Children Act 1989: transition to adulthood for care leavers", "https://www.gov.uk/government/publications/children-act-1989-transition-to-adulthood-for-care-leavers", "statutory_guidance"),
        ("local_offer_care_leavers", "Local offer for care leavers", "https://www.gov.uk/government/publications/local-offer-for-care-leavers", "statutory_guidance"),
        ("staying_put", "Staying Put: arrangements for care leavers aged 18 and above", "https://www.gov.uk/government/publications/staying-put-arrangements-for-care-leavers-aged-18-and-above-to-stay-on-with-their-former-foster-carers", "statutory_guidance"),
        ("staying_close", "Staying close: staying put for children's homes", "https://www.gov.uk/government/publications/staying-close-staying-put-for-childrens-homes", "statutory_guidance"),
        ("supported_accommodation_regulations", "Supported accommodation (England) regulations 2023", "https://www.legislation.gov.uk/uksi/2023/996/contents", "legislation"),
        ("adoption_statutory_guidance", "Adoption statutory guidance", "https://www.gov.uk/government/publications/adoption-statutory-guidance", "statutory_guidance"),
        ("fostering_services_national_minimum_standards", "National minimum standards for fostering services", "https://www.gov.uk/government/publications/national-minimum-standards-for-fostering-services", "statutory_guidance"),
        ("special_guardianship_statutory_guidance", "Special guardianship: statutory guidance", "https://www.gov.uk/government/publications/special-guardianship-guidance", "statutory_guidance"),
    ]
    for sid, title, url, stype in tier4:
        is_third = stype == "third_sector"
        is_law = stype == "legislation"
        sources.append(
            src(
                sid,
                title,
                url,
                stype,
                4,
                "Third sector" if is_third else ("UK Parliament" if is_law else "Department for Education"),
                "third_sector_resource" if is_third else ("primary_legislation" if is_law else "statutory_guidance"),
                "reflective_only" if is_third else ("authoritative_statute" if is_law else "authoritative_guidance"),
                should_cite=not is_third or sid == "childrens_commissioner",
                related_workflow_domains=["leaving_care", "equality_identity_culture", "key_work", "family_time", "life_story_records"],
                child_voice_prompts=["rights, advocacy and participation"] if not is_third else ["lived experience and voice"],
                professional_judgement_boundary=(
                    reflective_only_boundary if is_third else common_boundary
                ),
                not_to_be_used_for=(
                    ["treated as statutory authority", "guaranteeing compliance"] if is_third else no_compliance
                ),
            )
        )

    # --- Tier 5: Data protection, records, workforce and ethical AI ---
    tier5 = [
        ("ico_children_uk_gdpr", "ICO: Children's information and UK GDPR", "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/", "data_protection_guidance", "ICO", "professional_guidance"),
        ("ico_childrens_code", "ICO: Age appropriate design code (Children's Code)", "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-code-guidance-and-resources/", "data_protection_guidance", "ICO", "professional_guidance"),
        ("ico_dpia_guidance", "ICO: Data protection impact assessments", "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/accountability-and-governance/data-protection-impact-assessments-dpias/", "data_protection_guidance", "ICO", "professional_guidance"),
        ("ico_ai_data_protection", "ICO: AI and data protection", "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/artificial-intelligence/", "data_protection_guidance", "ICO", "professional_guidance"),
        ("dfe_data_protection_schools", "Data protection: a toolkit for schools", "https://www.gov.uk/government/publications/data-protection-toolkit-for-schools", "government_practice_guidance", "Department for Education", "practice_guidance"),
        ("dbs_guidance", "Disclosure and Barring Service: guidance", "https://www.gov.uk/government/organisations/disclosure-and-barring-service", "government_practice_guidance", "Home Office", "practice_guidance"),
        ("whistleblowing_guidance", "Whistleblowing for employees", "https://www.gov.uk/whistleblowing", "government_practice_guidance", "Department for Business and Trade", "practice_guidance"),
        ("safer_recruitment_education", "Keeping children safe in education: safer recruitment", "https://www.gov.uk/government/publications/keeping-children-safe-in-education--2", "statutory_guidance", "Department for Education", "statutory_guidance"),
        ("youth_justice_board_guidance", "Youth Justice Board: practice guidance", "https://www.gov.uk/government/organisations/youth-justice-board", "government_practice_guidance", "Youth Justice Board", "practice_guidance"),
        ("avoiding_unnecessary_criminalisation", "National protocol on reducing unnecessary criminalisation of looked-after children", "https://www.gov.uk/government/publications/national-protocol-on-reducing-unnecessary-criminalisation-of-looked-after-children-and-care-leavers", "statutory_guidance", "Ministry of Justice", "statutory_guidance"),
        ("life_story_care_files_guidance", "Guidance on life story work for looked-after children", "https://www.gov.uk/government/publications/life-story-work-for-looked-after-children", "government_practice_guidance", "Department for Education", "practice_guidance"),
        ("nspcc_learning", "NSPCC Learning", "https://learning.nspcc.org.uk/", "third_sector", "NSPCC", "third_sector_resource"),
        ("coram_voice", "Coram Voice", "https://coramvoice.org.uk/", "third_sector", "Coram Voice", "third_sector_resource"),
        ("become_charity", "Become", "https://www.becomecharity.org.uk/", "lived_experience", "Become", "lived_experience_resource"),
        ("nyas", "NYAS (National Youth Advocacy Service)", "https://www.nyas.net/", "third_sector", "NYAS", "third_sector_resource"),
        ("article_39", "Article 39", "https://article39.org.uk/", "third_sector", "Article 39", "third_sector_resource"),
        ("care_leaver_covenant", "Care Leaver Covenant", "https://www.mims.gov.uk/care-leaver-covenant", "government_practice_guidance", "Department for Education", "practice_guidance"),
        ("rees_foundation", "Rees Foundation", "https://reesfoundation.org/", "lived_experience", "Rees Foundation", "lived_experience_resource"),
    ]
    for sid, title, url, stype, publisher, stat in tier5:
        is_third = stype in ("third_sector", "lived_experience")
        sources.append(
            src(
                sid,
                title,
                url,
                stype,
                5,
                publisher,
                stat,
                "reflective_only" if is_third else "informative_practice",
                should_cite=not is_third or sid in ("nspcc_learning", "coram_voice"),
                related_workflow_domains=[
                    "data_protection_ai_safety",
                    "life_story_records",
                    "supervision",
                    "leaving_care",
                    "report_writing",
                ],
                professional_judgement_boundary=(
                    reflective_only_boundary if is_third else common_boundary
                ),
                not_to_be_used_for=(
                    ["treated as statutory authority", "guaranteeing compliance", "safeguarding decision-making"]
                    if is_third
                    else no_compliance + (["unauthorised AI processing decisions"] if "ico_ai" in sid else [])
                ),
            )
        )

    apply_catalogue_expansion(sources)
    return sources


EXPANSION_REPORT: dict[str, Any] = {}


def _add_unique(items: list[str], additions: list[str]) -> None:
    for item in additions:
        if item and item not in items:
            items.append(item)


def _find_source(sources: list[dict[str, Any]], source_id: str) -> dict[str, Any]:
    for source in sources:
        if source["source_id"] == source_id:
            return source
    raise KeyError(source_id)


def _extend_source(
    sources: list[dict[str, Any]],
    updated_ids: set[str],
    source_id: str,
    *,
    list_updates: dict[str, list[str]] | None = None,
    scalar_updates: dict[str, Any] | None = None,
) -> None:
    source = _find_source(sources, source_id)
    for field, additions in (list_updates or {}).items():
        _add_unique(source[field], additions)
    for field, value in (scalar_updates or {}).items():
        source[field] = value
    updated_ids.add(source_id)


def _add_or_extend_source(
    sources: list[dict[str, Any]],
    updated_ids: set[str],
    added_ids: set[str],
    duplicate_avoided_ids: set[str],
    source: dict[str, Any],
) -> None:
    source_id = source["source_id"]
    official_url = source["official_url"].strip().lower()
    title = source["title"].strip().lower()

    for existing in sources:
        same_id = existing["source_id"] == source_id
        same_url = official_url and existing["official_url"].strip().lower() == official_url
        same_title = existing["title"].strip().lower() == title
        if same_id or same_url or same_title:
            duplicate_avoided_ids.add(existing["source_id"])
            _extend_source(
                sources,
                updated_ids,
                existing["source_id"],
                list_updates={
                    "related_quality_standards": source["related_quality_standards"],
                    "related_sccif_judgement_areas": source["related_sccif_judgement_areas"],
                    "related_regulations": source["related_regulations"],
                    "related_workflow_domains": source["related_workflow_domains"],
                    "escalation_triggers": source["escalation_triggers"],
                    "safer_recording_behaviours": source["safer_recording_behaviours"],
                    "manager_oversight_triggers": source["manager_oversight_triggers"],
                    "child_voice_prompts": source["child_voice_prompts"],
                    "not_to_be_used_for": source["not_to_be_used_for"],
                },
            )
            return

    sources.append(source)
    added_ids.add(source_id)


def apply_catalogue_expansion(sources: list[dict[str, Any]]) -> None:
    """Expand PR #1799 catalogue without duplicating existing source entries."""

    baseline_count = len(sources)
    updated_ids: set[str] = set()
    added_ids: set[str] = set()
    duplicate_avoided_ids: set[str] = set()
    near_duplicates_for_human_review = [
        {
            "source_ids": ["keeping_children_safe_in_education", "safer_recruitment_education"],
            "reason": "Both intentionally point to the same KCSIE publication; safer recruitment is a subsection.",
        }
    ]

    operational_regs = [
        "Reg 16",
        "Reg 17",
        "Reg 21",
        "Reg 22",
        "Reg 23",
        "Reg 24",
        "Reg 25",
        "Reg 31",
        "Reg 32",
        "Reg 33",
        "Reg 34",
        "Reg 35",
        "Reg 36",
        "Reg 37",
        "Reg 38",
        "Reg 39",
        "Reg 40",
        "Reg 44",
        "Reg 45",
    ]
    operational_domains = [
        "regulated_home_governance",
        "statement_of_purpose_admissions",
        "search_confiscation_privacy_surveillance",
        "fire_premises_food_health_safety",
        "staff_training_qualifications_induction",
        "visitors_contractors_professionals",
        "record_access_care_files_future_reading",
    ]

    # Extend existing catalogue entries rather than creating duplicate sources.
    existing_extensions = {
        "childrens_homes_regulations_2015": {
            "related_regulations": operational_regs,
            "related_workflow_domains": operational_domains
            + [
                "corporate_parenting_sufficiency_matching",
                "money_possessions_financial_dignity",
                "ordinary_childhood_belonging_memories",
                "emergency_planning_business_continuity",
                "pets_animals_therapy_animals",
            ],
            "manager_oversight_triggers": [
                "registration compliance boundary",
                "responsible individual oversight",
                "restriction of accommodation review",
                "records and complaints governance",
            ],
            "safer_recording_behaviours": [
                "map operational concern to regulation number without claiming legal certainty",
                "record policy basis and manager review for restrictive practice",
            ],
            "child_voice_prompts": [
                "How was the child helped to understand the home, records, privacy and complaints routes?",
            ],
        },
        "dfe_childrens_homes_regulations_guide": {
            "related_regulations": operational_regs,
            "related_workflow_domains": operational_domains
            + [
                "bullying_group_living_dynamics",
                "staff_wellbeing_secondary_trauma",
                "staff_training_qualifications_induction",
                "ordinary_childhood_belonging_memories",
            ],
            "escalation_triggers": [
                "check provider policy and seek regulatory advice where registration or restriction is unclear",
            ],
            "manager_oversight_triggers": [
                "Statement of Purpose fit",
                "admissions matching and impact on existing children",
                "staff qualification and induction gap",
            ],
            "child_voice_prompts": [
                "Could this be explained in the Children's Guide in words the child can understand?",
            ],
        },
        "ofsted_sccif_childrens_homes": {
            "related_workflow_domains": [
                "regulated_home_governance",
                "corporate_parenting_sufficiency_matching",
                "critical_incidents_death_bereavement",
            ],
            "manager_oversight_triggers": [
                "evidence gap before inspection readiness claims",
                "regulatory risk review without grade prediction",
            ],
        },
        "working_together_safeguarding": {
            "related_workflow_domains": [
                "allegations_lado_adult_conduct",
                "prevent_radicalisation",
                "fgm_forced_marriage_honour_based_abuse",
                "critical_incidents_death_bereavement",
                "parental_substance_misuse_family_trauma",
                "harmful_sexual_behaviour_child_on_child",
            ],
            "escalation_triggers": [
                "LADO consultation per local procedures",
                "urgent safeguarding route where FGM, forced marriage or serious harm is suspected",
            ],
            "safer_recording_behaviours": [
                "distinguish concern, indicator, disclosure and conclusion",
                "avoid investigative findings in residential records",
            ],
        },
        "keeping_children_safe_in_education": {
            "related_workflow_domains": [
                "allegations_lado_adult_conduct",
                "prevent_radicalisation",
                "harmful_sexual_behaviour_child_on_child",
                "sexual_health_pregnancy_relationships",
            ],
            "escalation_triggers": [
                "manager/LADO/provider policy for adult conduct concerns",
                "DSL route for child-on-child harm and Prevent indicators",
            ],
            "safer_recording_behaviours": [
                "distinguish low-level concern, allegation, complaint and safeguarding concern",
                "avoid victim-blaming and unnecessary criminalising language",
            ],
            "not_to_be_used_for": [
                "deciding allegation outcome",
                "replacing LADO process",
                "deciding disciplinary action",
            ],
        },
        "dbs_guidance": {
            "official_url": "https://www.gov.uk/government/collections/dbs-checking-service-guidance--2",
            "related_workflow_domains": [
                "allegations_lado_adult_conduct",
                "visitors_contractors_professionals",
            ],
            "manager_oversight_triggers": ["DBS referral consideration", "safer access review"],
            "not_to_be_used_for": ["deciding DBS referral outcome"],
        },
        "whistleblowing_guidance": {
            "related_workflow_domains": [
                "allegations_lado_adult_conduct",
                "staff_wellbeing_secondary_trauma",
            ],
            "escalation_triggers": ["whistleblowing route where normal reporting feels unsafe"],
        },
        "online_safety_ceop": {
            "related_workflow_domains": [
                "harmful_sexual_behaviour_child_on_child",
                "prevent_radicalisation",
            ],
            "safer_recording_behaviours": [
                "record online sexual harm concerns factually and preserve dignity",
            ],
        },
        "nspcc_learning": {
            "related_workflow_domains": [
                "harmful_sexual_behaviour_child_on_child",
                "bullying_group_living_dynamics",
                "fgm_forced_marriage_honour_based_abuse",
            ],
            "not_to_be_used_for": ["treated as statutory authority"],
        },
        "ico_children_uk_gdpr": {
            "related_workflow_domains": [
                "search_confiscation_privacy_surveillance",
                "record_access_care_files_future_reading",
                "visitors_contractors_professionals",
            ],
            "safer_recording_behaviours": [
                "record privacy impact and child information rights where relevant",
            ],
        },
        "ico_childrens_code": {
            "official_url": "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/",
            "related_workflow_domains": [
                "search_confiscation_privacy_surveillance",
                "online_safety",
            ],
        },
        "nice_ng205_looked_after_children": {
            "related_workflow_domains": [
                "sexual_health_pregnancy_relationships",
                "staff_wellbeing_secondary_trauma",
            ],
            "child_voice_prompts": ["What support would the child find dignified, confidential and helpful?"],
        },
        "send_code_of_practice": {
            "related_workflow_domains": ["language_interpreters_communication_access"],
            "child_voice_prompts": [
                "Was communication adapted to the child's SEND, disability or communication needs?",
            ],
        },
        "domestic_abuse_guidance": {
            "related_workflow_domains": ["parental_substance_misuse_family_trauma"],
            "safer_recording_behaviours": [
                "record family trauma context without blaming the child or parent",
            ],
        },
        "coram_voice": {
            "related_workflow_domains": [
                "language_interpreters_communication_access",
                "ordinary_childhood_belonging_memories",
                "record_access_care_files_future_reading",
            ],
            "not_to_be_used_for": ["treated as statutory authority"],
        },
        "become_charity": {
            "related_workflow_domains": [
                "money_possessions_financial_dignity",
                "ordinary_childhood_belonging_memories",
                "record_access_care_files_future_reading",
            ],
            "not_to_be_used_for": ["treated as statutory authority"],
        },
        "safer_recruitment_education": {
            "duplicate_url_justification": "Same KCSIE publication; this entry is a safer recruitment subsection mapping.",
            "related_workflow_domains": [
                "allegations_lado_adult_conduct",
                "staff_training_qualifications_induction",
                "visitors_contractors_professionals",
            ],
        },
    }
    for source_id, updates in existing_extensions.items():
        list_updates = {k: v for k, v in updates.items() if isinstance(v, list)}
        scalar_updates = {k: v for k, v in updates.items() if not isinstance(v, list)}
        _extend_source(
            sources,
            updated_ids,
            source_id,
            list_updates=list_updates,
            scalar_updates=scalar_updates,
        )
        duplicate_avoided_ids.add(source_id)

    new_sources = [
        src(
            "care_standards_act_2000",
            "Care Standards Act 2000",
            "https://www.legislation.gov.uk/ukpga/2000/14/contents",
            "legislation",
            1,
            "UK Parliament",
            "primary_legislation",
            "authoritative_statute",
            quote_allowed_default=True,
            related_workflow_domains=["regulated_home_governance", "management_oversight"],
            related_regulations=["Care Standards Act 2000"],
            manager_oversight_triggers=["registered provider duties", "registration boundary"],
            not_to_be_used_for=[
                "deciding registration compliance",
                "predicting Ofsted enforcement outcome",
                "replacing legal/regulatory advice",
            ],
        ),
        src(
            "ofsted_register_childrens_home",
            "Register a children's home",
            "https://www.gov.uk/government/publications/register-a-childrens-home",
            "inspection_framework",
            1,
            "Ofsted",
            "inspection_framework",
            "authoritative_inspection",
            related_workflow_domains=[
                "regulated_home_governance",
                "statement_of_purpose_admissions",
            ],
            manager_oversight_triggers=[
                "registered provider and registered manager fitness",
                "responsible individual monitoring",
            ],
            not_to_be_used_for=[
                "deciding registration compliance",
                "replacing legal/regulatory advice",
            ],
        ),
        src(
            "ofsted_social_care_compliance_handbook",
            "Social care compliance handbook from September 2023",
            "https://www.gov.uk/government/publications/social-care-compliance-handbook-from-september-2023",
            "inspection_framework",
            1,
            "Ofsted",
            "inspection_framework",
            "authoritative_inspection",
            related_workflow_domains=["regulated_home_governance", "management_oversight"],
            escalation_triggers=["seek regulatory advice where enforcement risk is unclear"],
            manager_oversight_triggers=[
                "compliance notice boundary",
                "cancellation or suspension boundary",
            ],
            not_to_be_used_for=[
                "predicting Ofsted enforcement outcome",
                "deciding registration compliance",
                "replacing legal/regulatory advice",
            ],
        ),
        src(
            "statement_of_purpose_provider_document",
            "Statement of Purpose (provider-owned children's home document)",
            "",
            "provider_policy",
            1,
            "Provider",
            "provider_policy",
            "local_policy_required",
            should_cite=False,
            requires_local_policy=True,
            related_workflow_domains=[
                "statement_of_purpose_admissions",
                "regulated_home_governance",
                "corporate_parenting_sufficiency_matching",
            ],
            manager_oversight_triggers=["does this fit the Statement of Purpose?"],
            child_voice_prompts=["How would the home explain its purpose to this child?"],
            not_to_be_used_for=[
                "replacing provider policy or local safeguarding procedures",
                "approving placement suitability alone",
            ],
        ),
        src(
            "childrens_guide_provider_document",
            "Children's Guide (provider-owned children's home document)",
            "",
            "provider_policy",
            1,
            "Provider",
            "provider_policy",
            "local_policy_required",
            should_cite=False,
            requires_local_policy=True,
            related_workflow_domains=[
                "statement_of_purpose_admissions",
                "ordinary_childhood_belonging_memories",
                "language_interpreters_communication_access",
            ],
            child_voice_prompts=[
                "Could the child understand the guide and know how to complain or ask for advocacy?",
            ],
            not_to_be_used_for=[
                "replacing provider policy or local safeguarding procedures",
                "assuming the child understood without communication support",
            ],
        ),
        src(
            "prevent_duty_guidance",
            "Prevent duty guidance",
            "https://www.gov.uk/government/publications/prevent-duty-guidance",
            "statutory_guidance",
            2,
            "Home Office",
            "statutory_guidance",
            "authoritative_guidance",
            related_workflow_domains=["prevent_radicalisation", "online_safety"],
            escalation_triggers=["consult safeguarding lead and local Prevent policy"],
            safer_recording_behaviours=[
                "record observable facts and context without labelling the child",
            ],
            not_to_be_used_for=[
                "labelling a child as radicalised",
                "making Prevent referral decisions alone",
                "profiling based on identity, religion or culture",
            ],
        ),
        src(
            "channel_duty_guidance",
            "Channel duty guidance: protecting people susceptible to radicalisation",
            "https://www.gov.uk/government/publications/channel-duty-guidance-protecting-people-susceptible-to-radicalisation",
            "statutory_guidance",
            2,
            "Home Office",
            "statutory_guidance",
            "authoritative_guidance",
            related_workflow_domains=["prevent_radicalisation"],
            escalation_triggers=["safeguarding lead and local Channel process"],
            not_to_be_used_for=[
                "making Prevent referral decisions alone",
                "profiling based on identity, religion or culture",
            ],
        ),
        src(
            "nspcc_harmful_sexual_behaviour",
            "NSPCC Learning: harmful sexual behaviour",
            "https://learning.nspcc.org.uk/child-abuse-and-neglect/harmful-sexual-behaviour",
            "third_sector",
            2,
            "NSPCC",
            "third_sector_resource",
            "reflective_only",
            related_workflow_domains=["harmful_sexual_behaviour_child_on_child"],
            safer_recording_behaviours=[
                "use dignity-preserving language and avoid victim-blaming",
            ],
            not_to_be_used_for=[
                "determining whether abuse occurred",
                "replacing safeguarding investigation",
                "treated as statutory authority",
            ],
        ),
        src(
            "fgm_statutory_guidance",
            "Multi-agency statutory guidance on female genital mutilation",
            "https://www.gov.uk/government/publications/multi-agency-statutory-guidance-on-female-genital-mutilation",
            "statutory_guidance",
            2,
            "HM Government",
            "statutory_guidance",
            "authoritative_guidance",
            related_workflow_domains=["fgm_forced_marriage_honour_based_abuse"],
            escalation_triggers=["urgent safeguarding escalation where FGM risk indicators present"],
            safer_recording_behaviours=["record facts with cultural respect and no stereotyping"],
            not_to_be_used_for=["making risk decisions alone", "profiling families or communities"],
        ),
        src(
            "forced_marriage_guidance",
            "The right to choose: government guidance on forced marriage",
            "https://www.gov.uk/government/publications/the-right-to-choose-government-guidance-on-forced-marriage",
            "statutory_guidance",
            2,
            "Foreign, Commonwealth & Development Office",
            "statutory_guidance",
            "authoritative_guidance",
            related_workflow_domains=["fgm_forced_marriage_honour_based_abuse"],
            escalation_triggers=["urgent safeguarding route; do not alert family if unsafe"],
            safer_recording_behaviours=["record the child's words and immediate safety concerns"],
            not_to_be_used_for=["making risk decisions alone", "profiling families or communities"],
        ),
        src(
            "regulatory_reform_fire_safety_order_2005",
            "Regulatory Reform (Fire Safety) Order 2005",
            "https://www.legislation.gov.uk/uksi/2005/1541/contents",
            "legislation",
            5,
            "UK Parliament",
            "secondary_legislation",
            "authoritative_statute",
            quote_allowed_default=True,
            related_workflow_domains=["fire_premises_food_health_safety"],
            not_to_be_used_for=["replacing fire risk assessment", "replacing competent person risk assessments"],
        ),
        src(
            "fire_safety_sleeping_accommodation",
            "Fire safety risk assessment: sleeping accommodation",
            "https://www.gov.uk/government/publications/fire-safety-risk-assessment-sleeping-accommodation",
            "government_practice_guidance",
            5,
            "Home Office",
            "practice_guidance",
            "informative_practice",
            related_workflow_domains=["fire_premises_food_health_safety"],
            manager_oversight_triggers=["fire risk assessment action and maintenance evidence"],
            not_to_be_used_for=["replacing fire risk assessment", "replacing competent person risk assessments"],
        ),
        src(
            "health_safety_at_work_act_1974",
            "Health and Safety at Work etc. Act 1974",
            "https://www.legislation.gov.uk/ukpga/1974/37/contents",
            "legislation",
            5,
            "UK Parliament",
            "primary_legislation",
            "authoritative_statute",
            related_workflow_domains=["fire_premises_food_health_safety", "staff_wellbeing_secondary_trauma"],
            not_to_be_used_for=["replacing competent person risk assessments"],
        ),
        src(
            "hse_riddor",
            "HSE: RIDDOR reporting of injuries, diseases and dangerous occurrences",
            "https://www.hse.gov.uk/riddor/",
            "professional_guidance",
            5,
            "Health and Safety Executive",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["fire_premises_food_health_safety", "critical_incidents_death_bereavement"],
            manager_oversight_triggers=["accident reporting review"],
            not_to_be_used_for=["deciding statutory notification alone"],
        ),
        src(
            "hse_coshh",
            "HSE: Control of Substances Hazardous to Health (COSHH)",
            "https://www.hse.gov.uk/coshh/",
            "professional_guidance",
            5,
            "Health and Safety Executive",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["fire_premises_food_health_safety"],
            not_to_be_used_for=["replacing competent person risk assessments"],
        ),
        src(
            "hse_first_aid",
            "HSE: First aid at work",
            "https://www.hse.gov.uk/firstaid/",
            "professional_guidance",
            5,
            "Health and Safety Executive",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["fire_premises_food_health_safety", "health"],
            not_to_be_used_for=["replacing first aid needs assessment"],
        ),
        src(
            "food_standards_agency_food_hygiene",
            "Food Standards Agency: food hygiene for your business",
            "https://www.food.gov.uk/business-guidance/food-hygiene-for-your-business",
            "professional_guidance",
            5,
            "Food Standards Agency",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["fire_premises_food_health_safety", "ordinary_childhood_belonging_memories"],
            not_to_be_used_for=["replacing food safety advice", "replacing competent person risk assessments"],
        ),
        src(
            "hse_manual_handling",
            "HSE: manual handling at work",
            "https://www.hse.gov.uk/msd/manual-handling/index.htm",
            "professional_guidance",
            5,
            "Health and Safety Executive",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["fire_premises_food_health_safety"],
            not_to_be_used_for=["replacing competent person risk assessments"],
        ),
        src(
            "hse_legionella",
            "HSE: Legionnaires' disease",
            "https://www.hse.gov.uk/legionnaires/",
            "professional_guidance",
            5,
            "Health and Safety Executive",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["fire_premises_food_health_safety"],
            not_to_be_used_for=["replacing competent person risk assessments"],
        ),
        src(
            "hse_electrical_safety",
            "HSE: electrical safety",
            "https://www.hse.gov.uk/electricity/",
            "professional_guidance",
            5,
            "Health and Safety Executive",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["fire_premises_food_health_safety"],
            not_to_be_used_for=["replacing competent person risk assessments"],
        ),
        src(
            "hse_driving_at_work",
            "HSE: driving and riding safely for work",
            "https://www.hse.gov.uk/roadsafety/",
            "professional_guidance",
            5,
            "Health and Safety Executive",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["transport_community_activities"],
            manager_oversight_triggers=["vehicle checks and transport risk assessment"],
            not_to_be_used_for=["approving an activity without manager/provider risk assessment"],
        ),
        src(
            "child_car_seats_rules",
            "Child car seats: the rules",
            "https://www.gov.uk/child-car-seats-the-rules",
            "government_practice_guidance",
            5,
            "Department for Transport",
            "practice_guidance",
            "informative_practice",
            related_workflow_domains=["transport_community_activities"],
            not_to_be_used_for=["approving transport without manager/provider risk assessment"],
        ),
        src(
            "think_road_safety",
            "THINK! road safety",
            "https://www.think.gov.uk/",
            "government_practice_guidance",
            5,
            "Department for Transport",
            "practice_guidance",
            "informative_practice",
            related_workflow_domains=["transport_community_activities"],
            not_to_be_used_for=["approving an activity without manager/provider risk assessment"],
        ),
        src(
            "rospa_water_safety",
            "RoSPA: water safety",
            "https://www.rospa.com/policy/home-safety/water",
            "third_sector",
            5,
            "RoSPA",
            "third_sector_resource",
            "reflective_only",
            related_workflow_domains=["transport_community_activities"],
            not_to_be_used_for=[
                "treated as statutory authority",
                "approving an activity without manager/provider risk assessment",
            ],
        ),
        src(
            "junior_isa_looked_after_children",
            "Junior ISA for looked-after children",
            "https://www.gov.uk/government/publications/junior-individual-saving-accounts-for-looked-after-children",
            "government_practice_guidance",
            4,
            "Department for Education",
            "practice_guidance",
            "informative_practice",
            related_workflow_domains=["money_possessions_financial_dignity", "leaving_care"],
            not_to_be_used_for=["deducting money as punishment", "deciding financial safeguarding outcome"],
        ),
        src(
            "corporate_parenting_principles",
            "Applying corporate parenting principles to looked-after children and care leavers",
            "https://www.gov.uk/government/publications/applying-corporate-parenting-principles-to-looked-after-children-and-care-leavers",
            "statutory_guidance",
            4,
            "Department for Education",
            "statutory_guidance",
            "authoritative_guidance",
            related_workflow_domains=["corporate_parenting_sufficiency_matching", "leaving_care"],
            child_voice_prompts=["What would a good parent notice or do here?"],
            not_to_be_used_for=["approving placement suitability alone"],
        ),
        src(
            "sufficiency_duty_guidance",
            "Securing sufficient accommodation for looked-after children",
            "https://www.gov.uk/government/publications/securing-sufficient-accommodation-for-looked-after-children",
            "statutory_guidance",
            4,
            "Department for Education",
            "statutory_guidance",
            "authoritative_guidance",
            related_workflow_domains=["corporate_parenting_sufficiency_matching"],
            manager_oversight_triggers=["unregistered placement risk", "matching and stability review"],
            not_to_be_used_for=["approving placement suitability alone", "replacing responsible manager/placing authority decision"],
        ),
        src(
            "serious_child_safeguarding_incident_report_guidance",
            "Report a serious child safeguarding incident",
            "https://www.gov.uk/guidance/report-a-serious-child-safeguarding-incident",
            "statutory_guidance",
            2,
            "Department for Education",
            "statutory_guidance",
            "authoritative_guidance",
            related_workflow_domains=["critical_incidents_death_bereavement", "safeguarding_concern"],
            escalation_triggers=["urgent statutory notification consideration"],
            not_to_be_used_for=["managing an emergency", "deciding statutory notification alone"],
        ),
        src(
            "child_safeguarding_practice_review_panel",
            "Child Safeguarding Practice Review Panel",
            "https://www.gov.uk/government/organisations/child-safeguarding-practice-review-panel",
            "government_practice_guidance",
            2,
            "Child Safeguarding Practice Review Panel",
            "practice_guidance",
            "informative_practice",
            related_workflow_domains=["critical_incidents_death_bereavement"],
            manager_oversight_triggers=["organisational learning and review themes"],
            not_to_be_used_for=["deciding statutory notification alone", "replacing safeguarding review process"],
        ),
        src(
            "ofsted_serious_incident_children_home_guidance",
            "Tell Ofsted about a serious incident in a children's home or secure children's home",
            "https://www.gov.uk/guidance/tell-ofsted-about-a-serious-incident-in-a-childrens-home-or-secure-childrens-home",
            "inspection_framework",
            1,
            "Ofsted",
            "inspection_framework",
            "authoritative_inspection",
            related_workflow_domains=["critical_incidents_death_bereavement", "reg_40_notification"],
            escalation_triggers=["Ofsted notification consideration"],
            not_to_be_used_for=["deciding statutory notification alone", "guaranteeing compliance"],
        ),
        src(
            "hse_stress_at_work",
            "HSE: work-related stress and mental health",
            "https://www.hse.gov.uk/stress/",
            "professional_guidance",
            5,
            "Health and Safety Executive",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["staff_wellbeing_secondary_trauma"],
            not_to_be_used_for=["diagnosing staff wellbeing", "replacing supervision"],
        ),
        src(
            "hse_lone_working",
            "HSE: lone working",
            "https://www.hse.gov.uk/lone-working/",
            "professional_guidance",
            5,
            "Health and Safety Executive",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["staff_wellbeing_secondary_trauma", "emergency_planning_business_continuity"],
            not_to_be_used_for=["replacing management decision-making"],
        ),
        src(
            "nhs_sexual_health_services",
            "NHS: sexual health services",
            "https://www.nhs.uk/live-well/sexual-health/",
            "professional_guidance",
            3,
            "NHS",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["sexual_health_pregnancy_relationships"],
            escalation_triggers=["health professional and safeguarding lead where risk indicators present"],
            not_to_be_used_for=["giving clinical advice", "making contraception or pregnancy decisions"],
        ),
        src(
            "ico_subject_access_requests",
            "ICO: subject access requests",
            "https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/subject-access-requests/",
            "data_protection_guidance",
            5,
            "ICO",
            "professional_guidance",
            "informative_practice",
            related_workflow_domains=["record_access_care_files_future_reading", "data_protection_ai_safety"],
            not_to_be_used_for=["deciding SAR disclosure", "replacing data protection officer judgement"],
        ),
        src(
            "the_care_files",
            "The Care Files",
            "https://www.whocaresscotland.org/care-files/",
            "lived_experience",
            5,
            "Who Cares? Scotland",
            "lived_experience_resource",
            "reflective_only",
            related_workflow_domains=["record_access_care_files_future_reading", "life_story_records"],
            safer_recording_behaviours=["write records with dignity for the child who may read them later"],
            not_to_be_used_for=["treated as statutory authority", "deciding SAR disclosure"],
            jurisdiction="UK lived-experience context",
        ),
        src(
            "nicco_children_of_offenders",
            "NICCO: National Information Centre on Children of Offenders",
            "https://www.nicco.org.uk/",
            "third_sector",
            4,
            "Barnardo's / NICCO",
            "third_sector_resource",
            "reflective_only",
            related_workflow_domains=["children_with_parents_in_prison", "family_time"],
            child_voice_prompts=["How is the child making sense of family imprisonment and stigma?"],
            not_to_be_used_for=["making contact decisions alone", "treated as statutory authority"],
        ),
        src(
            "cabinet_office_emergency_response_recovery",
            "Emergency response and recovery",
            "https://www.gov.uk/government/publications/emergency-response-and-recovery",
            "government_practice_guidance",
            5,
            "Cabinet Office",
            "practice_guidance",
            "informative_practice",
            related_workflow_domains=["emergency_planning_business_continuity"],
            manager_oversight_triggers=["business continuity and emergency relocation planning"],
            not_to_be_used_for=["replacing business continuity plan"],
        ),
        src(
            "rspca_pets_advice",
            "RSPCA: pets advice and welfare",
            "https://www.rspca.org.uk/adviceandwelfare/pets",
            "third_sector",
            5,
            "RSPCA",
            "third_sector_resource",
            "reflective_only",
            related_workflow_domains=["pets_animals_therapy_animals", "ordinary_childhood_belonging_memories"],
            child_voice_prompts=["What does the pet or animal relationship mean to the child?"],
            not_to_be_used_for=["treated as statutory authority", "approving pets without provider risk assessment"],
        ),
    ]

    for new_source in new_sources:
        _add_or_extend_source(
            sources,
            updated_ids,
            added_ids,
            duplicate_avoided_ids,
            new_source,
        )

    EXPANSION_REPORT.clear()
    EXPANSION_REPORT.update(
        {
            "baseline_source_count": baseline_count,
            "sources_updated": sorted(updated_ids),
            "new_sources_added": sorted(added_ids),
            "duplicates_avoided": sorted(duplicate_avoided_ids),
            "uncertain_near_duplicates_requiring_human_review": near_duplicates_for_human_review,
        }
    )


def build_workflow_behaviours(source_list: list[dict[str, Any]]) -> list[dict[str, Any]]:
    domains_spec = [
        ("daily_recording", "Daily recording", 1, [QS["qs1"], QS["qs2"]], SCCIF["overall"], ["Reg 6", "Reg 7"]),
        ("incident_recording", "Incident recording", 1, [QS["qs7"], QS["qs2"]], SCCIF["protected"], ["Reg 12", "Reg 40"]),
        ("physical_intervention", "Physical intervention", 2, [QS["qs7"]], SCCIF["protected"], ["Reg 12"]),
        ("missing_from_care", "Missing from care", 2, [QS["qs7"]], SCCIF["protected"], ["Reg 12", "Reg 40"]),
        ("safeguarding_concern", "Safeguarding concern", 1, [QS["qs7"]], SCCIF["protected"], ["Reg 12"]),
        ("allegation", "Allegation", 1, [QS["qs7"], QS["qs8"]], SCCIF["protected"], ["Reg 12", "Reg 40"]),
        ("exploitation_concern", "Exploitation concern", 2, [QS["qs7"]], SCCIF["protected"], []),
        ("family_time", "Family time", 1, [QS["qs2"], QS["qs6"]], SCCIF["overall"], ["Reg 7", "Reg 14"]),
        ("education", "Education", 3, [QS["qs3"]], SCCIF["overall"], ["Reg 8"]),
        ("health", "Health", 3, [QS["qs5"]], SCCIF["overall"], ["Reg 10"]),
        ("medication", "Medication", 3, [QS["qs5"]], SCCIF["overall"], ["Reg 10"]),
        ("mental_health_self_harm", "Mental health and self-harm", 3, [QS["qs5"], QS["qs7"]], SCCIF["protected"], ["Reg 10", "Reg 12"]),
        ("send_disability_autism", "SEND / disability / autism", 3, [QS["qs3"], QS["qs5"]], SCCIF["overall"], ["Reg 8", "Reg 10"]),
        ("online_safety", "Online safety", 2, [QS["qs7"]], SCCIF["protected"], ["Reg 12"]),
        ("equality_identity_culture", "Equality / identity / culture", 4, [QS["qs2"], QS["qs6"]], SCCIF["overall"], []),
        ("key_work", "Key-work", 1, [QS["qs2"], QS["qs9"]], SCCIF["overall"], ["Reg 7", "Reg 14"]),
        ("risk_assessment", "Risk assessment", 2, [QS["qs7"]], SCCIF["protected"], ["Reg 12"]),
        ("behaviour_support", "Behaviour support", 2, [QS["qs1"], QS["qs6"]], SCCIF["overall"], ["Reg 6"]),
        ("supervision", "Supervision", 5, [QS["qs8"], QS["qs6"]], SCCIF["leadership"], ["Reg 13"]),
        ("management_oversight", "Management oversight", 1, [QS["qs8"]], SCCIF["leadership"], ["Reg 13"]),
        ("reg_40_notification", "Reg 40 notification consideration", 1, [QS["qs7"], QS["qs8"]], SCCIF["leadership"], ["Reg 40"]),
        ("reg_44_preparation", "Reg 44 preparation", 1, [QS["qs8"]], SCCIF["leadership"], ["Reg 44"]),
        ("reg_45_preparation", "Reg 45 preparation", 1, [QS["qs8"], QS["qs9"]], SCCIF["leadership"], ["Reg 45"]),
        ("inspection_readiness", "Inspection readiness", 1, [QS["qs1"], QS["qs8"]], SCCIF["overall"], ["Reg 6", "Reg 13"]),
        ("report_writing", "Report writing", 1, list(QS.values()), SCCIF["overall"], []),
        ("leaving_care", "Leaving care", 4, [QS["qs9"]], SCCIF["overall"], []),
        ("life_story_records", "Life story / records the child may read later", 5, [QS["qs2"]], SCCIF["overall"], ["Reg 7"]),
        ("data_protection_ai_safety", "Data protection / AI safety", 5, [QS["qs8"]], SCCIF["leadership"], []),
        ("regulated_home_governance", "Running the regulated children's home", 1, [QS["qs8"]], SCCIF["leadership"], ["Reg 13", "Reg 31", "Reg 44", "Reg 45"]),
        ("statement_of_purpose_admissions", "Statement of Purpose, Children's Guide and admissions matching", 1, [QS["qs1"], QS["qs2"], QS["qs9"]], SCCIF["overall"], ["Reg 16", "Reg 17"]),
        ("allegations_lado_adult_conduct", "Allegations, LADO and adult conduct", 1, [QS["qs7"], QS["qs8"]], SCCIF["protected"], ["Reg 12", "Reg 32", "Reg 34", "Reg 40"]),
        ("prevent_radicalisation", "Prevent, radicalisation and ideological harm", 2, [QS["qs7"], QS["qs2"]], SCCIF["protected"], ["Reg 12"]),
        ("harmful_sexual_behaviour_child_on_child", "Harmful sexual behaviour and child-on-child harm", 2, [QS["qs7"], QS["qs2"]], SCCIF["protected"], ["Reg 12", "Reg 35"]),
        ("fgm_forced_marriage_honour_based_abuse", "FGM, forced marriage and honour-based abuse", 2, [QS["qs7"], QS["qs2"]], SCCIF["protected"], ["Reg 12"]),
        ("bullying_group_living_dynamics", "Bullying, intimidation and group living dynamics", 2, [QS["qs6"], QS["qs7"]], SCCIF["protected"], ["Reg 11", "Reg 12", "Reg 35"]),
        ("search_confiscation_privacy_surveillance", "Search, confiscation, room checks, surveillance and privacy", 1, [QS["qs2"], QS["qs7"]], SCCIF["protected"], ["Reg 21", "Reg 22", "Reg 24", "Reg 35"]),
        ("fire_premises_food_health_safety", "Fire, premises, food, infection control and health and safety", 5, [QS["qs5"], QS["qs8"]], SCCIF["leadership"], ["Reg 25", "Reg 13"]),
        ("transport_community_activities", "Transport, vehicles and community activities", 5, [QS["qs4"], QS["qs7"]], SCCIF["overall"], ["Reg 12"]),
        ("money_possessions_financial_dignity", "Money, possessions and financial dignity", 4, [QS["qs2"], QS["qs4"]], SCCIF["overall"], ["Reg 7"]),
        ("corporate_parenting_sufficiency_matching", "Corporate parenting, sufficiency, matching and stability", 4, [QS["qs1"], QS["qs9"]], SCCIF["overall"], ["Reg 14", "Reg 17"]),
        ("critical_incidents_death_bereavement", "Critical incidents, death, serious harm and bereavement", 1, [QS["qs7"], QS["qs8"]], SCCIF["protected"], ["Reg 40"]),
        ("staff_wellbeing_secondary_trauma", "Staff wellbeing, supervision and secondary trauma", 5, [QS["qs8"], QS["qs6"]], SCCIF["leadership"], ["Reg 13", "Reg 31"]),
        ("staff_training_qualifications_induction", "Staff training, qualifications and induction", 1, [QS["qs8"]], SCCIF["leadership"], ["Reg 31", "Reg 32", "Reg 33"]),
        ("sexual_health_pregnancy_relationships", "Sexual health, contraception, pregnancy and relationships", 3, [QS["qs5"], QS["qs2"]], SCCIF["overall"], ["Reg 10"]),
        ("language_interpreters_communication_access", "Language, interpreters and communication access", 4, [QS["qs2"], QS["qs3"]], SCCIF["overall"], ["Reg 7"]),
        ("children_with_parents_in_prison", "Children with parents in prison or family imprisonment", 4, [QS["qs2"], QS["qs6"]], SCCIF["overall"], ["Reg 7"]),
        ("parental_substance_misuse_family_trauma", "Parental substance misuse, parental mental health and family trauma", 2, [QS["qs6"], QS["qs7"]], SCCIF["protected"], ["Reg 12"]),
        ("emergency_planning_business_continuity", "Emergency planning and business continuity", 5, [QS["qs8"], QS["qs5"]], SCCIF["leadership"], ["Reg 13", "Reg 23", "Reg 25"]),
        ("visitors_contractors_professionals", "Visitors, contractors and professionals in the home", 5, [QS["qs7"], QS["qs8"]], SCCIF["protected"], ["Reg 12", "Reg 32"]),
        ("pets_animals_therapy_animals", "Pets, animals and therapy animals", 5, [QS["qs4"], QS["qs6"]], SCCIF["overall"], ["Reg 9", "Reg 11"]),
        ("ordinary_childhood_belonging_memories", "Ordinary childhood, belonging and memories", 4, [QS["qs2"], QS["qs4"], QS["qs6"]], SCCIF["overall"], ["Reg 7", "Reg 9", "Reg 11"]),
        ("record_access_care_files_future_reading", "Record access, care files and future reading", 5, [QS["qs2"], QS["qs8"]], SCCIF["leadership"], ["Reg 36", "Reg 37", "Reg 38", "Reg 39"]),
    ]

    by_domain: dict[str, list[str]] = {}
    for s in source_list:
        for d in s["related_workflow_domains"]:
            by_domain.setdefault(d, []).append(s["source_id"])

    behaviours = []
    for domain_id, display, tier, qs_list, sccif, regs in domains_spec:
        relevant = by_domain.get(domain_id, [])
        if not relevant:
            # fallback to tier-appropriate core sources
            relevant = [s["source_id"] for s in source_list if s["tier"] == tier][:3]
        behaviours.append(
            {
                "domain": domain_id,
                "display_name": display,
                "primary_source_tier": tier,
                "relevant_sources": sorted(set(relevant)),
                "quality_standards": qs_list,
                "sccif_judgement_area": sccif,
                "regulation_guidance_links": regs,
                "evidence_prompts": [
                    "What happened and what was observed?",
                    "What impact on the child?",
                    "What actions were taken and by whom?",
                ],
                "safer_recording_prompts": [
                    "Separate observation from interpretation",
                    "Use child-centred, non-punitive language",
                    "Link to plan and follow-up",
                ],
                "child_voice_prompts": [
                    "What did the child say or communicate?",
                    "How were their views recorded?",
                ],
                "escalation_prompts": [
                    "DSL/manager where safeguarding indicators present",
                    "Check provider policy and local procedures",
                ],
                "manager_oversight_prompts": [
                    "Review chronology and actions",
                    "Confirm notifications and multi-agency steps",
                ],
                "citation_expectations": "Cite Tier 1 statutory sources where relevant; distinguish law from guidance",
                "uncertainty_behaviour": "State when source text is not ingested; do not invent citations or guarantees",
                "answer_style": "calm, factual, warm, child-centred, professional-judgement preserving",
                "not_to_be_used_for": [
                    "replacing professional judgement",
                    "guaranteeing compliance",
                    "substituting for provider policy or local safeguarding procedures",
                ],
            }
        )
    return behaviours


def main() -> None:
    sources = build_sources()
    assert len({s["source_id"] for s in sources}) == len(sources), "duplicate source_id"
    tiers = {s["tier"] for s in sources}
    assert tiers == {1, 2, 3, 4, 5}, f"expected 5 tiers, got {tiers}"
    tier1_required = {
        "childrens_homes_regulations_2015",
        "dfe_childrens_homes_regulations_guide",
        "ofsted_sccif_childrens_homes",
        "children_act_1989_vol2_care_planning",
        "care_planning_placement_case_review_regs_2010",
        "working_together_safeguarding",
        "children_social_care_national_framework",
        "iro_handbook",
        "ofsted_serious_incident_notification",
        "regulation_40_childrens_homes",
        "regulation_44_childrens_homes",
        "regulation_45_childrens_homes",
    }
    ids = {s["source_id"] for s in sources}
    assert tier1_required <= ids
    behaviours = build_workflow_behaviours(sources)
    domain_ids = {b["domain"] for b in behaviours}
    assert len(behaviours) == 52
    for s in sources:
        for d in s["related_workflow_domains"]:
            assert d in domain_ids, f"unknown domain {d} in {s['source_id']}"

    payload = {
        "version": "1.0.0",
        "governance_note": (
            "Mapping-only catalogue for ORB Residential. Does not ingest, scrape, or change runtime routes. "
            "NR-1 remains open. Public promise remains blocked."
        ),
        "last_catalogue_review": LAST_VERIFIED,
        "tiers": [1, 2, 3, 4, 5],
        "tier_labels": {
            "1": "Core statutory and inspection spine",
            "2": "Safeguarding, risk and child protection",
            "3": "Whole-child development, health, education and SEND",
            "4": "Rights, identity, advocacy, family and journey through care",
            "5": "Data protection, records, workforce and ethical AI",
        },
        "update_report": EXPANSION_REPORT,
        "sources": sources,
        "workflow_domain_behaviours": behaviours,
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {len(sources)} sources, {len(behaviours)} workflow domains -> {OUT_PATH}")


if __name__ == "__main__":
    main()
