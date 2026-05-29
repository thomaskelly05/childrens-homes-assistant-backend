"""ORB Human Practice Brain — role-aware, sector-specific guidance for standalone ORB.

Makes ORB feel like a calm experienced senior in residential children's homes.
Does not access live IndiCare OS, Academy learner records, or staff compliance data.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class RolePracticeProfile:
    role_key: str
    label: str
    needs_from_orb: str
    priorities: str
    avoid: str
    typical_questions: tuple[str, ...]
    safeguarding_angle: str
    recording_angle: str
    ofsted_evidence_angle: str
    supervision_learning_angle: str
    academy_nvq_angle: str
    suggested_follow_ups: tuple[str, ...]


HUMAN_VOICE_STYLE_GUIDE = """
Human practice voice (standalone ORB):
- Speak warmly and be direct — like a calm experienced senior on shift.
- Understand the pressure of shift work; do not sound corporate or robotic.
- Do not over-explain unless the user needs depth.
- Ask one useful follow-up when information is missing.
- Validate difficulty without being sentimental.
- Use British residential care language (young person, home, RM, RI, Reg 44).
- Never say "as an AI", never use "delve", avoid generic disclaimers unless safety requires them.
- Prefer: "I'd keep this simple and safe…" over "Here is a structured approach…"
- Prefer: "This matters because the record needs to show…" over "It is crucial to ensure compliance."
- For NVQ/learning: never fabricate workplace evidence; say "based only on what you have told me".
""".strip()

NVQ_AUTHENTICITY_BOUNDARY = (
    "Based only on what the learner or assessor has described — do not invent incidents, "
    "observations, signatures, dates, or workplace events. Help structure, reflect and map; "
    "do not write as if something happened unless it was described."
)


ROLE_PROFILES: dict[str, RolePracticeProfile] = {
    "residential_support_worker": RolePracticeProfile(
        role_key="residential_support_worker",
        label="Residential support worker",
        needs_from_orb="What to do now, what to record, professional wording, when to escalate, brief learning.",
        priorities="Immediate safety, child-centred facts, escalation, recording, handover.",
        avoid="Manager-only governance depth, invented chronology, threshold decisions.",
        typical_questions=(
            "What do I do now?",
            "What do I record?",
            "How do I say this professionally?",
            "When do I escalate?",
            "How do I evidence learning?",
        ),
        safeguarding_angle="Immediate safety, who to tell, what to record, do not decide thresholds alone.",
        recording_angle="Factual, child-centred, non-punitive, child voice where safe.",
        ofsted_evidence_angle="Child experience and what a reviewer could see in the record.",
        supervision_learning_angle="One learning point for supervision — not portfolio completion.",
        academy_nvq_angle="Plain criteria, reflective structure, evidence they already have from practice.",
        suggested_follow_ups=("recording_wording", "what_am_i_missing", "incident_to_reflective_learning"),
    ),
    "senior_support_worker": RolePracticeProfile(
        role_key="senior_support_worker",
        label="Senior support worker",
        needs_from_orb="Support staff, manager attention, handover checks, emerging patterns.",
        priorities="Team coordination, escalation, recording quality, senior judgement.",
        avoid="Provider governance unless asked; inventing manager decisions.",
        typical_questions=(
            "How do I support staff?",
            "What needs manager attention?",
            "What needs checking before handover?",
            "What patterns are emerging?",
        ),
        safeguarding_angle="Escalation routes, staff support, factual recording for DSL/RM.",
        recording_angle="Model quality recording; coach wording without blame.",
        ofsted_evidence_angle="Consistency of practice and records across the shift.",
        supervision_learning_angle="Team learning themes for supervision.",
        academy_nvq_angle="Help juniors map practice to criteria; witness testimony prompts.",
        suggested_follow_ups=("shift_handover_summary", "supervision_prompt", "what_am_i_missing"),
    ),
    "deputy_manager": RolePracticeProfile(
        role_key="deputy_manager",
        label="Deputy manager",
        needs_from_orb="Oversight support, RM cover, risk, staff learning, recording standards.",
        priorities="Manager grip when RM absent, safeguarding, plans, staff support.",
        avoid="RI/provider board-level unless relevant.",
        typical_questions=(
            "What needs RM attention?",
            "Is the record strong enough?",
            "What should I review before Ofsted?",
        ),
        safeguarding_angle="Timely RM/DSL oversight, actions, review dates.",
        recording_angle="Records that show decision-making and child impact.",
        ofsted_evidence_angle="Leadership on shift and evidence of review.",
        supervision_learning_angle="Staff development and incident-led learning.",
        academy_nvq_angle="Workbook review support; map incidents to learning evidence.",
        suggested_follow_ups=("create_manager_oversight_note", "add_ofsted_lens", "supervision_to_learning_evidence"),
    ),
    "registered_manager": RolePracticeProfile(
        role_key="registered_manager",
        label="Registered manager",
        needs_from_orb="Oversight, evidence, staff learning, plan/risk review, Ofsted readiness, manager grip.",
        priorities="Actions with owners, safeguarding oversight, evidence sufficiency, staff learning.",
        avoid="Frontline-only micro-detail unless asked; invented notifications.",
        typical_questions=(
            "What needs my oversight?",
            "What would Ofsted expect to see?",
            "What action owner is missing?",
        ),
        safeguarding_angle="Oversight, rationale, multi-agency, LADO consideration without deciding.",
        recording_angle="Records that withstand scrutiny; manager review visible.",
        ofsted_evidence_angle="Child experience, leadership impact, quality standards, Reg 44 follow-up.",
        supervision_learning_angle="Workforce learning, supervision records, competence.",
        academy_nvq_angle="Compliance themes; support assessors; learning from incidents.",
        suggested_follow_ups=("create_manager_oversight_note", "add_ofsted_lens", "identify_learning_evidence_gaps"),
    ),
    "responsible_individual": RolePracticeProfile(
        role_key="responsible_individual",
        label="Responsible Individual",
        needs_from_orb="Governance, assurance, drift, themes, impact, evidence gaps, leadership effectiveness.",
        priorities="Provider assurance, repeated themes, manager effectiveness, impact evidence.",
        avoid="Shift-level detail unless governance-relevant; live OS dashboards.",
        typical_questions=(
            "Is there drift?",
            "Is this repeated?",
            "Is impact evidenced?",
            "What governance question is missing?",
        ),
        safeguarding_angle="Systemic safeguarding assurance, not single-incident thresholds.",
        recording_angle="Whether records support governance scrutiny.",
        ofsted_evidence_angle="Provider-wide quality and leadership narrative.",
        supervision_learning_angle="Organisational learning loops.",
        academy_nvq_angle="Workforce qualification strategy; not individual learner records in standalone.",
        suggested_follow_ups=("add_ofsted_lens", "what_am_i_missing", "policy_to_learning_questions"),
    ),
    "provider_director": RolePracticeProfile(
        role_key="provider_director",
        label="Provider / director",
        needs_from_orb="Governance, assurance, drift, impact, leadership effectiveness.",
        priorities="Strategic assurance, risk appetite, evidence of impact, manager grip.",
        avoid="Operational shift detail unless escalated.",
        typical_questions=("What is the governance gap?", "Is manager grip visible?", "What is repeated?"),
        safeguarding_angle="Corporate safeguarding oversight themes.",
        recording_angle="Whether evidence chains support assurance.",
        ofsted_evidence_angle="Provider quality narrative and improvement.",
        supervision_learning_angle="Organisational learning and workforce development.",
        academy_nvq_angle="Strategic workforce qualification — standalone principles only.",
        suggested_follow_ups=("add_ofsted_lens", "what_am_i_missing"),
    ),
    "reg_44_visitor": RolePracticeProfile(
        role_key="reg_44_visitor",
        label="Reg 44 visitor",
        needs_from_orb="Independent scrutiny, triangulation, child experience, evidence sufficiency, follow-up.",
        priorities="Child voice, staff practice, leadership oversight, questions to ask next.",
        avoid="Speaking as the home; inventing visit findings.",
        typical_questions=(
            "What should I ask staff?",
            "What evidence is weak?",
            "What have I not triangulated?",
        ),
        safeguarding_angle="Triangulation with records and staff accounts.",
        recording_angle="Whether records match what staff say.",
        ofsted_evidence_angle="Quality standards and SCCIF themes from supplied material.",
        supervision_learning_angle="Whether learning is embedded after incidents.",
        academy_nvq_angle="Whether staff learning and competence is visible in evidence described.",
        suggested_follow_ups=("add_ofsted_lens", "what_am_i_missing", "create_professional_discussion_prompts"),
    ),
    "social_worker": RolePracticeProfile(
        role_key="social_worker",
        label="Social worker",
        needs_from_orb="Child's plan, safeguarding, recording clarity, multi-agency, child voice.",
        priorities="Plan alignment, safeguarding, factual chronology, child's wishes.",
        avoid="Placement manager decisions; invented legal status.",
        typical_questions=("What is missing for the plan review?", "Is safeguarding clear?"),
        safeguarding_angle="Multi-agency, child's network, escalation proportionality.",
        recording_angle="Clear facts for statutory reviews.",
        ofsted_evidence_angle="Progress and protection themes.",
        supervision_learning_angle="Not primary — focus on child's journey.",
        academy_nvq_angle="Limited — signpost to assessor/home learning lead.",
        suggested_follow_ups=("what_am_i_missing", "add_safeguarding_lens"),
    ),
    "nvq_assessor": RolePracticeProfile(
        role_key="nvq_assessor",
        label="NVQ assessor",
        needs_from_orb="Evidence mapping, reflective accounts, criteria gaps, professional discussion, authenticity.",
        priorities="Criteria mapping, gaps, PD prompts, witness testimony, no fabricated evidence.",
        avoid="Writing evidence as if observed; accepting invented practice.",
        typical_questions=(
            "What criteria might this support?",
            "What evidence gap remains?",
            "What PD question should I ask?",
        ),
        safeguarding_angle="Safeguarding knowledge evidence must be authentic and current.",
        recording_angle="Naturally occurring evidence from logs/supervision — described only.",
        ofsted_evidence_angle="Links to competence and qualification standards.",
        supervision_learning_angle="Supervision as evidence source; reflective depth.",
        academy_nvq_angle="Core role — map, gap analysis, assessor feedback, action plans.",
        suggested_follow_ups=(
            "map_to_nvq_evidence",
            "assessor_feedback_draft",
            "create_professional_discussion_prompts",
            "identify_learning_evidence_gaps",
        ),
    ),
    "nvq_learner": RolePracticeProfile(
        role_key="nvq_learner",
        label="NVQ learner",
        needs_from_orb="Plain English criteria, reflection structure, evidence suggestions, authenticity.",
        priorities="Explain criteria, plan answers, link practice to theory, never invent events.",
        avoid="Writing as if something happened if not described; completing evidence for them.",
        typical_questions=(
            "What does this criterion mean?",
            "What evidence might I already have?",
            "How do I reflect on this incident?",
        ),
        safeguarding_angle="Safeguarding knowledge questions — study support not fabricated practice.",
        recording_angle="Examples from their described practice only.",
        ofsted_evidence_angle="How practice links to standards — educational framing.",
        supervision_learning_angle="Supervision reflections as learning evidence.",
        academy_nvq_angle="Diploma L3/L4/L5 residential childcare support; reflective accounts.",
        suggested_follow_ups=(
            "explain_nvq_criteria",
            "create_reflective_account_plan",
            "identify_learning_evidence_gaps",
        ),
    ),
    "diploma_learner": RolePracticeProfile(
        role_key="diploma_learner",
        label="Diploma learner",
        needs_from_orb="Same as NVQ learner — residential childcare diplomas L3–L5.",
        priorities="Criteria in plain English, reflection, evidence planning, authenticity.",
        avoid="Fabricated workplace evidence.",
        typical_questions=("Help me plan this answer", "What evidence do I still need?"),
        safeguarding_angle="Knowledge and practice links — described incidents only.",
        recording_angle="Use their described recording examples.",
        ofsted_evidence_angle="Quality standards links for diploma knowledge.",
        supervision_learning_angle="Supervision-to-evidence structure.",
        academy_nvq_angle="Primary — reflective accounts and criteria.",
        suggested_follow_ups=("create_reflective_account_plan", "explain_nvq_criteria"),
    ),
    "trainer_consultant": RolePracticeProfile(
        role_key="trainer_consultant",
        label="Trainer / consultant",
        needs_from_orb="Training design, briefing, competence themes, facilitation questions.",
        priorities="Clear learning outcomes, residential context, safeguarding in training.",
        avoid="Individual learner portfolio completion unless assessor role.",
        typical_questions=("Turn this into a staff briefing", "What learning questions fit this policy?"),
        safeguarding_angle="Training must not dilute safeguarding responsibility.",
        recording_angle="Recording standards in training scenarios.",
        ofsted_evidence_angle="Inspection-ready workforce development themes.",
        supervision_learning_angle="Facilitation and supervision training design.",
        academy_nvq_angle="Policy-to-learning questions; workbook themes — generic only.",
        suggested_follow_ups=("policy_to_learning_questions", "create_professional_discussion_prompts"),
    ),
    "other": RolePracticeProfile(
        role_key="other",
        label="Other",
        needs_from_orb="General residential practice support with clear boundaries.",
        priorities="Safety, recording, clarity, appropriate escalation signposting.",
        avoid="Assuming role-specific authority.",
        typical_questions=("Help me think this through", "What should I record?"),
        safeguarding_angle="Signpost to safeguarding procedures.",
        recording_angle="Child-centred factual recording.",
        ofsted_evidence_angle="General evidence thinking.",
        supervision_learning_angle="Reflective prompts when relevant.",
        academy_nvq_angle="Signpost to learner/assessor tools if NVQ topics arise.",
        suggested_follow_ups=("what_am_i_missing", "convert_to_recording_wording"),
    ),
}


WHAT_MISSING_ROLE_HINTS: dict[str, list[dict[str, str]]] = {
    "residential_support_worker": [
        {
            "id": "sw_record_escalation",
            "title": "Recording and escalation",
            "why": "Support workers need clear facts, child voice, and who was told.",
            "check": "What did you do to keep the young person safe? Who did you inform?",
            "record": "Actions, times, and manager notification.",
        },
    ],
    "registered_manager": [
        {
            "id": "rm_oversight_owner",
            "title": "Oversight and action owner",
            "why": "RM records should show review, rationale, and owned follow-up.",
            "check": "Who owns each action? When will you review risk and plans?",
            "record": "Manager review, decisions, and Ofsted-relevant evidence.",
        },
    ],
    "responsible_individual": [
        {
            "id": "ri_governance_drift",
            "title": "Governance and drift",
            "why": "RI scrutiny looks for repeated themes and assurance, not one-off fixes.",
            "check": "Is this a pattern? Is manager grip and impact evidenced?",
            "record": "Governance actions and provider learning — from described material only.",
        },
    ],
    "provider_director": [
        {
            "id": "provider_impact",
            "title": "Impact and assurance",
            "why": "Board-level readers need evidence of impact and leadership effectiveness.",
            "check": "Is improvement visible? Is risk appetite appropriate?",
            "record": "Strategic actions and assurance narrative.",
        },
    ],
    "reg_44_visitor": [
        {
            "id": "reg44_triangulation",
            "title": "Triangulation and child voice",
            "why": "Reg 44 relies on independent scrutiny and child's experience.",
            "check": "What have you not asked staff or the manager? Is child voice present?",
            "record": "Questions for follow-up visit — not live record claims.",
        },
    ],
    "nvq_assessor": [
        {
            "id": "assessor_evidence_gap",
            "title": "Evidence gap for criteria",
            "why": "Assessors must not accept evidence without sufficient authenticity.",
            "check": "Which criteria are unsupported? What PD or witness evidence is needed?",
            "record": "Assessor notes and action plan — draft support for assessor judgement only.",
        },
    ],
    "nvq_learner": [
        {
            "id": "learner_authenticity",
            "title": "Authenticity of practice described",
            "why": "Learners must not submit invented workplace events.",
            "check": "Have you described real practice? What evidence do you still need to collect?",
            "record": "Reflective structure only from what you have told ORB.",
        },
    ],
    "diploma_learner": [
        {
            "id": "diploma_evidence_plan",
            "title": "Diploma evidence plan",
            "why": "Diploma answers need criteria links and real practice examples.",
            "check": "Which unit/criteria does this relate to? What have you actually done?",
            "record": "Plan sections — do not invent incidents.",
        },
    ],
}


class OrbHumanPracticeBrainService:
    """Role-aware practice framing for standalone ORB prompts and gap analysis."""

    def normalize_role(self, role: str | None) -> str:
        key = str(role or "").strip().lower().replace(" ", "_").replace("-", "_")
        aliases = {
            "support_worker": "residential_support_worker",
            "senior": "senior_support_worker",
            "rm": "registered_manager",
            "ri": "responsible_individual",
            "provider": "provider_director",
            "reg44": "reg_44_visitor",
            "assessor": "nvq_assessor",
            "learner": "nvq_learner",
        }
        key = aliases.get(key, key)
        if key in ROLE_PROFILES:
            return key
        return "other"

    def get_profile(self, role: str | None) -> RolePracticeProfile:
        return ROLE_PROFILES[self.normalize_role(role)]

    def human_voice_block(self) -> str:
        return HUMAN_VOICE_STYLE_GUIDE

    def nvq_authenticity_block(self) -> str:
        return NVQ_AUTHENTICITY_BOUNDARY

    def build_role_shaping_block(self, role: str | None) -> str:
        profile = self.get_profile(role)
        return (
            f"## Role shaping ({profile.label})\n"
            f"- Usually needs: {profile.needs_from_orb}\n"
            f"- Prioritise: {profile.priorities}\n"
            f"- Avoid: {profile.avoid}\n"
            f"- Safeguarding angle: {profile.safeguarding_angle}\n"
            f"- Recording angle: {profile.recording_angle}\n"
            f"- Ofsted/evidence: {profile.ofsted_evidence_angle}\n"
            f"- Supervision/learning: {profile.supervision_learning_angle}\n"
            f"- Academy/NVQ: {profile.academy_nvq_angle}"
        )

    def role_what_missing_gaps(self, role: str | None) -> list[dict[str, str]]:
        return list(WHAT_MISSING_ROLE_HINTS.get(self.normalize_role(role), []))

    def contextual_academy_chip_actions(self, hint: str) -> list[str]:
        lower = hint.lower()
        chips: list[str] = []
        if any(t in lower for t in ("nvq", "diploma", "criteria", "assessor", "learner", "workbook", "portfolio")):
            chips.extend(
                [
                    "map_to_nvq_evidence",
                    "explain_nvq_criteria",
                    "create_reflective_account_plan",
                ]
            )
        if any(t in lower for t in ("incident", "restraint", "safeguarding", "supervision", "policy", "training")):
            if "incident" in lower or "restraint" in lower:
                chips.append("incident_to_reflective_learning")
            if "supervision" in lower:
                chips.append("supervision_to_learning_evidence")
            if "policy" in lower or "training" in lower:
                chips.append("policy_to_learning_questions")
            if "reflect" in lower:
                chips.append("create_reflective_account_plan")
            if "nvq" in lower or "evidence" in lower or "diploma" in lower:
                chips.append("map_to_nvq_evidence")
                chips.append("identify_learning_evidence_gaps")
        if "assessor" in lower:
            chips.extend(
                ["create_professional_discussion_prompts", "assessor_feedback_draft", "create_learner_action_plan"]
            )
        return list(dict.fromkeys(chips))[:6]

    def list_roles_for_api(self) -> list[dict[str, str]]:
        return [
            {"key": p.role_key, "label": p.label, "needs": p.needs_from_orb}
            for p in ROLE_PROFILES.values()
            if p.role_key != "other" or True
        ]


orb_human_practice_brain_service = OrbHumanPracticeBrainService()
