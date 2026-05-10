from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user
from db.founder_db import (
    create_founder_lead,
    create_founder_strategy_note,
    create_founder_task,
    create_founder_thread,
    ensure_founder_tables,
    get_founder_messages,
    list_founder_leads,
    list_founder_strategy_notes,
    list_founder_tasks,
    list_founder_threads,
    save_founder_message,
    update_founder_lead_status,
    update_founder_task_status,
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


class FounderUpdateLeadStatusRequest(BaseModel):
    status: str = Field(..., min_length=1)


class FounderCreateTaskRequest(BaseModel):
    title: str = Field(..., min_length=1)
    status: str = "open"
    priority: str = "medium"
    due_date: str | None = None
    notes: str | None = None


class FounderUpdateTaskStatusRequest(BaseModel):
    status: str = Field(..., min_length=1)


class FounderCreateStrategyNoteRequest(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field(..., min_length=1)


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


def require_user_id(current_user: dict[str, Any]) -> int:
    user_id = get_user_id(current_user)

    if not user_id:
        raise HTTPException(status_code=401, detail="User could not be identified.")

    return user_id


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
    await ensure_founder_tables()

    user_id = require_user_id(current_user)

    leads = await list_founder_leads(user_id)
    tasks = await list_founder_tasks(user_id)
    notes = await list_founder_strategy_notes(user_id)

    response = await run_founder_quick_action(
        action="dashboard_brain",
        user=current_user,
    )

    open_tasks = [task for task in tasks if task.get("status") != "done"]
    active_leads = [
        lead for lead in leads
        if str(lead.get("status") or "").lower() not in {"closed", "lost", "not_interested"}
    ]

    return {
        "status": "ok",
        "summary": response,
        "widgets": {
            "priorities": open_tasks[:5],
            "leads": active_leads[:5],
            "tasks": open_tasks[:8],
            "risks": [],
            "funding": [],
            "product": [],
            "strategy_notes": notes[:5],
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

    user_id = require_user_id(current_user)
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
    await ensure_founder_tables()

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

    user_id = require_user_id(current_user)

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

    user_id = require_user_id(current_user)

    return {
        "messages": await get_founder_messages(user_id, thread_id),
    }


# ============================================================
# LEADS
# ============================================================

@router.get("/leads")
async def founder_leads(
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = require_user_id(current_user)

    return {
        "leads": await list_founder_leads(user_id),
    }


@router.post("/leads/create")
async def founder_create_lead(
    payload: FounderCreateLeadRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = require_user_id(current_user)

    lead = await create_founder_lead(
        user_id=user_id,
        organisation_name=payload.organisation_name,
        contact_name=payload.contact_name,
        contact_role=payload.contact_role,
        email=payload.email,
        phone=payload.phone,
        website=payload.website,
        status=payload.status,
        notes=payload.notes,
    )

    return {
        "status": "created",
        "lead": lead,
    }


@router.patch("/leads/{lead_id}/status")
async def founder_update_lead_status_route(
    lead_id: int,
    payload: FounderUpdateLeadStatusRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = require_user_id(current_user)

    lead = await update_founder_lead_status(
        user_id=user_id,
        lead_id=lead_id,
        status=payload.status,
    )

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    return {
        "status": "updated",
        "lead": lead,
    }


# ============================================================
# TASKS
# ============================================================

@router.get("/tasks")
async def founder_tasks(
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = require_user_id(current_user)

    return {
        "tasks": await list_founder_tasks(user_id),
    }


@router.post("/tasks/create")
async def founder_create_task(
    payload: FounderCreateTaskRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = require_user_id(current_user)

    task = await create_founder_task(
        user_id=user_id,
        title=payload.title,
        status=payload.status,
        priority=payload.priority,
        due_date=payload.due_date,
        notes=payload.notes,
    )

    return {
        "status": "created",
        "task": task,
    }


@router.patch("/tasks/{task_id}/status")
async def founder_update_task_status_route(
    task_id: int,
    payload: FounderUpdateTaskStatusRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = require_user_id(current_user)

    task = await update_founder_task_status(
        user_id=user_id,
        task_id=task_id,
        status=payload.status,
    )

    if not task:
        raise HTTPException(status_code=404, detail="Task not found.")

    return {
        "status": "updated",
        "task": task,
    }


# ============================================================
# STRATEGY NOTES
# ============================================================

@router.get("/strategy-notes")
async def founder_strategy_notes(
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = require_user_id(current_user)

    return {
        "notes": await list_founder_strategy_notes(user_id),
    }


@router.post("/strategy-notes/create")
async def founder_create_strategy_note(
    payload: FounderCreateStrategyNoteRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    require_founder(current_user)
    await ensure_founder_tables()

    user_id = require_user_id(current_user)

    note = await create_founder_strategy_note(
        user_id=user_id,
        title=payload.title,
        content=payload.content,
    )

    return {
        "status": "created",
        "note": note,
    }