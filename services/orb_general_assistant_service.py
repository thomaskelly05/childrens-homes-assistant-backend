from __future__ import annotations

import os
from typing import Any

from assistant.llm_provider import ChatStreamRequest, get_llm_provider


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
        if "indicare" in lower:
            return (
                "IndiCare OS is a care operations platform for children's homes. It brings together records, chronology, "
                "daily notes, incidents, safeguarding, handover, actions, reports and inspection-readiness support, with "
                "assistant features that respect role and home permissions."
            )
        if any(term in lower for term in ("weather", "news", "score", "played last week", "price", "schedule")):
            return "That is a current-facts question, so Orb needs a configured live tool/search provider before answering reliably."
        return "I can help with that. Ask me for an explanation, draft, plan, summary or calculation, and I will keep it concise."


orb_general_assistant_service = OrbGeneralAssistantService()

