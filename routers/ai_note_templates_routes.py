from fastapi import APIRouter, Depends, Form, HTTPException

from db.connection import get_db
from db.ai_note_templates_db import (
    ensure_ai_note_templates_table,
    list_ai_note_templates,
    insert_ai_note_template,
    delete_ai_note_template
)
from auth.dependencies import get_current_user

router = APIRouter(
    prefix="/ai-note-templates",
    tags=["AI Note Templates"]
)


@router.get("")
async def get_templates(
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_ai_note_templates_table(conn)

        templates = list_ai_note_templates(
            conn=conn,
            user_id=current_user["user_id"]
        )

        return {
            "ok": True,
            "templates": templates
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load templates: {str(e)}"
        )


@router.post("")
async def create_template(
    name: str = Form(...),
    sections_json: str = Form(...),
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    import json

    name = name.strip()

    if not name:
        raise HTTPException(status_code=400, detail="Template name is required")

    try:
        sections = json.loads(sections_json)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid sections format")

    if not isinstance(sections, list) or not sections:
        raise HTTPException(status_code=400, detail="At least one section is required")

    cleaned_sections = [str(section).strip() for section in sections if str(section).strip()]

    if not cleaned_sections:
        raise HTTPException(status_code=400, detail="At least one valid section is required")

    try:
        ensure_ai_note_templates_table(conn)

        template = insert_ai_note_template(
            conn=conn,
            user_id=current_user["user_id"],
            name=name,
            sections=cleaned_sections
        )

        return {
            "ok": True,
            "template": template
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not save template: {str(e)}"
        )


@router.post("/delete")
async def remove_template(
    template_id: int = Form(...),
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_ai_note_templates_table(conn)

        deleted = delete_ai_note_template(
            conn=conn,
            template_id=template_id,
            user_id=current_user["user_id"]
        )

        if not deleted:
            raise HTTPException(status_code=404, detail="Template not found")

        return {
            "ok": True,
            "message": "Template deleted"
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not delete template: {str(e)}"
        )
