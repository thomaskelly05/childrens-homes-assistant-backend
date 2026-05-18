from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from fastapi.responses import FileResponse

router = APIRouter(tags=["Referral Portal Page"])


def _frontend_file(name: str) -> Path:
    return Path(__file__).resolve().parent.parent / "frontend" / name


@router.get("/referral-portal", include_in_schema=False)
@router.get("/referral-portal/", include_in_schema=False)
@router.get("/matching-portal", include_in_schema=False)
@router.get("/matching-portal/", include_in_schema=False)
def referral_portal_page():
    return FileResponse(_frontend_file("referrals-portal.html"))
