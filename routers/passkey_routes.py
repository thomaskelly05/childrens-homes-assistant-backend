import base64
import json
import os
import secrets
import time
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from pydantic import BaseModel

from auth.mfa_guard import (
    SESSION_MFA_VERIFIED_KEY,
    SESSION_USER_EMAIL_KEY,
    SESSION_USER_ID_KEY,
)
from auth.routes import settings as auth_settings
from auth.tokens import create_session_token
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

RP_ID = os.getenv("PASSKEY_RP_ID", "app.indicare.co.uk")
RP_NAME = os.getenv("PASSKEY_RP_NAME", "IndiCare")
ALLOWED_ORIGINS = {
    origin.strip()
    for origin in os.getenv(
        "PASSKEY_ALLOWED_ORIGINS",
        "https://app.indicare.co.uk,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
}


class PasskeyRegisterVerifyRequest(BaseModel):
    credential: dict[str, Any] | None = None
    nickname: str | None = ""


class PasskeyAuthenticateOptionsRequest(BaseModel):
    email: str | None = None


class PasskeyAuthenticateVerifyRequest(BaseModel):
    credential: dict[str, Any] | None = None


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    data = (data or "").strip()
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _safe_json(value: Any) -> str | None:
    if value is None:
        return None
    try:
        return json.dumps(value)
    except Exception:
        return None


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


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


def _get_user_id_from_session(request: Request) -> int:
    user_id = request.session.get(SESSION_USER_ID_KEY) or request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return int(user_id)


def _get_user_email_from_session(request: Request, user_id: int) -> str:
    email = _safe_string(
        request.session.get(SESSION_USER_EMAIL_KEY)
        or request.session.get("user_email")
        or f"user-{user_id}@indicare.local"
    )
    return email


def _get_user_by_email(conn: Any, email: str) -> dict[str, Any] | None:
    with conn.cursor() as cur:
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
            WHERE lower(email) = lower(%s)
            LIMIT 1
            """,
            (email,),
        )
        row = cur.fetchone()
        if not row:
            return None

        columns = [desc[0] for desc in cur.description]
        return dict(zip(columns, row))


def _get_user_by_id(conn: Any, user_id: int) -> dict[str, Any] | None:
    with conn.cursor() as cur:
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
        if not row:
            return None

        columns = [desc[0] for desc in cur.description]
        return dict(zip(columns, row))


def _validate_login_user(user: dict[str, Any] | None) -> dict[str, Any]:
    if not user:
        raise HTTPException(status_code=401, detail="Invalid passkey sign-in")
    if user.get("archived") is True:
        raise HTTPException(status_code=403, detail="User is archived")
    if user.get("is_active") is False:
        raise HTTPException(status_code=403, detail="User account is inactive")
    return user


@router.get("")
def list_passkeys_route(request: Request, conn=Depends(get_db)):
    user_id = _get_user_id_from_session(request)
    items = list_user_passkeys(user_id)
    return {
        "ok": True,
        "items": items,
        "has_passkeys": len(items) > 0,
    }


@router.get("/status")
def passkey_status(request: Request, conn=Depends(get_db)):
    user_id = _get_user_id_from_session(request)
    has_keys = user_has_passkeys(user_id)
    return {
        "ok": True,
        "has_passkeys": has_keys,
        "should_prompt_register": not has_keys,
    }


@router.post("/register/options")
def register_passkey_options(request: Request):
    user_id = _get_user_id_from_session(request)
    user_email = _get_user_email_from_session(request, user_id)

    challenge_bytes = secrets.token_bytes(32)
    user_handle_bytes = f"indicare-user-{user_id}".encode("utf-8")

    challenge_b64 = _b64url_encode(challenge_bytes)
    user_handle_b64 = _b64url_encode(user_handle_bytes)

    request.session["passkey_register_challenge"] = challenge_b64
    request.session["passkey_register_user_id"] = user_id

    options = {
        "challenge": challenge_b64,
        "rp": {
            "name": RP_NAME,
            "id": RP_ID,
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

    existing = list_user_passkeys(user_id)
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
    conn=Depends(get_db),
):
    user_id = _get_user_id_from_session(request)

    expected_challenge = request.session.get("passkey_register_challenge")
    expected_user_id = request.session.get("passkey_register_user_id")

    if not expected_challenge or not expected_user_id:
        raise HTTPException(status_code=400, detail="No passkey registration is pending")

    if int(expected_user_id) != user_id:
        raise HTTPException(status_code=400, detail="Passkey registration session mismatch")

    credential = payload.credential or {}
    credential_id = _safe_string(credential.get("id"))
    response = credential.get("response") or {}

    if not credential_id:
        raise HTTPException(status_code=400, detail="Missing credential id")

    client_data_json = response.get("clientDataJSON")
    attestation_object = response.get("attestationObject")

    if not client_data_json or not attestation_object:
        raise HTTPException(status_code=400, detail="Missing passkey attestation data")

    try:
        client_data_raw = _b64url_decode(client_data_json)
        client_data = json.loads(client_data_raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid clientDataJSON")

    challenge = client_data.get("challenge")
    origin = client_data.get("origin")
    ceremony_type = client_data.get("type")

    if ceremony_type != "webauthn.create":
        raise HTTPException(status_code=400, detail="Invalid passkey ceremony type")

    if challenge != expected_challenge:
        raise HTTPException(status_code=400, detail="Challenge mismatch")

    if origin not in ALLOWED_ORIGINS:
        raise HTTPException(status_code=400, detail="Invalid passkey origin")

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
            raise HTTPException(status_code=409, detail="This passkey is already registered")
        raise

    request.session.pop("passkey_register_challenge", None)
    request.session.pop("passkey_register_user_id", None)

    return {
        "ok": True,
        "message": "Passkey registered",
        "has_passkeys": True,
    }


@router.post("/authenticate/options")
def authenticate_passkey_options(
    payload: PasskeyAuthenticateOptionsRequest,
    request: Request,
    authorization: str | None = Header(default=None),
    conn=Depends(get_db),
):
    email = _safe_string(payload.email).lower()
    allow_credentials: list[dict[str, str]] = []

    if email:
        user = _get_user_by_email(conn, email)
        if not user:
            raise HTTPException(status_code=404, detail="No passkeys registered for this account")

        user = _validate_login_user(user)
        passkeys = list_user_passkeys(int(user["id"]))
        if not passkeys:
            raise HTTPException(status_code=404, detail="No passkeys registered for this account")

        for item in passkeys:
            credential_id = _safe_string(item.get("credential_id"))
            if credential_id:
                allow_credentials.append(
                    {
                        "type": "public-key",
                        "id": credential_id,
                    }
                )
        request.session["passkey_auth_user_hint"] = int(user["id"])

    challenge_b64 = _b64url_encode(secrets.token_bytes(32))
    request.session["passkey_auth_challenge"] = challenge_b64
    request.session["passkey_auth_started_at"] = int(time.time())

    options: dict[str, Any] = {
        "challenge": challenge_b64,
        "rpId": RP_ID,
        "timeout": 60000,
        "userVerification": "preferred",
    }

    if allow_credentials:
        options["allowCredentials"] = allow_credentials

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
    expected_challenge = request.session.get("passkey_auth_challenge")
    if not expected_challenge:
        raise HTTPException(status_code=400, detail="No passkey sign-in is pending")

    credential = payload.credential or {}
    credential_id = _safe_string(credential.get("id"))
    response_data = credential.get("response") or {}

    if not credential_id:
        raise HTTPException(status_code=400, detail="Missing credential id")

    client_data_json = response_data.get("clientDataJSON")
    authenticator_data = response_data.get("authenticatorData")
    signature = response_data.get("signature")

    if not client_data_json or not authenticator_data or not signature:
        raise HTTPException(status_code=400, detail="Missing passkey assertion data")

    try:
        client_data_raw = _b64url_decode(client_data_json)
        client_data = json.loads(client_data_raw.decode("utf-8"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid clientDataJSON")

    challenge = client_data.get("challenge")
    origin = client_data.get("origin")
    ceremony_type = client_data.get("type")

    if ceremony_type != "webauthn.get":
        raise HTTPException(status_code=400, detail="Invalid passkey ceremony type")

    if challenge != expected_challenge:
        raise HTTPException(status_code=400, detail="Challenge mismatch")

    if origin not in ALLOWED_ORIGINS:
        raise HTTPException(status_code=400, detail="Invalid passkey origin")

    stored_passkey = get_passkey_by_credential_id(credential_id)
    if not stored_passkey:
        raise HTTPException(status_code=401, detail="Unknown passkey")

    user = _get_user_by_id(conn, int(stored_passkey["user_id"]))
    user = _validate_login_user(user)

    remember = False
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
    request.session["login_at"] = int(time.time())
    request.session.pop("preauth_pending", None)
    request.session.pop("passkey_auth_challenge", None)
    request.session.pop("passkey_auth_started_at", None)
    request.session.pop("passkey_auth_user_hint", None)

    _set_session_cookie(response, token, remember=remember)
    _set_csrf_cookie(response, csrf_token, remember=remember)

    current_sign_count = int(stored_passkey.get("sign_count") or 0)
    update_passkey_sign_count(credential_id, current_sign_count + 1)

    return {
        "ok": True,
        "message": "Passkey sign-in successful",
        "authenticated": True,
        "user": {
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
        },
    }


@router.delete("/{passkey_id}")
def delete_passkey_route(passkey_id: int, request: Request, conn=Depends(get_db)):
    user_id = _get_user_id_from_session(request)
    deleted = delete_user_passkey(user_id, passkey_id)

    if not deleted:
        raise HTTPException(status_code=404, detail="Passkey not found")

    return {
        "ok": True,
        "deleted": True,
    }


@router.post("/register/start")
def start_passkey_registration(request: Request):
    return register_passkey_options(request)


@router.post("/register/finish")
def finish_passkey_registration(
    payload: PasskeyRegisterVerifyRequest,
    request: Request,
    conn=Depends(get_db),
):
    return register_passkey_verify(payload, request, conn)
