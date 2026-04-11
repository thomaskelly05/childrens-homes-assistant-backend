import base64
import json
import os
import secrets

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from db.connection import get_db
from db.passkeys_db import user_has_passkeys

router = APIRouter(prefix="/auth/passkeys", tags=["Passkeys"])


RP_ID = os.getenv("PASSKEY_RP_ID", "app.indicare.co.uk")
RP_NAME = os.getenv("PASSKEY_RP_NAME", "IndiCare")


class PasskeyRegisterVerifyRequest(BaseModel):
    credential: dict | None = None
    nickname: str | None = ""


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _get_user_id_from_session(request: Request) -> int:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return int(user_id)


@router.get("")
def list_passkeys(request: Request, conn=Depends(get_db)):
    user_id = _get_user_id_from_session(request)
    has_keys = user_has_passkeys(user_id)

    return {
        "ok": True,
        "items": [],
        "has_passkeys": has_keys,
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
    user_email = str(
        request.session.get("user_email") or f"user-{user_id}@indicare.local"
    ).strip()

    challenge = secrets.token_bytes(32)
    user_handle = f"indicare-user-{user_id}".encode("utf-8")

    request.session["passkey_register_challenge"] = _b64url(challenge)

    options = {
        "challenge": _b64url(challenge),
        "rp": {
            "name": RP_NAME,
            "id": RP_ID,
        },
        "user": {
            "id": _b64url(user_handle),
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

    return {
        "ok": True,
        "message": "Passkey registration options created",
        "user_id": user_id,
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
    if not expected_challenge:
        raise HTTPException(status_code=400, detail="No passkey registration is pending")

    credential = payload.credential or {}
    response = credential.get("response") or {}
    client_data_json = response.get("clientDataJSON")

    if not client_data_json:
        raise HTTPException(status_code=400, detail="Missing credential response")

    # Placeholder success for now.
    # Real WebAuthn verification and DB save comes next.
    request.session.pop("passkey_register_challenge", None)

    return {
        "ok": True,
        "message": "Passkey registered",
        "user_id": user_id,
        "nickname": (payload.nickname or "").strip(),
    }


@router.delete("/{passkey_id}")
def delete_passkey(passkey_id: str, request: Request, conn=Depends(get_db)):
    _get_user_id_from_session(request)

    return {
        "ok": True,
        "deleted": True,
        "passkey_id": passkey_id,
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
