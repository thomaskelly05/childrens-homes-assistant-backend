from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status

from auth.current_user import get_current_user
from db.legal_acceptance_db import (
    get_latest_legal_acceptance_for_user,
    has_user_accepted_version,
    record_legal_acceptance,
)
from schemas.legal_acceptance import (
    LegalAcceptanceCreate,
    LegalAcceptanceResponse,
)

router = APIRouter(prefix="/auth", tags=["legal"])

CURRENT_LEGAL_VERSION = "2026-03-29-v1"


def _extract_user_id(user: object) -> int | None:
    if user is None:
        return None

    if isinstance(user, dict):
        value = user.get("id")
        return int(value) if value is not None else None

    value = getattr(user, "id", None)
    return int(value) if value is not None else None


def _extract_user_email(user: object) -> str | None:
    if user is None:
        return None

    if isinstance(user, dict):
        return user.get("email")

    return getattr(user, "email", None)


@router.post("/legal-acceptance", response_model=LegalAcceptanceResponse)
async def create_legal_acceptance(
    payload: LegalAcceptanceCreate,
    request: Request,
    current_user: object = Depends(get_current_user),
) -> LegalAcceptanceResponse:
    user_id = _extract_user_id(current_user)
    email = _extract_user_email(current_user)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    if payload.version != CURRENT_LEGAL_VERSION:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Legal version mismatch",
        )

    forwarded_for = request.headers.get("x-forwarded-for", "")
    ip_address = forwarded_for.split(",")[0].strip() if forwarded_for else None

    if not ip_address and request.client:
        ip_address = request.client.host

    user_agent = request.headers.get("user-agent")

    record_legal_acceptance(
        user_id=user_id,
        email=email,
        legal_version=payload.version,
        accepted_at=payload.accepted_at,
        ip_address=ip_address,
        user_agent=user_agent,
    )

    return LegalAcceptanceResponse(
        ok=True,
        accepted=True,
        version=payload.version,
        accepted_at=payload.accepted_at,
    )


@router.get("/legal-acceptance/current")
async def get_current_legal_acceptance_status(
    current_user: object = Depends(get_current_user),
) -> dict:
    user_id = _extract_user_id(current_user)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    latest = get_latest_legal_acceptance_for_user(user_id)
    accepted_current = has_user_accepted_version(user_id, CURRENT_LEGAL_VERSION)

    return {
        "ok": True,
        "current_version": CURRENT_LEGAL_VERSION,
        "accepted_current_version": accepted_current,
        "latest_acceptance": latest,
    }
