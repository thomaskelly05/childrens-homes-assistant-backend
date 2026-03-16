import os
import shutil
import uuid
from typing import Any

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


def _clean_text(value: str | None) -> str:
    return (value or "").strip()


def _none_if_empty(value: str | None) -> str | None:
    cleaned = _clean_text(value)
    return cleaned if cleaned else None


def _derive_title(final_note: str) -> str | None:
    lines = [line.strip() for line in final_note.splitlines() if line.strip()]
    if not lines:
        return None

    first_line = lines[0]

    if first_line.lower().startswith("meeting title:"):
        title = first_line.split(":", 1)[1].strip()
        return title or "AI Meeting Note"

    return first_line[:120]


def _normalise_segments(raw_segments: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_segments, list):
        return []

    normalised: list[dict[str, Any]] = []

    for index, segment in enumerate(raw_segments):
        if not isinstance(segment, dict):
            continue

        normalised.append({
            "speaker": str(segment.get("speaker") or f"Speaker {index + 1}"),
            "text": str(segment.get("text") or "").strip(),
            "start": float(segment.get("start") or 0),
            "end": float(segment.get("end") or 0)
        })

    return normalised


def _build_history_note(note: dict[str, Any]) -> dict[str, Any]:
    """
    Makes the response shape more stable for the frontend table.
    Keeps original keys where possible and adds fallback aliases.
    """
    final_note = note.get("final_note") or note.get("ai_draft") or ""
    excerpt = final_note[:180]

    return {
        **note,
        "id": note.get("id"),
        "title": note.get("title") or "Untitled care note",
        "template_name": note.get("template_name") or note.get("template") or "Saved note",
        "updated_at": note.get("updated_at") or note.get("created_at"),
        "final_note": final_note,
        "transcript": note.get("transcript") or "",
        "young_person_name": note.get("young_person_name") or "",
        "service_type": note.get("service_type") or "",
        "shift_type": note.get("shift_type") or "",
        "record_author": note.get("record_author") or "",
        "record_date": note.get("record_date") or "",
        "location_context": note.get("location_context") or "",
        "excerpt": excerpt
    }


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

        result = await transcribe_audio(temp_path)

        if isinstance(result, dict):
            transcript = _clean_text(result.get("transcript"))
            segments = _normalise_segments(result.get("segments") or result.get("speaker_segments"))

            return {
                "ok": True,
                "transcript": transcript,
                "segments": segments
            }

        transcript = _clean_text(str(result or ""))

        return {
            "ok": True,
            "transcript": transcript,
            "segments": []
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

    template_name: str | None = Form(None),
    service_type: str | None = Form(None),
    shift_type: str | None = Form(None),
    record_author: str | None = Form(None),
    young_person_name: str | None = Form(None),
    record_date: str | None = Form(None),
    location_context: str | None = Form(None),

    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    transcript = _clean_text(transcript)
    ai_draft = _clean_text(ai_draft)
    final_note = _clean_text(final_note)
    safeguarding_reason = _clean_text(safeguarding_reason)
    title = _clean_text(title)

    template_name = _clean_text(template_name)
    service_type = _clean_text(service_type)
    shift_type = _clean_text(shift_type)
    record_author = _clean_text(record_author)
    young_person_name = _clean_text(young_person_name)
    record_date = _clean_text(record_date)
    location_context = _clean_text(location_context)

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript required")

    if not ai_draft:
        raise HTTPException(status_code=400, detail="AI draft required")

    if not final_note:
        raise HTTPException(status_code=400, detail="Final note required")

    try:
        ensure_ai_meetings_table(conn)

        final_title = title or _derive_title(final_note) or "AI Meeting Note"
        final_safeguarding_flag = _to_bool(safeguarding_flag)
        final_safeguarding_reason = _none_if_empty(safeguarding_reason)

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
                safeguarding_reason=final_safeguarding_reason,

                template_name=_none_if_empty(template_name),
                service_type=_none_if_empty(service_type),
                shift_type=_none_if_empty(shift_type),
                record_author=_none_if_empty(record_author),
                young_person_name=_none_if_empty(young_person_name),
                record_date=_none_if_empty(record_date),
                location_context=_none_if_empty(location_context)
            )

            if not record:
                raise HTTPException(status_code=404, detail="Meeting note not found")

            return {
                "ok": True,
                "message": "Meeting note updated",
                "record": _build_history_note(record),
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
            safeguarding_reason=final_safeguarding_reason,

            template_name=_none_if_empty(template_name),
            service_type=_none_if_empty(service_type),
            shift_type=_none_if_empty(shift_type),
            record_author=_none_if_empty(record_author),
            young_person_name=_none_if_empty(young_person_name),
            record_date=_none_if_empty(record_date),
            location_context=_none_if_empty(location_context)
        )

        return {
            "ok": True,
            "message": "Meeting note saved",
            "record": _build_history_note(record),
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
            "notes": [_build_history_note(note) for note in notes]
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
            "note": _build_history_note(note)
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Could not load meeting note: {str(e)}"
        )


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
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
