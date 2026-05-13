from fastapi import Depends

from auth.dependencies import get_current_user
from auth.permissions import _ensure_home_access, require_provider_admin as _require_provider_admin


def require_authenticated_user(current_user=Depends(get_current_user)):
    return current_user


def require_provider_admin(current_user=Depends(get_current_user)):
    return _require_provider_admin(current_user)


def require_home_member(current_user=Depends(get_current_user)):
    home_id = current_user.get("home_id")

    if home_id is None:
        from auth.errors import forbidden

        raise forbidden("home_access_required", "No home access assigned")

    return _ensure_home_access(current_user, home_id)
