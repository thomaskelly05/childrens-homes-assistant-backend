import os
import shutil
import uuid

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from db.connection import get_db
from db.ai_notes_db import create_ai_notes_table, get_recent_ai_notes, save_ai_note
from services.ai_notes_service import generate_note, safeguarding_check, transcribe_audio

router = APIRouter(
    prefix="/ai-notes",
    tags=["AI Notes"]
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.on_event("startup")
def startup_create_ai_notes_table():
    db_gen = get_db()
    conn = next(db_gen)
    try:
        create_ai_notes_table(conn)
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass


@router.post("/transcribe")
async def transcribe_note_audio(
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file uploaded")

    extension = os.path.splitext(file.filename)[1] or ".webm"
    temp_filename = f"{uuid.uuid4()}{extension}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        transcript = await transcribe_audio(temp_path)

        return {
            "ok": True,
            "transcript": transcript
        }

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/generate")
async def generate_ai_note(
    transcript: str = Form(...)
):
    transcript = transcript.strip()

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    note = await generate_note(transcript)
    safeguarding = await safeguarding_check(transcript)

    return {
        "ok": True,
        "note": note,
        "safeguarding_flag": safeguarding["safeguarding_flag"],
        "safeguarding_reason": safeguarding["reason"]
    }


@router.post("/save")
async def save_generated_ai_note(
    child_id: int | None = Form(None),
    staff_id: int | None = Form(None),
    transcript: str = Form(...),
    ai_draft: str = Form(...),
    final_note: str = Form(...),
    safeguarding_flag: bool = Form(False),
    conn = Depends(get_db)
):
    transcript = transcript.strip()
    ai_draft = ai_draft.strip()
    final_note = final_note.strip()

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript is required")

    if not ai_draft:
        raise HTTPException(status_code=400, detail="AI draft is required")

    if not final_note:
        raise HTTPException(status_code=400, detail="Final note is required")

    row = save_ai_note(
        conn=conn,
        child_id=child_id,
        staff_id=staff_id,
        transcript=transcript,
        ai_draft=ai_draft,
        final_note=final_note,
        safeguarding_flag=safeguarding_flag
    )

    return {
        "ok": True,
        "message": "AI note saved",
        "record": row
    }


@router.get("/recent")
def recent_ai_notes(
    child_id: int | None = Query(None),
    limit: int = Query(20, ge=1, le=100),
    conn = Depends(get_db)
):
    notes = get_recent_ai_notes(conn, child_id=child_id, limit=limit)

    return {
        "ok": True,
        "notes": notes
    }
