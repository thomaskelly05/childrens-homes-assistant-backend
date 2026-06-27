from __future__ import annotations

import base64
import io
import logging
import os
import secrets
import time
from dataclasses import dataclass
from typing import Any

import pyotp
import qrcode
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor

from auth.mfa_guard import (
    SESSION_MFA_VERIFIED_KEY,
    SESSION_USER_EMAIL_KEY,
    SESSION_USER_ID_KEY,
)
from auth.routes import settings as auth_settings
from auth.tokens import create_session_token, decode_session_token
from db.connection import get_db
from db.mfa_db import (
    count_unused_recovery_codes,
    disable_user_mfa,
    enable_user_mfa,
    get_user_mfa,
    log_auth_event,
    save_recovery_codes,
    update_last_verified,
    upsert_user_mfa_secret,
    use_recovery_code,
)
from db.passkeys_db import user_has_passkeys

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth/mfa", tags=["MFA"])


def _get_user_mfa_safe(user_id: int, conn=None):
    try:
        return get_user_mfa(user_id, conn=conn)
    except TypeError:
        return get_user_mfa(user_id)


def _user_has_passkeys_safe(user_id: int, conn=None) -> bool:
    try:
        return user_has_passkeys(user_id, conn=conn)
    except TypeError:
        return user_has_passkeys(user_id)

RECOVERY_CODE_COUNT = int(os.getenv("MFA_RECOVERY_CODE_COUNT", "8"))
RECOVERY_CODE_LENGTH = int(os.getenv("MFA_RECOVERY_CODE_LENGTH", "10"))
MFA_WINDOW = int(os.getenv("MFA_TOTP_WINDOW", "1"))


class VerifyMFARequest(BaseModel):
    code: str = Field(min_length=6, max_length=32)


class SetupMFARequest(BaseModel):
    code: str = Field(min_length=6, max_length=32)


class DisableMFARequest(BaseModel):
    code: str = Field(min_length=6, max_length=32)


class RecoveryCodeLoginRequest(BaseModel):
    code: str = Field(min_length=6, max_length=64)


@dataclass(frozen=True)
class SessionUser:
    user_id: int
    email: str
    token: str


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_code(value: str) -> str:
    return _safe_string(value).replace(" ", "").replace("-", "")


def _client_ip(request: Request) -> str | None:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    if request.client:
        return request.client.host
    return None


def _user_agent(request: Request) -> str | None:
    return request.headers.get("user-agent")


def _log_auth(
    *,
    request: Request,
    user_id: int | None,
    email: str | None,
    event_type: str,
    detail: str,
) -> None:
    try:
        log_auth_event(
            user_id=user_id,
            email=email,
            event_type=event_type,
            ip_address=_client_ip(request),
            user_agent=_user_agent(request),
            detail=detail,
        )
    except Exception:
        logger.exception("Failed to write auth audit log")


def _extract_session_token(request: Request) -> str | None:
    token = request.cookies.get(auth_settings.session_cookie_name)
    return _safe_string(token) or None


def _get_session_user(request: Request) -> SessionUser:
    pending = request.session.get("preauth_pending") is True
    pending_user_id = request.session.get("pending_mfa_user_id")
    pending_email = _safe_string(request.session.get("pending_mfa_email"))

    if not pending or pending_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No MFA challenge is pending",
        )

    try:
        user_id = int(pending_user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid MFA session",
        )

    token = _extract_session_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    payload = decode_session_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    raw_user_id = payload.get("sub")
    try:
        token_user_id = int(raw_user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )

    if token_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session mismatch",
        )

    request.session[SESSION_USER_ID_KEY] = user_id
    request.session[SESSION_USER_EMAIL_KEY] = pending_email

    return SessionUser(
        user_id=user_id,
        email=pending_email,
        token=token,
    )


def _get_user_row(conn: Any, user_id: int) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, email, role, is_active, archived
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def _assert_active_user(user: dict[str, Any] | None) -> dict[str, Any]:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.get("archived") is True:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is archived",
        )

    if user.get("is_active") is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive",
        )

    return user


def _generate_recovery_codes() -> list[str]:
    codes: list[str] = []
    for _ in range(RECOVERY_CODE_COUNT):
        raw = secrets.token_hex(RECOVERY_CODE_LENGTH)
        codes.append(raw[:RECOVERY_CODE_LENGTH].upper())
    return codes


def generate_and_store_recovery_codes(user_id: int, count: int = RECOVERY_CODE_COUNT) -> list[str]:
    """
    Backwards-compatible helper kept for tests and legacy callers.
    """
    codes = _generate_recovery_codes()[: max(1, int(count))]
    save_recovery_codes(user_id=user_id, recovery_codes=codes)
    return codes


def _set_session_cookie(response: Response, token: str, remember: bool = False) -> None:
    max_age = (
        auth_settings.cookie_max_age_long
        if remember
        else auth_settings.cookie_max_age_short
    )
    response.set_cookie(
        key=auth_settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=auth_settings.cookie_secure,
        samesite=auth_settings.cookie_samesite,
        max_age=max_age,
        path="/",
    )


def _set_csrf_cookie(response: Response, csrf_token: str, remember: bool = False) -> None:
    max_age = (
        auth_settings.cookie_max_age_long
        if remember
        else auth_settings.cookie_max_age_short
    )
    response.set_cookie(
        key=auth_settings.csrf_cookie_name,
        value=csrf_token,
        httponly=False,
        secure=auth_settings.cookie_secure,
        samesite=auth_settings.cookie_samesite,
        max_age=max_age,
        path="/",
    )


def _rotate_post_mfa_session(
    *,
    request: Request,
    response: Response,
    user_id: int,
    email: str,
) -> None:
    remember = bool(request.session.get("remember"))
    new_token = create_session_token(user_id, mfa_verified=True)
    new_csrf = secrets.token_urlsafe(32)

    request.session[SESSION_USER_ID_KEY] = int(user_id)
    request.session[SESSION_USER_EMAIL_KEY] = email
    request.session[SESSION_MFA_VERIFIED_KEY] = True
    request.session["csrf_token"] = new_csrf
    request.session["remember"] = remember
    request.session["mfa_verified_at"] = int(time.time())

    request.session["preauth_pending"] = False
    request.session.pop("pending_mfa_user_id", None)
    request.session.pop("pending_mfa_email", None)

    _set_session_cookie(response, new_token, remember=remember)
    _set_csrf_cookie(response, new_csrf, remember=remember)


def _verify_totp(secret: str, code: str) -> bool:
    if not secret:
        return False
    try:
        totp = pyotp.TOTP(secret)
        return bool(totp.verify(code, valid_window=MFA_WINDOW))
    except Exception:
        return False


def _build_qr_code_data_url(value: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=8, border=4)
    qr.add_data(value)
    qr.make(fit=True)

    image = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    image.save(buffer, format="PNG")
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/png;base64,{encoded}"


@router.get("/status")
def mfa_status(request: Request, conn=Depends(get_db)):
    session_user = _get_session_user(request)
    user = _assert_active_user(_get_user_row(conn, session_user.user_id))
    mfa_row = _get_user_mfa_safe(session_user.user_id, conn=conn)

    return {
        "ok": True,
        "user_id": user["id"],
        "email": user["email"],
        "mfa_enabled": bool(mfa_row and mfa_row.get("is_enabled")),
        "mfa_verified": request.session.get(SESSION_MFA_VERIFIED_KEY) is True,
        "mfa_pending": request.session.get("preauth_pending") is True,
        "recovery_code_count": count_unused_recovery_codes(user["id"]),
    }


@router.get("/setup")
def get_mfa_setup(request: Request, conn=Depends(get_db)):
    try:
        session_user = _get_session_user(request)
        user = _assert_active_user(_get_user_row(conn, session_user.user_id))

        mfa_row = _get_user_mfa_safe(session_user.user_id, conn=conn)
        if mfa_row and mfa_row.get("is_enabled"):
            return {
                "ok": True,
                "already_enabled": True,
                "mfa_enabled": True,
                "recovery_code_count": count_unused_recovery_codes(user["id"]),
            }

        secret = pyotp.random_base32()
        issuer = os.getenv("MFA_ISSUER_NAME", "IndiCare")
        account_name = (
            user.get("email")
            or session_user.email
            or f"user-{user['id']}@indicare.local"
        )

        provisioning_uri = pyotp.TOTP(secret).provisioning_uri(
            name=account_name,
            issuer_name=issuer,
        )

        qr_code_data_url = None
        try:
            qr_code_data_url = _build_qr_code_data_url(provisioning_uri)
        except Exception as exc:
            _log_auth(
                request=request,
                user_id=user["id"],
                email=user["email"],
                event_type="mfa_setup_qr_warning",
                detail=repr(exc),
            )

        request.session["pending_mfa_secret"] = secret

        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="mfa_setup_started",
            detail="MFA setup initiated",
        )

        return {
            "ok": True,
            "already_enabled": False,
            "secret": secret,
            "provisioning_uri": provisioning_uri,
            "issuer": issuer,
            "account_name": account_name,
            "qr_code_data_url": qr_code_data_url,
        }

    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("Fatal MFA setup error")
        _log_auth(
            request=request,
            user_id=None,
            email=None,
            event_type="mfa_setup_error",
            detail=repr(exc),
        )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"MFA setup failed: {exc.__class__.__name__}: {str(exc)}",
        )


@router.post("/setup")
def complete_mfa_setup(
    payload: SetupMFARequest,
    request: Request,
    response: Response,
    conn=Depends(get_db),
):
    session_user = _get_session_user(request)
    user = _assert_active_user(_get_user_row(conn, session_user.user_id))

    secret = _safe_string(request.session.get("pending_mfa_secret"))
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No MFA setup is pending",
        )

    code = _normalise_code(payload.code)
    if not _verify_totp(secret, code):
        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="mfa_setup_failed",
            detail="Invalid setup verification code",
        )
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code",
        )

    recovery_codes = _generate_recovery_codes()

    upsert_user_mfa_secret(
        user_id=user["id"],
        email=user["email"],
        totp_secret=secret,
    )
    enable_user_mfa(
        user_id=user["id"],
        secret=secret,
    )
    save_recovery_codes(
        user_id=user["id"],
        recovery_codes=recovery_codes,
    )
    update_last_verified(user["id"])

    request.session.pop("pending_mfa_secret", None)

    _rotate_post_mfa_session(
        request=request,
        response=response,
        user_id=user["id"],
        email=user["email"],
    )

    _log_auth(
        request=request,
        user_id=user["id"],
        email=user["email"],
        event_type="mfa_setup_completed",
        detail="MFA enabled successfully",
    )

    return {
        "ok": True,
        "message": "MFA enabled successfully",
        "mfa_enabled": True,
        "mfa_verified": True,
        "has_passkeys": _user_has_passkeys_safe(user["id"], conn=conn),
        "recovery_codes": recovery_codes,
    }


@router.post("/verify")
def verify_mfa(
    payload: VerifyMFARequest,
    request: Request,
    response: Response,
    conn=Depends(get_db),
):
    session_user = _get_session_user(request)
    user = _assert_active_user(_get_user_row(conn, session_user.user_id))

    mfa_row = _get_user_mfa_safe(user["id"], conn=conn)
    if not mfa_row or not mfa_row.get("is_enabled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this user",
        )

    code = _normalise_code(payload.code)
    secret = _safe_string(mfa_row.get("totp_secret") or mfa_row.get("secret"))

    if not _verify_totp(secret, code):
        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="mfa_verify_failed",
            detail="Invalid MFA code",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code",
        )

    update_last_verified(user["id"])

    _rotate_post_mfa_session(
        request=request,
        response=response,
        user_id=user["id"],
        email=user["email"],
    )

    _log_auth(
        request=request,
        user_id=user["id"],
        email=user["email"],
        event_type="mfa_verified",
        detail="MFA verification successful",
    )

    return {
        "ok": True,
        "message": "MFA verified",
        "mfa_verified": True,
        "has_passkeys": _user_has_passkeys_safe(user["id"], conn=conn),
    }


@router.post("/recovery")
def verify_recovery_code(
    payload: RecoveryCodeLoginRequest,
    request: Request,
    response: Response,
    conn=Depends(get_db),
):
    session_user = _get_session_user(request)
    user = _assert_active_user(_get_user_row(conn, session_user.user_id))

    mfa_row = _get_user_mfa_safe(user["id"], conn=conn)
    if not mfa_row or not mfa_row.get("is_enabled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this user",
        )

    code = _safe_string(payload.code).upper()

    if not use_recovery_code(user["id"], code):
        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="mfa_recovery_failed",
            detail="Invalid recovery code",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid recovery code",
        )

    update_last_verified(user["id"])

    _rotate_post_mfa_session(
        request=request,
        response=response,
        user_id=user["id"],
        email=user["email"],
    )

    _log_auth(
        request=request,
        user_id=user["id"],
        email=user["email"],
        event_type="mfa_recovery_used",
        detail="Recovery code used successfully",
    )

    return {
        "ok": True,
        "message": "Recovery code accepted",
        "mfa_verified": True,
        "has_passkeys": _user_has_passkeys_safe(user["id"], conn=conn),
        "remaining_recovery_codes": count_unused_recovery_codes(user["id"]),
    }


@router.post("/disable")
def disable_mfa_route(
    payload: DisableMFARequest,
    request: Request,
    conn=Depends(get_db),
):
    user_id = request.session.get(SESSION_USER_ID_KEY)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    user = _assert_active_user(_get_user_row(conn, int(user_id)))

    mfa_row = _get_user_mfa_safe(user["id"], conn=conn)
    if not mfa_row or not mfa_row.get("is_enabled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this user",
        )

    code = _normalise_code(payload.code)
    secret = _safe_string(mfa_row.get("totp_secret") or mfa_row.get("secret"))

    if not _verify_totp(secret, code):
        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="mfa_disable_failed",
            detail="Invalid MFA code for disable request",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code",
        )

    disable_user_mfa(user["id"])
    request.session[SESSION_MFA_VERIFIED_KEY] = False

    _log_auth(
        request=request,
        user_id=user["id"],
        email=user["email"],
        event_type="mfa_disabled",
        detail="MFA disabled",
    )

    return {
        "ok": True,
        "message": "MFA disabled",
        "mfa_enabled": False,
    }


@router.post("/recovery-codes/regenerate")
def regenerate_recovery_codes(
    payload: VerifyMFARequest,
    request: Request,
    conn=Depends(get_db),
):
    user_id = request.session.get(SESSION_USER_ID_KEY)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    user = _assert_active_user(_get_user_row(conn, int(user_id)))

    mfa_row = _get_user_mfa_safe(user["id"], conn=conn)
    if not mfa_row or not mfa_row.get("is_enabled"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MFA is not enabled for this user",
        )

    code = _normalise_code(payload.code)
    secret = _safe_string(mfa_row.get("totp_secret") or mfa_row.get("secret"))

    if not _verify_totp(secret, code):
        _log_auth(
            request=request,
            user_id=user["id"],
            email=user["email"],
            event_type="mfa_recovery_regen_failed",
            detail="Invalid MFA code for recovery code regeneration",
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid verification code",
        )

    recovery_codes = _generate_recovery_codes()
    save_recovery_codes(
        user_id=user["id"],
        recovery_codes=recovery_codes,
    )

    _log_auth(
        request=request,
        user_id=user["id"],
        email=user["email"],
        event_type="mfa_recovery_regenerated",
        detail="Recovery codes regenerated",
    )

    return {
        "ok": True,
        "message": "Recovery codes regenerated",
        "recovery_codes": recovery_codes,
        "remaining_recovery_codes": len(recovery_codes),
    }
