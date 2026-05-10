"""Legacy compatibility wrapper for the IndiCare residential care Copilot.

Do not call OpenAI directly from product code. The production assistant must go
through services.ai_service.generate_ai_stream so that conversation continuity,
role context, evidence grounding, regulation mapping, citations, audit metadata
and answer-quality checks are all applied consistently.
"""

from __future__ import annotations

from services.ai_service import generate_ai_stream


async def ask_openai(prompt: str) -> str:
    """Compatibility wrapper for older callers.

    This preserves the old function name but routes the request through the
    orchestrated assistant pipeline instead of the old one-line system prompt.
    New code should call generate_ai_stream directly.
    """
    answer_parts: list[str] = []

    async for item in generate_ai_stream(
        message=prompt,
        session_id="legacy-openai-service",
        history=[],
        response_mode="balanced",
        user_context={
            "assistant_type": "standalone",
            "role": "residential care worker",
            "legacy_entrypoint": "services.openai_service.ask_openai",
        },
    ):
        if isinstance(item, str):
            answer_parts.append(item)
            continue

        if not isinstance(item, dict):
            continue

        item_type = item.get("type")
        if item_type == "token":
            answer_parts.append(str(item.get("content") or ""))
        elif item_type == "text":
            answer_parts.append(str(item.get("content") or item.get("text") or ""))

    return "".join(answer_parts).strip()
