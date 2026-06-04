from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.session_user import get_current_user
from schemas.data_protection import DataClassification
from services.ai_external_call_governance import (
    FEATURE_REPORT_DRAFTING,
    governance_ids_from_user,
    governed_draft_text,
    redact_plain_text,
)
from services.provider_data_intelligence_settings_service import (
    provider_data_intelligence_settings_service,
)

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[Depends(get_current_user)],
)
compat_router = APIRouter(prefix="/api/reports", tags=["Reports compatibility"])


class IncidentRequest(BaseModel):
    description: str


class ReportRequest(BaseModel):
    report_type: str | None = None
    scope: str | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    payload: dict[str, Any] | None = None


@router.post("/incident")
def generate_incident_report(
    payload: IncidentRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    ids = governance_ids_from_user(current_user)
    settings = provider_data_intelligence_settings_service.defaults(
        provider_id=ids["provider_id"],
        home_id=ids["home_id"],
    )
    if not settings.report_ai_drafting_enabled:
        raise HTTPException(
            status_code=403,
            detail="Report AI drafting is disabled for this provider",
        )

    redacted_description, _ = redact_plain_text(payload.description, mode=settings.redaction_mode or "strict")
    prompt = f"""
You help residential children's home staff write structured incident reports.

Write a professional, neutral incident report using the structure below.

Do NOT invent details. Use only the information provided.

Sections:

Incident Summary
Immediate Context
Staff Response
Safeguarding Considerations
Reflection
Next Steps

Incident description:
{redacted_description}
"""

    response = governed_draft_text(
        feature=FEATURE_REPORT_DRAFTING,
        prompt=prompt,
        model="gpt-4o-mini",
        provider_id=ids["provider_id"],
        home_id=ids["home_id"],
        user_id=ids["user_id"],
        data_classification=DataClassification.SAFEGUARDING_SENSITIVE,
        metadata={"route": "reports_routes.incident", "draft_only": True},
    )

    return {
        "report": response.text,
        "draft_only": True,
        "human_review_required": True,
        "external_ai_used": response.external_ai_used,
    }


@compat_router.get("/context")
def report_context(current_user: dict[str, Any] = Depends(get_current_user)):
    return {
        "ok": True,
        "available": True,
        "message": "Reporting context is schema-backed only. Preview and lifecycle actions remain unavailable until report composition is connected to live records.",
        "user": {
            "user_id": current_user.get("user_id") or current_user.get("id"),
            "home_id": current_user.get("home_id"),
            "provider_id": current_user.get("provider_id"),
            "role": current_user.get("role"),
        },
        "supported_sources": [
            "chronology_events",
            "documents",
            "reg44_actions",
            "reg45_actions",
            "inspection_readiness_runs",
            "actions",
        ],
    }


@compat_router.post("/preview")
def report_preview(payload: ReportRequest, current_user: dict[str, Any] = Depends(get_current_user)):
    return {
        "ok": True,
        "available": False,
        "report_type": payload.report_type,
        "message": "Report preview is not generated from frontend demo data. A live schema-backed report composer is required before previews are shown.",
    }


@compat_router.post("/save-draft")
def save_report_draft(payload: ReportRequest, current_user: dict[str, Any] = Depends(get_current_user)):
    return {
        "ok": True,
        "available": False,
        "report_type": payload.report_type,
        "message": "Draft saving is unavailable until backend report persistence is connected to live report records.",
    }


@compat_router.post("/review")
def review_report(payload: ReportRequest, current_user: dict[str, Any] = Depends(get_current_user)):
    return {
        "ok": True,
        "available": False,
        "report_type": payload.report_type,
        "message": "Report review is unavailable until backend report lifecycle records are connected.",
    }


@compat_router.post("/sign-off")
def sign_off_report(payload: ReportRequest, current_user: dict[str, Any] = Depends(get_current_user)):
    return {
        "ok": True,
        "available": False,
        "report_type": payload.report_type,
        "message": "Report sign-off is unavailable until backend report lifecycle records are connected.",
    }
