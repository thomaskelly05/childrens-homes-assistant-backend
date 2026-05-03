from fastapi import APIRouter

from services.security_posture_service import (
    build_safeguarding_security_alerts,
    build_security_posture,
)

router = APIRouter(prefix="/security", tags=["security"])


@router.get("/status")
def security_status():
    return build_security_posture()


@router.get("/alerts")
def security_alerts():
    return build_safeguarding_security_alerts()
