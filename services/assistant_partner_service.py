from __future__ import annotations

from typing import Any

from assistant.llm_provider import ChatStreamRequest, get_llm_provider
from schemas.assistant_partner_api import PartnerAssistantRequest


def _build_system_prompt(mode: str) -> str:
    base = (
        "You are IndiCare Assistant for UK residential children's homes. "
        "You must be safeguarding-aware, factual, and practical. "
        "Use British English."
    )

    if mode == "recording_support":
        return base + " Help improve and structure care records professionally."
    if mode == "chronology":
        return base + " Build clear chronological summaries from provided records."
    if mode == "reg45_review":
        return base + " Identify themes, risks, and strengths for Reg 45 reviews."
    if mode == "safeguarding_review":
        return base + " Highlight safeguarding concerns and risks clearly."

    return base


async def generate_partner_response(payload: PartnerAssistantRequest) -> dict[str, Any]:
    provider = get_llm_provider()

    system_prompt = _build_system_prompt(payload.mode)

    context_blob = ""
    if payload.documents:
        context_blob = "\n\n".join(d.content for d in payload.documents)

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": payload.message + "\n\n" + context_blob},
    ]

    result_text = ""

    async for chunk in provider.stream_chat(
        ChatStreamRequest(messages=messages, metadata={"structured_output": True})
    ):
        if isinstance(chunk, str):
            result_text += chunk
        elif isinstance(chunk, dict):
            result_text = chunk.get("text", result_text)

    return {
        "answer": result_text.strip(),
        "mode": payload.mode,
        "safeguarding_level": "standard",
        "follow_up_required": False,
        "citations": [],
        "suggested_actions": [],
        "conversation_id": payload.conversation_id,
        "metadata": {},
    }
