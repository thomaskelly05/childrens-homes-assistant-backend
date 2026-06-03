"""Map scenarios to life domains and professional lenses around the child."""

from __future__ import annotations

from typing import Any

DOMAINS: list[str] = [
    "safety_and_protection",
    "emotional_wellbeing",
    "physical_health",
    "mental_health",
    "neurodevelopment_send",
    "education_and_attendance",
    "family_time_and_identity",
    "culture_religion_belonging",
    "communication_and_advocacy",
    "relationships_and_peer_risk",
    "online_safety",
    "exploitation_contextual_safeguarding",
    "placement_stability",
    "behaviour_as_communication",
    "restrictive_practice",
    "complaints_and_rights",
    "transitions_and_independence",
    "staff_practice_and_relationships",
    "leadership_and_governance",
]

PROFESSIONAL_LENSES: dict[str, str] = {
    "child": "What does this feel like for me?",
    "residential_support_worker": "What do I do now and who do I tell?",
    "senior": "Is practice safe and consistent on shift?",
    "registered_manager": "What is my oversight, action owner and evidence?",
    "responsible_individual": "Where is provider drift or repeat weakness?",
    "social_worker": "Does this change risk, plan or statutory duties?",
    "iro": "Is the plan in the child's best interests?",
    "advocate": "Is the child's voice heard and rights upheld?",
    "parent_person_with_pr": "What do they need to know proportionately?",
    "police": "Is there crime, missing or immediate danger?",
    "lado": "Is there an allegation against an adult?",
    "health_gp": "Are health needs assessed and followed up?",
    "camhs_crisis": "Is mental health risk managed?",
    "virtual_school_sendco": "Is education protected?",
    "local_authority_placing": "Are placement duties met?",
    "reg_44_visitor": "What would I triangulate on visit?",
    "reg_45_reviewer": "What quality themes need provider action?",
    "ofsted_inspector": "What is life like and is impact evidenced?",
    "commissioner": "Is placement value and safety appropriate?",
    "therapist_psychologist": "What does trauma/attachment suggest?",
}

_TRIGGER_DOMAIN_MAP: list[tuple[tuple[str, ...], list[str], list[str]]] = [
    (("missing", "absent", "run away", "awol"), ["safety_and_protection", "exploitation_contextual_safeguarding"], ["police", "social_worker", "registered_manager"]),
    (("self-harm", "self harm", "cut", "suicide"), ["mental_health", "safety_and_protection"], ["camhs_crisis", "registered_manager", "health_gp"]),
    (("restraint", "physical intervention", "hold"), ["restrictive_practice", "safety_and_protection"], ["registered_manager"]),
    (("allegation", "lado", "hurt me", "abuse"), ["safety_and_protection"], ["lado", "registered_manager", "social_worker"]),
    (("ofsted", "inspection", "sccif"), ["leadership_and_governance"], ["ofsted_inspector", "registered_manager", "reg_44_visitor"]),
    (("reg 44", "reg 45", "visitor"), ["leadership_and_governance"], ["reg_44_visitor", "reg_45_reviewer", "responsible_individual"]),
    (("school", "education", "ehcp", "send"), ["education_and_attendance", "neurodevelopment_send"], ["virtual_school_sendco", "social_worker"]),
    (("snapchat", "social media", "online"), ["online_safety", "staff_practice_and_relationships"], ["registered_manager"]),
    (("hate living", "nobody listens", "settled"), ["emotional_wellbeing", "communication_and_advocacy"], ["advocate", "registered_manager", "child"]),
    (("cannabis", "exploit", "county lines", "cse"), ["exploitation_contextual_safeguarding"], ["police", "social_worker", "registered_manager"]),
]


class OrbWholeChildLensService:
    def map_scenario(self, message: str, *, risk_level: str | None = None) -> dict[str, Any]:
        lower = str(message or "").lower()
        domains: list[str] = []
        lenses: list[str] = []
        questions: dict[str, str] = {}

        for triggers, doms, profs in _TRIGGER_DOMAIN_MAP:
            if any(t in lower for t in triggers):
                for d in doms:
                    if d not in domains:
                        domains.append(d)
                for p in profs:
                    if p not in lenses:
                        lenses.append(p)

        if not domains:
            domains = ["safety_and_protection", "emotional_wellbeing", "staff_practice_and_relationships"]
        if not lenses:
            lenses = ["residential_support_worker", "registered_manager"]

        if risk_level in ("high", "critical") and "registered_manager" not in lenses:
            lenses.append("registered_manager")

        for lens_key in lenses:
            questions[lens_key] = PROFESSIONAL_LENSES.get(lens_key, "")

        return {
            "domains": domains,
            "professional_lenses": lenses,
            "lens_questions": questions,
            "all_domains": DOMAINS,
        }


orb_whole_child_lens_service = OrbWholeChildLensService()
