"""Standalone ORB document understanding and action planning — no OS records."""

from __future__ import annotations

import json
import logging
import re
from typing import Any

from schemas.orb_documents import (
    OrbDocumentAction,
    OrbDocumentActionPlan,
    OrbDocumentAnalysisMode,
    OrbDocumentAnalysisRequest,
    OrbDocumentEvidenceImplication,
    OrbDocumentGap,
    OrbDocumentKeyPoint,
    OrbDocumentPracticeImplication,
    OrbDocumentQuestion,
    OrbDocumentRisk,
    OrbDocumentUnderstanding,
)
from services.ai_model_router_service import ai_model_router_service
from services.orb_citation_service import orb_citation_service
from services.orb_document_ingestion_service import orb_document_ingestion_service
from services.orb_evaluation_service import orb_evaluation_service
from services.orb_knowledge_library_service import orb_knowledge_library_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service

logger = logging.getLogger("indicare.orb_document_understanding")

STANDALONE_DOCUMENT_SAFETY = (
    "Standalone ORB does not access live IndiCare OS records. "
    "Uploaded documents are user-provided standalone context only. "
    "Action plans are draft suggestions for local review."
)

SAFEGUARDING_LENS_NOTICE = (
    "Safeguarding reflection only — follow local procedures and escalate where immediate risk exists. "
    "ORB does not make threshold or statutory decisions."
)

OFSTED_LENS_NOTICE = (
    "Ofsted/SCCIF lens for evidence thinking only — ORB does not predict inspection grades."
)

POLICY_COMPARISON_NOTICE = (
    "Policy comparison is support for practice review, not legal advice."
)

SUPPORTED_MODES: list[OrbDocumentAnalysisMode] = [
    "explain",
    "summarise",
    "action_plan",
    "ofsted_lens",
    "safeguarding_lens",
    "recording_lens",
    "therapeutic_lens",
    "policy_comparison",
    "manager_briefing",
    "staff_briefing",
    "full_review",
]


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbDocumentUnderstandingService:
    """Analyse standalone user documents with knowledge-backed citations."""

    def health(self) -> dict[str, Any]:
        return {
            "status": "ready",
            "service": "orb_document_understanding",
            "standalone_only": True,
            "os_linked": False,
            "care_record_access": False,
            "supported_modes": list(SUPPORTED_MODES),
            "supported_upload_types": [".txt", ".md", ".pdf", ".docx"],
        }

    async def analyse_document(self, request: OrbDocumentAnalysisRequest) -> OrbDocumentUnderstanding:
        if request.source_id:
            return await self.analyse_source(
                request.source_id,
                request.mode,
                question=request.question,
                include_evaluation=request.include_evaluation,
            )
        if request.text:
            return await self.analyse_uploaded_text(
                request.title or "Uploaded document",
                request.text,
                request.mode,
                question=request.question,
                include_evaluation=request.include_evaluation,
            )
        raise ValueError("Provide source_id or text for document analysis.")

    async def analyse_source(
        self,
        source_id: str,
        mode: OrbDocumentAnalysisMode,
        *,
        question: str | None = None,
        include_evaluation: bool = True,
    ) -> OrbDocumentUnderstanding:
        source = orb_knowledge_library_service.get_source(source_id)
        if not source:
            raise ValueError("Knowledge source not found for standalone document analysis.")
        chunks = orb_knowledge_library_service.list_chunks(source_id)
        document_text = "\n\n".join(_text(c.get("text")) for c in chunks if _text(c.get("text")))
        if not document_text:
            raise ValueError("No readable text found for this document source.")
        title = _text(source.get("title")) or "Document"
        return await self._run_analysis(
            title=title,
            document_text=document_text,
            mode=mode,
            source_record=source,
            question=question,
            include_evaluation=include_evaluation,
        )

    async def analyse_uploaded_text(
        self,
        title: str,
        text: str,
        mode: OrbDocumentAnalysisMode,
        *,
        metadata: dict[str, Any] | None = None,
        question: str | None = None,
        include_evaluation: bool = True,
    ) -> OrbDocumentUnderstanding:
        normalised = orb_document_ingestion_service.normalise_text(text)
        if not normalised:
            raise ValueError("Document text is empty.")
        return await self._run_analysis(
            title=title,
            document_text=normalised,
            mode=mode,
            source_record={"id": None, "title": title, "metadata": metadata or {}},
            question=question,
            include_evaluation=include_evaluation,
        )

    async def _run_analysis(
        self,
        *,
        title: str,
        document_text: str,
        mode: OrbDocumentAnalysisMode,
        source_record: dict[str, Any],
        question: str | None,
        include_evaluation: bool,
    ) -> OrbDocumentUnderstanding:
        document_context = self.build_document_context(document_text, source_record)
        related = self.retrieve_related_guidance(document_text, mode)
        prompt = self.build_analysis_prompt(document_context, related, mode, question=question)
        llm_text = ""
        model_routing: dict[str, Any] | None = None
        try:
            response, decision, trace = await ai_model_router_service.complete_with_routing(
                message=prompt,
                system_prompt=self._system_prompt(mode),
                history=[],
                mode=self._mode_label(mode),
                retrieval_context={"document_results": related, "source_packs": []},
                detail_level="detailed",
                surface="orb_document_understanding",
                route="orb_document_understanding_service.analyse_document",
                local_fallback_available=True,
            )
            llm_text = _text(response.text)
            model_routing = ai_model_router_service.routing_metadata_for_context(
                decision, trace, response=response
            )
        except Exception:
            logger.debug("document analysis LLM failed; using fallback", exc_info=True)

        request_stub = OrbDocumentAnalysisRequest(
            mode=mode,
            title=title,
            text=document_text,
            source_id=source_record.get("id"),
            question=question,
        )
        if llm_text:
            understanding = self.parse_document_analysis_output(llm_text, request_stub, title=title)
        else:
            understanding = self.fallback_analysis(request_stub, "llm_unavailable", title=title)

        understanding.source_id = source_record.get("id")
        understanding.analysis_mode = mode
        understanding.model_routing = model_routing
        understanding.citations, understanding.sources = self.build_document_citations(
            source_record, related, document_text=document_text
        )
        understanding.action_plan = self.build_action_plan(understanding, mode)
        understanding.safety_notice = self._safety_notice(mode)
        understanding.limitations = self._limitations(mode)
        if include_evaluation:
            eval_result = orb_evaluation_service.evaluate_document_output(
                understanding.model_dump(),
                analysis_mode=mode,
            )
            understanding.evaluation = eval_result.model_dump()
        try:
            from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service

            indicare_ai_governance_event_service.record_from_standalone_response(
                {
                    "answer": understanding.plain_english_summary,
                    "sources": understanding.sources,
                    "citations": understanding.citations,
                    "context_used": {
                        "model_routing": understanding.model_routing,
                        "surface": "standalone_orb_ai",
                    },
                    "evaluation": understanding.evaluation,
                },
                event_type="document_analysis",
                message=question or title,
            )
        except Exception:
            pass
        return understanding

    def build_document_context(
        self,
        document_text: str,
        source_record: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        excerpt = document_text[:12000]
        return {
            "title": _text((source_record or {}).get("title")) or "Document",
            "source_type": (source_record or {}).get("source_type"),
            "text_excerpt": excerpt,
            "word_estimate": len(excerpt.split()),
            "standalone_only": True,
        }

    def retrieve_related_guidance(
        self,
        document_text: str,
        mode: OrbDocumentAnalysisMode,
    ) -> list[dict[str, Any]]:
        query = document_text[:1500]
        if mode == "policy_comparison":
            query = f"policy recording quality standards {query[:800]}"
        elif mode == "ofsted_lens":
            query = f"Ofsted SCCIF evidence quality standards {query[:800]}"
        elif mode == "safeguarding_lens":
            query = f"safeguarding escalation {query[:800]}"
        try:
            return orb_rag_retrieval_service.search(query, mode=self._mode_label(mode), limit=6)
        except Exception:
            logger.debug("related guidance retrieval failed", exc_info=True)
            return []

    def build_analysis_prompt(
        self,
        document_context: dict[str, Any],
        related_sources: list[dict[str, Any]],
        mode: OrbDocumentAnalysisMode,
        *,
        question: str | None = None,
    ) -> str:
        related_block = ""
        if related_sources:
            lines = []
            for item in related_sources[:5]:
                lines.append(
                    f"- {item.get('citation_label') or item.get('source_title')}: "
                    f"{_text(item.get('text'))[:400]}"
                )
            related_block = "Related knowledge library excerpts:\n" + "\n".join(lines)

        mode_instruction = {
            "explain": "Explain the document in plain English with key points and practice meaning.",
            "summarise": "Provide a concise summary with key themes and important details.",
            "action_plan": "Create a prioritised action plan with owners, timescales and review flags.",
            "ofsted_lens": "Apply an Ofsted/SCCIF evidence lens without predicting grades.",
            "safeguarding_lens": "Highlight possible safeguarding considerations with escalation reminder.",
            "recording_lens": "Explain recording quality and child-centred evidence implications.",
            "therapeutic_lens": "Apply trauma-informed and behaviour-as-communication thinking.",
            "policy_comparison": "Compare to knowledge library expectations; note gaps and updates.",
            "manager_briefing": "Create a manager briefing: summary, risks, decisions, actions.",
            "staff_briefing": "Create a staff briefing: practical steps and reflective questions.",
            "full_review": "Full structured review covering all lenses above.",
        }.get(mode, "Analyse the document.")

        user_q = f"\nUser question: {question}" if question else ""
        return (
            f"Analyse this standalone user-uploaded document.\n"
            f"Title: {document_context.get('title')}\n"
            f"Mode: {mode}\n"
            f"Instruction: {mode_instruction}{user_q}\n\n"
            f"Document text:\n{document_context.get('text_excerpt')}\n\n"
            f"{related_block}\n\n"
            "Respond with JSON containing: plain_english_summary, document_type, likely_purpose, "
            "key_themes (list), important_points (list of {point, detail}), who_needs_to_know (list), "
            "practice_implications, evidence_implications, risks_or_concerns, gaps_or_missing_information, "
            "suggested_questions, and actions (list of {action, why_it_matters, priority, "
            "suggested_owner_label, timescale, review_needed})."
        )

    def parse_document_analysis_output(
        self,
        text: str,
        request: OrbDocumentAnalysisRequest,
        *,
        title: str | None = None,
    ) -> OrbDocumentUnderstanding:
        payload = self._extract_json(text)
        if payload:
            return self._understanding_from_payload(payload, request, title=title)
        return self.fallback_analysis(request, "parse_fallback", title=title, llm_text=text)

    def _understanding_from_payload(
        self,
        payload: dict[str, Any],
        request: OrbDocumentAnalysisRequest,
        *,
        title: str | None = None,
    ) -> OrbDocumentUnderstanding:
        def key_points(raw: Any) -> list[OrbDocumentKeyPoint]:
            items: list[OrbDocumentKeyPoint] = []
            for entry in raw or []:
                if isinstance(entry, dict):
                    items.append(
                        OrbDocumentKeyPoint(
                            point=_text(entry.get("point") or entry.get("text")),
                            detail=_text(entry.get("detail")) or None,
                            source_basis=_text(entry.get("source_basis")) or None,
                        )
                    )
                elif entry:
                    items.append(OrbDocumentKeyPoint(point=_text(entry)))
            return [p for p in items if p.point]

        def risks(raw: Any) -> list[OrbDocumentRisk]:
            out: list[OrbDocumentRisk] = []
            for entry in raw or []:
                if isinstance(entry, dict):
                    out.append(
                        OrbDocumentRisk(
                            risk=_text(entry.get("risk") or entry.get("text")),
                            severity=_text(entry.get("severity")) or None,
                            mitigation=_text(entry.get("mitigation")) or None,
                            source_basis=_text(entry.get("source_basis")) or None,
                        )
                    )
                elif entry:
                    out.append(OrbDocumentRisk(risk=_text(entry)))
            return [r for r in out if r.risk]

        actions_raw = payload.get("actions") or (payload.get("action_plan") or {}).get("actions")
        actions = []
        for entry in actions_raw or []:
            if not isinstance(entry, dict):
                continue
            actions.append(
                OrbDocumentAction(
                    action=_text(entry.get("action")),
                    why_it_matters=_text(entry.get("why_it_matters")) or None,
                    priority=entry.get("priority") if entry.get("priority") in {
                        "low",
                        "medium",
                        "high",
                        "urgent",
                    }
                    else "medium",
                    suggested_owner_label=_text(entry.get("suggested_owner_label")) or None,
                    timescale=_text(entry.get("timescale")) or None,
                    source_basis=_text(entry.get("source_basis")) or None,
                    review_needed=bool(entry.get("review_needed", True)),
                )
            )

        summary_text = _text(payload.get("plain_english_summary") or payload.get("summary"))
        if not summary_text:
            summary_text = "See key points and themes below."
        return OrbDocumentUnderstanding(
            title=title or _text(request.title) or "Document",
            plain_english_summary=summary_text,
            document_type=_text(payload.get("document_type")) or None,
            likely_purpose=_text(payload.get("likely_purpose")) or None,
            key_themes=[_text(t) for t in (payload.get("key_themes") or []) if _text(t)],
            important_points=key_points(payload.get("important_points")),
            who_needs_to_know=[
                _text(w) for w in (payload.get("who_needs_to_know") or []) if _text(w)
            ],
            practice_implications=[
                OrbDocumentPracticeImplication(
                    implication=_text(
                        e.get("implication") if isinstance(e, dict) else e
                    ),
                    for_role=_text(e.get("for_role")) if isinstance(e, dict) else None,
                )
                for e in (payload.get("practice_implications") or [])
                if _text(e.get("implication") if isinstance(e, dict) else e)
            ],
            evidence_implications=[
                OrbDocumentEvidenceImplication(
                    implication=_text(
                        e.get("implication") if isinstance(e, dict) else e
                    ),
                )
                for e in (payload.get("evidence_implications") or [])
                if _text(e.get("implication") if isinstance(e, dict) else e)
            ],
            risks_or_concerns=risks(payload.get("risks_or_concerns")),
            gaps_or_missing_information=[
                OrbDocumentGap(
                    gap=_text(e.get("gap") if isinstance(e, dict) else e),
                    why_it_matters=_text(e.get("why_it_matters")) if isinstance(e, dict) else None,
                )
                for e in (payload.get("gaps_or_missing_information") or [])
                if _text(e.get("gap") if isinstance(e, dict) else e)
            ],
            suggested_questions=[
                OrbDocumentQuestion(question=_text(e.get("question") if isinstance(e, dict) else e))
                for e in (payload.get("suggested_questions") or [])
                if _text(e.get("question") if isinstance(e, dict) else e)
            ],
            action_plan=OrbDocumentActionPlan(
                summary=_text((payload.get("action_plan") or {}).get("summary")),
                actions=actions,
            )
            if actions
            else None,
            analysis_mode=request.mode,
            source_id=request.source_id,
        )

    def fallback_analysis(
        self,
        request: OrbDocumentAnalysisRequest,
        error: str,
        *,
        title: str | None = None,
        llm_text: str | None = None,
    ) -> OrbDocumentUnderstanding:
        text = _text(request.text)
        doc_title = title or _text(request.title) or "Document"
        sentences = [s.strip() for s in re.split(r"[.!?]\s+", text) if s.strip()]
        summary = (
            _text(llm_text)[:1200]
            if llm_text
            else (
                " ".join(sentences[:3])
                if sentences
                else "This document could not be fully analysed automatically; review the text locally."
            )
        )
        key_points = [
            OrbDocumentKeyPoint(point=s[:240], detail=None, source_basis="Uploaded document")
            for s in sentences[:6]
        ]
        themes: list[str] = []
        lower = text.lower()
        for label, terms in (
            ("Recording quality", ("daily note", "recording", "factual", "child-centred")),
            ("Safeguarding", ("safeguarding", "risk", "escalat")),
            ("Ofsted / evidence", ("ofsted", "evidence", "inspection")),
            ("Therapeutic practice", ("trauma", "therapeutic", "behaviour")),
        ):
            if any(t in lower for t in terms):
                themes.append(label)

        actions = self._heuristic_actions(text, request.mode)
        practice = [
            OrbDocumentPracticeImplication(
                implication=(
                    "Apply the document's expectations in everyday practice and supervision."
                ),
                for_role="staff and managers",
                source_basis="Uploaded document",
            )
        ]
        if "child-centred" in lower or "child's voice" in lower:
            practice.insert(
                0,
                OrbDocumentPracticeImplication(
                    implication="Prioritise factual, child-centred recording with the child's voice.",
                    source_basis="Uploaded document",
                ),
            )

        return OrbDocumentUnderstanding(
            title=doc_title,
            plain_english_summary=summary,
            document_type=orb_document_ingestion_service.detect_source_type(doc_title, text),
            likely_purpose="Standalone reference document for practice guidance",
            key_themes=themes or ["General practice guidance"],
            important_points=key_points,
            who_needs_to_know=["Registered manager", "Deputy manager", "Shift leaders", "Care staff"],
            practice_implications=practice,
            evidence_implications=[
                OrbDocumentEvidenceImplication(
                    implication="Ensure records show what happened, adult responses, and child's voice.",
                    evidence_type="daily recording",
                    source_basis="Uploaded document",
                )
            ],
            risks_or_concerns=self._heuristic_risks(text, request.mode),
            gaps_or_missing_information=self._heuristic_gaps(text, request.mode),
            suggested_questions=self._heuristic_questions(request.mode),
            action_plan=OrbDocumentActionPlan(
                summary="Draft actions from document review — confirm locally before implementation.",
                actions=actions,
            ),
            analysis_mode=request.mode,
            source_id=request.source_id,
            safety_notice=self._safety_notice(request.mode),
            limitations=self._limitations(request.mode) + [f"Analysis note: {error}"],
        )

    def build_action_plan(
        self,
        analysis: OrbDocumentUnderstanding,
        mode: OrbDocumentAnalysisMode,
    ) -> OrbDocumentActionPlan | None:
        if analysis.action_plan and analysis.action_plan.actions:
            plan = analysis.action_plan
        else:
            actions = self._heuristic_actions(
                analysis.plain_english_summary,
                mode if mode == "action_plan" else "explain",
            )
            if not actions and mode not in {"action_plan", "full_review", "manager_briefing"}:
                return analysis.action_plan
            plan = OrbDocumentActionPlan(
                summary="Draft action plan from document analysis.",
                actions=actions,
                review_note="Review all actions with your manager before implementation.",
            )
        if mode in {"action_plan", "full_review", "manager_briefing"} and not plan.review_note:
            plan.review_note = "Draft for local review — not written to IndiCare OS action tables."
        analysis.action_plan = plan
        return plan

    def build_document_citations(
        self,
        source_record: dict[str, Any],
        related_sources: list[dict[str, Any]],
        *,
        document_text: str = "",
    ) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
        citations: list[dict[str, Any]] = []
        sources: list[dict[str, Any]] = []
        sid = source_record.get("id")
        title = _text(source_record.get("title")) or "Uploaded document"
        if sid or document_text:
            doc_citation = {
                "id": sid or "uploaded-document",
                "label": title,
                "type": "user_uploaded",
                "basis": "User-uploaded standalone document",
                "live_retrieved": False,
                "document_chunk": True,
                "standalone_only": True,
            }
            citations.append(doc_citation)
            sources.append(doc_citation)
        for item in related_sources[:6]:
            entry = {
                "id": item.get("source_id"),
                "label": item.get("citation_label") or item.get("source_title"),
                "type": item.get("source_type") or "knowledge_library",
                "basis": "ORB Knowledge Library",
                "live_retrieved": False,
                "document_chunk": True,
                "section": item.get("section"),
                "chunk_index": item.get("chunk_index"),
            }
            citations.append(entry)
            sources.append(entry)
        if citations:
            return citations, sources
        return orb_citation_service.frontend_sources_payload([]), []

    def _heuristic_actions(
        self,
        text: str,
        mode: OrbDocumentAnalysisMode,
    ) -> list[OrbDocumentAction]:
        lower = text.lower()
        actions: list[OrbDocumentAction] = []
        if "judgemental" in lower or "attention seeking" in lower:
            actions.append(
                OrbDocumentAction(
                    action="Brief staff on child-centred, non-judgemental language in records.",
                    why_it_matters="Language shapes culture and inspection evidence.",
                    priority="high",
                    suggested_owner_label="Registered manager",
                    timescale="Within 2 weeks",
                    source_basis="Uploaded document",
                    review_needed=True,
                )
            )
        if "child's voice" in lower or "child voice" in lower:
            actions.append(
                OrbDocumentAction(
                    action="Audit a sample of daily notes for child voice and factual description.",
                    why_it_matters="Evidence of the child's lived experience supports quality and Ofsted thinking.",
                    priority="medium",
                    suggested_owner_label="Quality lead",
                    timescale="Within 4 weeks",
                    source_basis="Uploaded document",
                    review_needed=True,
                )
            )
        if mode in {"action_plan", "full_review", "manager_briefing"} or not actions:
            actions.append(
                OrbDocumentAction(
                    action="Discuss this document in team meeting and agree one practice change.",
                    why_it_matters="Shared understanding improves consistent practice.",
                    priority="medium",
                    suggested_owner_label="Shift leader",
                    timescale="Next team meeting",
                    source_basis="Uploaded document",
                    review_needed=True,
                )
            )
        return actions

    def _heuristic_risks(
        self,
        text: str,
        mode: OrbDocumentAnalysisMode,
    ) -> list[OrbDocumentRisk]:
        risks: list[OrbDocumentRisk] = []
        lower = text.lower()
        if any(term in lower for term in ("attention seeking", "bad behaviour", "naughty")):
            risks.append(
                OrbDocumentRisk(
                    risk="Judgemental language in guidance or practice may harm child-centred culture.",
                    severity="medium",
                    mitigation="Use descriptive, trauma-informed wording in records and briefings.",
                    source_basis="Uploaded document",
                )
            )
        if mode == "safeguarding_lens":
            risks.append(
                OrbDocumentRisk(
                    risk="Any safeguarding concern requires local escalation — ORB cannot decide thresholds.",
                    severity="high",
                    mitigation="Follow safeguarding procedures immediately where risk is present.",
                )
            )
        return risks

    def _heuristic_gaps(
        self,
        text: str,
        mode: OrbDocumentAnalysisMode,
    ) -> list[OrbDocumentGap]:
        gaps: list[OrbDocumentGap] = []
        if mode == "policy_comparison" and len(text) < 400:
            gaps.append(
                OrbDocumentGap(
                    gap="Document may be too short for full policy comparison.",
                    why_it_matters="Compare against fuller Knowledge Library sources.",
                    suggested_update="Add cross-references to regulatory standards in the Knowledge Library.",
                )
            )
        return gaps

    def _heuristic_questions(self, mode: OrbDocumentAnalysisMode) -> list[OrbDocumentQuestion]:
        common = [
            OrbDocumentQuestion(
                question="What would good practice look like on the next shift?",
                purpose="Translate document into practice",
            ),
            OrbDocumentQuestion(
                question="How will we know this is embedded in recording quality?",
                purpose="Evidence and oversight",
            ),
        ]
        if mode == "safeguarding_lens":
            common.insert(
                0,
                OrbDocumentQuestion(
                    question="Does anything in this document raise immediate safeguarding concerns?",
                    purpose="Escalation check",
                ),
            )
        return common

    def _extract_json(self, text: str) -> dict[str, Any] | None:
        cleaned = _text(text)
        if not cleaned:
            return None
        try:
            return json.loads(cleaned)
        except json.JSONDecodeError:
            pass
        match = re.search(r"\{[\s\S]*\}", cleaned)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                return None
        return None

    def _system_prompt(self, mode: OrbDocumentAnalysisMode) -> str:
        base = (
            "You are ORB Care Companion analysing a standalone user-uploaded document. "
            "British English. Child-centred. No access to live IndiCare OS records. "
            f"{STANDALONE_DOCUMENT_SAFETY}"
        )
        if mode == "safeguarding_lens":
            base += f" {SAFEGUARDING_LENS_NOTICE}"
        if mode == "ofsted_lens":
            base += f" {OFSTED_LENS_NOTICE}"
        if mode == "policy_comparison":
            base += f" {POLICY_COMPARISON_NOTICE}"
        return base

    def _safety_notice(self, mode: OrbDocumentAnalysisMode) -> str:
        parts = [STANDALONE_DOCUMENT_SAFETY]
        if mode == "safeguarding_lens":
            parts.append(SAFEGUARDING_LENS_NOTICE)
        if mode == "ofsted_lens":
            parts.append(OFSTED_LENS_NOTICE)
        if mode == "policy_comparison":
            parts.append(POLICY_COMPARISON_NOTICE)
        return " ".join(parts)

    def _limitations(self, mode: OrbDocumentAnalysisMode) -> list[str]:
        items = [
            "Draft analysis for local review — not stored in Care Hub or child records.",
            "Does not replace legal, medical or statutory advice.",
        ]
        if mode == "ofsted_lens":
            items.append("Does not predict inspection grades.")
        if mode == "safeguarding_lens":
            items.append("Does not make safeguarding threshold decisions.")
        return items

    def _mode_label(self, mode: OrbDocumentAnalysisMode) -> str:
        mapping = {
            "ofsted_lens": "Ofsted Lens",
            "safeguarding_lens": "Safeguarding",
            "recording_lens": "Record This Properly",
            "therapeutic_lens": "Behaviour Support",
        }
        return mapping.get(mode, "Ask ORB")


orb_document_understanding_service = OrbDocumentUnderstandingService()
