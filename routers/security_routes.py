from fastapi import APIRouter, Depends, HTTPException, status

from auth.current_user import get_current_user
from services.security_posture_service import (
    build_safeguarding_security_alerts,
    build_security_posture,
)

router = APIRouter(prefix="/security", tags=["security"])

SECURITY_ROLES = {
    "admin",
    "administrator",
    "super_admin",
    "superadmin",
    "founder",
    "owner",
    "provider_admin",
    "responsible_individual",
    "ri",
}


def require_security_user(current_user=Depends(get_current_user)):
    role = str(current_user.get("role") or "").strip().lower()
    if role not in SECURITY_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Security dashboard access is restricted",
        )
    return current_user


@router.get("/status")
def security_status(current_user=Depends(require_security_user)):
    return build_security_posture()


@router.get("/alerts")
def security_alerts(current_user=Depends(require_security_user)):
    return build_safeguarding_security_alerts()
