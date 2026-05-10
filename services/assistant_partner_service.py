from __future__ import annotations

from typing import Any

from schemas.assistant_partner_api import PartnerAssistantRequest
from services.assistant_general_service import generate_general_assistant_stream


def _build_partner_message(payload: PartnerAssistantRequest) -> str:
    parts: list[str] = [payload.message]

    if payload.mode != "general":
        parts.append(f"\nRequested assistant mode: {payload.mode}")

    if payload.context:
        context_lines = []
        if payload.context.host_system:
            context_lines.append(f"Host system: {payload.context.host_system}")
        if payload.context.user_role:
            context_lines.append(f"User role: {payload.context.user_role}")
        if payload.context.record_type:
            context_lines.append(f"Record type: {payload.context.record_type}")

        if context_lines:
            parts.append("\nContext:\n" + "\n".join(context_lines))

    if payload.documents:
        document_blocks = []
        for index, document in enumerate(payload.documents, start=1):
            document_blocks.append(
                "\n".join(
                    [
                        f"Document {index}: {document.title}",
                        f"Source type: {document.source_type or 'not provided'}",
                        "Content:",
                        document.content,
                    ]
                )
            )
        parts.append("\nProvided material:\n" + "\n\n".join(document_blocks))

    return "\n\n".join(parts).strip()


async def generate_partner_response(payload: PartnerAssistantRequest) -> dict[str, Any]:
    answer_parts: list[str] = []
    sources: list[dict[str, Any]] = []
    runtime: dict[str, Any] = {}
    explainability: dict[str, Any] = {}
    suggested_actions_raw: list[Any] = []

    partner_message = _build_partner_message(payload)

    async for item in generate_general_assistant_stream(
        message=partner_message,
        history=None,
        response_mode="balanced",
        user_id=None,
        conversation_id=payload.conversation_id,
    ):
        if not isinstance(item, dict):
            continue

        item_type = item.get("type")

        if item_type == "token":
            content = str(item.get("content") or "")
            if content:
                answer_parts.append(content)
            continue

        if item_type == "meta":
            if isinstance(item.get("sources"), list):
                sources = item.get("sources") or []
            if isinstance(item.get("runtime"), dict):
                runtime = item.get("runtime") or {}
            if isinstance(item.get("explainability"), dict):
                explainability = item.get("explainability") or {}
            if isinstance(item.get("suggested_actions"), list):
                suggested_actions_raw = item.get("suggested_actions") or []

    citations = []
    for source in sources:
        if not isinstance(source, dict):
            continue
        title = str(source.get("title") or source.get("name") or "Source").strip()
        citations.append(
            {
                "title": title,
                "source_type": source.get("source_type") or source.get("type"),
                "source_id": source.get("source_id") or source.get("id"),
                "excerpt": source.get("excerpt") or source.get("summary"),
            }
        )

    suggested_actions = []
    for action in suggested_actions_raw:
        if isinstance(action, str) and action.strip():
            suggested_actions.append(
                {
                    "label": action.strip(),
                    "action_type": "suggestion",
                    "payload": {},
                }
            )
        elif isinstance(action, dict):
            suggested_actions.append(
                {
                    "label": str(action.get("label") or action.get("title") or "Suggested action"),
                    "action_type": str(action.get("action_type") or action.get("type") or "suggestion"),
                    "payload": action.get("payload") if isinstance(action.get("payload"), dict) else {},
                }
            )

    metadata = {
        "runtime": runtime,
        "explainability": explainability,
        "uses_same_assistant_pipeline": True,
        "assistant_source": "services.assistant_general_service.generate_general_assistant_stream",
    }

    return {
        "answer": "".join(answer_parts).strip(),
        "mode": payload.mode,
        "safeguarding_level": "standard",
        "follow_up_required": False,
        "citations": citations,
        "suggested_actions": suggested_actions,
        "conversation_id": payload.conversation_id,
        "metadata": metadata,
    }
