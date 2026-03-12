import os
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query

from db.connection import get_db
from db.ai_notes_db import (
    ensure_ai_meetings_table,
    insert_ai_meeting_note,
    list_ai_meeting_notes,
    get_ai_meeting_note,
    delete_ai_meeting_note
)

from services.ai_notes_service import (
    transcribe_audio,
    generate_note,
    edit_note
)

router = APIRouter(
    prefix="/ai-notes",
    tags=["AI Notes"]
)

# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "_tmp_uploads")

if os.path.exists(UPLOAD_DIR) and not os.path.isdir(UPLOAD_DIR):
    os.remove(UPLOAD_DIR)

os.makedirs(UPLOAD_DIR, exist_ok=True)


# --------------------------------------------------
# TRANSCRIBE AUDIO
# --------------------------------------------------

@router.post("/transcribe")
async def transcribe_note_audio(file: UploadFile = File(...)):

    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    filename = file.filename or ""
    extension = os.path.splitext(filename)[1].lower()

    if extension == "":
        extension = ".webm"

    allowed = [".webm", ".wav", ".mp3", ".m4a", ".mp4", ".ogg"]

    if extension not in allowed:
        raise HTTPException(
            status_code=400,
            detail="Unsupported audio format"
        )

    temp_filename = f"{uuid.uuid4()}{extension}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        if not os.path.exists(temp_path) or os.path.getsize(temp_path) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        transcript = await transcribe_audio(temp_path)

        return {
            "ok": True,
            "transcript": transcript
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )

    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


# --------------------------------------------------
# GENERATE MEETING NOTE
# --------------------------------------------------

@router.post("/generate")
async def generate_ai_note(transcript: str = Form(...)):

    transcript = transcript.strip()

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Transcript required"
        )

    try:
        note = await generate_note(transcript)

        return {
            "ok": True,
            "note": note
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI note generation failed: {str(e)}"
        )


# --------------------------------------------------
# AI EDIT FINAL NOTE
# --------------------------------------------------

@router.post("/edit")
async def edit_ai_note(
    text: str = Form(...),
    mode: str = Form(...)
):

    text = text.strip()
    mode = mode.strip().lower()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Text required"
        )

    if not mode:
        raise HTTPException(
            status_code=400,
            detail="Edit mode required"
        )

    try:
        edited = await edit_note(text, mode)

        return {
            "ok": True,
            "text": edited
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI edit failed: {str(e)}"
        )


# --------------------------------------------------
# SAVE MEETING NOTE
# --------------------------------------------------

@router.post("/save")
async def save_ai_note(
    transcript: str = Form(...),
    ai_draft: str = Form(...),
    final_note: str = Form(...),
    conn=Depends(get_db)
):

    transcript = transcript.strip()
    ai_draft = ai_draft.strip()
    final_note = final_note.strip()

    if not transcript:
        raise HTTPException(
            status_code=400,
            detail="Transcript required"
        )

    if not ai_draft:
        raise HTTPException(
            status_code=400,
            detail="AI draft required"
        )

    if not final_note:
        raise HTTPException(
            status_code=400,
            detail="Final note required"
        )

    try:
        ensure_ai_meetings_table(conn)

        record = insert_ai_meeting_note(
            conn=conn,
            transcript=transcript,
            ai_draft=ai_draft,
            final_note=final_note
        )

        return {
            "ok": True,
            "message": "Meeting note saved",
            "record": record
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Save failed: {str(e)}"
        )


# --------------------------------------------------
# LIST SAVED MEETING NOTES
# --------------------------------------------------

@router.get("/history")
async def list_saved_ai_notes(
    limit: int = Query(20, ge=1, le=100),
    conn=Depends(get_db)
):
    try:
        ensure_ai_meetings_table(conn)

        notes = list_ai_meeting_notes(conn, limit=limit)

        return {
            "ok": True,
            "notes": notes
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load meeting history: {str(e)}"
        )


# --------------------------------------------------
# GET ONE SAVED MEETING NOTE
# --------------------------------------------------

@router.get("/history/{note_id}")
async def get_saved_ai_note(
    note_id: int,
    conn=Depends(get_db)
):
    try:
        ensure_ai_meetings_table(conn)

        note = get_ai_meeting_note(conn, note_id)

        if not note:
            raise HTTPException(
                status_code=404,
                detail="Meeting note not found"
            )

        return {
            "ok": True,
            "note": note
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load meeting note: {str(e)}"
        )


# --------------------------------------------------
# DELETE MEETING NOTE
# --------------------------------------------------

@router.post("/delete")
async def delete_note(
    note_id: int | None = Form(None),
    conn=Depends(get_db)
):
    if note_id is None:
        return {
            "ok": True,
            "message": "Meeting cleared"
        }

    try:
        ensure_ai_meetings_table(conn)

        deleted = delete_ai_meeting_note(conn, note_id)

        if not deleted:
            raise HTTPException(
                status_code=404,
                detail="Meeting note not found"
            )

        return {
            "ok": True,
            "message": "Meeting note deleted"
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Delete failed: {str(e)}"
        )
