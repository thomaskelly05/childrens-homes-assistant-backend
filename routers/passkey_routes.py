from fastapi import APIRouter, Depends, HTTPException, Request

from db.connection import get_db
from db.passkeys_db import user_has_passkeys

router = APIRouter(prefix="/passkeys", tags=["Passkeys"])


def _get_user_id_from_session(request: Request) -> int:
    user_id = request.session.get("user_id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return int(user_id)


@router.get("/status")
def passkey_status(request: Request, conn=Depends(get_db)):
    user_id = _get_user_id_from_session(request)

    has_keys = user_has_passkeys(user_id)

    return {
        "ok": True,
        "has_passkeys": has_keys,
        "should_prompt_register": not has_keys,
    }


@router.post("/register/start")
def start_passkey_registration(request: Request):
    user_id = _get_user_id_from_session(request)

    return {
        "ok": True,
        "message": "Passkey registration started",
        "user_id": user_id,
    }


@router.post("/register/finish")
def finish_passkey_registration(request: Request):
    user_id = _get_user_id_from_session(request)

    return {
        "ok": True,
        "message": "Passkey registered",
        "user_id": user_id,
    }
