from fastapi import Depends, HTTPException

from auth.dependencies import get_current_user


def require_authenticated_user(current_user=Depends(get_current_user)):
    return current_user


def require_provider_admin(current_user=Depends(get_current_user)):
    role = current_user.get("role")

    if role != "provider_admin":
        raise HTTPException(status_code=403, detail="Forbidden")

    return current_user


def require_home_member(current_user=Depends(get_current_user)):
    home_id = current_user.get("home_id")

    if home_id is None:
        raise HTTPException(status_code=403, detail="No home access assigned")

    return current_user
