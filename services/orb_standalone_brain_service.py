from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any


@dataclass(frozen=True)
class StandaloneBrainFrame:
    mode: str
    active_brains: list[str]
    intent_summary: str
    response_contract: list[str] = field(default_factory=list)
    safety_boundaries: list[str] = field(default_factory=list)
    reflective_questions: list[str] = field(default_factory=list)
    evidence_prompts: list[str] = field(default_factory=list)
    knowledge_domains: list[str] = field(default_factory=list)
    dual_brain_route: str = "residential_specialist"

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbStandaloneBrainService:
    """Standalone ORB dual-brain service.

    ORB must behave as two things at once:
    1. A residential children's homes specialist copilot for adults working in Ofsted-regulated homes.
    2. A broad general-knowledge assistant when the user asks ordinary ChatGPT-style questions.

    This service does not access live IndiCare OS records. It creates the thinking frame that tells the
    assistant which brain to use and what a high-quality answer must consider.
    """

    CORE_BOUNDARIES = [
        "Standalone ORB supports reflection and guidance only; it does not make safeguarding threshold decisions.",
        "It must not claim access to live IndiCare OS records, child files, staff files, chronology or dashboards.",
        "Where immediate risk may be present, advise escalation through local safeguarding procedures and relevant emergency routes.",
        "Do not diagnose children, decide abuse occurred, predict Ofsted grades, or replace managers, DSLs, LADO, social workers, police, health professionals or local policy.",
        "If the user asks a general knowledge question, answer like a capable general assistant without forcing a children's homes lens unless it is relevant.",
    ]

    GENERAL_KNOWLEDGE_DOMAINS = [
        "writing_and_editing",
        "emails_letters_and_reports",
        "planning_and_problem_solving",
        "education_and_explanation",
        "technology_and_software",
        "business_and_strategy",
        "maths_and_logic",
        "general_research_summary",
        "creative_brainstorming",
        "personal_productivity",
    ]

    RESIDENTIAL_KNOWLEDGE_DOMAINS = [
        "children_homes_regulations_2015",
        "quality_standards",
        "ofsted_sccif",
        "regulation_44",
        "regulation_45",
        "regulation_40_notifications",
        "safeguarding_and_child_protection",
        "allegations_and_lado",
        "missing_from_care_and_return_home_interviews",
        "exploitation_and_contextual_safeguarding",
        "restraint_physical_intervention_and_debrief",
        "risk_assessment_and_safety_planning",
        "complaints_and_whistleblowing",
        "safer_recruitment_and_staff_conduct",
        "supervision_probation_training_and_competence",
        "leadership_management_and_governance",
        "recording_quality_and_child_voice",
        "daily_notes_incidents_keywork_and_chronology",
        "therapeutic_trauma_informed_practice",
        "pace_attachment_shame_and_repair",
        "co_regulation_and_de_escalation",
        "education_health_identity_and_contact",
        "equality_diversity_culture_and_rights",
        "transitions_admissions_discharge_and_placement_stability",
        "staff_wellbeing_resilience_and_team_culture",
        "inspection_readiness_and_evidence_gaps",
        "professional_curiosity_and_decision_making",
        "digital_safety_online_risk_and_modern_harm",
    ]

    MODE_ALIASES = {
        "safeguarding": "Safeguarding Thinking",
        "safeguarding thinking": "Safeguarding Thinking",
        "reflect": "Reflect with ORB",
        "reflect with orb": "Reflect with ORB",
        "ofsted lens": "Ofsted Lens",
        "record this properly": "Record This Properly",
        "behaviour support": "Therapeutic Reframe",
        "behavior support": "Therapeutic Reframe",
        "therapeutic reframe": "Therapeutic Reframe",
        "manager copilot": "Manager Copilot",
        "staff coach": "Staff Coach",
        "reg 44 / reg 45 prep": "Reg 44 / Reg 45 Prep",
        "reg 44": "Reg 44 / Reg 45 Prep",
        "reg 45": "Reg 44 / Reg 45 Prep",
        "policy explainer": "Policy Explainer",
        "scenario simulator": "Scenario Simulator",
        "general knowledge": "General Knowledge",
        "ask chatgpt": "General Knowledge",
        "ask orb": "Ask ORB",
    }

    def normalise_mode(self, mode: str | None) -> str:
        key = str(mode or "Ask ORB").strip().lower()
        return self.MODE_ALIASES.get(key, str(mode or "Ask ORB").strip() or "Ask ORB")

    def frame(self, message: str, *, mode: str | None = None) -> StandaloneBrainFrame:
        text = str(message or "").lower()
        resolved_mode = self.normalise_mode(mode)
        route = self._dual_brain_route(text, resolved_mode)
        brains = ["standalone_boundary_brain"]

        if route == "general_knowledge":
            brains.extend(["general_knowledge_brain", "general_reasoning_brain", "writing_and_planning_brain"])
        else:
            brains.extend(["residential_specialist_brain", "residential_children_homes_practice_brain"])

        if self._is_safeguarding(text, resolved_mode):
            brains.extend([
                "safeguarding_brain",
                "child_protection_brain",
                "allegations_lado_brain",
                "risk_reflection_brain",
                "regulatory_brain",
                "evidence_gap_brain",
            ])
        if self._is_regulatory(text, resolved_mode):
            brains.extend([
                "regulatory_brain",
                "quality_standards_brain",
                "ofsted_brain",
                "inspection_evidence_brain",
                "evidence_graph_brain",
            ])
        if self._is_recording(text, resolved_mode):
            brains.extend([
                "recording_quality_brain",
                "child_voice_brain",
                "chronology_brain",
                "professional_language_brain",
                "therapeutic_language_brain",
            ])
        if self._is_therapeutic(text, resolved_mode):
            brains.extend([
                "therapeutic_brain",
                "trauma_informed_brain",
                "pace_brain",
                "attachment_and_shame_brain",
                "co_regulation_brain",
                "repair_brain",
            ])
        if self._is_manager(text, resolved_mode):
            brains.extend([
                "manager_copilot_brain",
                "leadership_and_management_brain",
                "governance_brain",
                "quality_assurance_brain",
                "evidence_gap_brain",
            ])
        if self._is_staff_support(text, resolved_mode):
            brains.extend([
                "staff_coach_brain",
                "reflection_brain",
                "supervision_brain",
                "wellbeing_brain",
                "team_culture_brain",
            ])
        if self._is_policy(text, resolved_mode):
            brains.extend(["policy_explainer_brain", "regulatory_brain", "practice_translation_brain"])
        if self._is_scenario(text, resolved_mode):
            brains.extend([
                "scenario_simulator_brain",
                "professional_curiosity_brain",
                "risk_reflection_brain",
                "safe_next_steps_brain",
            ])
        if self._is_modern_risk(text, resolved_mode):
            brains.extend(["digital_safety_brain", "exploitation_brain", "contextual_safeguarding_brain"])
        if self._is_transitions(text, resolved_mode):
            brains.extend(["placement_stability_brain", "transitions_brain", "care_planning_brain"])
        if self._is_workforce(text, resolved_mode):
            brains.extend(["safer_recruitment_brain", "staff_conduct_brain", "training_competence_brain"])

        brains = self._dedupe(brains)
        domains = self._knowledge_domains(brains, route)
        return StandaloneBrainFrame(
            mode=resolved_mode,
            active_brains=brains,
            intent_summary=self._intent_summary(text, resolved_mode, brains, route),
            response_contract=self._response_contract(brains, resolved_mode, route),
            safety_boundaries=self.CORE_BOUNDARIES,
            reflective_questions=self._reflective_questions(brains, route),
            evidence_prompts=self._evidence_prompts(brains, route),
            knowledge_domains=domains,
            dual_brain_route=route,
        )

    def build_prompt_block(self, message: str, *, mode: str | None = None) -> str:
        frame = self.frame(message, mode=mode)
        lines = [
            "Standalone ORB dual-brain frame:",
            f"- Mode: {frame.mode}",
            f"- Dual brain route: {frame.dual_brain_route}",
            f"- Intent summary: {frame.intent_summary}",
            "- Active brains: " + ", ".join(frame.active_brains),
            "- Knowledge domains: " + ", ".join(frame.knowledge_domains),
            "",
            "Answer contract:",
            *[f"- {item}" for item in frame.response_contract],
            "",
            "Evidence prompts to consider:",
            *[f"- {item}" for item in frame.evidence_prompts],
            "",
            "Reflective prompts to consider:",
            *[f"- {item}" for item in frame.reflective_questions],
            "",
            "Safety boundaries:",
            *[f"- {item}" for item in frame.safety_boundaries],
        ]
        return "\n".join(lines)

    def context_payload(self, message: str, *, mode: str | None = None) -> dict[str, Any]:
        return self.frame(message, mode=mode).to_dict()

    def _dual_brain_route(self, text: str, mode: str) -> str:
        if mode == "General Knowledge":
            return "general_knowledge"
        if mode != "Ask ORB":
            return "residential_specialist"
        if self._contains_residential_signal(text):
            return "residential_specialist"
        return "general_knowledge"

    def _contains_residential_signal(self, text: str) -> bool:
        terms = (
            "children's home", "childrens home", "residential", "young person", "looked after", "care home",
            "ofsted", "sccif", "quality standard", "reg 44", "reg 45", "regulation", "lado", "allegation",
            "safeguarding", "missing from care", "restraint", "physical intervention", "keywork", "daily note",
            "placement", "care plan", "risk assessment", "staff supervision", "manager review", "child voice",
            "therapeutic", "trauma", "pace", "co-regulation", "behaviour as communication", "exploitation",
        )
        return any(term in text for term in terms)

    def _response_contract(self, brains: list[str], mode: str, route: str) -> list[str]:
        if route == "general_knowledge":
            return [
                "Answer as a capable general assistant, like ChatGPT, using clear British English.",
                "Do not force a children's homes angle unless the user asks for it or it is clearly relevant.",
                "Help with writing, explanation, planning, maths, technology, business, creativity and everyday questions.",
                "Be honest when live, current or specialist information would need checking.",
            ]

        contract = [
            "Speak in British English with calm, practitioner-level confidence.",
            "Be practical and specific to Ofsted-regulated residential children's homes.",
            "Sound like an experienced registered manager, therapeutic lead and safeguarding-aware supervisor.",
            "Avoid generic AI phrasing, robotic disclaimers and vague safeguarding summaries.",
            "Give the user a usable answer first, then add boundaries where needed.",
            "Think about the adult on shift: what do they need to understand, do, record, escalate, reflect on or evidence?",
        ]
        if "safeguarding_brain" in brains:
            contract.extend([
                "Separate known facts, concerns, missing information and escalation considerations.",
                "Consider LADO, social worker, police, health, Ofsted notification and local safeguarding procedures where relevant without making the decision for the user.",
                "Protect the child while maintaining fairness, confidentiality and procedural integrity for adults involved.",
            ])
        if "allegations_lado_brain" in brains:
            contract.extend([
                "Differentiate allegation, complaint, low-level concern, conduct issue and safeguarding concern where useful.",
                "Remind that allegations against adults require prompt manager/DSL/LADO consideration under local procedures.",
            ])
        if "regulatory_brain" in brains or "ofsted_brain" in brains:
            contract.extend([
                "Explain why this matters through Regulations, Quality Standards and SCCIF evidence expectations.",
                "Do not predict Ofsted grades; explain what an inspector may look for and what evidence should show impact.",
            ])
        if "recording_quality_brain" in brains:
            contract.extend([
                "Focus on factual, child-centred, non-punitive recording language.",
                "Identify missing evidence such as child voice, staff response, outcome, manager review, follow-up and plan links.",
                "Help staff avoid judgemental phrases and write in a way that is professional, clear and reviewable.",
            ])
        if "therapeutic_brain" in brains or "therapeutic_language_brain" in brains:
            contract.extend([
                "Use behaviour-as-communication thinking and trauma-informed language.",
                "Consider emotional containment, co-regulation, repair, shame sensitivity and relational safety.",
                "Avoid diagnosis and formulation beyond reflective practice unless the user has provided professional context.",
            ])
        if "manager_copilot_brain" in brains:
            contract.extend([
                "Frame the answer for oversight, learning, audit and leadership action.",
                "Highlight evidence gaps, drift, actions, sign-off, supervision and what needs manager review.",
            ])
        if "staff_coach_brain" in brains:
            contract.extend([
                "Support staff confidence without minimising accountability.",
                "Help the adult think about next time, debrief, emotional impact and professional learning.",
            ])
        if "digital_safety_brain" in brains:
            contract.append("Consider online harm, exploitation, peer risk, location sharing, devices, social media and contextual safeguarding.")
        if mode == "Policy Explainer":
            contract.append("Explain policy or guidance in plain English and show how it applies on shift.")
        return self._dedupe(contract)

    def _knowledge_domains(self, brains: list[str], route: str) -> list[str]:
        if route == "general_knowledge":
            return list(self.GENERAL_KNOWLEDGE_DOMAINS)
        domains = list(self.RESIDENTIAL_KNOWLEDGE_DOMAINS)
        if "digital_safety_brain" not in brains:
            domains.remove("digital_safety_online_risk_and_modern_harm")
        if "placement_stability_brain" not in brains:
            domains.remove("transitions_admissions_discharge_and_placement_stability")
        return domains

    def _evidence_prompts(self, brains: list[str], route: str) -> list[str]:
        if route == "general_knowledge":
            return ["What is the user asking for?", "What format would be most useful?", "Is current/live information required?"]
        prompts = [
            "What happened?",
            "What did adults do and why?",
            "What did the child say, show or communicate?",
            "What changed afterwards?",
            "What needs recording, review, escalation or follow-up?",
        ]
        if "safeguarding_brain" in brains:
            prompts.extend([
                "Who needs to be informed or consulted?",
                "What immediate safety plan or protective action is needed?",
                "Is LADO, social worker, police, health, Ofsted notification or local safeguarding advice potentially relevant?",
                "What evidence must be preserved and what should not be asked in a leading way?",
            ])
        if "recording_quality_brain" in brains:
            prompts.extend([
                "Is the record factual rather than judgemental?",
                "Is the child voice visible?",
                "Is manager oversight/sign-off needed?",
                "Does the record show impact, not just activity?",
            ])
        if "ofsted_brain" in brains or "evidence_graph_brain" in brains:
            prompts.extend([
                "Where is the evidence trail?",
                "What would demonstrate impact, not just activity?",
                "Are actions reviewed and closed with learning?",
                "Would this withstand scrutiny from a Regulation 44 visitor, Regulation 45 review or Ofsted inspector?",
            ])
        if "therapeutic_brain" in brains:
            prompts.extend([
                "What may the behaviour be communicating?",
                "Was there repair after rupture?",
                "Did adults support regulation before consequence?",
            ])
        return self._dedupe(prompts)

    def _reflective_questions(self, brains: list[str], route: str) -> list[str]:
        if route == "general_knowledge":
            return ["Would a concise answer, step-by-step explanation or draft be most useful?"]
        questions = [
            "What might be the child's lived experience of this?",
            "What would safe, curious practice look like next?",
            "What could an adult on shift do now that is calm, boundaried and child-centred?",
        ]
        if "therapeutic_brain" in brains:
            questions.append("What need might sit underneath the behaviour?")
        if "manager_copilot_brain" in brains:
            questions.append("What should leadership know, review and evidence?")
        if "staff_coach_brain" in brains:
            questions.append("What support, learning or debrief might the adult need?")
        if "safeguarding_brain" in brains:
            questions.append("What is known, what is unknown, and what cannot wait?")
        return self._dedupe(questions)

    def _intent_summary(self, text: str, mode: str, brains: list[str], route: str) -> str:
        if route == "general_knowledge":
            return "General knowledge / ChatGPT-style assistant request."
        if "allegation" in text or "lado" in text:
            return "Allegation or staff-conduct safeguarding reflection in a children's home context."
        if "recording_quality_brain" in brains:
            return "Recording quality and professional wording support."
        if "ofsted_brain" in brains:
            return "Ofsted/SCCIF evidence and inspection-readiness reflection."
        if "therapeutic_brain" in brains:
            return "Therapeutic practice and behaviour-as-communication reflection."
        if "safeguarding_brain" in brains:
            return "Safeguarding thinking and safe escalation reflection."
        if mode == "Ask ORB":
            return "General standalone ORB guidance with residential care awareness."
        return f"{mode} support request."

    def _is_safeguarding(self, text: str, mode: str) -> bool:
        terms = (
            "safeguarding", "abuse", "exploitation", "missing", "self harm", "self-harm", "allegation", "lado",
            "harm", "risk", "police", "child protection", "disclosure", "whistleblowing", "concern", "neglect",
            "radicalisation", "county lines", "cse", "criminal exploitation", "sexual exploitation",
        )
        return mode == "Safeguarding Thinking" or any(term in text for term in terms)

    def _is_regulatory(self, text: str, mode: str) -> bool:
        terms = (
            "ofsted", "sccif", "regulation", "quality standard", "reg 44", "reg 45", "reg 40", "inspection",
            "evidence", "lado", "allegation", "notification", "statement of purpose", "workforce plan",
            "registered manager", "responsible individual",
        )
        return mode in {"Ofsted Lens", "Policy Explainer", "Manager Copilot"} or any(term in text for term in terms)

    def _is_recording(self, text: str, mode: str) -> bool:
        terms = (
            "record", "recording", "daily note", "incident", "wording", "write this", "professional", "language",
            "chronology", "keywork", "case note", "log", "manager review", "sign off", "child voice",
        )
        return mode == "Record This Properly" or any(term in text for term in terms)

    def _is_therapeutic(self, text: str, mode: str) -> bool:
        terms = (
            "trauma", "therapeutic", "pace", "repair", "co-regulation", "coregulation", "behaviour", "behavior",
            "dysregulated", "shame", "attachment", "de-escalation", "relationship", "restorative", "containment",
            "meltdown", "trigger", "sensory", "autism", "developmental", "mental health",
        )
        return mode in {"Therapeutic Reframe", "Reflect with ORB", "Staff Coach"} or any(term in text for term in terms)

    def _is_manager(self, text: str, mode: str) -> bool:
        terms = (
            "manager", "leadership", "oversight", "audit", "reg 44", "reg 45", "supervision", "quality assurance",
            "governance", "action plan", "drift", "responsible individual", "provider", "team meeting", "handover",
        )
        return mode == "Manager Copilot" or any(term in text for term in terms)

    def _is_staff_support(self, text: str, mode: str) -> bool:
        terms = (
            "staff", "shift", "debrief", "supervision", "confidence", "wellbeing", "what should i do next time",
            "burnout", "stress", "team", "handover", "probation", "training", "competence", "sleep-in",
        )
        return mode in {"Staff Coach", "Reflect with ORB"} or any(term in text for term in terms)

    def _is_policy(self, text: str, mode: str) -> bool:
        terms = ("policy", "procedure", "guidance", "explain", "what does", "what should", "law", "standard")
        return mode == "Policy Explainer" or any(term in text for term in terms)

    def _is_scenario(self, text: str, mode: str) -> bool:
        terms = ("scenario", "situation", "what if", "young person", "staff member", "child", "home", "on shift")
        return mode == "Scenario Simulator" or any(term in text for term in terms)

    def _is_modern_risk(self, text: str, mode: str) -> bool:
        terms = (
            "phone", "device", "online", "social media", "snapchat", "tiktok", "instagram", "location sharing",
            "grooming", "exploitation", "county lines", "peer risk", "bullying", "sexting", "image sharing",
        )
        return any(term in text for term in terms)

    def _is_transitions(self, text: str, mode: str) -> bool:
        terms = (
            "admission", "move in", "move out", "discharge", "transition", "placement stability", "placement breakdown",
            "matching", "impact risk assessment", "return home", "independence", "semi-independent",
        )
        return any(term in text for term in terms)

    def _is_workforce(self, text: str, mode: str) -> bool:
        terms = (
            "safer recruitment", "dbs", "reference", "staff conduct", "probation", "disciplinary", "training matrix",
            "competency", "agency staff", "rota", "staffing levels", "supervision record",
        )
        return any(term in text for term in terms)

    def _dedupe(self, items: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in items:
            if item in seen:
                continue
            seen.add(item)
            out.append(item)
        return out


orb_standalone_brain_service = OrbStandaloneBrainService()
