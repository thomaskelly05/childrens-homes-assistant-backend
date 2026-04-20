from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from fastapi import HTTPException

from auth.current_user import get_current_user
from db.connection import get_db
from routers.assistant_routes import (
    HomeAssistantPayload,
    QualityAssistantPayload,
    ReportSendPayload,
    YoungPersonAssistantPayload,
    ask_home_assistant as _legacy_ask_home_assistant,
    ask_quality_assistant as _legacy_ask_quality_assistant,
    ask_young_person_assistant as _legacy_ask_young_person_assistant,
    preview_report as _legacy_preview_report,
    send_report_now as _legacy_send_report_now,
)
from services.assistant_security import contains_prompt_injection_attempt, role_can_access_scope, safe_string

router = APIRouter(prefix="/assistant/os", tags=["OS Assistant"])


def _normalise_role(current_user: dict[str, Any]) -> str:
    return safe_string(current_user.get("role")).lower()


def _assert_scope_access(current_user: dict[str, Any], scope: str) -> None:
    role = _normalise_role(current_user)
    if not role_can_access_scope(role, scope):
        raise HTTPException(status_code=403, detail="Role does not have access to requested scope.")


def _assert_safe_message(message: str) -> None:
    if contains_prompt_injection_attempt(message):
        raise HTTPException(status_code=400, detail="Prompt injection attempt detected.")


@router.post("/young-people/stream")
async def ask_young_person_assistant(
    payload: YoungPersonAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_scope_access(current_user, "child")
    _assert_safe_message(payload.message)
    return await _legacy_ask_young_person_assistant(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@router.post("/home/stream")
async def ask_home_assistant(
    payload: HomeAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_scope_access(current_user, "home")
    _assert_safe_message(payload.message)
    return await _legacy_ask_home_assistant(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@router.post("/quality/stream")
async def ask_quality_assistant(
    payload: QualityAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    _assert_scope_access(current_user, "quality")
    _assert_safe_message(payload.message)
    return await _legacy_ask_quality_assistant(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@router.post("/reports/preview")
async def preview_report(
    payload: HomeAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await _legacy_preview_report(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@router.post("/reports/send-now")
async def send_report_now(
    payload: ReportSendPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return await _legacy_send_report_now(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )
