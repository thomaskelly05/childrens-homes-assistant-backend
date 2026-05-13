from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from auth.permissions import require_assistant_access
from db.connection import get_db
from services.assistant_context_service import SharedAssistantContext, build_shared_assistant_context
from services.assistant_prompt_policy import assert_safe_assistant_message, normalise_mode
from services.assistant_response_service import AssistantResponseService

router = APIRouter(prefix="/assistant", tags=["Assistant Query"])
assistant_response_service = AssistantResponseService()


class AssistantQueryRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str = Field(..., min_length=1, max_length=20000)
    mode: str = "embedded"
    context: dict[str, Any] | SharedAssistantContext = Field(default_factory=dict)
    conversation_id: str | None = None
    project_id: str | None = None


def _error_response(status_code: int, code: str, message: str, details: Any = None) -> JSONResponse:
    body: dict[str, Any] = {
        "success": False,
        "error": {
            "code": code,
            "message": message,
        },
    }
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


@router.post("/query")
async def query_assistant(
    payload: AssistantQueryRequest,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    try:
        message = assert_safe_assistant_message(payload.message)
        mode = normalise_mode(payload.mode)
        raw_context = payload.context.model_dump() if isinstance(payload.context, SharedAssistantContext) else dict(payload.context or {})
        context = build_shared_assistant_context(
            current_user=current_user,
            requested_context=raw_context,
            mode=mode,
            conversation_id=payload.conversation_id,
            project_id=payload.project_id,
        )
        data = assistant_response_service.query(
            conn,
            message=message,
            context=context,
            current_user=current_user,
        )
        return {"success": True, "data": data}
    except HTTPException as exc:
        detail = exc.detail if isinstance(exc.detail, str) else "Assistant query failed."
        return _error_response(exc.status_code, "assistant_query_error", detail, exc.detail if not isinstance(exc.detail, str) else None)
    except Exception as exc:
        return _error_response(500, "assistant_query_unavailable", "Assistant query is temporarily unavailable.", str(exc))
