from __future__ import annotations

import os
import secrets
from typing import Any

from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, EmailStr
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers import base64url_to_bytes
from webauthn.helpers.cose import COSEAlgorithmIdentifier
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)
from webauthn.helpers.parsers import (
    parse_authentication_credential_json,
    parse_registration_credential_json,
)

from auth.mfa_guard import (
    SESSION_MFA_VERIFIED_KEY,
    SESSION_USER_EMAIL_KEY,
    SESSION_USER_ID_KEY,
)
from auth.routes import (
    _clear_failures,
    _client_ip,
    _get_billing_safe,
    _log_auth,
    _session_user_payload,
    _set_csrf_cookie,
    _set_session_cookie,
    _safe_session_reset,
    _validate_active_user,
)
from auth.tokens import create_session_token
from db.connection import get_db_connection, release_db_connection
from db.passkeys_db import (
    consume_webauthn_challenge,
    create_passkey,
    create_webauthn_challenge,
    delete_passkey,
    get_active_webauthn_challenge,
    get_passkey_by_credential_id,
    get_user_by_email,
    get_user_by_id,
    list_user_passkeys,
    update_passkey_counter,
)

router = APIRouter(prefix="/auth/passkeys", tags=["Passkeys"])

RP_ID = os.getenv("WEBAUTHN_RP_ID", "app.indicare.co.uk")
RP_NAME = os.getenv("WEBAUTHN_RP_NAME", "IndiCare")
RP_ORIGIN = os.getenv("WEBAUTHN_RP_ORIGIN", "https://app.indicare.co.uk")


class PasskeyAuthBeginRequest(BaseModel):
    email: EmailStr


class PasskeyRegisterCompleteRequest(BaseModel):
    credential: dict[str, Any]
    nickname: str | None = None


class PasskeyAuthCompleteRequest(BaseModel):
    credential: dict[str, Any]


def _user_display_name(user: dict[str, Any]) -> str:
    name = f"{user.get('first_name') or ''} {user.get('last_name') or ''}".strip()
    return name or user["email"]


@router.get("")
def list_my_passkeys(request: Request):
    user_id = request.session.get(SESSION_USER_ID_KEY)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    rows = list_user_passkeys(int(user_id))
    return {
        "ok": True,
        "passkeys": [
            {
                "id": r["id"],
                "nickname": r.get("nickname"),
                "device_type": r.get("device_type"),
                "backed_up": r.get("backed_up"),
                "last_used_at": r.get("last_used_at"),
                "created_at": r.get("created_at"),
            }
            for r in rows
        ],
    }


@router.post("/register/options")
def begin_passkey_registration(request: Request):
    user_id = request.session.get(SESSION_USER_ID_KEY)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    user = get_user_by_id(int(user_id))
    user = _validate_active_user(user)

    existing = list_user_passkeys(int(user_id))
    exclude_credentials = [
        PublicKeyCredentialDescriptor(id=base64url_to_bytes(row["credential_id"]))
        for row in existing
    ]

    options = generate_registration_options(
        rp_id=RP_ID,
        rp_name=RP_NAME,
        user_id=str(user["id"]).encode("utf-8"),
        user_name=user["email"],
        user_display_name=_user_display_name(user),
        exclude_credentials=exclude_credentials,
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED,
            user_verification=UserVerificationRequirement.PREFERRED,
        ),
        supported_pub_key_algs=[
            COSEAlgorithmIdentifier.ECDSA_SHA_256,
            COSEAlgorithmIdentifier.RSASSA_PKCS1_v1_5_SHA_256,
        ],
    )

    challenge_b64 = options.challenge
    create_webauthn_challenge(
        challenge=challenge_b64,
        challenge_type="registration",
        user_id=int(user_id),
        email=user["email"],
    )

    _log_auth(
        request=request,
        user_id=user["id"],
        email=user["email"],
        event_type="passkey_registration_started",
        detail="Passkey registration started",
    )

    return {
        "ok": True,
        "options": options_to_json(options),
    }


@router.post("/register/verify")
def complete_passkey_registration(payload: PasskeyRegisterCompleteRequest, request: Request):
    user_id = request.session.get(SESSION_USER_ID_KEY)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    user = get_user_by_id(int(user_id))
    user = _validate_active_user(user)

    credential = parse_registration_credential_json(payload.credential)
    challenge_b64 = credential.response.client_data.challenge

    stored = get_active_webauthn_challenge(
        challenge=challenge_b64,
        challenge_type="registration",
    )
    if not stored or int(stored["user_id"] or 0) != int(user_id):
        raise HTTPException(status_code=400, detail="Registration challenge is invalid or expired")

    verification = verify_registration_response(
        credential=credential,
        expected_challenge=challenge_b64,
        expected_rp_id=RP_ID,
        expected_origin=RP_ORIGIN,
        require_user_verification=False,
    )

    create_passkey(
        user_id=int(user_id),
        credential_id=verification.credential_id,
        public_key=verification.credential_public_key,
        sign_count=verification.sign_count,
        transports=",".join(payload.credential.get("response", {}).get("transports", []))
        if isinstance(payload.credential.get("response", {}).get("transports"), list)
        else None,
        device_type=str(getattr(verification, "credential_device_type", None) or ""),
        backed_up=bool(getattr(verification, "credential_backed_up", False)),
        aaguid=str(getattr(verification, "aaguid", "") or ""),
        nickname=(payload.nickname or "").strip() or None,
    )

    consume_webauthn_challenge(int(stored["id"]))

    _log_auth(
        request=request,
        user_id=user["id"],
        email=user["email"],
        event_type="passkey_registration_completed",
        detail="Passkey registration completed",
    )

    return {"ok": True, "message": "Passkey added successfully"}


@router.post("/authenticate/options")
def begin_passkey_authentication(payload: PasskeyAuthBeginRequest, request: Request):
    user = get_user_by_email(payload.email)
    if not user or user.get("archived") is True or user.get("is_active") is False:
        raise HTTPException(status_code=401, detail="Account not available")

    passkeys = list_user_passkeys(int(user["id"]))
    if not passkeys:
        raise HTTPException(status_code=400, detail="No passkeys registered for this account")

    allow_credentials = [
        PublicKeyCredentialDescriptor(id=base64url_to_bytes(row["credential_id"]))
        for row in passkeys
    ]

    options = generate_authentication_options(
        rp_id=RP_ID,
        allow_credentials=allow_credentials,
        user_verification=UserVerificationRequirement.PREFERRED,
    )

    challenge_b64 = options.challenge
    create_webauthn_challenge(
        challenge=challenge_b64,
        challenge_type="authentication",
        user_id=int(user["id"]),
        email=user["email"],
    )

    _log_auth(
        request=request,
        user_id=user["id"],
        email=user["email"],
        event_type="passkey_auth_started",
        detail="Passkey authentication started",
    )

    return {
        "ok": True,
        "options": options_to_json(options),
    }


@router.post("/authenticate/verify")
def complete_passkey_authentication(
    payload: PasskeyAuthCompleteRequest,
    request: Request,
    response: Response,
):
    credential = parse_authentication_credential_json(payload.credential)
    challenge_b64 = credential.response.client_data.challenge

    stored = get_active_webauthn_challenge(
        challenge=challenge_b64,
        challenge_type="authentication",
    )
    if not stored:
        raise HTTPException(status_code=400, detail="Authentication challenge is invalid or expired")

    cred_id = credential.raw_id
    passkey = get_passkey_by_credential_id(cred_id)
    if not passkey:
        raise HTTPException(status_code=401, detail="Passkey not recognised")

    user = get_user_by_id(int(passkey["user_id"]))
    user = _validate_active_user(user)

    verification = verify_authentication_response(
        credential=credential,
        expected_challenge=challenge_b64,
        expected_rp_id=RP_ID,
        expected_origin=RP_ORIGIN,
        credential_public_key=passkey["public_key"],
        credential_current_sign_count=int(passkey["sign_count"] or 0),
        require_user_verification=False,
    )

    update_passkey_counter(int(passkey["id"]), int(verification.new_sign_count))
    consume_webauthn_challenge(int(stored["id"]))

    remember = False
    token = create_session_token(int(user["id"]))
    csrf_token = secrets.token_urlsafe(32)

    _set_session_cookie(response, token, remember=remember)
    _set_csrf_cookie(response, csrf_token, remember=remember)

    _safe_session_reset(request)
    request.session[SESSION_USER_ID_KEY] = int(user["id"])
    request.session[SESSION_USER_EMAIL_KEY] = user["email"]
    request.session[SESSION_MFA_VERIFIED_KEY] = True
    request.session["csrf_token"] = csrf_token
    request.session["login_at"] = __import__("time").time()

    conn = get_db_connection()
    try:
        billing = _get_billing_safe(conn, int(user["id"]))
    finally:
        release_db_connection(conn)

    _clear_failures(_client_ip(request), user["email"])
    _log_auth(
        request=request,
        user_id=user["id"],
        email=user["email"],
        event_type="passkey_auth_succeeded",
        detail="Passkey authentication successful",
    )

    return {
        "ok": True,
        "authenticated": True,
        "mfa_verified": True,
        "mfa_pending": False,
        "user": _session_user_payload(user, billing),
    }


@router.delete("/{passkey_id}")
def remove_passkey(passkey_id: int, request: Request):
    user_id = request.session.get(SESSION_USER_ID_KEY)
    if not user_id:
        raise HTTPException(status_code=401, detail="Authentication required")

    delete_passkey(passkey_id, int(user_id))

    _log_auth(
        request=request,
        user_id=int(user_id),
        email=request.session.get(SESSION_USER_EMAIL_KEY),
        event_type="passkey_deleted",
        detail=f"Passkey {passkey_id} removed",
    )

    return {"ok": True, "message": "Passkey removed"}
