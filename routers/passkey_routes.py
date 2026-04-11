import base64
import json
import os
import secrets
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from db.connection import get_db
from db.passkeys_db import (
    create_user_passkey,
    delete_user_passkey,
    list_user_passkeys,
    user_has_passkeys,
)

router = APIRouter(prefix="/auth/passkeys", tags=["Passkeys"])


RP_ID = os.getenv("PASSKEY_RP_ID", "app.indicare.co.uk")
RP_NAME = os.getenv("PASSKEY_RP_NAME", "IndiCare")


class PasskeyRegisterVerifyRequest(BaseModel):
    credential: dict[str, Any] | None = None
    nickname: str | None = ""


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


def _get_user_id_from_session(request: Request) -> int:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return int(user_id)


def _get_user_email_from_session(request: Request, user_id: int) -> str:
    email = str(
        request.session.get("user_email") or f"user-{user_id}@indicare.local"
    ).strip()
    return email


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
        credential_id = str(item.get("credential_id") or "").strip()
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
    credential_id = str(credential.get("id") or "").strip()
    raw_id = str(credential.get("rawId") or "").strip()
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

    allowed_origins = {
        "https://app.indicare.co.uk",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
    if origin not in allowed_origins:
        raise HTTPException(status_code=400, detail="Invalid passkey origin")

    transports = credential.get("transports")
    nickname = (payload.nickname or "").strip() or "My passkey"

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


# Backwards-compatible aliases
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
