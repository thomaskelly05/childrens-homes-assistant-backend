from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

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
# MODELS
# ============================================================

class FounderChatRequest(BaseModel):
    message: str
    mode: str = "strategy"
    thread_id: int | None = None


class FounderQuickActionRequest(BaseModel):
    action: str


class FounderCreateLeadRequest(BaseModel):
    organisation_name: str
    contact_name: str | None = None
    contact_role: str | None = None


class FounderCreateTaskRequest(BaseModel):
    title: str


# ============================================================
# HELPERS
# ============================================================

def require_founder(current_user: dict[str, Any]):
    role = str(
        current_user.get("role")
        or current_user.get("user_role")
        or ""
    ).lower()

    if role not in FOUNDER_ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Founder only")

    return current_user


def get_user_id(user: dict[str, Any]) -> int:
    return int(user.get("id") or user.get("user_id") or 0)


# ============================================================
# HEALTH
# ============================================================

@router.get("/health")
async def founder_health(current_user=Depends(get_current_user)):
    require_founder(current_user)
    return {"ok": True}


# ============================================================
# AI CHAT
# ============================================================

@router.post("/ai/chat")
async def founder_ai_chat(
    payload: FounderChatRequest,
    current_user=Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = get_user_id(current_user)

    thread_id = payload.thread_id

    if not thread_id:
        thread_id = await create_founder_thread(user_id)

    history = await get_founder_messages(user_id, thread_id)

    await save_founder_message(thread_id, user_id, "user", payload.message)

    response = await run_founder_ai(
        mode=payload.mode,
        message=payload.message,
        user=current_user,
        history=history,
    )

    await save_founder_message(thread_id, user_id, "assistant", response)

    return {
        "thread_id": thread_id,
        "response": response,
    }


# ============================================================
# QUICK ACTIONS
# ============================================================

@router.post("/ai/quick-action")
async def founder_quick_action(
    payload: FounderQuickActionRequest,
    current_user=Depends(get_current_user),
):
    require_founder(current_user)

    response = await run_founder_quick_action(
        action=payload.action,
        user=current_user,
    )

    return {
        "action": payload.action,
        "response": response,
    }


# ============================================================
# THREADS
# ============================================================

@router.get("/threads")
async def founder_threads(current_user=Depends(get_current_user)):
    require_founder(current_user)
    user_id = get_user_id(current_user)
    return await list_founder_threads(user_id)


@router.get("/threads/{thread_id}/messages")
async def founder_thread_messages(
    thread_id: int,
    current_user=Depends(get_current_user),
):
    require_founder(current_user)
    user_id = get_user_id(current_user)
    return await get_founder_messages(user_id, thread_id)


# ============================================================
# SUMMARY (FUTURE DASHBOARD)
# ============================================================

@router.get("/summary")
async def founder_summary(current_user=Depends(get_current_user)):
    require_founder(current_user)

    return {
        "message": "Founder summary endpoint ready",
        "future": [
            "leads",
            "tasks",
            "growth metrics",
            "pipeline",
        ],
    }


# ============================================================
# LEADS (FUTURE CRM)
# ============================================================

@router.get("/leads")
async def founder_leads(current_user=Depends(get_current_user)):
    require_founder(current_user)
    return {"leads": []}


@router.post("/leads/create")
async def founder_create_lead(
    payload: FounderCreateLeadRequest,
    current_user=Depends(get_current_user),
):
    require_founder(current_user)

    return {
        "status": "created",
        "lead": payload.dict(),
    }


# ============================================================
# TASKS
# ============================================================

@router.get("/tasks")
async def founder_tasks(current_user=Depends(get_current_user)):
    require_founder(current_user)
    return {"tasks": []}


@router.post("/tasks/create")
async def founder_create_task(
    payload: FounderCreateTaskRequest,
    current_user=Depends(get_current_user),
):
    require_founder(current_user)

    return {
        "status": "created",
        "task": payload.dict(),
    }