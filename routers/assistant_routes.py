from __future__ import annotations

from typing import Literal, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.current_user import get_current_user
from db.connection import get_db
from services.assistant_orchestrator import build_assistant_prompt

router = APIRouter(prefix="/assistant-api", tags=["Assistant"])


class AssistantScope(BaseModel):
    scope_type: Literal["global", "young_person"] = "global"
    home_id: int | None = None
    young_person_id: int | None = None


class AssistantContextRequest(BaseModel):
    scope: AssistantScope


@router.post("/context")
def get_assistant_context(
    payload: AssistantContextRequest,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        result = build_assistant_prompt(
            conn,
            user_id=current_user["user_id"],
            message="Provide assistant context only.",
            scope=payload.scope.model_dump(),
            history=[],
        )
        return {
            "ok": True,
            "context": result["context"],
            "runtime": result["runtime"],
        }
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


class AssistantPromptRequest(BaseModel):
    message: str
    scope: AssistantScope | None = None
    history: list[dict[str, Any]] | None = None


@router.post("/prompt")
def build_prompt(
    payload: AssistantPromptRequest,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        result = build_assistant_prompt(
            conn,
            user_id=current_user["user_id"],
            message=payload.message,
            scope=payload.scope.model_dump() if payload.scope else None,
            history=payload.history or [],
        )
        return {
            "ok": True,
            "prompt": result["prompt"],
            "context": result["context"],
            "runtime": result["runtime"],
        }
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
