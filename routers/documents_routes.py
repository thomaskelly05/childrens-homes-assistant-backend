from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from openai import OpenAI
from docx import Document
from docx.enum.section import WD_ORIENT
from psycopg2.extras import RealDictCursor
from slowapi import Limiter
from slowapi.util import get_remote_address
import uuid
import json
import os
import tempfile
import logging

from auth.session_user import get_current_user
from db.connection import get_db

router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
)

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
client = OpenAI()

ALLOWED_ROLES = {"manager", "admin"}
MAX_DESCRIPTION_LENGTH = 8000
ALLOWED_DOC_TYPES = {
    "incident",
    "risk",
    "daily-log",
    "handover",
    "safeguarding",
    "reflection",
}


class DocumentRequest(BaseModel):
    description: str = Field(..., min_length=10, max_length=MAX_DESCRIPTION_LENGTH)


def require_document_access(current_user: dict):
    role = (current_user.get("role") or "").strip().lower()
    if role not in ALLOWED_ROLES:
        raise HTTPException(status_code=403, detail="Manager or admin access required")

    home_id = current_user.get("home_id")
    try:
        home_id = int(home_id) if home_id is not None else None
    except (TypeError, ValueError):
        home_id = None

    if role == "manager" and home_id is None:
        raise HTTPException(status_code=403, detail="Manager is not assigned to a home")

    return role, home_id


def create_temp_docx() -> str:
    fd, path = tempfile.mkstemp(suffix=".docx", prefix="indicare_")
    os.close(fd)
    return path


def remove_file_safely(path: str):
    try:
        if path and os.path.exists(path):
            os.remove(path)
    except Exception:
        logger.exception("Failed to remove temporary file: %s", path)


def save_and_return_doc(
    doc: Document,
    download_name: str,
    background_tasks: BackgroundTasks,
):
    path = create_temp_docx()
    doc.save(path)
    background_tasks.add_task(remove_file_safely, path)
    return FileResponse(
        path,
        filename=download_name,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    )


def write_simple_doc(title: str, text: str) -> Document:
    doc = Document()
    doc.add_heading(title, level=1)

    for line in (text or "").split("\n"):
        clean = line.strip()
        if clean:
            doc.add_paragraph(clean)

    return doc


def audit_document_action(
    conn,
    admin_user_id: int | None,
    action: str,
    target_type: str,
    details: dict,
):
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO admin_audit_log (
                    admin_user_id,
                    action,
                    target_type,
                    target_id,
                    details,
                    created_at
                )
                VALUES (%s, %s, %s, NULL, %s::jsonb, NOW())
                """,
                (
                    admin_user_id,
                    action,
                    target_type,
                    json.dumps(details),
                ),
            )
        conn.commit()
    except Exception:
        conn.rollback()
        logger.exception("Failed to write admin audit log")


def safe_model_text(prompt: str) -> str:
    try:
        res = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You write professional, factual UK residential childcare documents. "
                        "Do not include markdown fences. Do not invent facts. "
                        "Use clear headings and plain professional language."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
        )
        return (res.choices[0].message.content or "").strip()
    except Exception:
        logger.exception("OpenAI text generation failed")
        raise HTTPException(status_code=502, detail="Document generation service failed")


def safe_model_json(prompt: str) -> list[dict]:
    try:
        res = client.chat.completions.create(
            model="gpt-4o-mini",
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Return valid JSON only. "
                        "Output an object with key 'risks' containing a list of exactly 5 risk items."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
        )
        raw = (res.choices[0].message.content or "").strip()
        parsed = json.loads(raw)

        risks = parsed.get("risks")
        if not isinstance(risks, list):
            raise ValueError("Missing risks list")

        cleaned = []
        for item in risks[:5]:
            if not isinstance(item, dict):
                continue
            cleaned.append(
                {
                    "hazard": str(item.get("hazard", "")),
                    "who": str(item.get("who", "")),
                    "harm": str(item.get("harm", "")),
                    "likelihood": str(item.get("likelihood", "")),
                    "severity": str(item.get("severity", "")),
                    "controls": str(item.get("controls", "")),
                    "further_controls": str(item.get("further_controls", "")),
                }
            )

        if not cleaned:
            raise ValueError("No usable risk rows returned")

        return cleaned

    except Exception:
        logger.exception("OpenAI JSON generation failed")
        raise HTTPException(status_code=502, detail="Risk assessment generation failed")


def build_context_header(current_user: dict) -> str:
    role = (current_user.get("role") or "").strip()
    home_id = current_user.get("home_id")
    return f"Author role: {role}\nHome ID: {home_id}\n"


@router.post("/incident")
@limiter.limit("10/minute")
def generate_incident(
    request: Request,
    payload: DocumentRequest,
    background_tasks: BackgroundTasks,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_document_access(current_user)

    prompt = f"""
{build_context_header(current_user)}
Write a professional incident report for a UK residential children's home.

Sections:
Incident Summary
Antecedents
Behaviour Observed
Staff Response
Safeguarding Considerations
Outcome
Follow Up Actions

Situation:
{payload.description}
"""
    text = safe_model_text(prompt)
    doc = write_simple_doc("Incident Report", text)

    audit_document_action(
        conn,
        int(current_user["user_id"]),
        "generate_incident_document",
        "document_generation",
        {"home_id": current_user.get("home_id")},
    )

    return save_and_return_doc(doc, "Incident_Report.docx", background_tasks)


@router.post("/risk")
@limiter.limit("10/minute")
def generate_risk(
    request: Request,
    payload: DocumentRequest,
    background_tasks: BackgroundTasks,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_document_access(current_user)

    prompt = f"""
{build_context_header(current_user)}
Create a risk assessment for a residential children's home.

Return JSON as:
{{
  "risks": [
    {{
      "hazard": "",
      "who": "",
      "harm": "",
      "likelihood": "",
      "severity": "",
      "controls": "",
      "further_controls": ""
    }}
  ]
}}

Situation:
{payload.description}
"""
    risks = safe_model_json(prompt)

    doc = Document()
    section = doc.sections[0]
    section.orientation = WD_ORIENT.LANDSCAPE
    section.page_width, section.page_height = section.page_height, section.page_width

    doc.add_heading("Risk Assessment", level=1)
    table = doc.add_table(rows=1, cols=10)

    headers = [
        "Hazard",
        "Who at Risk",
        "Potential Harm",
        "Likelihood",
        "Severity",
        "Risk Score",
        "Existing Controls",
        "Further Controls",
        "Responsible",
        "Review Date",
    ]

    for i, h in enumerate(headers):
        table.rows[0].cells[i].text = h

    for r in risks:
        row = table.add_row().cells
        row[0].text = r["hazard"]
        row[1].text = r["who"]
        row[2].text = r["harm"]
        row[3].text = r["likelihood"]
        row[4].text = r["severity"]
        row[5].text = ""
        row[6].text = r["controls"]
        row[7].text = r["further_controls"]
        row[8].text = ""
        row[9].text = ""

    audit_document_action(
        conn,
        int(current_user["user_id"]),
        "generate_risk_document",
        "document_generation",
        {"home_id": current_user.get("home_id")},
    )

    return save_and_return_doc(doc, "Risk_Assessment.docx", background_tasks)


@router.post("/daily-log")
@limiter.limit("10/minute")
def generate_daily_log(
    request: Request,
    payload: DocumentRequest,
    background_tasks: BackgroundTasks,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_document_access(current_user)

    prompt = f"""
{build_context_header(current_user)}
Write a daily log entry for residential children's home staff.

Sections:
Summary of the Day
Behaviour Observed
Staff Support Provided
Education / Activities
Health and Wellbeing
Any Concerns
Next Actions

Notes:
{payload.description}
"""
    text = safe_model_text(prompt)
    doc = write_simple_doc("Daily Log Entry", text)

    audit_document_action(
        conn,
        int(current_user["user_id"]),
        "generate_daily_log_document",
        "document_generation",
        {"home_id": current_user.get("home_id")},
    )

    return save_and_return_doc(doc, "Daily_Log.docx", background_tasks)


@router.post("/handover")
@limiter.limit("10/minute")
def generate_handover(
    request: Request,
    payload: DocumentRequest,
    background_tasks: BackgroundTasks,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_document_access(current_user)

    prompt = f"""
{build_context_header(current_user)}
Write a shift handover for residential children's home staff.

Sections:
Children Present
Key Events
Safeguarding Concerns
Medication Updates
Appointments
Behaviour Notes
Tasks for Next Shift

Notes:
{payload.description}
"""
    text = safe_model_text(prompt)
    doc = write_simple_doc("Shift Handover", text)

    audit_document_action(
        conn,
        int(current_user["user_id"]),
        "generate_handover_document",
        "document_generation",
        {"home_id": current_user.get("home_id")},
    )

    return save_and_return_doc(doc, "Shift_Handover.docx", background_tasks)


@router.post("/safeguarding")
@limiter.limit("5/minute")
def generate_safeguarding(
    request: Request,
    payload: DocumentRequest,
    background_tasks: BackgroundTasks,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_document_access(current_user)

    prompt = f"""
{build_context_header(current_user)}
Write a safeguarding concern record for a children's home.

Sections:
Concern Description
Child Details
Immediate Actions Taken
Who Was Notified
External Agencies Involved
Outcome

Concern:
{payload.description}
"""
    text = safe_model_text(prompt)
    doc = write_simple_doc("Safeguarding Concern Record", text)

    audit_document_action(
        conn,
        int(current_user["user_id"]),
        "generate_safeguarding_document",
        "document_generation",
        {"home_id": current_user.get("home_id")},
    )

    return save_and_return_doc(doc, "Safeguarding_Record.docx", background_tasks)


@router.post("/reflection")
@limiter.limit("10/minute")
def generate_reflection(
    request: Request,
    payload: DocumentRequest,
    background_tasks: BackgroundTasks,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    require_document_access(current_user)

    prompt = f"""
{build_context_header(current_user)}
Write a reflective practice record for children's home staff.

Sections:
Situation
Thoughts and Feelings
Analysis
Learning
Future Actions

Reflection:
{payload.description}
"""
    text = safe_model_text(prompt)
    doc = write_simple_doc("Reflective Practice Record", text)

    audit_document_action(
        conn,
        int(current_user["user_id"]),
        "generate_reflection_document",
        "document_generation",
        {"home_id": current_user.get("home_id")},
    )

    return save_and_return_doc(doc, "Reflective_Practice.docx", background_tasks)
