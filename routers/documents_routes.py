from fastapi import APIRouter, Depends
from fastapi.responses import FileResponse
from pydantic import BaseModel
from openai import OpenAI
from docx import Document
from docx.enum.section import WD_ORIENT
import uuid
import json

from auth.session_user import get_current_user

router = APIRouter(
    prefix="/documents",
    tags=["Documents"],
    dependencies=[Depends(get_current_user)],
)

client = OpenAI()


class DocumentRequest(BaseModel):
    description: str


# ----------------------------
# INCIDENT REPORT
# ----------------------------

@router.post("/incident")
def generate_incident(payload: DocumentRequest):
    prompt = f"""
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

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )

    text = res.choices[0].message.content

    doc = Document()
    doc.add_heading("Incident Report", level=1)
    doc.add_paragraph(text)

    filename = f"/tmp/{uuid.uuid4()}.docx"
    doc.save(filename)

    return FileResponse(filename, filename="Incident_Report.docx")


# ----------------------------
# RISK ASSESSMENT (LANDSCAPE)
# ----------------------------

@router.post("/risk")
def generate_risk(payload: DocumentRequest):
    prompt = f"""
Create a risk assessment for a residential children's home.

Return JSON list with 5 hazards.

Format:

[
{{
"hazard":"",
"who":"",
"harm":"",
"likelihood":"",
"severity":"",
"controls":"",
"further_controls":""
}}
]

Situation:
{payload.description}
"""

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )

    risks = json.loads(res.choices[0].message.content)

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

    filename = f"/tmp/{uuid.uuid4()}.docx"
    doc.save(filename)

    return FileResponse(filename, filename="Risk_Assessment.docx")


# ----------------------------
# DAILY LOG
# ----------------------------

@router.post("/daily-log")
def generate_daily_log(payload: DocumentRequest):
    prompt = f"""
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

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )

    text = res.choices[0].message.content

    doc = Document()
    doc.add_heading("Daily Log Entry", level=1)
    doc.add_paragraph(text)

    filename = f"/tmp/{uuid.uuid4()}.docx"
    doc.save(filename)

    return FileResponse(filename, filename="Daily_Log.docx")


# ----------------------------
# SHIFT HANDOVER
# ----------------------------

@router.post("/handover")
def generate_handover(payload: DocumentRequest):
    prompt = f"""
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

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )

    text = res.choices[0].message.content

    doc = Document()
    doc.add_heading("Shift Handover", level=1)
    doc.add_paragraph(text)

    filename = f"/tmp/{uuid.uuid4()}.docx"
    doc.save(filename)

    return FileResponse(filename, filename="Shift_Handover.docx")


# ----------------------------
# SAFEGUARDING CONCERN
# ----------------------------

@router.post("/safeguarding")
def generate_safeguarding(payload: DocumentRequest):
    prompt = f"""
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

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )

    text = res.choices[0].message.content

    doc = Document()
    doc.add_heading("Safeguarding Concern Record", level=1)
    doc.add_paragraph(text)

    filename = f"/tmp/{uuid.uuid4()}.docx"
    doc.save(filename)

    return FileResponse(filename, filename="Safeguarding_Record.docx")


# ----------------------------
# REFLECTIVE PRACTICE
# ----------------------------

@router.post("/reflection")
def generate_reflection(payload: DocumentRequest):
    prompt = f"""
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

    res = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
    )

    text = res.choices[0].message.content

    doc = Document()
    doc.add_heading("Reflective Practice Record", level=1)
    doc.add_paragraph(text)

    filename = f"/tmp/{uuid.uuid4()}.docx"
    doc.save(filename)

    return FileResponse(filename, filename="Reflective_Practice.docx")
