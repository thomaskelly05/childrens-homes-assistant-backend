from __future__ import annotations

import asyncio
import logging
import re
import time
from collections.abc import AsyncIterator
from typing import Any

from services.ai_model_router_service import (
    STANDALONE_LLM_TIMEOUT_SECONDS,
    _chunk_text_for_stream,
    ai_model_router_service,
)
from services.orb_citation_service import orb_citation_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service
from services.orb_standalone_sources import (
    INDICARE_PRODUCT_FALLBACK,
    append_sources_basis_section,
    build_standalone_sources,
)
from services.orb_agent_conversation_bridge import detect_agent_intent, maybe_run_agent_for_conversation
from services.orb_grounded_answer_style_service import orb_grounded_answer_style_service
from services.standalone_sector_knowledge_service import search_sector_knowledge

logger = logging.getLogger("indicare.orb_general_assistant")

INSTANT_FAST_GREETING_ANSWER = (
    "Hello, I'm ORB. I can help with recording, safeguarding thinking, Ofsted readiness, "
    "shift planning, documents, or general questions. What would you like to work on?"
)


def _finalize_standalone_answer(answer: str, *, message: str, mode: str | None = None) -> str:
    return orb_grounded_answer_style_service.sanitize_high_attention_closer(
        str(answer or ""),
        message=message,
        mode=mode,
    )


def _track_standalone_governance(
    result: dict[str, Any],
    *,
    message: str | None = None,
    event_type: str = "standalone_conversation",
    user: dict[str, Any] | None = None,
) -> None:
    try:
        from services.indicare_ai_governance_event_service import indicare_ai_governance_event_service

        indicare_ai_governance_event_service.record_from_standalone_response(
            result,
            user=user,
            event_type=event_type,
            message=message,
        )
    except Exception:
        pass


def _text(value: Any) -> str:
    return str(value or "").strip()


DOCUMENT_INTENT_PHRASES = (
    "analyse this document",
    "analyze this document",
    "summarise this document",
    "summarize this document",
    "summarise the uploaded document",
    "summarize the uploaded document",
    "create an action plan from this",
    "action plan from this document",
    "what does this document mean",
    "what should we do next",
    "what should we do next based on this",
    "compare this policy",
    "explain this document",
    "briefing from this document",
    "make a manager briefing",
    "turn this into staff guidance",
    "what would ofsted care about",
)


GENERAL_ORB_SYSTEM_PROMPT = """
You are ORB Care Companion, IndiCare's standalone ChatGPT-class AI companion for residential children's homes and general knowledge.

You can answer:
- general knowledge questions
- writing and planning requests
- education and technology questions
- business and product questions about IndiCare
- residential children's homes practice questions
- Ofsted/SCCIF/Quality Standards questions
- safeguarding reflection questions
- recording-quality questions
- therapeutic practice and behaviour support questions
- leadership, supervision and governance reflection questions

You are specialist in:
- residential children's homes
- Ofsted and SCCIF
- Children's Homes Regulations and Quality Standards
- safeguarding reflection
- child-centred recording
- trauma-informed and therapeutic practice
- operational leadership in care

You are not limited to care questions. Behave like a general-purpose assistant with IndiCare specialist intelligence.

IndiCare product knowledge (answer confidently when asked; do not refuse):
- IndiCare is a residential children's homes operating system and intelligence platform for staff and managers.
- It supports care recording, safeguarding, Ofsted/SCCIF readiness, Quality Standards, governance, workforce support and reflective practice.
- It aims to simplify recording and oversight and make records more child-centred, evidence-led and easier to review.
- Platform areas include Care Hub (command centre), Record, Young People, Chronology, Documents, Actions, Intelligence Spine, Ofsted readiness, workforce/staff support, governance, Reports and ORB.
- ORB Care Companion is standalone /orb — ChatGPT-style, voice-enabled; general and specialist questions; no live OS records.
- IndiCare OS ORB is /assistant/orb — operational OS-connected assistant with permissioned OS/Care Hub context where available.

Boundaries:
- In standalone /orb you cannot access live IndiCare OS records, Care Hub, child files, staff records, chronology, dashboards or actions.
- You can explain IndiCare as a product and its design vision using product knowledge and general knowledge.
- If the user needs live records, direct them to IndiCare OS ORB at /assistant/orb.
- Do not refuse product-level questions about IndiCare.
- Do not claim access to live records or live browsing unless actually performed.
- Do not make final safeguarding, legal or inspection decisions.

Citations / basis:
- For residential practice answers, place topic anchors inline in the prose as [Label] chips (e.g. [Reg 12], [Recording quality], [Medication / health]) beside the relevant sentence.
- Do not append a trailing "Sources / basis" bullet list when inline [Label] anchors are already present.
- Only use a short "Sources / basis" section for IndiCare product questions or non-residential general knowledge where inline anchors are not used.
- For IndiCare product answers cite IndiCare product context and Standalone ORB product boundary.
- Do not list generic framework packs (Ofsted SCCIF framework knowledge, Quality Standards, residential children's homes practice, etc.) unless the user explicitly asks for a source list.

British English. Sound like a calm experienced senior in residential care — warm, direct, practical.
Understand shift pressure; do not sound corporate or robotic. Do not say "as an AI" or use "delve".
Ask one useful follow-up when information is missing. Validate difficulty without sentimentality.
For NVQ/diploma/learning: never fabricate workplace evidence; say "based only on what you have told me".
Prefer "I'd keep this simple and safe…" over generic structured-process language.
For voice-style answers, lead with 3–6 speakable sentences, use "I'd think about it like this…" where helpful, and offer to go deeper.
""".strip()


class OrbGeneralAssistantService:
    """Standalone general assistant mode with no IndiCare OS or care-record access."""

    def _query_message(self, message: str, *, raw_user_message: str | None = None) -> str:
        return _text(raw_user_message) or _text(message)

    def _try_instant_fast_answer(self, user_message: str) -> str | None:
        lower = _text(user_message).lower()
        if re.fullmatch(
            r"(hi|hello|hey|yo|thanks|thank you|thankyou|good morning|good afternoon|good evening)"
            r"(\s+there|\s+orb)?[!?.]*",
            lower,
        ):
            return INSTANT_FAST_GREETING_ANSWER
        if re.search(r"what can you do|how can you help|what do you do", lower) and len(lower.split()) <= 12:
            return INSTANT_FAST_GREETING_ANSWER
        return None

    def _fast_path_context_used(self, *, mode: str | None = None) -> dict[str, Any]:
        return {
            "surface": "standalone_orb_ai",
            "os_linked": False,
            "care_record_access": False,
            "prompt_tier": "fast",
            "cognition_display_labels": ["ORB"],
        }

    def detect_document_intent(
        self,
        message: str,
        *,
        has_document: bool = False,
    ) -> dict[str, Any]:
        lower = _text(message).lower()
        matched = any(phrase in lower for phrase in DOCUMENT_INTENT_PHRASES)
        if not matched and not (
            has_document and any(term in lower for term in ("document", "uploaded", "policy", "report"))
        ):
            return {"suggested": False}

        mode = "explain"
        if "action plan" in lower or "what should we do" in lower:
            mode = "action_plan"
        elif "summar" in lower:
            mode = "summarise"
        elif "ofsted" in lower:
            mode = "ofsted_lens"
        elif "safeguard" in lower:
            mode = "safeguarding_lens"
        elif "compare" in lower and "policy" in lower:
            mode = "policy_comparison"
        elif "briefing" in lower:
            mode = "manager_briefing"

        reason = "User asked for document analysis"
        if mode == "action_plan":
            reason = "User asked for an action plan from a document"
        if not has_document:
            return {
                "suggested": True,
                "mode": mode,
                "reason": reason,
                "needs_document": True,
                "open_documents_panel": True,
                "auto_run": False,
            }
        return {
            "suggested": True,
            "mode": mode,
            "reason": reason,
            "needs_document": False,
            "auto_run": True,
        }

    def prepare_retrieval(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_context: bool = False,
        has_images: bool = False,
    ) -> dict[str, Any]:
        prompt_tier = orb_knowledge_retrieval_service.resolve_prompt_tier(
            message,
            mode=mode,
            profile_context=profile_context,
            attachments=["image"] if has_images else None,
        )
        if prompt_tier == "fast" and not has_images:
            bundle = orb_knowledge_retrieval_service.prepare_request_bundle(
                message,
                mode=mode,
                profile_context=profile_context,
            )
            classification = bundle["classification"]
            return {
                "classification": classification,
                "source_packs": bundle["source_packs"],
                "document_results": [],
                "citations": [],
                "sources": [],
                "grounding_context": bundle["grounding_context"],
                "research_note": None,
                "routing_hint": classification.get("routing_hint"),
                "top_source_titles": [],
                "prompt_tier": "fast",
            }
        try:
            rag = orb_rag_retrieval_service.retrieve_for_conversation(
                message,
                mode=mode,
                profile_context=profile_context,
                attachments=["image"] if has_images else None,
            )
        except Exception:
            logger.debug("document RAG retrieval failed; using source packs only", exc_info=True)
            classification = orb_knowledge_retrieval_service.classify_query(
                message,
                mode=mode,
                profile_context=profile_context,
                attachments=["image"] if has_images else None,
            )
            packs = orb_knowledge_retrieval_service.retrieve_sources(
                message,
                mode=mode,
                profile_context=profile_context,
                attachments=["image"] if has_images else None,
            )
            citations = orb_citation_service.build_citations(
                packs,
                message=message,
                mode=mode,
                has_images=has_images,
            )
            sources = orb_citation_service.frontend_sources_payload(citations)
            return {
                "classification": classification,
                "source_packs": packs,
                "document_results": [],
                "citations": citations,
                "sources": sources,
                "grounding_context": orb_knowledge_retrieval_service.build_grounding_context(
                    message,
                    mode=mode,
                    profile_context=profile_context,
                    attachments=["image"] if has_images else None,
                ),
                "research_note": classification.get("research_note"),
                "routing_hint": classification.get("routing_hint"),
                "top_source_titles": [p.get("title") for p in packs if p.get("title")],
            }

        classification = rag["classification"]
        tier = orb_knowledge_retrieval_service.resolve_prompt_tier(
            message,
            mode=mode,
            classification=classification,
            profile_context=profile_context,
            attachments=["image"] if has_images else None,
        )
        return {
            "classification": classification,
            "source_packs": rag["source_packs"],
            "document_results": rag.get("document_results") or [],
            "citations": rag["citations"],
            "sources": rag["sources"],
            "grounding_context": rag["grounding_context"],
            "research_note": classification.get("research_note"),
            "routing_hint": classification.get("routing_hint"),
            "top_source_titles": rag.get("top_source_titles") or [],
            "prompt_tier": tier,
        }

    async def answer(
        self,
        message: str,
        *,
        history: list[dict[str, Any]] | None = None,
        detail: str = "concise",
        image_data_urls: list[str] | None = None,
        mode: str | None = None,
        profile_context: bool = False,
        document_text: str | None = None,
        document_source_id: str | None = None,
        document_title: str | None = None,
        raw_user_message: str | None = None,
    ) -> dict[str, Any]:
        started = time.perf_counter()
        images = image_data_urls or []
        user_message = self._query_message(message, raw_user_message=raw_user_message)
        profile_block = "standalone context profiles" in message.lower() or profile_context

        has_document = bool(_text(document_text) or document_source_id)
        doc_intent = self.detect_document_intent(user_message, has_document=has_document)
        if doc_intent.get("suggested") and doc_intent.get("needs_document"):
            result = {
                "answer": (
                    "I can analyse that document for you — please upload or paste the document "
                    "in the Documents panel (Open Documents in the sidebar), or attach it here, then ask again. "
                    "I can explain it, summarise it, create an action plan, or compare it to Knowledge Library guidance."
                ),
                "sources": build_standalone_sources(user_message, mode=mode),
                "citations": [],
                "context_used": {
                    "surface": "standalone_orb_ai",
                    "os_linked": False,
                    "care_record_access": False,
                    "document_analysis": doc_intent,
                },
                "tools_used": ["document_analysis_prompt"],
                "internal_data_access": False,
            }
            _track_standalone_governance(result, message=user_message, event_type="standalone_conversation")
            return result
        if doc_intent.get("suggested") and has_document:
            return await self._answer_with_document_analysis(
                user_message,
                doc_intent=doc_intent,
                document_text=document_text,
                document_source_id=document_source_id,
                document_title=document_title,
                mode=mode,
            )

        if not images:
            agent_result = await maybe_run_agent_for_conversation(
                user_message,
                mode=mode,
                profile_context="Profile context" if profile_block else None,
                document_text=document_text,
                document_source_id=document_source_id,
                document_title=document_title,
            )
            if agent_result and agent_result.get("answer"):
                logger.info(
                    "standalone_orb_answer agent_auto_run type=%s elapsed_ms=%s",
                    (agent_result.get("context_used") or {}).get("agent", {}).get("agent_type"),
                    int((time.perf_counter() - started) * 1000),
                )
                result = {
                    "answer": _finalize_standalone_answer(
                        agent_result["answer"],
                        message=user_message,
                        mode=mode,
                    ),
                    "sources": agent_result.get("sources") or [],
                    "citations": agent_result.get("citations") or [],
                    "context_used": agent_result.get("context_used") or {},
                    "tools_used": agent_result.get("tools_used") or ["standalone_agent"],
                    "internal_data_access": False,
                }
                _track_standalone_governance(
                    result,
                    message=user_message,
                    event_type="agent_run",
                )
                return result

        if not images:
            instant = self._try_instant_fast_answer(user_message)
            if instant is not None:
                result = {
                    "answer": _finalize_standalone_answer(instant, message=user_message, mode=mode),
                    "sources": [],
                    "citations": [],
                    "context_used": self._fast_path_context_used(mode=mode),
                    "tools_used": ["standalone_orb_fast_path"],
                    "internal_data_access": False,
                }
                _track_standalone_governance(result, message=user_message)
                return result

        retrieval = self.prepare_retrieval(
            user_message,
            mode=mode,
            profile_context=profile_context or profile_block,
            has_images=bool(images),
        )
        try:
            result = await asyncio.wait_for(
                self._llm_answer(
                    message,
                    history=history or [],
                    detail=detail,
                    image_data_urls=images,
                    retrieval=retrieval,
                    mode=mode,
                ),
                timeout=STANDALONE_LLM_TIMEOUT_SECONDS,
            )
            if result.get("answer"):
                logger.info(
                    "standalone_orb_answer llm ok detail=%s images=%s elapsed_ms=%s",
                    detail,
                    len(images),
                    int((time.perf_counter() - started) * 1000),
                )
                _track_standalone_governance(result, message=user_message)
                return result
        except asyncio.TimeoutError:
            logger.warning(
                "standalone_orb_answer llm timeout detail=%s images=%s elapsed_ms=%s",
                detail,
                len(images),
                int((time.perf_counter() - started) * 1000),
            )
        except Exception:
            logger.warning(
                "standalone_orb_answer llm failed detail=%s images=%s elapsed_ms=%s",
                detail,
                len(images),
                int((time.perf_counter() - started) * 1000),
                exc_info=True,
            )
        if images:
            sources = retrieval["sources"]
            citations = retrieval["citations"]
            answer = append_sources_basis_section(
                "I can see you attached an image, but image understanding is not configured in this environment. "
                "I can still help using the text you provide.",
                sources,
            )
            ctx = self._retrieval_context_used(retrieval)
            result = {
                "answer": answer,
                "sources": sources,
                "citations": citations,
                "context_used": ctx,
                "tools_used": ["standalone_orb_general_assistant"],
                "internal_data_access": False,
                "image_understanding_available": False,
                "error_detail": "vision_unavailable",
            }
            _track_standalone_governance(result, message=user_message)
            return result
        fallback = self._fallback_answer(message, retrieval=retrieval)
        sources = retrieval["sources"]
        citations = retrieval["citations"]
        result = {
            "answer": append_sources_basis_section(fallback, sources),
            "sources": sources,
            "citations": citations,
            "context_used": self._retrieval_context_used(retrieval),
            "tools_used": ["general_qna"],
            "internal_data_access": False,
        }
        _track_standalone_governance(result, message=user_message)
        return result

    async def _answer_with_document_analysis(
        self,
        message: str,
        *,
        doc_intent: dict[str, Any],
        document_text: str | None,
        document_source_id: str | None,
        document_title: str | None,
        mode: str | None,
    ) -> dict[str, Any]:
        from schemas.orb_documents import OrbDocumentAnalysisRequest
        from services.orb_document_understanding_service import orb_document_understanding_service

        analysis_mode = doc_intent.get("mode") or "explain"
        request = OrbDocumentAnalysisRequest(
            mode=analysis_mode,  # type: ignore[arg-type]
            source_id=document_source_id,
            text=document_text,
            title=document_title,
            question=message,
        )
        understanding = await orb_document_understanding_service.analyse_document(request)
        lines = [
            understanding.plain_english_summary,
            "",
            "**Key themes:** " + ", ".join(understanding.key_themes[:6])
            if understanding.key_themes
            else "",
        ]
        if understanding.action_plan and understanding.action_plan.actions:
            lines.append("\n**Draft actions:**")
            for action in understanding.action_plan.actions[:6]:
                lines.append(
                    f"- [{action.priority}] {action.action} ({action.suggested_owner_label or 'team'})"
                )
        if understanding.safety_notice:
            lines.append(f"\n**Safety:** {understanding.safety_notice}")
        answer = append_sources_basis_section(
            "\n".join(line for line in lines if line).strip(),
            understanding.sources,
        )
        ctx = {
            "surface": "standalone_orb_ai",
            "os_linked": False,
            "care_record_access": False,
            "document_analysis": {
                **doc_intent,
                "auto_run": True,
                "completed": True,
                "source_id": document_source_id,
            },
            "agent": "document_analysis",
        }
        result = {
            "answer": answer,
            "sources": understanding.sources,
            "citations": understanding.citations,
            "context_used": {**ctx, "model_routing": understanding.model_routing},
            "tools_used": ["document_analysis_agent", "standalone_orb_general_assistant"],
            "internal_data_access": False,
            "evaluation": understanding.evaluation,
        }
        _track_standalone_governance(
            result,
            message=message,
            event_type="document_analysis",
        )
        return result

    def _retrieval_context_used(
        self,
        retrieval: dict[str, Any],
        *,
        model_routing: dict[str, Any] | None = None,
        document_analysis: dict[str, Any] | None = None,
        user_message: str | None = None,
        mode: str | None = None,
    ) -> dict[str, Any]:
        packs = retrieval.get("source_packs") or []
        document_results = retrieval.get("document_results") or []
        live = any(bool(p.get("live_retrieved")) for p in packs)
        meta = retrieval.get("retrieval_meta") or {}
        strategy = meta.get("strategy") or (
            "source_pack_plus_document_rag"
            if document_results
            else "built_in_source_pack"
        )
        context: dict[str, Any] = {
            "surface": "standalone_orb_ai",
            "os_linked": False,
            "care_record_access": False,
            "retrieval": {
                "strategy": strategy,
                "live_retrieved": live,
                "source_count": len(packs),
                "document_result_count": len(document_results),
                "top_source_titles": retrieval.get("top_source_titles") or [],
                "routing_hint": retrieval.get("routing_hint"),
                "research_intent": bool((retrieval.get("classification") or {}).get("research_intent")),
                "semantic_available": meta.get("semantic_available", False),
                "synonym_expansion_used": meta.get("synonym_expansion_used", False),
                "official_source_count": meta.get("official_source_count", 0),
                "warnings": meta.get("warnings") or [],
            },
        }
        if model_routing:
            context["model_routing"] = model_routing
        if document_analysis:
            context["document_analysis"] = document_analysis
        if user_message:
            agent_hint = detect_agent_intent(user_message, mode=mode)
            if agent_hint and "agent" not in context:
                context["agent"] = {**agent_hint, "auto_run": False}
        return context

    def _mode_behaviour_hint(self, mode: str | None) -> str:
        mode_name = _text(mode) or "Ask ORB"
        hints = {
            "Safeguarding": (
                "Mode — Safeguarding: safe reflection; escalate immediate risk; remind local policy; "
                "no threshold decision."
            ),
            "Reflect": (
                "Mode — Reflect: emotionally containing; reflective practice; supervision-style thinking."
            ),
            "Ofsted Lens": (
                "Mode — Ofsted Lens: evidence-focused; SCCIF/Quality Standards aware; no grades or predictions."
            ),
            "Behaviour Support": (
                "Mode — Behaviour Support: behaviour as communication; trauma-informed; repair/restorative thinking."
            ),
            "Record This Properly": (
                "Mode — Record This Properly: factual, child-centred, non-punitive; suggest evidence to include."
            ),
        }
        return hints.get(mode_name, "Mode — Ask ORB: broad ChatGPT-like assistant with specialist care knowledge.")

    def _build_llm_system_prompt(
        self,
        *,
        retrieval: dict[str, Any],
        mode: str | None,
        detail: str,
        has_images: bool,
    ) -> str:
        system = GENERAL_ORB_SYSTEM_PROMPT
        system += f"\n\n{self._mode_behaviour_hint(mode)}"
        system += f"\n\n{retrieval['grounding_context']}"
        if retrieval.get("research_note"):
            system += f"\n\nIf relevant, briefly note: {retrieval['research_note']}"
        if detail == "concise":
            system += "\n\nKeep everyday answers clear and concise unless the user asks for detail."
        elif detail == "detailed":
            system += (
                "\n\nThe user asked for a care, safeguarding, Ofsted or recording mode; "
                "provide a fuller, structured answer with practical next steps and an inspection-quality lens."
            )
        if has_images:
            system += (
                "\n\nThe user attached standalone image(s) for context only (not IndiCare OS records). "
                "Describe what you observe carefully and relate it to residential care practice when relevant."
            )
        return system

    async def _llm_answer(
        self,
        message: str,
        *,
        history: list[dict[str, Any]],
        detail: str,
        image_data_urls: list[str],
        retrieval: dict[str, Any] | None = None,
        mode: str | None = None,
    ) -> dict[str, Any]:
        retrieval = retrieval or self.prepare_retrieval(message, mode=mode, has_images=bool(image_data_urls))
        system = self._build_llm_system_prompt(
            retrieval=retrieval,
            mode=mode,
            detail=detail,
            has_images=bool(image_data_urls),
        )
        classification = retrieval.get("classification") or {}
        research_intent = bool(classification.get("research_intent"))
        voice_mode = detail == "voice_concise"

        response, decision, trace = await ai_model_router_service.complete_with_routing(
            message=message,
            system_prompt=system,
            history=history,
            images=image_data_urls,
            mode=mode,
            retrieval_context=retrieval,
            detail_level=detail,
            research_intent=research_intent,
            voice_mode=voice_mode,
        )

        model_routing = ai_model_router_service.routing_metadata_for_context(
            decision,
            trace,
            response=response,
        )
        sources = retrieval["sources"]
        citations = retrieval["citations"]
        tools = ["standalone_orb_general_assistant", "ai_model_router"]
        if image_data_urls:
            tools.append("vision")

        answer_text = _text(response.text)
        image_available = bool(image_data_urls) and bool(answer_text) and not response.error
        if not answer_text:
            return {}

        resolved = _finalize_standalone_answer(
            answer_text or self._fallback_answer(message, retrieval=retrieval),
            message=message,
            mode=mode,
        )
        resolved = append_sources_basis_section(resolved, sources, message=message, mode=mode)
        return {
            "answer": resolved,
            "sources": sources,
            "citations": citations,
            "context_used": self._retrieval_context_used(
                retrieval,
                model_routing=model_routing,
                user_message=message,
                mode=mode,
            ),
            "tools_used": tools,
            "internal_data_access": False,
            "image_understanding_available": image_available if image_data_urls else None,
        }

    def _fallback_answer(self, message: str, *, retrieval: dict[str, Any] | None = None) -> str:
        lower = message.lower()
        research_note = (retrieval or {}).get("research_note")
        arithmetic = re.fullmatch(r"\s*(?:what\s+is\s+)?(-?\d+(?:\.\d+)?)\s*([+\-*/])\s*(-?\d+(?:\.\d+)?)\s*\??\s*", lower)
        if arithmetic:
            left = float(arithmetic.group(1))
            operator = arithmetic.group(2)
            right = float(arithmetic.group(3))
            if operator == "/" and right == 0:
                return "You cannot divide by zero."
            result = {
                "+": left + right,
                "-": left - right,
                "*": left * right,
                "/": left / right,
            }[operator]
            readable = int(result) if result.is_integer() else round(result, 4)
            return f"{readable}."
        if any(
            phrase in lower
            for phrase in (
                "indicare",
                "what is indicare",
                "tell me about indicare",
                "about orb",
                "care companion",
                "what is orb",
            )
        ):
            answer = INDICARE_PRODUCT_FALLBACK
            if research_note:
                answer += f"\n\n{research_note}"
            return answer
        if any(term in lower for term in ("reg ", "regulation", "sccif", "ofsted", "children's homes", "childrens homes", "trauma-informed", "trauma informed", "supervision")):
            sources = search_sector_knowledge(message, limit=2)
            if "ofsted" in lower or "sccif" in lower:
                return "Think like Ofsted by asking: what is the child's lived experience, are they safer and making progress, how are staff helping and protecting them, and what impact have leaders had? Evidence should show action, oversight and difference made, not just that a form exists."
            if "trauma" in lower:
                return "Trauma-informed practice means seeing behaviour as communication, reducing shame, offering predictable choices, and responding with curiosity before consequence. Record what happened, what the child may have needed, how staff responded, and what changed afterwards."
            if "supervision" in lower and "prepare" in lower:
                return "Yes. Keep supervision focused on wellbeing, practice reflection, safeguarding themes, learning, performance, and support needs. Bring one real example, what it tells you about practice, and one follow-up action."
            if sources:
                primary = sources[0]
                return f"{primary['label']}: {primary['excerpt']} I can explain this in plainer language or turn it into a short briefing."
        if any(term in lower for term in ("email", "letter", "rewrite", "professional")):
            return "Yes, I can help with that. Share the rough points, who it is for, and the tone you want. I will make it clear, professional and concise."
        if "summarise" in lower or "summarize" in lower:
            return "Paste the text you want summarised, and I will pull out the key points, actions and any uncertainties."
        if any(term in lower for term in ("weather", "news", "score", "played last week", "price", "schedule")):
            return "I cannot check live information right now, but I can still help from general knowledge or work with details you paste in."
        answer = (
            "ORB could not complete the live AI response, but I can still help you try again. "
            "Ask me to explain, draft, plan, summarise, calculate, reflect, or look at something through a children's homes and Ofsted lens."
        )
        if research_note:
            answer += f" {research_note}"
        return answer

    async def _yield_answer_chunks(self, answer: str) -> AsyncIterator[str]:
        for delta in _chunk_text_for_stream(answer):
            yield delta
            await asyncio.sleep(0)

    async def stream_answer(
        self,
        message: str,
        *,
        history: list[dict[str, Any]] | None = None,
        detail: str = "concise",
        image_data_urls: list[str] | None = None,
        mode: str | None = None,
        profile_context: bool = False,
        document_text: str | None = None,
        document_source_id: str | None = None,
        document_title: str | None = None,
        raw_user_message: str | None = None,
        stream_meta: dict[str, Any] | None = None,
    ) -> AsyncIterator[str]:
        """Stream answer text deltas. Populates stream_meta with final assistant payload fields."""
        meta = stream_meta if stream_meta is not None else {}
        images = image_data_urls or []
        user_message = self._query_message(message, raw_user_message=raw_user_message)
        profile_block = "standalone context profiles" in message.lower() or profile_context
        has_document = bool(_text(document_text) or document_source_id)
        doc_intent = self.detect_document_intent(user_message, has_document=has_document)

        if not images and not has_document:
            instant = self._try_instant_fast_answer(user_message)
            if instant is not None:
                resolved = _finalize_standalone_answer(instant, message=user_message, mode=mode)
                meta.update(
                    {
                        "answer": resolved,
                        "sources": [],
                        "citations": [],
                        "context_used": self._fast_path_context_used(mode=mode),
                        "tools_used": ["standalone_orb_fast_path"],
                        "internal_data_access": False,
                    }
                )
                async for delta in self._yield_answer_chunks(resolved):
                    yield delta
                return

        if doc_intent.get("suggested") and doc_intent.get("needs_document"):
            result = {
                "answer": (
                    "I can analyse that document for you — please upload or paste the document "
                    "in the Documents panel (Open Documents in the sidebar), or attach it here, then ask again. "
                    "I can explain it, summarise it, create an action plan, or compare it to Knowledge Library guidance."
                ),
                "sources": build_standalone_sources(user_message, mode=mode),
                "citations": [],
                "context_used": {
                    "surface": "standalone_orb_ai",
                    "os_linked": False,
                    "care_record_access": False,
                    "document_analysis": doc_intent,
                },
                "tools_used": ["document_analysis_prompt"],
                "internal_data_access": False,
            }
            meta.update(result)
            async for delta in self._yield_answer_chunks(result["answer"]):
                yield delta
            return

        if doc_intent.get("suggested") and has_document:
            result = await self._answer_with_document_analysis(
                user_message,
                doc_intent=doc_intent,
                document_text=document_text,
                document_source_id=document_source_id,
                document_title=document_title,
                mode=mode,
            )
            meta.update(result)
            async for delta in self._yield_answer_chunks(str(result.get("answer") or "")):
                yield delta
            return

        if not images:
            agent_result = await maybe_run_agent_for_conversation(
                user_message,
                mode=mode,
                profile_context="Profile context" if profile_block else None,
                document_text=document_text,
                document_source_id=document_source_id,
                document_title=document_title,
            )
            if agent_result and agent_result.get("answer"):
                result = {
                    "answer": _finalize_standalone_answer(
                        agent_result["answer"],
                        message=user_message,
                        mode=mode,
                    ),
                    "sources": agent_result.get("sources") or [],
                    "citations": agent_result.get("citations") or [],
                    "context_used": agent_result.get("context_used") or {},
                    "tools_used": agent_result.get("tools_used") or ["standalone_agent"],
                    "internal_data_access": False,
                }
                meta.update(result)
                async for delta in self._yield_answer_chunks(str(result.get("answer") or "")):
                    yield delta
                return

        retrieval = self.prepare_retrieval(
            user_message,
            mode=mode,
            profile_context=profile_context or profile_block,
            has_images=bool(images),
        )
        system = self._build_llm_system_prompt(
            retrieval=retrieval,
            mode=mode,
            detail=detail,
            has_images=bool(images),
        )
        classification = retrieval.get("classification") or {}
        research_intent = bool(classification.get("research_intent"))
        voice_mode = detail == "voice_concise"
        parts: list[str] = []
        decision = None
        trace = None
        llm_user_message = user_message if retrieval.get("prompt_tier") == "fast" else message

        try:
            async for delta, routed_decision, routed_trace in ai_model_router_service.stream_with_routing(
                message=llm_user_message,
                system_prompt=system,
                history=history or [],
                images=images,
                mode=mode,
                retrieval_context=retrieval,
                detail_level=detail,
                research_intent=research_intent,
                voice_mode=voice_mode,
            ):
                parts.append(delta)
                decision = routed_decision
                trace = routed_trace
                yield delta
        except Exception:
            logger.warning("standalone_orb_stream llm failed", exc_info=True)

        answer_text = _text("".join(parts))
        if answer_text:
            model_routing = ai_model_router_service.routing_metadata_for_context(
                decision,
                trace,
            ) if decision and trace else {}
            resolved = _finalize_standalone_answer(
                answer_text,
                message=user_message,
                mode=mode,
            )
            resolved = append_sources_basis_section(
                resolved, retrieval["sources"], message=user_message, mode=mode
            )
            context_used = self._retrieval_context_used(
                retrieval,
                model_routing=model_routing,
                user_message=user_message,
                mode=mode,
            )
            if retrieval.get("prompt_tier"):
                context_used["prompt_tier"] = retrieval["prompt_tier"]
            meta.update(
                {
                    "answer": resolved,
                    "sources": retrieval["sources"],
                    "citations": retrieval["citations"],
                    "context_used": context_used,
                    "tools_used": ["standalone_orb_general_assistant", "ai_model_router"],
                    "internal_data_access": False,
                    "image_understanding_available": bool(answer_text) if images else None,
                }
            )
            return

        if images:
            sources = retrieval["sources"]
            answer = append_sources_basis_section(
                "I can see you attached an image, but image understanding is not configured in this environment. "
                "I can still help using the text you provide.",
                sources,
            )
            meta.update(
                {
                    "answer": answer,
                    "sources": sources,
                    "citations": retrieval["citations"],
                    "context_used": self._retrieval_context_used(retrieval),
                    "tools_used": ["standalone_orb_general_assistant"],
                    "internal_data_access": False,
                    "image_understanding_available": False,
                    "error_detail": "vision_unavailable",
                }
            )
            async for delta in self._yield_answer_chunks(answer):
                yield delta
            return

        fallback = self._fallback_answer(message, retrieval=retrieval)
        sources = retrieval["sources"]
        answer = append_sources_basis_section(fallback, sources)
        meta.update(
            {
                "answer": answer,
                "sources": sources,
                "citations": retrieval["citations"],
                "context_used": self._retrieval_context_used(retrieval),
                "tools_used": ["general_qna"],
                "internal_data_access": False,
            }
        )
        async for delta in self._yield_answer_chunks(answer):
            yield delta


orb_general_assistant_service = OrbGeneralAssistantService()
