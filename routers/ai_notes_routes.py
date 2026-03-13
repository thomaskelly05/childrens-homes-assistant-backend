import os
import shutil
import uuid

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends, Query

from db.connection import get_db
from db.ai_notes_db import (
    ensure_ai_meetings_table,
    insert_ai_meeting_note,
    update_ai_meeting_note,
    list_ai_meeting_notes,
    get_ai_meeting_note,
    delete_ai_meeting_note
)

from services.ai_notes_service import (
    transcribe_audio,
    generate_note,
    edit_note
)

from auth.dependencies import get_current_user

router = APIRouter(
    prefix="/ai-notes",
    tags=["AI Notes"]
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "_tmp_uploads")

if os.path.exists(UPLOAD_DIR) and not os.path.isdir(UPLOAD_DIR):
    os.remove(UPLOAD_DIR)

os.makedirs(UPLOAD_DIR, exist_ok=True)


def _to_bool(value: str | None) -> bool:
    if value is None:
        return False
    return str(value).strip().lower() in {"true", "1", "yes", "y", "on"}


def _derive_title(final_note: str) -> str | None:
    lines = [line.strip() for line in final_note.splitlines() if line.strip()]
    if not lines:
        return None

    first_line = lines[0]

    if first_line.lower().startswith("meeting title:"):
        title = first_line.split(":", 1)[1].strip()
        return title or "AI Meeting Note"

    return first_line[:120]


@router.post("/transcribe")
async def transcribe_note_audio(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    filename = file.filename or ""
    extension = os.path.splitext(filename)[1].lower()

    if extension == "":
        extension = ".webm"

    allowed = [".webm", ".wav", ".mp3", ".m4a", ".mp4", ".ogg"]

    if extension not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported audio format")

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


@router.post("/generate")
async def generate_ai_note(
    transcript: str = Form(...),
    current_user=Depends(get_current_user)
):
    transcript = transcript.strip()

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript required")

    try:
        result = await generate_note(transcript)

        if isinstance(result, dict):
            return {
                "ok": True,
                "note": result.get("note", ""),
                "safeguarding_flag": result.get("safeguarding_flag", False),
                "safeguarding_reason": result.get("safeguarding_reason", "")
            }

        return {
            "ok": True,
            "note": str(result or "").strip(),
            "safeguarding_flag": False,
            "safeguarding_reason": "No safeguarding concern identified."
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI note generation failed: {str(e)}"
        )


@router.post("/edit")
async def edit_ai_note(
    text: str = Form(...),
    mode: str = Form(...),
    instruction: str | None = Form(None),
    current_user=Depends(get_current_user)
):
    text = text.strip()
    mode = mode.strip().lower()
    instruction = (instruction or "").strip()

    if not text:
        raise HTTPException(status_code=400, detail="Text required")

    if not mode:
        raise HTTPException(status_code=400, detail="Edit mode required")

    try:
        edited = await edit_note(
            text=text,
            mode=mode,
            instruction=instruction
        )

        return {
            "ok": True,
            "text": edited
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"AI edit failed: {str(e)}"
        )


@router.post("/save")
async def save_ai_note(
    transcript: str = Form(...),
    ai_draft: str = Form(...),
    final_note: str = Form(...),
    safeguarding_flag: str | None = Form(None),
    safeguarding_reason: str | None = Form(None),
    title: str | None = Form(None),
    note_id: int | None = Form(None),
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    transcript = transcript.strip()
    ai_draft = ai_draft.strip()
    final_note = final_note.strip()
    safeguarding_reason = (safeguarding_reason or "").strip()
    title = (title or "").strip()

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript required")

    if not ai_draft:
        raise HTTPException(status_code=400, detail="AI draft required")

    if not final_note:
        raise HTTPException(status_code=400, detail="Final note required")

    try:
        ensure_ai_meetings_table(conn)

        final_title = title or _derive_title(final_note)
        final_safeguarding_flag = _to_bool(safeguarding_flag)
        final_safeguarding_reason = safeguarding_reason or None

        if note_id is not None:
            record = update_ai_meeting_note(
                conn=conn,
                note_id=note_id,
                user_id=current_user["user_id"],
                transcript=transcript,
                ai_draft=ai_draft,
                final_note=final_note,
                title=final_title,
                safeguarding_flag=final_safeguarding_flag,
                safeguarding_reason=final_safeguarding_reason
            )

            if not record:
                raise HTTPException(status_code=404, detail="Meeting note not found")

            return {
                "ok": True,
                "message": "Meeting note updated",
                "record": record,
                "updated": True
            }

        record = insert_ai_meeting_note(
            conn=conn,
            user_id=current_user["user_id"],
            transcript=transcript,
            ai_draft=ai_draft,
            final_note=final_note,
            title=final_title,
            safeguarding_flag=final_safeguarding_flag,
            safeguarding_reason=final_safeguarding_reason
        )

        return {
            "ok": True,
            "message": "Meeting note saved",
            "record": record,
            "updated": False
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Save failed: {str(e)}"
        )


@router.get("/history")
async def list_saved_ai_notes(
    limit: int = Query(20, ge=1, le=100),
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_ai_meetings_table(conn)

        notes = list_ai_meeting_notes(
            conn=conn,
            user_id=current_user["user_id"],
            limit=limit
        )

        return {
            "ok": True,
            "notes": notes
        }

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load meeting history: {str(e)}"
        )


@router.get("/history/{note_id}")
async def get_saved_ai_note(
    note_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_ai_meetings_table(conn)

        note = get_ai_meeting_note(
            conn=conn,
            note_id=note_id,
            user_id=current_user["user_id"]
        )

        if not note:
            raise HTTPException(status_code=404, detail="Meeting note not found")

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


@router.post("/delete")
async def delete_note(
    note_id: int | None = Form(None),
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    if note_id is None:
        return {
            "ok": True,
            "message": "Meeting cleared"
        }

    try:
        ensure_ai_meetings_table(conn)

        deleted = delete_ai_meeting_note(
            conn=conn,
            note_id=note_id,
            user_id=current_user["user_id"]
        )

        if not deleted:
            raise HTTPException(status_code=404, detail="Meeting note not found")

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
