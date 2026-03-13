import os

from fastapi import APIRouter, Depends, Form, HTTPException
from fastapi.responses import FileResponse

from auth.dependencies import get_current_user
from services.ai_note_export_service import (
    create_docx_export,
    create_pdf_export,
    safe_filename,
)

router = APIRouter(
    prefix="/ai-notes/export",
    tags=["AI Note Export"]
)


def _clean_text(value: str | None) -> str:
    return (value or "").strip()


@router.post("/docx")
async def export_ai_note_docx(
    title: str | None = Form(None),
    final_note: str = Form(...),
    template_name: str | None = Form(None),
    current_user=Depends(get_current_user)
):
    final_note = _clean_text(final_note)
    title = _clean_text(title)
    template_name = _clean_text(template_name)

    if not final_note:
        raise HTTPException(status_code=400, detail="Final note is required")

    try:
        export_title = title or "AI Note"
        output_path = create_docx_export(
            title=export_title,
            note_text=final_note,
            template_name=template_name or None
        )

        filename = f"{safe_filename(export_title)}.docx"

        return FileResponse(
            path=output_path,
            filename=filename,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not export DOCX: {str(e)}"
        )


@router.post("/pdf")
async def export_ai_note_pdf(
    title: str | None = Form(None),
    final_note: str = Form(...),
    template_name: str | None = Form(None),
    current_user=Depends(get_current_user)
):
    final_note = _clean_text(final_note)
    title = _clean_text(title)
    template_name = _clean_text(template_name)

    if not final_note:
        raise HTTPException(status_code=400, detail="Final note is required")

    try:
        export_title = title or "AI Note"
        output_path = create_pdf_export(
            title=export_title,
            note_text=final_note,
            template_name=template_name or None
        )

        filename = f"{safe_filename(export_title)}.pdf"

        return FileResponse(
            path=output_path,
            filename=filename,
            media_type="application/pdf"
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not export PDF: {str(e)}"
        )
