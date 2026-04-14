from __future__ import annotations

import logging
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, ConfigDict

from auth.current_user import get_current_user
from db.connection import get_db
from services.assistant_orchestrator import build_assistant_prompt

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant-api", tags=["Public Assistant"])


class AssistantScope(BaseModel):
    """
    Public assistant scope.

    We keep the request model tolerant so existing clients do not break,
    but we explicitly block any non-global scope at runtime.
    """

    model_config = ConfigDict(extra="forbid")

    scope_type: Literal["global", "young_person", "home", "quality"] = "global"
    home_id: int | None = None
    young_person_id: int | None = None


class AssistantContextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: AssistantScope


class AssistantPromptRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    message: str = Field(..., min_length=1, max_length=3000)
    scope: AssistantScope | None = None
    history: list[dict[str, Any]] | None = None


def _safe_user_id(current_user: dict[str, Any]) -> int:
    user_id = current_user.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return int(user_id)


def _normalise_public_scope(scope: AssistantScope | None) -> dict[str, Any]:
    """
    Enforce strict separation:
    /assistant-api is public assistant only.
    It must never accept OS-style scoped context.
    """
    if scope is None:
        return {
            "scope_type": "global",
            "home_id": None,
            "young_person_id": None,
        }

    if scope.scope_type != "global":
        raise HTTPException(
            status_code=403,
            detail="Public assistant does not support young person, home, or quality scope.",
        )

    if scope.home_id is not None or scope.young_person_id is not None:
        raise HTTPException(
            status_code=403,
            detail="Public assistant cannot accept home_id or young_person_id.",
        )

    return {
        "scope_type": "global",
        "home_id": None,
        "young_person_id": None,
    }


def _normalise_history(history: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    """
    Keep history shape predictable and safe.
    """
    if not history:
        return []

    safe_history: list[dict[str, str]] = []

    for item in history[:20]:
        if not isinstance(item, dict):
            continue

        role = str(item.get("role") or "").strip().lower()
        content = str(item.get("content") or item.get("message") or "").strip()

        if role not in {"user", "assistant", "system"}:
            continue

        if not content:
            continue

        safe_history.append(
            {
                "role": role,
                "content": content[:3000],
            }
        )

    return safe_history


@router.post("/context")
def get_assistant_context(
    payload: AssistantContextRequest,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        user_id = _safe_user_id(current_user)
        scope = _normalise_public_scope(payload.scope)

        result = build_assistant_prompt(
            conn,
            user_id=user_id,
            message="Provide assistant context only.",
            scope=scope,
            history=[],
            assistant_type="public",
        )

        return {
            "ok": True,
            "context": result.get("context", {}),
            "runtime": {
                **result.get("runtime", {}),
                "assistant_type": "public",
                "scope_enforced": "global",
            },
        }

    except HTTPException:
        raise
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Public assistant context failed")
        raise HTTPException(
            status_code=500,
            detail="Unable to build assistant context.",
        )


@router.post("/prompt")
def build_prompt(
    payload: AssistantPromptRequest,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    try:
        user_id = _safe_user_id(current_user)
        scope = _normalise_public_scope(payload.scope)
        history = _normalise_history(payload.history)

        result = build_assistant_prompt(
            conn,
            user_id=user_id,
            message=payload.message.strip(),
            scope=scope,
            history=history,
            assistant_type="public",
        )

        return {
            "ok": True,
            "prompt": result.get("prompt", ""),
            "context": result.get("context", {}),
            "runtime": {
                **result.get("runtime", {}),
                "assistant_type": "public",
                "scope_enforced": "global",
                "history_items_used": len(history),
            },
        }

    except HTTPException:
        raise
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        logger.exception("Public assistant prompt build failed")
        raise HTTPException(
            status_code=500,
            detail="Unable to build assistant prompt.",
        )