from __future__ import annotations

import re
from functools import lru_cache
from typing import Iterable

from schemas.document_templates import DocumentScope, DocumentSectionTemplate, DocumentTemplate


CHILD_VOICE_PROMPTS = [
    "What mattered to the child?",
    "How did the child experience this?",
    "What support helped?",
    "What changed emotionally?",
    "What strengths were seen?",
    "What relationships supported progress?",
    "How was the child's voice included?",
    "What should adults reflect on?",
    "What has improved from the child's starting point?",
    "What still needs support?",
    "What should the next adults know?",
]

THERAPEUTIC_GUIDANCE = [
    "Write with curiosity before certainty.",
    "Describe behaviour as communication and avoid punitive phrasing.",
    "Name strengths, relationships and progress from the child's starting point.",
    "Separate observed facts from professional reflection.",
    "Do not make safeguarding conclusions without cited evidence and manager oversight.",
]

CHILD_TEMPLATES = [
    "Care Plan",
    "Placement Plan",
    "Matching Assessment",
    "Impact Risk Assessment",
    "Individual Risk Assessment",
    "Missing From Care Protocol",
    "Positive Behaviour Support Plan",
    "Education Plan",
    "Health Plan",
    "Medication Plan",
    "Family Contact Plan",
    "Independence Plan",
    "Online Safety Plan",
    "Self-Harm Risk Assessment",
    "Safety Plan",
    "Keywork Plan",
    "Emotional Wellbeing Plan",
    "CSE/CCE Risk Assessment",
    "Bullying/Peer Relationship Plan",
]

HOME_TEMPLATES = [
    "Statement of Purpose",
    "Children's Guide",
    "Locality Risk Assessment",
    "Safeguarding Policy",
    "Missing Child Policy",
    "Behaviour Management Policy",
    "Restraint Policy",
    "Complaints Policy",
    "Whistleblowing Policy",
    "Medication Policy",
    "Admissions Policy",
    "Equality & Diversity Policy",
    "Data Protection Policy",
    "Online Safety Policy",
    "Business Continuity Plan",
    "Fire Risk Assessment",
    "Health & Safety Risk Assessment",
    "Workforce Development Plan",
    "Quality Assurance Calendar",
    "Reg 44 Report",
    "Reg 45 Review",
    "Ofsted Action Plan",
]

STAFF_TEMPLATES = [
    "Supervision Record",
    "Appraisal",
    "Induction",
    "Probation",
    "Training Matrix",
    "Competency Assessment",
    "Safer Recruitment Checklist",
    "DBS Tracking",
    "Staff Development Plan",
]


def slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.lower()).strip("_")


def _section(title: str, purpose: str, prompts: Iterable[str], *, required: bool = True) -> DocumentSectionTemplate:
    return DocumentSectionTemplate(
        section_id=slug(title),
        title=title,
        purpose=purpose,
        prompts=list(prompts),
        required=required,
        therapeutic_guidance=THERAPEUTIC_GUIDANCE if required else THERAPEUTIC_GUIDANCE[:2],
    )


def _child_sections(title: str) -> list[DocumentSectionTemplate]:
    risk_prompts = [
        "What is known from recent daily notes, incidents, safeguarding or missing episodes?",
        "Which protective adults, routines or places reduce risk?",
        "What should staff do first, next and if concern increases?",
    ]
    return [
        _section("Child voice and wishes", "Record the child's words, preferences, worries and hopes.", CHILD_VOICE_PROMPTS[:6]),
        _section("Story and starting point", "Explain the child's context without blame or adult-centred shorthand.", CHILD_VOICE_PROMPTS[6:]),
        _section("Strengths, relationships and what helps", "Show protective relationships, strengths and regulation support.", ["What has helped before?", "Who does the child trust?", "What helps the child feel safe?"]),
        _section("Current needs, risks and support", "Translate needs and risks into practical adult responses.", risk_prompts),
        _section("Actions, evidence and review", "Link actions, chronology, evidence and manager review.", ["What evidence supports this?", "What follow-up is still open?", "When should this be reviewed?"]),
    ]


def _home_sections(title: str) -> list[DocumentSectionTemplate]:
    return [
        _section("Purpose and child impact", "Explain how this document improves children's experiences and safety.", ["What changes for children because this document exists?", "How will staff know it is working?"]),
        _section("Practice expectations", "Set out clear expectations for staff and leaders.", ["What must happen in day-to-day practice?", "What must be escalated?"]),
        _section("Evidence and oversight", "Show linked evidence, review ownership and QA checks.", ["What evidence must be sampled?", "Who reviews this and when?"]),
        _section("Actions and inspection readiness", "Connect improvement actions, review history and Ofsted/SCCIF evidence.", ["What action is open?", "What would an inspector need to understand quickly?"]),
    ]


def _staff_sections(title: str) -> list[DocumentSectionTemplate]:
    return [
        _section("Reflective practice", "Support honest, psychologically safe reflection on practice.", ["What went well?", "What felt difficult?", "What learning is emerging?"]),
        _section("Wellbeing, support and accountability", "Record support needs, agreed actions and appropriate accountability.", ["What support is needed?", "What action is agreed?", "What should be followed up?"]),
        _section("Development evidence", "Link supervision, training, competency and development evidence.", ["What evidence shows progress?", "What training or mentoring is needed?"]),
        _section("Sign-off and next review", "Confirm review ownership, signatures and next review date.", ["Who signs this?", "When is the next review?", "What remains confidential?"]),
    ]


def _category(title: str, scope: DocumentScope) -> str:
    text = title.lower()
    if scope == DocumentScope.CHILD and "risk" in text:
        return "risk_assessment"
    if scope == DocumentScope.CHILD and "plan" in text:
        return "child_plan"
    if scope == DocumentScope.HOME and ("policy" in text or "purpose" in text or "guide" in text):
        return "home_policy"
    if scope == DocumentScope.HOME and ("reg " in text or "ofsted" in text or "quality" in text):
        return "inspection_readiness"
    if scope == DocumentScope.STAFF:
        return "staff_confidential"
    return f"{scope.value}_document"


def _frequency(title: str, scope: DocumentScope) -> str:
    text = title.lower()
    if "reg 44" in text:
        return "monthly"
    if "reg 45" in text:
        return "six-monthly"
    if "risk" in text or "missing" in text or "self-harm" in text or "safety" in text:
        return "monthly or after significant event"
    if scope == DocumentScope.STAFF and ("supervision" in text):
        return "monthly"
    return "annual or when circumstances change"


def _regulations(title: str, scope: DocumentScope) -> list[str]:
    text = title.lower()
    if "reg 44" in text:
        return ["Children's Homes Regulations 2015 Regulation 44"]
    if "reg 45" in text:
        return ["Children's Homes Regulations 2015 Regulation 45"]
    if scope == DocumentScope.STAFF:
        return ["Regulation 32", "Regulation 33"]
    if "safeguarding" in text or "missing" in text or "risk" in text or "safety" in text:
        return ["Regulation 12", "Regulation 13"]
    return ["Children's Homes Regulations 2015", "The Children Act 1989 care planning framework"]


def _make_template(title: str, scope: DocumentScope) -> DocumentTemplate:
    required = _child_sections(title) if scope == DocumentScope.CHILD else _home_sections(title) if scope == DocumentScope.HOME else _staff_sections(title)
    template_id = f"{scope.value}_{slug(title)}"
    return DocumentTemplate(
        template_id=template_id,
        title=title,
        category=_category(title, scope),
        scope=scope,
        description=f"Operational {title.lower()} workspace with editable sections, evidence links, review, sign-off and audit-ready history.",
        review_frequency=_frequency(title, scope),
        owner_role="key worker / registered manager" if scope == DocumentScope.CHILD else "registered manager / responsible individual" if scope == DocumentScope.HOME else "registered manager / supervisor",
        required_sections=required,
        optional_sections=[
            _section("Appendix: chronology and evidence", "Optional linked chronology, evidence, actions and review appendix.", ["Which linked records should appear in the appendix?"], required=False),
            _section("Orb drafting notes", "Optional assistant suggestions that must be accepted by a human before saving.", ["Which suggestion was accepted, declined or needs manager review?"], required=False),
        ],
        regulatory_links=_regulations(title, scope),
        quality_standard_links=["Quality Standards: children's views, wishes and feelings", "Quality Standards: protection of children", "Quality Standards: leadership and management"],
        sccif_links=["experiences and progress", "help and protection", "leadership and management"],
        evidence_requirements=["linked chronology entries", "linked evidence records", "linked actions with owners", "review history", "signature/sign-off where required"],
        signoff_requirements=["author confirms evidence is accurate", "manager QA review", "responsible person sign-off for regulatory documents" if scope == DocumentScope.HOME else "manager sign-off before approval"],
        export_profile={"print_html": True, "pdf": False, "appendices": ["chronology", "evidence", "review_history", "signatures"], "watermark": "Confidential care record"},
        orb_prompt_pack=[
            "strengthen child voice" if scope == DocumentScope.CHILD else "prepare for manager review",
            "make this more reflective",
            "identify missing follow-up",
            "show evidence gaps",
            "summarise chronology themes",
        ],
        child_voice_prompts=CHILD_VOICE_PROMPTS if scope == DocumentScope.CHILD else [],
        therapeutic_guidance=THERAPEUTIC_GUIDANCE if scope == DocumentScope.CHILD else ["Keep wording specific, evidence-led and supportive.", "Use review language, not blame language."],
        inspection_relevance="Shows editable, scoped, evidence-linked practice with review history, leadership oversight and inspection-ready appendices.",
    )


class DocumentTemplateService:
    """Template registry for real editable operational documents."""

    @lru_cache(maxsize=1)
    def templates(self) -> tuple[DocumentTemplate, ...]:
        return tuple(
            [_make_template(title, DocumentScope.CHILD) for title in CHILD_TEMPLATES]
            + [_make_template(title, DocumentScope.HOME) for title in HOME_TEMPLATES]
            + [_make_template(title, DocumentScope.STAFF) for title in STAFF_TEMPLATES]
        )

    def list_templates(self, *, scope: str | None = None, category: str | None = None) -> list[DocumentTemplate]:
        items = list(self.templates())
        if scope:
            items = [item for item in items if item.scope.value == scope]
        if category:
            items = [item for item in items if item.category == category]
        return items

    def get_template(self, template_id: str) -> DocumentTemplate:
        for template in self.templates():
            if template.template_id == template_id:
                return template
        raise KeyError(f"Unknown document template: {template_id}")

    def blank_sections(self, template_id: str) -> dict[str, str]:
        template = self.get_template(template_id)
        return {section.section_id: "" for section in [*template.required_sections, *template.optional_sections]}


document_template_service = DocumentTemplateService()
