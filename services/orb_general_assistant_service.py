from __future__ import annotations

import asyncio
import logging
import re
import time
from typing import Any

from services.ai_model_router_service import STANDALONE_LLM_TIMEOUT_SECONDS, ai_model_router_service
from services.orb_citation_service import orb_citation_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_rag_retrieval_service import orb_rag_retrieval_service
from services.orb_standalone_sources import (
    INDICARE_PRODUCT_FALLBACK,
    append_sources_basis_section,
    build_standalone_sources,
)
from services.standalone_sector_knowledge_service import search_sector_knowledge

logger = logging.getLogger("indicare.orb_general_assistant")

def _text(value: Any) -> str:
    return str(value or "").strip()


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
- End substantive answers with a short "Sources / basis" section listing honest source labels (no fabricated URLs or quotes).
- For IndiCare product answers cite IndiCare product context and Standalone ORB product boundary.
- For Ofsted/SCCIF cite Ofsted SCCIF framework knowledge and Children's Homes Regulations / Quality Standards where relevant.
- For safeguarding cite safeguarding practice principles and remind users to follow local policy.
- For general knowledge cite general model knowledge unless the user provided context.

British English. Calm, warm, concise when speaking, reflective and practical. For voice-style answers, lead with 3–6 speakable sentences, use "I'd think about it like this…" where helpful, and offer to go deeper.
""".strip()


class OrbGeneralAssistantService:
    """Standalone general assistant mode with no IndiCare OS or care-record access."""

    def prepare_retrieval(
        self,
        message: str,
        *,
        mode: str | None = None,
        profile_context: bool = False,
        has_images: bool = False,
    ) -> dict[str, Any]:
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
    ) -> dict[str, Any]:
        started = time.perf_counter()
        images = image_data_urls or []
        retrieval = self.prepare_retrieval(
            message,
            mode=mode,
            profile_context=profile_context or "standalone context profiles" in message.lower(),
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
            return {
                "answer": answer,
                "sources": sources,
                "citations": citations,
                "context_used": ctx,
                "tools_used": ["standalone_orb_general_assistant"],
                "internal_data_access": False,
                "image_understanding_available": False,
                "error_detail": "vision_unavailable",
            }
        fallback = self._fallback_answer(message, retrieval=retrieval)
        sources = retrieval["sources"]
        citations = retrieval["citations"]
        return {
            "answer": append_sources_basis_section(fallback, sources),
            "sources": sources,
            "citations": citations,
            "context_used": self._retrieval_context_used(retrieval),
            "tools_used": ["general_qna"],
            "internal_data_access": False,
        }

    def _retrieval_context_used(
        self,
        retrieval: dict[str, Any],
        *,
        model_routing: dict[str, Any] | None = None,
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

        resolved = append_sources_basis_section(
            answer_text or self._fallback_answer(message, retrieval=retrieval),
            sources,
        )
        return {
            "answer": resolved,
            "sources": sources,
            "citations": citations,
            "context_used": self._retrieval_context_used(retrieval, model_routing=model_routing),
            "tools_used": tools,
            "internal_data_access": False,
            "image_understanding_available": image_available,
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


orb_general_assistant_service = OrbGeneralAssistantService()
