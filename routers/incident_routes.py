from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from services.document_service import generate_doc

router = APIRouter()


@router.post("/documents/incident")
async def generate_incident(data: dict):

    template = "templates/incident_template.docx"

    doc = generate_doc(template, data)

    return StreamingResponse(
        doc,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": "attachment; filename=incident_report.docx"},
    )
