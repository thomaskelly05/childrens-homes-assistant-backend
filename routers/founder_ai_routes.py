from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user
from db.founder_db import (
    create_founder_thread,
    ensure_founder_tables,
    get_founder_messages,
    list_founder_threads,
    save_founder_message,
)
from services.founder_ai_service import (
    normalise_founder_mode,
    run_founder_ai,
    run_founder_quick_action,
)


router = APIRouter(prefix="/founder", tags=["Founder HQ"])


FOUNDER_ALLOWED_ROLES = {
    "founder",
    "owner",
    "super_admin",
    "superadmin",
}


# ============================================================
# REQUEST MODELS
# ============================================================

class FounderChatRequest(BaseModel):
    message: str = Field(..., min_length=1)
    mode: str = "strategy"
    thread_id: int | None = None
    title: str | None = None


class FounderQuickActionRequest(BaseModel):
    action: str = Field(..., min_length=1)


class FounderCreateLeadRequest(BaseModel):
    organisation_name: str = Field(..., min_length=1)
    contact_name: str | None = None
    contact_role: str | None = None
    email: str | None = None
    phone: str | None = None
    website: str | None = None
    status: str = "new"
    notes: str | None = None


class FounderCreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1)
    status: str = "open"
    priority: str = "medium"
    due_date: str | None = None
    notes: str | None = None


# ============================================================
# HELPERS
# ============================================================

def get_user_id(current_user: dict[str, Any]) -> int:
    raw_id = (
        current_user.get("id")
        or current_user.get("user_id")
        or current_user.get("sub")
        or 0
    )

    try:
        return int(raw_id)
    except Exception:
        return 0


def get_user_role(current_user: dict[str, Any]) -> str:
    return str(
        current_user.get("role")
        or current_user.get("user_role")
        or current_user.get("account_role")
        or ""
    ).strip().lower()


def require_founder(current_user: dict[str, Any]) -> dict[str, Any]:
    role = get_user_role(current_user)

    if role not in FOUNDER_ALLOWED_ROLES:
        raise HTTPException(
            status_code=403,
            detail="Founder HQ is restricted to founder users only.",
        )

    return current_user


# ============================================================
# HEALTH
# ============================================================

@router.get("/health")
async def founder_health(
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)

    return {
        "ok": True,
        "area": "founder_hq",
        "role": get_user_role(current_user),
    }


# ============================================================
# DASHBOARD BRAIN
# ============================================================

@router.get("/summary")
async def founder_summary(
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)

    response = await run_founder_quick_action(
        action="dashboard_brain",
        user=current_user,
    )

    return {
        "status": "ok",
        "summary": response,
        "widgets": {
            "priorities": [],
            "leads": [],
            "tasks": [],
            "risks": [],
            "funding": [],
            "product": [],
        },
    }


# ============================================================
# AI CHAT
# ============================================================

@router.post("/ai/chat")
async def founder_ai_chat(
    payload: FounderChatRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = get_user_id(current_user)
    if not user_id:
        raise HTTPException(status_code=401, detail="User could not be identified.")

    mode = normalise_founder_mode(payload.mode)

    thread_id = payload.thread_id
    if not thread_id:
        thread_id = await create_founder_thread(
            user_id=user_id,
            title=payload.title or f"Founder {mode.title()} Chat",
            mode=mode,
        )

    history = await get_founder_messages(user_id, thread_id)

    await save_founder_message(
        thread_id=thread_id,
        user_id=user_id,
        role="user",
        content=payload.message,
    )

    response_text = await run_founder_ai(
        mode=mode,
        message=payload.message,
        user=current_user,
        history=history,
    )

    await save_founder_message(
        thread_id=thread_id,
        user_id=user_id,
        role="assistant",
        content=response_text,
    )

    return {
        "thread_id": thread_id,
        "mode": mode,
        "response": response_text,
    }


# ============================================================
# QUICK ACTIONS
# ============================================================

@router.post("/ai/quick-action")
async def founder_quick_action(
    payload: FounderQuickActionRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)

    response = await run_founder_quick_action(
        action=payload.action,
        user=current_user,
    )

    return {
        "status": "ok",
        "action": payload.action,
        "response": response,
    }


# ============================================================
# THREADS
# ============================================================

@router.get("/threads")
async def founder_threads(
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = get_user_id(current_user)

    return {
        "threads": await list_founder_threads(user_id),
    }


@router.get("/threads/{thread_id}/messages")
async def founder_thread_messages(
    thread_id: int,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = get_user_id(current_user)

    return {
        "messages": await get_founder_messages(user_id, thread_id),
    }


# ============================================================
# LEADS - FUTURE CRM READY
# ============================================================

@router.get("/leads")
async def founder_leads(
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)

    return {
        "leads": [],
        "message": "Founder leads endpoint ready.",
    }


@router.post("/leads/create")
async def founder_create_lead(
    payload: FounderCreateLeadRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)

    return {
        "status": "created",
        "lead": payload.dict(),
        "message": "Lead route is ready. Database persistence can be connected next.",
    }


# ============================================================
# TASKS - FUTURE COMMAND CENTRE READY
# ============================================================

@router.get("/tasks")
async def founder_tasks(
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)

    return {
        "tasks": [],
        "message": "Founder tasks endpoint ready.",
    }


@router.post("/tasks/create")
async def founder_create_task(
    payload: FounderCreateTaskRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)

    return {
        "status": "created",
        "task": payload.dict(),
        "message": "Task route is ready. Database persistence can be connected next.",
    }