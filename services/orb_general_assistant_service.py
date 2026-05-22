from __future__ import annotations

import os
import re
from typing import Any

from assistant.llm_provider import ChatStreamRequest, get_llm_provider
from services.standalone_sector_knowledge_service import search_sector_knowledge


def _text(value: Any) -> str:
    return str(value or "").strip()


GENERAL_ORB_SYSTEM_PROMPT = """
You are ORB Care Companion, a standalone general AI assistant for residential children's homes in England.

You should feel as capable and flexible as ChatGPT. Users can ask you to explain, plan, draft, rewrite, summarise, calculate, brainstorm, prepare meetings, create training material, reflect on practice, or think through difficult situations.

Your specialist advantage is residential children's homes, Ofsted thinking, safeguarding, leadership, therapeutic practice and the Children's Homes quality standards. When a question touches care practice, think like an outstanding Ofsted inspector and an experienced registered manager:
- Focus first on children's lived experience, safety, welfare, progress, relationships, belonging and stability.
- Consider how well children are helped and protected.
- Consider the effectiveness of leaders and managers.
- Look for impact, not just policy or process.
- Ask what the evidence would show, what the child would say, what staff actually did, and whether oversight was effective.
- Think about patterns, professional curiosity, drift, delay, escalation and whether actions made a difference.
- Keep trauma-informed, autism-informed and relationship-based practice in mind.
- Support clear, factual, child-centred recording.

You are standalone. You do not access or imply access to IndiCare OS records, CareHub, young person records, staff records, chronology, dashboards, live home data or operational feeds. If the user needs record-aware support, tell them to use the IndiCare OS Assistant inside the OS.

You give guidance and reflection, not statutory, legal, medical or safeguarding decisions. Where there may be immediate risk, tell the user to follow safeguarding procedures and escalate to the right safeguarding lead, manager, local authority or emergency service as appropriate.

Be warm, direct, practical and intelligent. Do not sound like a policy document unless the user asks for formal wording. Give useful answers quickly, then deepen the thinking when the subject involves risk, care quality, inspection or leadership.
""".strip()


class OrbGeneralAssistantService:
    """Standalone general assistant mode with no IndiCare OS or care-record access."""

    async def answer(self, message: str, *, history: list[dict[str, Any]] | None = None, detail: str = "concise") -> dict[str, Any]:
        if os.getenv("OPENAI_API_KEY"):
            try:
                return await self._llm_answer(message, history=history or [], detail=detail)
            except Exception:
                pass
        return {"answer": self._fallback_answer(message), "sources": [], "tools_used": ["general_qna"], "internal_data_access": False}

    async def _llm_answer(self, message: str, *, history: list[dict[str, Any]], detail: str) -> dict[str, Any]:
        provider = get_llm_provider()
        system = GENERAL_ORB_SYSTEM_PROMPT
        if detail == "concise":
            system += "\n\nKeep everyday answers clear and concise unless the user asks for detail."
        elif detail == "detailed":
            system += "\n\nThe user asked for a care, safeguarding, Ofsted or recording mode; provide a fuller, structured answer with practical next steps and an inspection-quality lens."
        messages = [{"role": "system", "content": system}, *history[-8:], {"role": "user", "content": message}]
        parts: list[str] = []
        async for item in provider.stream_chat(
            ChatStreamRequest(messages=messages, model="gpt-4o-mini", temperature=0.2, max_tokens=1200, metadata={"structured_output": False})
        ):
            if isinstance(item, str):
                parts.append(item)
        return {
            "answer": "".join(parts).strip() or self._fallback_answer(message),
            "sources": [],
            "tools_used": ["standalone_orb_general_assistant"],
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
                "IndiCare OS is the operational platform. I am ORB Care Companion, the standalone assistant. "
                "I can give general guidance and Ofsted-style reflection, but I do not access CareHub, records, chronology or dashboards. "
                "For record-aware support, use the IndiCare OS Assistant inside the OS."
            )
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
        return "I can help with that. Ask me to explain, draft, plan, summarise, calculate, reflect, or look at something through a children’s homes and Ofsted lens."


orb_general_assistant_service = OrbGeneralAssistantService()
