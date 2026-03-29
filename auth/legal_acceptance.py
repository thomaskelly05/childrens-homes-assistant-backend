from __future__ import annotations

from fastapi import Depends, HTTPException, status

from auth.current_user import get_current_user
from db.legal_acceptance_db import has_user_accepted_version

CURRENT_LEGAL_VERSION = "2026-03-29-v1"


def _extract_user_id(user: object) -> int | None:
    if user is None:
        return None

    if isinstance(user, dict):
        value = user.get("id")
        return int(value) if value is not None else None

    value = getattr(user, "id", None)
    return int(value) if value is not None else None


def require_current_legal_acceptance(
    current_user: object = Depends(get_current_user),
) -> object:
    user_id = _extract_user_id(current_user)

    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    if not has_user_accepted_version(user_id, CURRENT_LEGAL_VERSION):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Current legal terms must be accepted before using this feature.",
        )

    return current_user
