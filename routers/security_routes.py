from fastapi import APIRouter
import os

router = APIRouter(prefix="/security", tags=["security"])

@router.get("/status")
def security_status():
    issues = []

    if not os.getenv("SESSION_SECRET_KEY"):
        issues.append("SESSION_SECRET_KEY not set")

    if not os.getenv("COOKIE_SECURE"):
        issues.append("COOKIE_SECURE not set")

    if "localhost" in os.getenv("ALLOWED_ORIGINS", ""):
        issues.append("ALLOWED_ORIGINS includes localhost (remove in production)")

    return {
        "ok": len(issues) == 0,
        "issues": issues,
    }
