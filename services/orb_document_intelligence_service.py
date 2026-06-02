"""ORB Document Intelligence — converged lenses for standalone document analysis.

Wraps ``orb_document_understanding_service``, Reg 44 extraction (from report reader
heuristics), and structured policy/action outputs. No live IndiCare OS record access.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from schemas.orb_document_intelligence import (
    OrbDocumentIntelligenceAction,
    OrbDocumentIntelligenceData,
    OrbDocumentIntelligenceRequest,
    OrbDocumentIntelligenceResponse,
    OrbDocumentIntelligenceSection,
    OrbDocumentLens,
)
from schemas.orb_documents import OrbDocumentAnalysisRequest, OrbDocumentUnderstanding
from services.orb_document_understanding_service import (
    STANDALONE_DOCUMENT_SAFETY,
    orb_document_understanding_service,
)
from services.orb_knowledge_library_service import orb_knowledge_library_service
from services.orb_expert_answer_engine_service import orb_expert_answer_engine_service
from services.orb_brain_metadata_service import build_brain_metadata
from services.orb_reg44_document_extraction import NOT_STATED, extract_reg44_report

logger = logging.getLogger("indicare.orb_document_intelligence")

LENS_REGISTRY: dict[str, dict[str, Any]] = {
    "summary": {
        "id": "summary",
        "label": "Summary",
        "description": "Concise summary of the supplied document.",
        "residential_purpose": "Quick orientation for busy staff.",
        "output_structure": "summary + key themes",
        "safety_level": "low",
        "recommended_vaults": ("Recording Quality Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "summarise",
    },
    "explain": {
        "id": "explain",
        "label": "Explain",
        "description": "Plain-English explanation with practice meaning.",
        "residential_purpose": "Help staff understand what the document means in practice.",
        "output_structure": "summary + key points + implications",
        "safety_level": "low",
        "recommended_vaults": ("Recording Quality Vault", "Therapeutic Vault"),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "explain",
    },
    "actions": {
        "id": "actions",
        "label": "Action plan",
        "description": "Structured draft actions from the document (not OS tasks).",
        "residential_purpose": "Turn document content into follow-up work.",
        "output_structure": "immediate / short-term / governance actions",
        "safety_level": "medium",
        "recommended_vaults": ("Leadership/Governance Vault", "Safeguarding Vault"),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "action_plan",
    },
    "policy_card": {
        "id": "policy_card",
        "label": "Policy Card",
        "description": "Policy Card Generator — staff-facing card from uploaded policy text only.",
        "residential_purpose": "Translate policy into shift-ready guidance.",
        "output_structure": "policy_card sections",
        "safety_level": "medium",
        "recommended_vaults": ("Recording Quality Vault", "Safeguarding Vault", "Ofsted/SCCIF Vault"),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
    },
    "reg44": {
        "id": "reg44",
        "label": "Reg 44 extraction",
        "description": "Extract themes, actions and oversight points from a Reg 44 visit report.",
        "residential_purpose": "Support manager and RI response to independent visitor reports.",
        "output_structure": "reg44 structured extraction",
        "safety_level": "high",
        "recommended_vaults": ("Leadership/Governance Vault", "Ofsted/SCCIF Vault"),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
    },
    "reg45": {
        "id": "reg45",
        "label": "Reg 45 reflection",
        "description": "Provider quality-of-care learning lens on supplied evidence text.",
        "residential_purpose": "Support Reg 45 reflection from visitor or audit material.",
        "output_structure": "governance + learning sections",
        "safety_level": "high",
        "recommended_vaults": ("Leadership/Governance Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "manager_briefing",
    },
    "ofsted": {
        "id": "ofsted",
        "label": "Ofsted lens",
        "description": "Child experience, evidence, leadership — no grade prediction.",
        "residential_purpose": "Inspection-ready evidence thinking.",
        "output_structure": "SCCIF-aligned sections",
        "safety_level": "medium",
        "recommended_vaults": ("Ofsted/SCCIF Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "ofsted_lens",
    },
    "safeguarding": {
        "id": "safeguarding",
        "label": "Safeguarding lens",
        "description": "Safeguarding reflection with escalation reminder.",
        "residential_purpose": "Structured safeguarding thinking without threshold decisions.",
        "output_structure": "safety + facts + gaps + escalation",
        "safety_level": "critical",
        "recommended_vaults": ("Safeguarding Vault", "Recording Quality Vault"),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "safeguarding_lens",
    },
    "recording_quality": {
        "id": "recording_quality",
        "label": "Recording quality review",
        "description": "Recording quality and child-centred evidence lens.",
        "residential_purpose": "Improve logs and chronology evidence.",
        "output_structure": "recording standards + gaps",
        "safety_level": "medium",
        "recommended_vaults": ("Recording Quality Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "recording_lens",
    },
    "manager_oversight": {
        "id": "manager_oversight",
        "label": "Manager briefing",
        "description": "Manager briefing: risks, decisions, actions from document only.",
        "residential_purpose": "RM grip without live OS records.",
        "output_structure": "manager briefing",
        "safety_level": "high",
        "recommended_vaults": ("Leadership/Governance Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "manager_briefing",
    },
    "ri_governance": {
        "id": "ri_governance",
        "label": "RI / provider briefing",
        "description": "RI and provider oversight reflection from supplied document.",
        "residential_purpose": "Governance learning and assurance.",
        "output_structure": "governance sections",
        "safety_level": "high",
        "recommended_vaults": ("Leadership/Governance Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "manager_briefing",
    },
    "staff_briefing": {
        "id": "staff_briefing",
        "label": "Staff briefing",
        "description": "Practical staff briefing from the document.",
        "residential_purpose": "Shift-ready guidance for care staff.",
        "output_structure": "briefing + questions",
        "safety_level": "low",
        "recommended_vaults": ("Recording Quality Vault", "Therapeutic Vault"),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "staff_briefing",
    },
    "supervision": {
        "id": "supervision",
        "label": "Supervision questions",
        "description": "Reflective supervision prompts from the document.",
        "residential_purpose": "Prepare supervision discussions.",
        "output_structure": "question list",
        "safety_level": "medium",
        "recommended_vaults": ("Leadership/Governance Vault", "Therapeutic Vault"),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "full_review",
    },
    "checklist": {
        "id": "checklist",
        "label": "Audit checklist",
        "description": "Practical checklist derived from the document.",
        "residential_purpose": "Audit and embed practice.",
        "output_structure": "checklist items",
        "safety_level": "low",
        "recommended_vaults": ("Recording Quality Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "action_plan",
    },
    "what_is_missing": {
        "id": "what_is_missing",
        "label": "What is missing?",
        "description": "Gaps, missing evidence and follow-up questions.",
        "residential_purpose": "Professional curiosity before sign-off.",
        "output_structure": "gaps + questions",
        "safety_level": "high",
        "recommended_vaults": ("Recording Quality Vault", "Safeguarding Vault"),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "full_review",
    },
    "nvq_evidence_map": {
        "id": "nvq_evidence_map",
        "label": "NVQ evidence map",
        "description": "Map supplied text to possible criteria/themes — no invented practice.",
        "residential_purpose": "Assessor/learner evidence mapping from uploaded text only.",
        "output_structure": "criteria + gaps + authenticity",
        "safety_level": "medium",
        "recommended_vaults": ("NVQ Diploma Support Vault", "Qualification Evidence Vault"),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "full_review",
    },
    "reflective_account_plan": {
        "id": "reflective_account_plan",
        "label": "Reflective account plan",
        "description": "Structure reflective account sections from supplied text only.",
        "residential_purpose": "Learner reflective writing support.",
        "output_structure": "reflective sections + authenticity",
        "safety_level": "medium",
        "recommended_vaults": ("Reflective Practice Learning Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "full_review",
    },
    "assessor_feedback": {
        "id": "assessor_feedback",
        "label": "Assessor feedback",
        "description": "Draft assessor feedback — support for assessor judgement only.",
        "residential_purpose": "NVQ assessor draft feedback from supplied evidence text.",
        "output_structure": "strengths + gaps + PD questions",
        "safety_level": "medium",
        "recommended_vaults": ("NVQ Diploma Support Vault", "Qualification Evidence Vault"),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "full_review",
    },
    "professional_discussion_prompts": {
        "id": "professional_discussion_prompts",
        "label": "Professional discussion prompts",
        "description": "PD prompts from supplied criteria or evidence text.",
        "residential_purpose": "Prepare professional discussion without inventing practice.",
        "output_structure": "question list",
        "safety_level": "medium",
        "recommended_vaults": ("NVQ Diploma Support Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "full_review",
    },
    "witness_testimony_prompt": {
        "id": "witness_testimony_prompt",
        "label": "Witness testimony prompt",
        "description": "Witness testimony focus from supplied practice description.",
        "residential_purpose": "Identify witness scope and questions.",
        "output_structure": "witness prompts",
        "safety_level": "low",
        "recommended_vaults": ("Qualification Evidence Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "full_review",
    },
    "learning_action_plan": {
        "id": "learning_action_plan",
        "label": "Learning action plan",
        "description": "Action plan for collecting missing authentic evidence.",
        "residential_purpose": "Learner/assessor evidence collection planning.",
        "output_structure": "action plan",
        "safety_level": "low",
        "recommended_vaults": ("Academy Learning Vault", "Workforce Development Vault"),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "action_plan",
    },
    "workbook_summary": {
        "id": "workbook_summary",
        "label": "Workbook summary",
        "description": "Summarise workbook or assignment text for learning themes.",
        "residential_purpose": "Orientation on workbook content supplied by user.",
        "output_structure": "summary + themes",
        "safety_level": "low",
        "recommended_vaults": ("Academy Learning Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "summarise",
    },
    "qualification_criteria_explainer": {
        "id": "qualification_criteria_explainer",
        "label": "Criteria explainer",
        "description": "Plain-English criteria explanation from supplied criteria text.",
        "residential_purpose": "Help learners understand assessor expectations.",
        "output_structure": "criteria explanation",
        "safety_level": "low",
        "recommended_vaults": ("NVQ Diploma Support Vault",),
        "standalone_boundary": STANDALONE_DOCUMENT_SAFETY,
        "understanding_mode": "explain",
    },
}


def _text(value: Any) -> str:
    return str(value or "").strip()


def detect_document_kind(text: str, title: str = "") -> str:
    """Heuristic document type for contextual UI actions."""
    combined = f"{title} {text}".lower()
    if any(
        term in combined
        for term in (
            "regulation 44",
            "reg 44",
            "reg44",
            "independent visitor",
            "visitor report",
            "monthly visit",
        )
    ):
        return "reg44"
    if any(term in combined for term in ("policy", "procedure", "guidance", "staff must", "escalat")):
        return "policy"
    if any(
        term in combined
        for term in ("incident", "daily note", "recording", "chronology", "safeguarding concern")
    ):
        return "incident_record"
    return "general"


class OrbDocumentIntelligenceService:
    """Single interface for ORB document intelligence lenses."""

    def _with_brain_metadata(
        self,
        data: OrbDocumentIntelligenceData,
        *,
        request: OrbDocumentIntelligenceRequest,
    ) -> OrbDocumentIntelligenceData:
        brain = build_brain_metadata(
            surface="orb_residential",
            mode=request.mode,
            lens=data.lens,
            feature="document_intelligence",
            sources=data.sources,
        )
        return data.model_copy(update={"brain_metadata": brain})

    def _apply_standalone_envelope(
        self,
        data: OrbDocumentIntelligenceData,
        *,
        request: OrbDocumentIntelligenceRequest,
        source_title: str,
    ) -> OrbDocumentIntelligenceData:
        """Normalize structured document output fields for all lenses."""
        risks = list(dict.fromkeys(data.missing_information or []))
        if data.policy_card:
            for gap in data.policy_card.get("missing_information") or []:
                if gap and gap not in risks:
                    risks.append(str(gap))

        suggested: list[str] = []
        for action in data.actions[:8]:
            if action.title and action.title not in suggested:
                suggested.append(action.title)
        for item in data.checklist[:6]:
            if item and item not in suggested:
                suggested.append(item)
        if data.lens == "policy_card" and data.policy_card:
            for q in (data.policy_card.get("supervision_questions") or [])[:4]:
                if q and q not in suggested:
                    suggested.append(f"Discuss in supervision: {q}")

        doc_title = _text(source_title) or _text(request.document_title) or data.title

        return data.model_copy(
            update={
                "source_document_title": doc_title,
                "risks_or_gaps": risks[:20],
                "suggested_next_actions": suggested[:12],
                "standalone": True,
                "os_records_accessed": False,
                "live_record_access": False,
            }
        )

    def list_lenses(self) -> list[dict[str, Any]]:
        return list(LENS_REGISTRY.values())

    def health(self) -> dict[str, Any]:
        return {
            "status": "ready",
            "service": "orb_document_intelligence",
            "standalone_only": True,
            "os_records_accessed": False,
            "lenses": list(LENS_REGISTRY.keys()),
            "underlying": orb_document_understanding_service.health(),
        }

    async def run(self, request: OrbDocumentIntelligenceRequest) -> OrbDocumentIntelligenceResponse:
        title, text, source_id = await self._resolve_document(request)
        lens = request.lens

        if lens == "reg44":
            data = await self._lens_reg44(title, text, source_id, request)
        elif lens == "policy_card":
            data = await self._lens_policy_card(title, text, source_id, request)
        elif lens == "actions":
            data = await self._lens_document_action_plan(title, text, source_id, request)
        else:
            data = await self._lens_from_understanding(title, text, source_id, request)

        data = self._enrich_with_expert_families(data, title=title, text=text, lens=lens)
        data = self._apply_standalone_envelope(data, request=request, source_title=title)
        data = self._with_brain_metadata(data, request=request)
        return OrbDocumentIntelligenceResponse(success=True, data=data)

    def _enrich_with_expert_families(
        self,
        data: OrbDocumentIntelligenceData,
        *,
        title: str,
        text: str,
        lens: str,
    ) -> OrbDocumentIntelligenceData:
        """Apply scenario-family markers to document lens outputs."""
        combined = f"{title}\n{text}"
        doc_kind = detect_document_kind(text, title)
        packet = orb_expert_answer_engine_service.build_expert_answer_packet(combined)
        if not packet.get("active"):
            return data

        missing = list(data.missing_information)
        checklist = list(data.checklist)
        sections = list(data.sections)

        for flag in (packet.get("red_flags") or [])[:6]:
            if flag not in missing:
                missing.append(f"Expert gap to check: {flag}")

        if lens in ("recording_quality", "safeguarding", "actions") or doc_kind == "incident_record":
            for item in (packet.get("what_to_check") or [])[:5]:
                checklist.append(item)
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="Scenario-family checks",
                    body="From residential expert scenario recognition (supplied document only).",
                    items=(packet.get("what_to_check") or [])[:6],
                )
            )

        if lens == "reg44" or doc_kind == "reg44":
            reg44_q = packet.get("reg44_questions") or []
            if reg44_q:
                sections.append(
                    OrbDocumentIntelligenceSection(
                        heading="Reg 44 triangulation questions",
                        body="Independent scrutiny prompts from expert scenario families.",
                        items=reg44_q[:8],
                    )
                )

        if lens == "policy_card" or doc_kind == "policy":
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="Staff briefing / audit prompts",
                    body="Policy-to-practice checks (no live OS access).",
                    items=(packet.get("what_to_escalate") or [])[:5]
                    + ["Supervision questions: is practice matching policy in records?"],
                )
            )

        if lens in {
            "nvq_evidence_map",
            "reflective_account_plan",
            "assessor_feedback",
            "professional_discussion_prompts",
        }:
            nvq = packet.get("nvq_learning_points") or []
            must = packet.get("must_not_say") or []
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="Academy / NVQ authenticity",
                    body="Evidence mapping from expert NVQ scenario family.",
                    items=nvq[:6] + must[:3],
                )
            )

        anchors = packet.get("source_anchors") or []
        sources = list(data.sources)
        for anchor in anchors[:4]:
            sid = anchor.get("source_id")
            if sid and not any(s.get("source_id") == sid for s in sources):
                sources.append(anchor)

        return data.model_copy(
            update={
                "missing_information": missing[:20],
                "checklist": checklist[:20],
                "sections": sections,
                "sources": sources,
            }
        )

    async def _resolve_document(
        self, request: OrbDocumentIntelligenceRequest
    ) -> tuple[str, str, str | None]:
        if request.document_source_id:
            source = orb_knowledge_library_service.get_source(request.document_source_id)
            if not source:
                raise ValueError("Knowledge source not found for document intelligence.")
            chunks = orb_knowledge_library_service.list_chunks(request.document_source_id)
            text = "\n\n".join(_text(c.get("text")) for c in chunks if _text(c.get("text")))
            if not text:
                raise ValueError("No readable text found for this document source.")
            title = _text(request.document_title) or _text(source.get("title")) or "Document"
            return title, text, request.document_source_id
        if request.document_text:
            title = _text(request.document_title) or "Document"
            return title, _text(request.document_text), None
        raise ValueError("Provide document_text or document_source_id.")

    async def _lens_from_understanding(
        self,
        title: str,
        text: str,
        source_id: str | None,
        request: OrbDocumentIntelligenceRequest,
    ) -> OrbDocumentIntelligenceData:
        lens = request.lens
        meta = LENS_REGISTRY.get(lens, LENS_REGISTRY["explain"])
        mode = meta.get("understanding_mode", "explain")

        analysis_request = OrbDocumentAnalysisRequest(
            mode=mode,
            title=title,
            text=text,
            source_id=source_id,
            question=request.question,
            include_evaluation=request.include_evaluation,
        )
        understanding = await orb_document_understanding_service.analyse_document(analysis_request)

        sections = self._sections_from_understanding(understanding, lens)
        actions = self._actions_from_understanding(understanding)
        checklist = self._checklist_from_understanding(understanding, lens)
        missing = [
            g.gap for g in understanding.gaps_or_missing_information if g.gap
        ]

        if lens == "what_is_missing" and not missing:
            missing.append(
                "Review whether child voice, timeline, rationale, and follow-up are explicit in the document."
            )

        if lens == "supervision":
            checklist = [
                q.question for q in understanding.suggested_questions if q.question
            ] or checklist

        if lens == "reg45":
            sections.insert(
                0,
                OrbDocumentIntelligenceSection(
                    heading="Reg 45 / provider learning",
                    body="Reflection on quality of care and provider learning from supplied text only.",
                    items=[
                        "Consider whether findings require provider-wide learning.",
                        "Map repeated themes to governance assurance — not live OS dashboards.",
                    ],
                ),
            )

        if lens == "ri_governance":
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="RI / provider responsibilities",
                    body="Oversight and assurance themes visible in the supplied document.",
                    items=understanding.who_needs_to_know[:8],
                )
            )

        if lens in {
            "nvq_evidence_map",
            "reflective_account_plan",
            "assessor_feedback",
            "professional_discussion_prompts",
            "witness_testimony_prompt",
            "learning_action_plan",
            "workbook_summary",
            "qualification_criteria_explainer",
        }:
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="Authenticity / boundary",
                    body=(
                        "Based only on the supplied document — do not treat as official assessment "
                        "or live Academy learner records. Draft support for professional judgement only."
                    ),
                    items=[
                        "Do not invent workplace events, observations or signatures.",
                        "Say when criteria links depend on further evidence from the learner.",
                    ],
                )
            )
            if lens == "nvq_evidence_map":
                sections.append(
                    OrbDocumentIntelligenceSection(
                        heading="Possible criteria / themes",
                        body="From supplied text only.",
                        items=understanding.key_themes[:10] or ["Review unit/criteria referenced in the document."],
                    )
                )
            if lens == "assessor_feedback":
                sections.append(
                    OrbDocumentIntelligenceSection(
                        heading="Draft feedback structure",
                        body="Strengths, evidence matched, gaps, PD questions, next steps.",
                        items=[q.question for q in understanding.suggested_questions if q.question][:8],
                    )
                )

        return OrbDocumentIntelligenceData(
            lens=lens,
            title=title,
            summary=understanding.plain_english_summary,
            sections=sections,
            actions=actions,
            checklist=checklist,
            confidence="draft",
            sources=understanding.sources,
            standalone=True,
            os_records_accessed=False,
            missing_information=missing,
            understanding=understanding.model_dump(),
        )

    async def _lens_reg44(
        self,
        title: str,
        text: str,
        source_id: str | None,
        request: OrbDocumentIntelligenceRequest,
    ) -> OrbDocumentIntelligenceData:
        reg44 = extract_reg44_report(text, title=title)
        sections = [
            OrbDocumentIntelligenceSection(
                heading="Visit details",
                body="Extracted from supplied report text only.",
                items=[
                    f"Visit date: {reg44['visit_date']}",
                    f"Visitor: {reg44['visitor']}",
                    f"Home: {reg44['home']}",
                ],
            ),
        ]
        theme_labels = {
            "childrens_experience": "Children's experience",
            "safeguarding": "Safeguarding",
            "staff_practice": "Staff practice",
            "leadership_management": "Leadership / management",
            "environment": "Environment",
            "records_evidence": "Records / evidence",
        }
        for key, label in theme_labels.items():
            items = (reg44.get("themes") or {}).get(key) or []
            if items:
                sections.append(
                    OrbDocumentIntelligenceSection(
                        heading=label,
                        body=f"Themes identified in the supplied Reg 44 report ({len(items)} items).",
                        items=items,
                    )
                )

        actions = [
            OrbDocumentIntelligenceAction(
                title=a["title"],
                reason=a["action_text"][:400],
                owner=a.get("owner") or NOT_STATED,
                due_date=a.get("due_date") or NOT_STATED,
                risk_level="high" if a.get("safeguarding_relevant") else "medium",
                manager_visibility=True,
                ri_visibility=bool(a.get("safeguarding_relevant")),
                horizon="immediate" if a.get("safeguarding_relevant") else "short_term",
                related_lens="reg44",
                evidence_needed=a.get("source_basis"),
            )
            for a in reg44.get("actions_raised") or []
        ]

        plan_request = OrbDocumentAnalysisRequest(
            mode="action_plan",
            title=title,
            text=text,
            source_id=source_id,
            question="Create a follow-up action plan from this Reg 44 report. Do not invent visit details.",
            include_evaluation=False,
        )
        follow_up = await orb_document_understanding_service.analyse_document(plan_request)
        plan_actions = self._actions_from_understanding(follow_up)

        missing = []
        for field in ("visit_date", "visitor", "home"):
            if reg44.get(field) == NOT_STATED:
                missing.append(f"{field.replace('_', ' ').title()}: {NOT_STATED}")

        summary = (
            f"Reg 44 extraction from supplied document ({reg44.get('finding_count', 0)} findings). "
            f"{STANDALONE_DOCUMENT_SAFETY}"
        )

        return OrbDocumentIntelligenceData(
            lens="reg44",
            title=title,
            summary=summary,
            sections=sections,
            actions=actions + plan_actions,
            checklist=[
                "Confirm visit date and visitor with the original report.",
                "Agree manager response to actions raised.",
                "Share RI-relevant themes at governance meeting.",
            ],
            confidence="draft",
            sources=[
                {
                    "label": title,
                    "type": "user_uploaded",
                    "basis": "User-provided Reg 44 report",
                    "standalone_only": True,
                    "live_retrieved": False,
                }
            ],
            standalone=True,
            os_records_accessed=False,
            missing_information=missing,
            reg44=reg44,
            action_plan_groups=self._group_actions(actions + plan_actions),
            understanding=follow_up.model_dump(),
        )

    async def _lens_policy_card(
        self,
        title: str,
        text: str,
        source_id: str | None,
        request: OrbDocumentIntelligenceRequest,
    ) -> OrbDocumentIntelligenceData:
        analysis_request = OrbDocumentAnalysisRequest(
            mode="explain",
            title=title,
            text=text,
            source_id=source_id,
            question=(
                "Create a policy card: plain-English summary, what staff must know, escalation, "
                "recording, who to inform, timescales (only if stated), related records, manager and "
                "RI responsibilities, safeguarding and Ofsted relevance, common mistakes, staff briefing, "
                "supervision questions, audit checklist. Say 'not stated in the supplied document' "
                "when information is absent."
            ),
            include_evaluation=request.include_evaluation,
        )
        understanding = await orb_document_understanding_service.analyse_document(analysis_request)
        policy_card = self._build_policy_card(understanding, text)

        skip_section_keys = {
            "policy_title",
            "orb_safe_answer_rules",
            "supervision_questions",
            "supervision_team_questions",
            "audit_checklist",
            "actions_to_consider",
            "missing_information",
        }
        sections = [
            OrbDocumentIntelligenceSection(heading=key.replace("_", " ").title(), body=_text(val), items=[])
            for key, val in policy_card.items()
            if _text(val) and key not in skip_section_keys and not isinstance(val, list)
        ]
        if policy_card.get("staff_briefing_version"):
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="Staff briefing version",
                    body=policy_card["staff_briefing_version"],
                )
            )
        for heading, key in (
            ("Supervision / team meeting questions", "supervision_team_questions"),
            ("Actions to consider", "actions_to_consider"),
            ("Audit checklist", "audit_checklist"),
        ):
            items = policy_card.get(key) or policy_card.get(key.replace("_team", "")) or []
            if items:
                sections.append(
                    OrbDocumentIntelligenceSection(heading=heading, body="", items=list(items)[:12])
                )
        if policy_card.get("legal_completeness_notice"):
            sections.insert(
                0,
                OrbDocumentIntelligenceSection(
                    heading="Important — read before use",
                    body=f"{policy_card['legal_completeness_notice']} {policy_card.get('review_before_use', '')}".strip(),
                ),
            )

        return OrbDocumentIntelligenceData(
            lens="policy_card",
            title=policy_card.get("policy_title") or title,
            summary=(
                f"{policy_card.get('plain_english_summary') or understanding.plain_english_summary} "
                f"{policy_card.get('review_before_use', '')}"
            ).strip(),
            sections=sections,
            actions=self._actions_from_understanding(understanding),
            checklist=policy_card.get("audit_checklist") or [],
            confidence="draft",
            sources=understanding.sources,
            standalone=True,
            os_records_accessed=False,
            missing_information=policy_card.get("missing_information") or [],
            policy_card=policy_card,
            understanding=understanding.model_dump(),
        )

    async def _lens_document_action_plan(
        self,
        title: str,
        text: str,
        source_id: str | None,
        request: OrbDocumentIntelligenceRequest,
    ) -> OrbDocumentIntelligenceData:
        analysis_request = OrbDocumentAnalysisRequest(
            mode="action_plan",
            title=title,
            text=text,
            source_id=source_id,
            question=request.question,
            include_evaluation=request.include_evaluation,
        )
        understanding = await orb_document_understanding_service.analyse_document(analysis_request)
        actions = self._actions_from_understanding(understanding)
        grouped = self._group_actions(actions)
        missing = [g.gap for g in understanding.gaps_or_missing_information if g.gap]

        sections = [
            OrbDocumentIntelligenceSection(
                heading="Immediate actions",
                body="Address within the current shift or 24 hours where stated.",
                items=[a.title for a in grouped.get("immediate", [])],
            ),
            OrbDocumentIntelligenceSection(
                heading="Short-term actions",
                body="Agree owners and timescales locally.",
                items=[a.title for a in grouped.get("short_term", [])],
            ),
            OrbDocumentIntelligenceSection(
                heading="Governance / oversight",
                body="Manager, RI or provider-level follow-up.",
                items=[a.title for a in grouped.get("governance", [])],
            ),
            OrbDocumentIntelligenceSection(
                heading="Evidence to gather",
                body="From the document — confirm locally.",
                items=[
                    e.implication
                    for e in understanding.evidence_implications
                    if e.implication
                ][:8],
            ),
        ]

        return OrbDocumentIntelligenceData(
            lens="actions",
            title=title,
            summary=understanding.plain_english_summary,
            sections=sections,
            actions=actions,
            checklist=[
                "Confirm each action owner and due date locally.",
                "Do not treat this as an IndiCare OS task unless created manually.",
            ],
            confidence="draft",
            sources=understanding.sources,
            standalone=True,
            os_records_accessed=False,
            missing_information=missing,
            action_plan_groups={k: [a.model_dump() for a in v] for k, v in grouped.items()},
            understanding=understanding.model_dump(),
        )

    def _build_policy_card(
        self, understanding: OrbDocumentUnderstanding, text: str
    ) -> dict[str, Any]:
        lower = text.lower()
        not_stated = NOT_STATED

        def stated_or_missing(value: str | None, *, keyword: str | None = None) -> str:
            if _text(value):
                return _text(value)
            if keyword and keyword in lower:
                return f"See supplied document ({keyword} mentioned)."
            return not_stated

        timescales = not_stated
        if re.search(r"\b(within|by|hours?|days?|weeks?)\s+\d+", lower):
            timescales = "Timescales mentioned in document — confirm exact wording in original."

        who_matters = ", ".join(understanding.who_needs_to_know[:6]) if understanding.who_needs_to_know else not_stated
        staff_must_know = stated_or_missing(
            "; ".join(understanding.key_themes[:6]) if understanding.key_themes else None,
            keyword="staff",
        )
        good_practice = stated_or_missing(
            "; ".join(
                p.implication
                for p in understanding.practice_implications
                if p.implication
            )[:600]
            or None,
            keyword="practice",
        )
        recording_req = stated_or_missing(
            next(
                (e.implication for e in understanding.evidence_implications if e.implication),
                None,
            ),
            keyword="record",
        )
        manager_oversight = stated_or_missing(
            next(
                (
                    p.implication
                    for p in understanding.practice_implications
                    if p.for_role and "manager" in (p.for_role or "").lower()
                ),
                None,
            ),
            keyword="manager",
        )
        safeguarding = stated_or_missing(
            next((r.risk for r in understanding.risks_or_concerns if r.risk), None),
            keyword="safeguarding",
        )
        ofsted_reg44 = stated_or_missing(
            next((e.implication for e in understanding.evidence_implications if e.implication), None),
            keyword="ofsted",
        )
        common_mistakes = stated_or_missing(
            next((g.gap for g in understanding.gaps_or_missing_information if g.gap), None),
        )
        supervision_questions = [
            q.question for q in understanding.suggested_questions if q.question
        ]
        actions_to_consider = [
            a.action
            for a in (understanding.action_plan.actions if understanding.action_plan else [])
            if a.action
        ][:10]
        legal_notice = (
            "Based only on the uploaded or pasted policy. This card does not confirm the policy "
            "is legally complete or up to date."
        )
        review_notice = (
            "Recommend registered manager and provider review before sharing with staff or "
            "relying on this card in practice."
        )

        return {
            "policy_title": understanding.title,
            "plain_english_summary": understanding.plain_english_summary,
            "who_this_matters_for": who_matters,
            "key_staff_responsibilities": staff_must_know,
            "what_good_practice_looks_like": good_practice,
            "safeguarding_considerations": safeguarding,
            "recording_requirements": recording_req,
            "manager_oversight_points": manager_oversight,
            "ofsted_reg44_relevance": ofsted_reg44,
            "common_mistakes_to_avoid": common_mistakes,
            "staff_briefing_version": understanding.plain_english_summary[:800],
            "supervision_team_questions": supervision_questions,
            "actions_to_consider": actions_to_consider,
            "legal_completeness_notice": legal_notice,
            "review_before_use": review_notice,
            # Backward-compatible keys
            "what_staff_must_know": staff_must_know,
            "when_to_escalate": stated_or_missing(
                next(
                    (r.risk for r in understanding.risks_or_concerns if "escalat" in (r.risk or "").lower()),
                    None,
                ),
                keyword="escalat",
            ),
            "what_to_record": recording_req,
            "who_to_inform": who_matters,
            "timescales": timescales,
            "related_forms_records": stated_or_missing(None, keyword="form"),
            "manager_responsibilities": manager_oversight,
            "ri_provider_responsibilities": stated_or_missing(
                None, keyword="responsible individual"
            ),
            "safeguarding_implications": safeguarding,
            "ofsted_sccif_relevance": ofsted_reg44,
            "common_mistakes": common_mistakes,
            "supervision_questions": supervision_questions,
            "audit_checklist": actions_to_consider[:10],
            "orb_safe_answer_rules": [
                STANDALONE_DOCUMENT_SAFETY,
                legal_notice,
                review_notice,
                "Do not invent statutory timescales or claims not in the policy text.",
                "Say when information is not stated in the supplied document.",
            ],
            "missing_information": [g.gap for g in understanding.gaps_or_missing_information if g.gap],
        }

    def _sections_from_understanding(
        self, understanding: OrbDocumentUnderstanding, lens: OrbDocumentLens
    ) -> list[OrbDocumentIntelligenceSection]:
        sections = [
            OrbDocumentIntelligenceSection(
                heading="Summary",
                body=understanding.plain_english_summary,
            )
        ]
        if understanding.key_themes:
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="Key themes",
                    body="",
                    items=understanding.key_themes,
                )
            )
        if understanding.important_points:
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="Important points",
                    body="",
                    items=[p.point for p in understanding.important_points if p.point],
                )
            )
        if lens == "ofsted":
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="Child experience & evidence",
                    body="Ofsted/SCCIF lens — evidence thinking only.",
                    items=[
                        e.implication for e in understanding.evidence_implications if e.implication
                    ][:8]
                    or ["Review child experience and evidence strength in the supplied document."],
                )
            )
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="Leadership & management",
                    body="",
                    items=[
                        p.implication
                        for p in understanding.practice_implications
                        if p.implication
                    ][:6],
                )
            )
        if lens == "safeguarding":
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="Safeguarding reflection",
                    body=understanding.safety_notice or STANDALONE_DOCUMENT_SAFETY,
                    items=[r.risk for r in understanding.risks_or_concerns if r.risk],
                )
            )
        if lens == "recording_quality":
            sections.append(
                OrbDocumentIntelligenceSection(
                    heading="Recording quality",
                    body="Child-centred, factual recording expectations from the document.",
                    items=[
                        p.implication for p in understanding.practice_implications if p.implication
                    ],
                )
            )
        return sections

    def _actions_from_understanding(
        self, understanding: OrbDocumentUnderstanding
    ) -> list[OrbDocumentIntelligenceAction]:
        raw = understanding.action_plan.actions if understanding.action_plan else []
        actions: list[OrbDocumentIntelligenceAction] = []
        for entry in raw:
            if not entry.action:
                continue
            owner = entry.suggested_owner_label or NOT_STATED
            due = entry.timescale or NOT_STATED
            horizon: str = "short_term"
            if entry.priority in {"urgent", "high"}:
                horizon = "immediate"
            if owner and any(
                term in owner.lower() for term in ("ri", "responsible", "provider", "governance")
            ):
                horizon = "governance"
            actions.append(
                OrbDocumentIntelligenceAction(
                    title=entry.action,
                    reason=entry.why_it_matters,
                    risk_level=entry.priority,
                    owner=owner,
                    due_date=due,
                    evidence_needed=entry.source_basis,
                    follow_up_question="Confirm locally before implementation.",
                    manager_visibility="manager" in (owner or "").lower()
                    or entry.priority in {"high", "urgent"},
                    ri_visibility=horizon == "governance",
                    horizon=horizon,  # type: ignore[arg-type]
                )
            )
        return actions

    def _checklist_from_understanding(
        self, understanding: OrbDocumentUnderstanding, lens: OrbDocumentLens
    ) -> list[str]:
        items = [a.action for a in (understanding.action_plan.actions if understanding.action_plan else []) if a.action]
        if lens == "checklist" and not items:
            items = [q.question for q in understanding.suggested_questions if q.question]
        return items[:12]

    def _group_actions(
        self, actions: list[OrbDocumentIntelligenceAction]
    ) -> dict[str, list[OrbDocumentIntelligenceAction]]:
        grouped: dict[str, list[OrbDocumentIntelligenceAction]] = {
            "immediate": [],
            "short_term": [],
            "governance": [],
        }
        for action in actions:
            grouped.get(action.horizon, grouped["short_term"]).append(action)
        return grouped


orb_document_intelligence_service = OrbDocumentIntelligenceService()
