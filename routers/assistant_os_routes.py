from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException

from auth.errors import forbidden, unauthorised
from auth.permissions import require_assistant_access
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
from services.assistant_security import (
    contains_prompt_injection_attempt,
    role_can_access_scope,
    safe_string,
)
from services.young_people_assistant_context_service import build_young_person_assistant_context
from services.ai_reasoning_service import run_os_reasoning

router = APIRouter(prefix="/assistant/os", tags=["OS Assistant"])

MAX_ASSISTANT_MESSAGE_CHARS = 6000


def _normalise_role(current_user: dict[str, Any]) -> str:
    return safe_string(current_user.get("role")).lower()


def _safe_user_id(current_user: dict[str, Any]) -> int | None:
    raw_user_id = (
        current_user.get("id")
        or current_user.get("user_id")
        or current_user.get("sub")
    )

    try:
        return int(raw_user_id)
    except (TypeError, ValueError):
        return None


def _safe_home_id(current_user: dict[str, Any]) -> int | None:
    raw_home_id = (
        current_user.get("home_id")
        or current_user.get("selected_home_id")
        or current_user.get("default_home_id")
    )

    try:
        return int(raw_home_id)
    except (TypeError, ValueError):
        return None


def _assert_scope_access(current_user: dict[str, Any], scope: str) -> None:
    role = _normalise_role(current_user)

    if not role_can_access_scope(role, scope):
        raise forbidden("permission_denied", "Role does not have access to requested scope.")


def _assert_authenticated_user(current_user: dict[str, Any]) -> None:
    if not isinstance(current_user, dict) or not current_user:
        raise unauthorised("not_authenticated", "Authentication required.")

    if _safe_user_id(current_user) is None:
        raise unauthorised("session_invalid", "Valid authenticated user required.")


def _assert_safe_message(message: str) -> None:
    clean_message = safe_string(message)

    if not clean_message:
        raise HTTPException(status_code=400, detail="Message is required.")

    if len(clean_message) > MAX_ASSISTANT_MESSAGE_CHARS:
        raise HTTPException(
            status_code=413,
            detail=f"Message is too long. Maximum length is {MAX_ASSISTANT_MESSAGE_CHARS} characters.",
        )

    if contains_prompt_injection_attempt(clean_message):
        raise HTTPException(
            status_code=400,
            detail="Prompt injection attempt detected.",
        )


def _assert_home_context_for_scope(
    current_user: dict[str, Any],
    scope: str,
) -> None:
    role = _normalise_role(current_user)

    if role in {"super_admin", "superadmin", "admin", "administrator"}:
        return

    if scope in {"child", "home"} and _safe_home_id(current_user) is None:
        raise HTTPException(
            status_code=403,
            detail="No home context is available for this assistant scope.",
        )


def _preflight_assistant_request(
    *,
    current_user: dict[str, Any],
    scope: str,
    message: str,
) -> None:
    _assert_authenticated_user(current_user)
    _assert_scope_access(current_user, scope)
    _assert_home_context_for_scope(current_user, scope)
    _assert_safe_message(message)


@router.get("/context/{young_person_id}")
def get_os_context(
    young_person_id: int,
    current_user=Depends(require_assistant_access),
):
    _assert_authenticated_user(current_user)
    _assert_scope_access(current_user, "child")

    return build_young_person_assistant_context(
        young_person_id=young_person_id
    )


@router.post("/reason")
async def reason_about_child(
    payload: dict,
    current_user=Depends(require_assistant_access),
):
    _assert_authenticated_user(current_user)
    _assert_scope_access(current_user, "child")

    young_person_id = payload.get("young_person_id")
    question = payload.get("question")

    if not young_person_id:
        raise HTTPException(status_code=400, detail="young_person_id is required")

    _assert_safe_message(question or "")

    context = build_young_person_assistant_context(
        young_person_id=int(young_person_id)
    )

    answer = await run_os_reasoning(
        question=question,
        context=context,
    )

    return {"ok": True, "answer": answer}


@router.post("/young-people/stream")
async def ask_young_person_assistant(
    payload: YoungPersonAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    _preflight_assistant_request(
        current_user=current_user,
        scope="child",
        message=payload.message,
    )

    return await _legacy_ask_young_person_assistant(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@router.post("/home/stream")
async def ask_home_assistant(
    payload: HomeAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    _preflight_assistant_request(
        current_user=current_user,
        scope="home",
        message=payload.message,
    )

    return await _legacy_ask_home_assistant(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@router.post("/quality/stream")
async def ask_quality_assistant(
    payload: QualityAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    _preflight_assistant_request(
        current_user=current_user,
        scope="quality",
        message=payload.message,
    )

    return await _legacy_ask_quality_assistant(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@router.post("/reports/preview")
async def preview_report(
    payload: HomeAssistantPayload,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    _preflight_assistant_request(
        current_user=current_user,
        scope="home",
        message=payload.message,
    )

    return await _legacy_preview_report(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )


@router.post("/reports/send-now")
async def send_report_now(
    payload: ReportSendPayload,
    conn=Depends(get_db),
    current_user=Depends(require_assistant_access),
):
    _assert_authenticated_user(current_user)
    _assert_scope_access(current_user, "home")
    _assert_home_context_for_scope(current_user, "home")

    return await _legacy_send_report_now(
        payload=payload,
        conn=conn,
        current_user=current_user,
    )
