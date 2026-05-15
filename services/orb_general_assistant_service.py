from __future__ import annotations

import os
import re
from typing import Any

from assistant.llm_provider import ChatStreamRequest, get_llm_provider
from services.standalone_sector_knowledge_service import search_sector_knowledge


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbGeneralAssistantService:
    """Everyday assistant mode with no IndiCare record access."""

    async def answer(self, message: str, *, history: list[dict[str, Any]] | None = None, detail: str = "concise") -> dict[str, Any]:
        if os.getenv("OPENAI_API_KEY"):
            try:
                return await self._llm_answer(message, history=history or [], detail=detail)
            except Exception:
                pass
        return {"answer": self._fallback_answer(message), "sources": [], "tools_used": ["general_qna"], "internal_data_access": False}

    async def _llm_answer(self, message: str, *, history: list[dict[str, Any]], detail: str) -> dict[str, Any]:
        provider = get_llm_provider()
        system = (
            "You are Orb's General Assistant Brain inside IndiCare OS. You can answer everyday questions like ChatGPT, "
            "help write and plan, and explain public/general topics. You do not have access to IndiCare care records in "
            "this mode and must not imply you checked records. For current facts, say a live tool is required."
        )
        if detail == "concise":
            system += " Keep answers short unless the user asks for detail."
        elif detail == "detailed":
            system += " The user asked for detailed mode; provide a fuller answer."
        messages = [{"role": "system", "content": system}, *history[-8:], {"role": "user", "content": message}]
        parts: list[str] = []
        async for item in provider.stream_chat(
            ChatStreamRequest(messages=messages, model="gpt-4o-mini", temperature=0.2, max_tokens=900, metadata={"structured_output": False})
        ):
            if isinstance(item, str):
                parts.append(item)
        return {
            "answer": "".join(parts).strip() or self._fallback_answer(message),
            "sources": [],
            "tools_used": ["general_qna"],
            "internal_data_access": False,
        }

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
        if "indicare" in lower:
            return (
                "IndiCare OS is a care operations platform for children's homes. It brings together records, chronology, "
                "daily notes, incidents, safeguarding, handover, actions, reports and inspection-readiness support, with "
                "assistant features that respect role and home permissions."
            )
        if any(term in lower for term in ("reg ", "regulation", "sccif", "ofsted", "children's homes", "childrens homes", "trauma-informed", "trauma informed", "supervision")):
            sources = search_sector_knowledge(message, limit=2)
            if "trauma" in lower:
                return "Trauma-informed practice means noticing behaviour as communication, reducing shame, offering predictable choices, and responding with curiosity before consequence. Keep records factual: what happened, what the child may have needed, what staff did, and what changed."
            if "supervision" in lower and "prepare" in lower:
                return "Yes, I can help. Keep supervision focused on wellbeing, practice reflection, safeguarding themes, learning, actions, and any support the staff member needs. Bring one clear example and one follow-up action."
            if sources:
                primary = sources[0]
                return f"{primary['label']}: {primary['excerpt']} I can explain this in plainer language or turn it into a short briefing."
        if any(term in lower for term in ("email", "letter", "rewrite", "professional")):
            return "Yes, I can help with that. Share the rough points, who it is for, and the tone you want. I will make it clear, professional and concise."
        if "summarise" in lower or "summarize" in lower:
            return "Paste the text you want summarised, and I will pull out the key points, actions and any uncertainties."
        if any(term in lower for term in ("weather", "news", "score", "played last week", "price", "schedule")):
            return "I cannot check live information right now, but I can still help from general knowledge or work with details you paste in."
        return "I can help with that. Ask me for an explanation, draft, plan, summary or calculation, and I will keep it concise."


orb_general_assistant_service = OrbGeneralAssistantService()

