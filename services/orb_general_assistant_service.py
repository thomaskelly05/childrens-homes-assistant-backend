from __future__ import annotations

import asyncio
import logging
import os
import re
import time
from typing import Any

from assistant.llm_provider import ChatStreamRequest, get_llm_provider
from services.orb_standalone_sources import (
    INDICARE_PRODUCT_FALLBACK,
    append_sources_basis_section,
    build_standalone_sources,
)
from services.standalone_sector_knowledge_service import search_sector_knowledge

logger = logging.getLogger("indicare.orb_general_assistant")

STANDALONE_LLM_TIMEOUT_SECONDS = 40.0


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

    async def answer(
        self,
        message: str,
        *,
        history: list[dict[str, Any]] | None = None,
        detail: str = "concise",
        image_data_urls: list[str] | None = None,
    ) -> dict[str, Any]:
        started = time.perf_counter()
        images = image_data_urls or []
        if os.getenv("OPENAI_API_KEY"):
            try:
                result = await asyncio.wait_for(
                    self._llm_answer(
                        message,
                        history=history or [],
                        detail=detail,
                        image_data_urls=images,
                    ),
                    timeout=STANDALONE_LLM_TIMEOUT_SECONDS,
                )
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
            sources = build_standalone_sources(message, has_images=True)
            answer = append_sources_basis_section(
                "I can see you attached an image, but image understanding is not configured in this environment. "
                "I can still help using the text you provide.",
                sources,
            )
            return {
                "answer": answer,
                "sources": sources,
                "tools_used": ["standalone_orb_general_assistant"],
                "internal_data_access": False,
                "image_understanding_available": False,
                "error_detail": "vision_unavailable",
            }
        fallback = self._fallback_answer(message)
        sources = build_standalone_sources(message)
        return {
            "answer": append_sources_basis_section(fallback, sources),
            "sources": sources,
            "tools_used": ["general_qna"],
            "internal_data_access": False,
        }

    async def _llm_answer(
        self,
        message: str,
        *,
        history: list[dict[str, Any]],
        detail: str,
        image_data_urls: list[str],
    ) -> dict[str, Any]:
        system = GENERAL_ORB_SYSTEM_PROMPT
        if detail == "concise":
            system += "\n\nKeep everyday answers clear and concise unless the user asks for detail."
        elif detail == "detailed":
            system += "\n\nThe user asked for a care, safeguarding, Ofsted or recording mode; provide a fuller, structured answer with practical next steps and an inspection-quality lens."
        if image_data_urls:
            system += (
                "\n\nThe user attached standalone image(s) for context only (not IndiCare OS records). "
                "Describe what you observe carefully and relate it to residential care practice when relevant."
            )

        if image_data_urls:
            answer = await self._vision_answer(
                system=system,
                message=message,
                history=history,
                image_data_urls=image_data_urls,
            )
            sources = build_standalone_sources(message, has_images=True)
            resolved = append_sources_basis_section(answer or self._fallback_answer(message), sources)
            return {
                "answer": resolved,
                "sources": sources,
                "tools_used": ["standalone_orb_general_assistant", "vision"],
                "internal_data_access": False,
                "image_understanding_available": bool(answer),
            }

        provider = get_llm_provider()
        messages = [{"role": "system", "content": system}, *history[-16:], {"role": "user", "content": message}]
        parts: list[str] = []
        async for item in provider.stream_chat(
            ChatStreamRequest(
                messages=messages,
                model="gpt-4o-mini",
                temperature=0.2,
                max_tokens=1200,
                metadata={"structured_output": False},
            )
        ):
            if isinstance(item, str):
                parts.append(item)
        answer = "".join(parts).strip() or self._fallback_answer(message)
        sources = build_standalone_sources(
            message,
            profile_context="standalone context profiles" in message.lower(),
        )
        return {
            "answer": append_sources_basis_section(answer, sources),
            "sources": sources,
            "tools_used": ["standalone_orb_general_assistant"],
            "internal_data_access": False,
            "image_understanding_available": False,
        }

    async def _vision_answer(
        self,
        *,
        system: str,
        message: str,
        history: list[dict[str, Any]],
        image_data_urls: list[str],
    ) -> str:
        from openai import AsyncOpenAI

        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            return ""

        client = AsyncOpenAI(api_key=api_key, timeout=STANDALONE_LLM_TIMEOUT_SECONDS)
        user_content: list[dict[str, Any]] = [{"type": "text", "text": message}]
        for url in image_data_urls[:4]:
            user_content.append({"type": "image_url", "image_url": {"url": url}})

        chat_messages: list[dict[str, Any]] = [{"role": "system", "content": system}]
        for item in history[-8:]:
            role = str(item.get("role") or "").strip().lower()
            content = _text(item.get("content"))
            if role in {"user", "assistant"} and content:
                chat_messages.append({"role": role, "content": content})
        chat_messages.append({"role": "user", "content": user_content})

        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=chat_messages,
            temperature=0.2,
            max_tokens=1200,
        )
        return _text(response.choices[0].message.content if response.choices else "")

    def _fallback_answer(self, message: str) -> str:
        lower = message.lower()
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
            return INDICARE_PRODUCT_FALLBACK
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
        return (
            "ORB could not complete the live AI response, but I can still help you try again. "
            "Ask me to explain, draft, plan, summarise, calculate, reflect, or look at something through a children's homes and Ofsted lens."
        )


orb_general_assistant_service = OrbGeneralAssistantService()
