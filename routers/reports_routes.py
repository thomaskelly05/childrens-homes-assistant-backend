from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from openai import OpenAI

from auth.session_user import get_current_user

router = APIRouter(
    prefix="/reports",
    tags=["Reports"],
    dependencies=[Depends(get_current_user)],
)
compat_router = APIRouter(prefix="/api/reports", tags=["Reports compatibility"])

client = OpenAI()


class IncidentRequest(BaseModel):
    description: str


class ReportRequest(BaseModel):
    report_type: str | None = None
    scope: str | None = None
    home_id: int | None = None
    young_person_id: int | None = None
    payload: dict[str, Any] | None = None


@router.post("/incident")
def generate_incident_report(payload: IncidentRequest):
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
{payload.description}
"""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    return {
        "report": response.choices[0].message.content
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
