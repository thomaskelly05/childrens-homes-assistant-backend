from __future__ import annotations

import base64
import io

import pyotp
import qrcode
from fastapi import APIRouter, HTTPException, Request, status

from auth.mfa_guard import (
    SESSION_MFA_VERIFIED_KEY,
    SESSION_USER_EMAIL_KEY,
    SESSION_USER_ID_KEY,
    clear_auth_session,
    get_session_user_email,
    get_session_user_id,
    is_mfa_verified_in_session,
)
from db.mfa_db import (
    count_unused_recovery_codes,
    enable_user_mfa,
    generate_and_store_recovery_codes,
    get_user_mfa,
    log_auth_event,
    update_last_verified,
    upsert_user_mfa_secret,
    use_recovery_code,
)
from schemas.mfa import (
    MfaChallengeRequest,
    MfaSetupResponse,
    MfaStatusResponse,
    MfaVerifyEnableRequest,
    RecoveryCodeVerifyRequest,
)

router = APIRouter(prefix="/auth/mfa", tags=["mfa"])

TOTP_ISSUER = "IndiCare"


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def _user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


def _log_mfa_event(
    request: Request,
    *,
    user_id: int | None,
    email: str | None,
    event_type: str,
    detail: str,
) -> None:
    log_auth_event(
        user_id=user_id,
        email=email,
        event_type=event_type,
        ip_address=_client_ip(request),
        user_agent=_user_agent(request),
        detail=detail,
    )


def _require_session_user(request: Request) -> tuple[int, str | None]:
    user_id = get_session_user_id(request)
    email = get_session_user_email(request)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
        )

    return user_id, email


def _get_mfa_row_or_none(user_id: int):
    return get_user_mfa(user_id)


def _require_enabled_mfa(user_id: int):
    row = _get_mfa_row_or_none(user_id)
    if not row or not bool(row.get("is_enabled")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this account.",
        )
    return row


def _build_qr_data_url(otp_url: str) -> str:
    img = qrcode.make(otp_url)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{encoded}"


def _persist_verified_session(request: Request, user_id: int, email: str | None) -> None:
    request.session[SESSION_USER_ID_KEY] = int(user_id)
    request.session[SESSION_USER_EMAIL_KEY] = email or ""
    request.session[SESSION_MFA_VERIFIED_KEY] = True
    request.state.mfa_verified = True


@router.get("/status", response_model=MfaStatusResponse)
async def mfa_status(request: Request):
    user_id, _email = _require_session_user(request)
    row = _get_mfa_row_or_none(user_id)
    enabled = bool(row and bool(row.get("is_enabled")))

    return MfaStatusResponse(
        ok=True,
        enabled=enabled,
        verified_in_session=is_mfa_verified_in_session(request),
        recovery_codes_remaining=count_unused_recovery_codes(user_id) if enabled else 0,
    )


@router.post("/setup", response_model=MfaSetupResponse)
async def mfa_setup(request: Request):
    user_id, email = _require_session_user(request)

    secret = pyotp.random_base32()
    upsert_user_mfa_secret(user_id=user_id, email=email, totp_secret=secret)

    label = email or f"user-{user_id}"
    otp_url = pyotp.TOTP(secret).provisioning_uri(name=label, issuer_name=TOTP_ISSUER)
    qr_code_data_url = _build_qr_data_url(otp_url)

    _log_mfa_event(
        request,
        user_id=user_id,
        email=email,
        event_type="mfa_setup_started",
        detail="TOTP setup initiated",
    )

    return MfaSetupResponse(
        ok=True,
        secret=secret,
        otp_auth_url=otp_url,
        qr_code_data_url=qr_code_data_url,
    )


@router.post("/enable")
async def mfa_enable(request: Request, payload: MfaVerifyEnableRequest):
    user_id, email = _require_session_user(request)
    row = _get_mfa_row_or_none(user_id)

    if not row:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA setup has not been started.",
        )

    totp = pyotp.TOTP(row["totp_secret"])
    if not totp.verify(payload.code, valid_window=1):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid authentication code.",
        )

    enable_user_mfa(user_id)
    update_last_verified(user_id)
    _persist_verified_session(request, user_id, email)
    recovery_codes = generate_and_store_recovery_codes(user_id, count=8)

    _log_mfa_event(
        request,
        user_id=user_id,
        email=email,
        event_type="mfa_enabled",
        detail="MFA enabled successfully",
    )

    return {
        "ok": True,
        "enabled": True,
        "verified": True,
        "mfa_verified": True,
        "recovery_codes": recovery_codes,
        "detail": "MFA enabled successfully.",
        "redirect_to": "/assistant",
    }


@router.post("/verify")
async def mfa_verify(request: Request, payload: MfaChallengeRequest):
    user_id, email = _require_session_user(request)
    row = _require_enabled_mfa(user_id)

    totp = pyotp.TOTP(row["totp_secret"])
    if not totp.verify(payload.code, valid_window=1):
        _log_mfa_event(
            request,
            user_id=user_id,
            email=email,
            event_type="mfa_verify_failed",
            detail="Invalid TOTP code",
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid authentication code.",
        )

    update_last_verified(user_id)
    _persist_verified_session(request, user_id, email)

    _log_mfa_event(
        request,
        user_id=user_id,
        email=email,
        event_type="mfa_verified",
        detail="MFA challenge passed",
    )

    return {
        "ok": True,
        "verified": True,
        "mfa_verified": True,
        "redirect_to": "/assistant",
    }


@router.post("/verify-recovery")
async def mfa_verify_recovery(request: Request, payload: RecoveryCodeVerifyRequest):
    user_id, email = _require_session_user(request)

    ok = use_recovery_code(user_id, payload.recovery_code.strip().upper())
    if not ok:
        _log_mfa_event(
            request,
            user_id=user_id,
            email=email,
            event_type="mfa_recovery_failed",
            detail="Invalid recovery code",
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid recovery code.",
        )

    update_last_verified(user_id)
    _persist_verified_session(request, user_id, email)

    _log_mfa_event(
        request,
        user_id=user_id,
        email=email,
        event_type="mfa_recovery_used",
        detail="Recovery code used",
    )

    return {
        "ok": True,
        "verified": True,
        "mfa_verified": True,
        "redirect_to": "/assistant",
    }


@router.post("/regenerate-recovery-codes")
async def regenerate_recovery_codes(request: Request):
    user_id, email = _require_session_user(request)
    _require_enabled_mfa(user_id)

    if not is_mfa_verified_in_session(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="MFA verification required.",
        )

    codes = generate_and_store_recovery_codes(user_id, count=8)

    _log_mfa_event(
        request,
        user_id=user_id,
        email=email,
        event_type="mfa_recovery_regenerated",
        detail="Recovery codes regenerated",
    )

    return {"ok": True, "recovery_codes": codes}


@router.post("/logout")
async def mfa_logout(request: Request):
    user_id = get_session_user_id(request)
    email = get_session_user_email(request)

    _log_mfa_event(
        request,
        user_id=user_id,
        email=email,
        event_type="logout",
        detail="User logged out",
    )

    clear_auth_session(request)
    return {"ok": True}
