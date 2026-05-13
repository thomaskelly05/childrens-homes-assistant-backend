import base64
import json
import os
import secrets
import time
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from auth.mfa_guard import (
    SESSION_MFA_VERIFIED_KEY,
    SESSION_USER_EMAIL_KEY,
    SESSION_USER_ID_KEY,
)
from auth.routes import settings as auth_settings
from auth.tokens import create_session_token, decode_session_token
from db.connection import get_db
from db.passkeys_db import (
    create_user_passkey,
    delete_user_passkey,
    get_passkey_by_credential_id,
    list_user_passkeys,
    update_passkey_sign_count,
    user_has_passkeys,
)

router = APIRouter(prefix="/auth/passkeys", tags=["Passkeys"])

DEFAULT_RP_ID = "app.indicare.co.uk"
REQUIRED_PASSKEY_ALLOWED_ORIGINS = {
    "https://app.indicare.co.uk",
    "https://indicare-frontend-next.onrender.com",
}

RP_ID = os.getenv("PASSKEY_RP_ID", DEFAULT_RP_ID).strip() or DEFAULT_RP_ID
RP_NAME = os.getenv("PASSKEY_RP_NAME", "IndiCare")
PASSKEY_CHALLENGE_MAX_AGE_SECONDS = int(
    os.getenv("PASSKEY_CHALLENGE_MAX_AGE_SECONDS", "300")
)


def _normalise_origin(origin: str | None) -> str:
    if origin is None:
        return ""
    if isinstance(origin, str):
        return origin.strip().rstrip("/")
    return str(origin).strip().rstrip("/")


def _configured_allowed_origins() -> set[str]:
    configured = os.getenv("PASSKEY_ALLOWED_ORIGINS")
    default_origins = (
        "https://app.indicare.co.uk,"
        "https://indicare-frontend-next.onrender.com,"
        "http://localhost:3000,"
        "http://127.0.0.1:3000"
    )
    raw_origins = configured if configured is not None else default_origins
    origins = {
        _normalise_origin(origin)
        for origin in raw_origins.split(",")
        if _normalise_origin(origin)
    }
    origins.update(REQUIRED_PASSKEY_ALLOWED_ORIGINS)
    return origins


ALLOWED_ORIGINS = _configured_allowed_origins()


class PasskeyRegisterVerifyRequest(BaseModel):
    credential: dict[str, Any] | None = None
    nickname: str | None = ""


class PasskeyAuthenticateOptionsRequest(BaseModel):
    email: str | None = None


class PasskeyAuthenticateVerifyRequest(BaseModel):
    credential: dict[str, Any] | None = None


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _origin_host(origin: str | None) -> str:
    parsed = urlparse(_normalise_origin(origin))
    return (parsed.hostname or "").lower()


def _rp_id_matches_origin(rp_id: str, origin_host: str) -> bool:
    rp_id = _safe_string(rp_id).lower()
    origin_host = _safe_string(origin_host).lower()
    if not rp_id or not origin_host:
        return False
    return origin_host == rp_id or origin_host.endswith(f".{rp_id}")


def _request_origin(request: Request) -> str:
    origin = _normalise_origin(request.headers.get("origin"))
    if origin:
        return origin

    referer = _safe_string(request.headers.get("referer"))
    if referer:
        parsed = urlparse(referer)
        if parsed.scheme and parsed.netloc:
            return f"{parsed.scheme}://{parsed.netloc}".rstrip("/")

    return ""


def _rp_id_for_request(request: Request) -> str:
    origin = _request_origin(request)
    origin_host = _origin_host(origin)
    configured_rp_id = _safe_string(RP_ID).lower()

    if _rp_id_matches_origin(configured_rp_id, origin_host):
        return configured_rp_id

    if origin in ALLOWED_ORIGINS and origin_host:
        return origin_host

    return configured_rp_id or DEFAULT_RP_ID


def _normalise_email(value: str | None) -> str:
    return _safe_string(value).lower()


def _safe_json(value: Any) -> str | None:
    if value is None:
        return None
    try:
        return json.dumps(value)
    except Exception:
        return None


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    data = (data or "").strip()
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _now() -> int:
    return int(time.time())


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


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


def _extract_token(request: Request, authorization: str | None = None) -> str | None:
    cookie_token = _safe_string(request.cookies.get(auth_settings.session_cookie_name))
    if cookie_token:
        return cookie_token

    if not authorization:
        return None

    parts = authorization.split(" ", 1)
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None

    token = parts[1].strip()
    return token or None


def _clear_passkey_register_state(request: Request) -> None:
    request.session.pop("passkey_register_challenge", None)
    request.session.pop("passkey_register_user_id", None)
    request.session.pop("passkey_register_started_at", None)


def _clear_passkey_auth_state(request: Request) -> None:
    request.session.pop("passkey_auth_challenge", None)
    request.session.pop("passkey_auth_started_at", None)
    request.session.pop("passkey_auth_user_hint", None)


def _clear_all_passkey_state(request: Request) -> None:
    _clear_passkey_register_state(request)
    _clear_passkey_auth_state(request)


def _set_authenticated_session(
    *,
    request: Request,
    response: Response,
    user: dict[str, Any],
    remember: bool = False,
) -> None:
    token = create_session_token(int(user["id"]))
    csrf_token = secrets.token_urlsafe(32)

    try:
        request.session.clear()
    except Exception:
        pass

    request.session[SESSION_USER_ID_KEY] = int(user["id"])
    request.session[SESSION_USER_EMAIL_KEY] = user["email"]
    request.session[SESSION_MFA_VERIFIED_KEY] = True
    request.session["csrf_token"] = csrf_token
    request.session["remember"] = remember
    request.session["login_at"] = _now()
    request.session["mfa_verified_at"] = _now()
    request.session["preauth_pending"] = False

    _clear_all_passkey_state(request)

    _set_session_cookie(response, token, remember=remember)
    _set_csrf_cookie(response, csrf_token, remember=remember)


def _get_user_id_from_session(request: Request) -> int:
    raw_user_id = request.session.get(SESSION_USER_ID_KEY) or request.session.get("user_id")
    if raw_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        return int(raw_user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session",
        )


def _get_user_email_from_session(request: Request, user_id: int) -> str:
    return _safe_string(
        request.session.get(SESSION_USER_EMAIL_KEY)
        or request.session.get("user_email")
        or f"user-{user_id}@indicare.local"
    )


def _get_authenticated_user_from_request(
    request: Request,
    conn: Any,
    authorization: str | None = None,
) -> dict[str, Any]:
    token = _extract_token(request, authorization)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
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

    session_user_id = request.session.get(SESSION_USER_ID_KEY)
    try:
        session_user_id = int(session_user_id) if session_user_id is not None else None
    except (TypeError, ValueError):
        session_user_id = None

    if session_user_id != token_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session mismatch",
        )

    user = _get_user_by_id(conn, token_user_id)
    return _validate_active_user(user)


def _get_user_by_email(conn: Any, email: str) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                role,
                home_id,
                first_name,
                last_name,
                is_active,
                archived,
                subscription_active,
                subscription_status,
                plan_name
            FROM users
            WHERE lower(email) = %s
            LIMIT 1
            """,
            (email,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def _get_user_by_id(conn: Any, user_id: int) -> dict[str, Any] | None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                email,
                role,
                home_id,
                first_name,
                last_name,
                is_active,
                archived,
                subscription_active,
                subscription_status,
                plan_name
            FROM users
            WHERE id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def _validate_active_user(user: dict[str, Any] | None) -> dict[str, Any]:
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid passkey sign-in",
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


def _parse_client_data_json(encoded: str) -> dict[str, Any]:
    try:
        client_data_raw = _b64url_decode(encoded)
        return json.loads(client_data_raw.decode("utf-8"))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid clientDataJSON",
        )


def _assert_allowed_origin(origin: str | None) -> None:
    if _normalise_origin(origin) not in ALLOWED_ORIGINS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid passkey origin",
        )


def _assert_challenge(expected: str | None, actual: str | None) -> None:
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No passkey challenge is pending",
        )
    if actual != expected:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Challenge mismatch",
        )


def _assert_challenge_fresh(started_at: Any) -> None:
    try:
        started_at_int = int(started_at)
    except (TypeError, ValueError):
        started_at_int = None

    if not started_at_int:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passkey challenge is invalid or expired",
        )

    if (_now() - started_at_int) > PASSKEY_CHALLENGE_MAX_AGE_SECONDS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passkey challenge has expired",
        )


def _validate_passkey_registration_ceremony(
    *,
    request: Request,
    user_id: int,
    credential: dict[str, Any],
) -> tuple[str, Any]:
    expected_challenge = request.session.get("passkey_register_challenge")
    expected_user_id = request.session.get("passkey_register_user_id")
    started_at = request.session.get("passkey_register_started_at")

    if expected_user_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No passkey registration is pending",
        )

    try:
        expected_user_id = int(expected_user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passkey registration session mismatch",
        )

    if expected_user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passkey registration session mismatch",
        )

    _assert_challenge_fresh(started_at)

    credential_id = _safe_string(credential.get("id"))
    response_data = credential.get("response") or {}

    if not credential_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing credential id",
        )

    client_data_json = response_data.get("clientDataJSON")
    attestation_object = response_data.get("attestationObject")

    if not client_data_json or not attestation_object:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing passkey attestation data",
        )

    client_data = _parse_client_data_json(client_data_json)

    ceremony_type = client_data.get("type")
    challenge = client_data.get("challenge")
    origin = client_data.get("origin")

    if ceremony_type != "webauthn.create":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid passkey ceremony type",
        )

    _assert_challenge(expected_challenge, challenge)
    _assert_allowed_origin(origin)

    return credential_id, attestation_object


def _validate_passkey_authentication_ceremony(
    request: Request,
    credential: dict[str, Any],
) -> str:
    expected_challenge = request.session.get("passkey_auth_challenge")
    started_at = request.session.get("passkey_auth_started_at")

    _assert_challenge_fresh(started_at)

    credential_id = _safe_string(credential.get("id"))
    response_data = credential.get("response") or {}

    if not credential_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing credential id",
        )

    client_data_json = response_data.get("clientDataJSON")
    authenticator_data = response_data.get("authenticatorData")
    signature = response_data.get("signature")

    if not client_data_json or not authenticator_data or not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing passkey assertion data",
        )

    client_data = _parse_client_data_json(client_data_json)

    ceremony_type = client_data.get("type")
    challenge = client_data.get("challenge")
    origin = client_data.get("origin")

    if ceremony_type != "webauthn.get":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid passkey ceremony type",
        )

    _assert_challenge(expected_challenge, challenge)
    _assert_allowed_origin(origin)

    return credential_id


def _build_user_payload(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "email": user["email"],
        "role": user["role"],
        "home_id": user.get("home_id"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "is_active": bool(user.get("is_active")),
        "subscription_active": bool(user.get("subscription_active")),
        "subscription_status": user.get("subscription_status") or "inactive",
        "plan_name": user.get("plan_name"),
        "mfa_enabled": True,
        "mfa_verified": True,
        "mfa_pending": False,
        "has_passkeys": True,
    }


@router.get("")
def list_passkeys_route(
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db),
):
    user = _get_authenticated_user_from_request(request, conn, authorization)
    items = list_user_passkeys(int(user["id"]))
    return {
        "ok": True,
        "items": items,
        "has_passkeys": len(items) > 0,
    }


@router.get("/status")
def passkey_status(
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db),
):
    user = _get_authenticated_user_from_request(request, conn, authorization)
    has_keys = user_has_passkeys(int(user["id"]))
    return {
        "ok": True,
        "has_passkeys": has_keys,
        "should_prompt_register": not has_keys,
    }


@router.post("/register/options")
def register_passkey_options(
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db),
):
    user = _get_authenticated_user_from_request(request, conn, authorization)
    user_id = int(user["id"])
    user_email = _get_user_email_from_session(request, user_id) or user["email"]

    challenge_bytes = secrets.token_bytes(32)
    user_handle_bytes = f"indicare-user-{user_id}".encode("utf-8")

    challenge_b64 = _b64url_encode(challenge_bytes)
    user_handle_b64 = _b64url_encode(user_handle_bytes)
    rp_id = _rp_id_for_request(request)

    request.session["passkey_register_challenge"] = challenge_b64
    request.session["passkey_register_user_id"] = user_id
    request.session["passkey_register_started_at"] = _now()

    options: dict[str, Any] = {
        "challenge": challenge_b64,
        "rp": {
            "name": RP_NAME,
            "id": rp_id,
        },
        "user": {
            "id": user_handle_b64,
            "name": user_email,
            "displayName": user_email,
        },
        "pubKeyCredParams": [
            {"type": "public-key", "alg": -7},
            {"type": "public-key", "alg": -257},
        ],
        "timeout": 60000,
        "attestation": "none",
        "authenticatorSelection": {
            "residentKey": "preferred",
            "userVerification": "preferred",
        },
    }

    try:
        existing = list_user_passkeys(user_id)
    except Exception:
        existing = []

    exclude_credentials: list[dict[str, str]] = []
    for item in existing:
        credential_id = _safe_string(item.get("credential_id"))
        if credential_id:
            exclude_credentials.append(
                {
                    "type": "public-key",
                    "id": credential_id,
                }
            )

    if exclude_credentials:
        options["excludeCredentials"] = exclude_credentials

    return {
        "ok": True,
        "options": options,
    }


@router.post("/register/verify")
def register_passkey_verify(
    payload: PasskeyRegisterVerifyRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db),
):
    user = _get_authenticated_user_from_request(request, conn, authorization)
    user_id = int(user["id"])

    credential = payload.credential or {}
    credential_id, attestation_object = _validate_passkey_registration_ceremony(
        request=request,
        user_id=user_id,
        credential=credential,
    )

    transports = credential.get("transports")
    nickname = _safe_string(payload.nickname) or "My passkey"

    try:
        create_user_passkey(
            user_id=user_id,
            credential_id=credential_id,
            credential_public_key=attestation_object,
            sign_count=0,
            transports=_safe_json(transports),
            aaguid=None,
            nickname=nickname,
        )
    except Exception as exc:
        message = str(exc).lower()
        if "unique" in message or "duplicate" in message:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This passkey is already registered",
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save passkey",
        )

    _clear_passkey_register_state(request)

    return {
        "ok": True,
        "message": "Passkey registered",
        "has_passkeys": True,
    }


@router.post("/authenticate/options")
def authenticate_passkey_options(
    payload: PasskeyAuthenticateOptionsRequest,
    request: Request,
    conn=Depends(get_db),
):
    email = _normalise_email(payload.email)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is required for passkey sign-in",
        )

    user = _get_user_by_email(conn, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No passkeys registered for this account",
        )

    user = _validate_active_user(user)

    try:
        passkeys = list_user_passkeys(int(user["id"]))
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not read passkeys",
        )

    if not passkeys:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No passkeys registered for this account",
        )

    allow_credentials: list[dict[str, str]] = []
    for item in passkeys:
        credential_id = _safe_string(item.get("credential_id"))
        if credential_id:
            allow_credentials.append(
                {
                    "type": "public-key",
                    "id": credential_id,
                }
            )

    if not allow_credentials:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No usable passkeys registered for this account",
        )

    challenge_b64 = _b64url_encode(secrets.token_bytes(32))
    request.session["passkey_auth_challenge"] = challenge_b64
    request.session["passkey_auth_started_at"] = _now()
    request.session["passkey_auth_user_hint"] = int(user["id"])
    rp_id = _rp_id_for_request(request)

    options: dict[str, Any] = {
        "challenge": challenge_b64,
        "rpId": rp_id,
        "timeout": 60000,
        "userVerification": "preferred",
        "allowCredentials": allow_credentials,
    }

    return {
        "ok": True,
        "options": options,
    }


@router.post("/authenticate/verify")
def authenticate_passkey_verify(
    payload: PasskeyAuthenticateVerifyRequest,
    request: Request,
    response: Response,
    conn=Depends(get_db),
):
    credential = payload.credential or {}
    credential_id = _validate_passkey_authentication_ceremony(request, credential)

    stored_passkey = get_passkey_by_credential_id(credential_id)
    if not stored_passkey:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unknown passkey",
        )

    hinted_user_id = request.session.get("passkey_auth_user_hint")
    try:
        hinted_user_id = int(hinted_user_id) if hinted_user_id is not None else None
    except (TypeError, ValueError):
        hinted_user_id = None

    stored_user_id = int(stored_passkey["user_id"])
    if hinted_user_id is not None and hinted_user_id != stored_user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Passkey account mismatch",
        )

    user = _get_user_by_id(conn, stored_user_id)
    user = _validate_active_user(user)

    remember = False
    _set_authenticated_session(
        request=request,
        response=response,
        user=user,
        remember=remember,
    )

    current_sign_count = int(stored_passkey.get("sign_count") or 0)
    try:
        update_passkey_sign_count(credential_id, current_sign_count + 1)
    except Exception:
        pass

    return {
        "ok": True,
        "message": "Passkey sign-in successful",
        "authenticated": True,
        "user": _build_user_payload(user),
    }


@router.delete("/{passkey_id}")
def delete_passkey_route(
    passkey_id: int,
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db),
):
    user = _get_authenticated_user_from_request(request, conn, authorization)
    deleted = delete_user_passkey(int(user["id"]), passkey_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Passkey not found",
        )

    return {
        "ok": True,
        "deleted": True,
    }


@router.post("/register/start")
def start_passkey_registration(
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db),
):
    return register_passkey_options(request, authorization, conn)


@router.post("/register/finish")
def finish_passkey_registration(
    payload: PasskeyRegisterVerifyRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db),
):
    return register_passkey_verify(payload, request, authorization, conn)
