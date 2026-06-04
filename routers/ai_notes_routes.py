import os
import json
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
    soft_delete_ai_meeting_note
)
from db.ai_note_versions_db import (
    ensure_ai_note_versions_table,
    insert_ai_note_version,
    list_ai_note_versions,
    get_ai_note_version
)
from services.ai_external_call_governance import governance_ids_from_user
from services.ai_notes_service import (
    transcribe_audio,
    generate_note,
    edit_note,
    extract_actions
)
from auth.dependencies import get_current_user

router = APIRouter(
    prefix="/ai-notes",
    tags=["AI Notes"]
)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "_tmp_uploads")
MAX_AUDIO_UPLOAD_BYTES = 25 * 1024 * 1024
MAX_TEXT_LENGTH = 120000

if os.path.exists(UPLOAD_DIR) and not os.path.isdir(UPLOAD_DIR):
    os.remove(UPLOAD_DIR)

os.makedirs(UPLOAD_DIR, exist_ok=True)


def _to_bool(value: str | None) -> bool:
    if value is None:
        return False
    return str(value).strip().lower() in {"true", "1", "yes", "y", "on"}


def _clean_text(value: str | None) -> str:
    return (value or "").strip()


def _clamp_text(value: str | None, max_length: int = MAX_TEXT_LENGTH) -> str:
    return _clean_text(value)[:max_length]


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
        return title or "I-Note"

    return first_line[:120]


def _normalise_segments(raw_segments: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_segments, list):
        return []

    normalised: list[dict[str, Any]] = []

    for index, segment in enumerate(raw_segments):
        if not isinstance(segment, dict):
            continue

        text = str(segment.get("text") or "").strip()
        if not text:
            continue

        normalised.append({
            "id": str(segment.get("id") or f"seg_{index + 1}"),
            "speaker": str(segment.get("speaker") or f"Speaker {index + 1}"),
            "text": text,
            "start": float(segment.get("start") or 0),
            "end": float(segment.get("end") or 0),
            "type": str(segment.get("type") or "transcript.text.segment")
        })

    return normalised


def _parse_speaker_segments_json(value: str | None) -> list[dict[str, Any]]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid speaker_segments_json")
    return _normalise_segments(parsed)


def _parse_speaker_map_json(value: str | None) -> dict[str, str]:
    if not value:
        return {}
    try:
        parsed = json.loads(value)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid speaker_map_json")

    if not isinstance(parsed, dict):
        raise HTTPException(status_code=400, detail="speaker_map_json must be an object")

    cleaned: dict[str, str] = {}
    for key, val in parsed.items():
        k = str(key).strip()
        v = str(val).strip()
        if k and v:
            cleaned[k] = v
    return cleaned


def _normalise_note_status(value: str | None) -> str:
    allowed = {"draft", "final", "approved"}
    cleaned = _clean_text(value).lower() or "draft"
    return cleaned if cleaned in allowed else "draft"


def _build_history_note(note: dict[str, Any]) -> dict[str, Any]:
    final_note = note.get("final_note") or note.get("ai_draft") or ""
    excerpt = final_note[:180]

    return {
        **note,
        "id": note.get("id"),
        "title": note.get("title") or "Untitled note",
        "template_name": note.get("template_name") or note.get("template") or "Meeting note",
        "updated_at": note.get("updated_at") or note.get("created_at"),
        "final_note": final_note,
        "transcript": note.get("transcript") or "",
        "young_person_name": note.get("young_person_name") or "",
        "service_type": note.get("service_type") or "",
        "shift_type": note.get("shift_type") or "",
        "meeting_format": note.get("meeting_format") or "",
        "record_author": note.get("record_author") or "",
        "record_date": note.get("record_date") or "",
        "location_context": note.get("location_context") or "",
        "speaker_segments": _normalise_segments(note.get("speaker_segments") or []),
        "speaker_map": note.get("speaker_map") or {},
        "note_status": note.get("note_status") or "draft",
        "excerpt": excerpt
    }


def _build_version_record(version: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": version.get("id"),
        "note_id": version.get("note_id"),
        "title": version.get("title") or "Untitled note",
        "transcript": version.get("transcript") or "",
        "ai_draft": version.get("ai_draft") or "",
        "final_note": version.get("final_note") or "",
        "speaker_segments": _normalise_segments(version.get("speaker_segments") or []),
        "created_at": version.get("created_at")
    }


@router.get("/diagnostics")
async def diagnostics(current_user=Depends(get_current_user)):
    return {
        "ok": True,
        "message": "I-Notes diagnostics healthy",
        "user_id": current_user["user_id"],
        "upload_dir_exists": os.path.isdir(UPLOAD_DIR),
        "openai_key_present": bool(os.getenv("OPENAI_API_KEY"))
    }


@router.post("/transcribe")
async def transcribe_note_audio(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user)
):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    filename = file.filename or ""
    extension = os.path.splitext(filename)[1].lower() or ".webm"
    allowed = [".webm", ".wav", ".mp3", ".m4a", ".mp4", ".ogg"]

    if extension not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported audio format")

    temp_filename = f"{uuid.uuid4()}{extension}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)

    try:
        total_bytes = 0
        with open(temp_path, "wb") as buffer:
            while True:
                chunk = file.file.read(1024 * 1024)
                if not chunk:
                    break
                total_bytes += len(chunk)
                if total_bytes > MAX_AUDIO_UPLOAD_BYTES:
                    raise HTTPException(status_code=400, detail="Audio file is too large")
                buffer.write(chunk)

        if not os.path.exists(temp_path) or os.path.getsize(temp_path) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")

        ids = governance_ids_from_user(current_user)
        result = await transcribe_audio(
            temp_path,
            provider_id=ids["provider_id"],
            home_id=ids["home_id"],
            user_id=ids["user_id"],
        )

        return {
            "ok": True,
            "transcript": _clamp_text(result.get("transcript")),
            "segments": _normalise_segments(result.get("segments") or []),
            "duration": result.get("duration")
        }

    except HTTPException:
        raise
    except Exception as e:
        print("TRANSCRIBE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Transcription failed: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@router.post("/generate")
async def generate_ai_note(
    transcript: str = Form(...),
    current_user=Depends(get_current_user)
):
    transcript = _clamp_text(transcript)

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript required")

    try:
        ids = governance_ids_from_user(current_user)
        result = await generate_note(
            transcript,
            provider_id=ids["provider_id"],
            home_id=ids["home_id"],
            user_id=ids["user_id"],
        )

        return {
            "ok": True,
            "note": result.get("note", ""),
            "safeguarding_flag": result.get("safeguarding_flag", False),
            "safeguarding_reason": result.get("safeguarding_reason", "")
        }

    except Exception as e:
        print("GENERATE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"AI note generation failed: {str(e)}")


@router.post("/edit")
async def edit_ai_note(
    text: str = Form(...),
    mode: str = Form(...),
    instruction: str | None = Form(None),
    current_user=Depends(get_current_user)
):
    text = _clamp_text(text)
    mode = _clean_text(mode).lower()
    instruction = _clamp_text(instruction, 5000)

    if not text:
        raise HTTPException(status_code=400, detail="Text required")

    if not mode:
        raise HTTPException(status_code=400, detail="Edit mode required")

    try:
        ids = governance_ids_from_user(current_user)
        edited = await edit_note(
            text=text,
            mode=mode,
            instruction=instruction,
            provider_id=ids["provider_id"],
            home_id=ids["home_id"],
            user_id=ids["user_id"],
        )

        return {
            "ok": True,
            "text": edited
        }

    except Exception as e:
        print("EDIT ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"AI edit failed: {str(e)}")


@router.post("/extract-actions")
async def extract_ai_note_actions(
    text: str = Form(...),
    current_user=Depends(get_current_user)
):
    text = _clamp_text(text)

    if not text:
        raise HTTPException(status_code=400, detail="Text required")

    try:
        ids = governance_ids_from_user(current_user)
        actions = await extract_actions(
            text,
            provider_id=ids["provider_id"],
            home_id=ids["home_id"],
            user_id=ids["user_id"],
        )
        return {
            "ok": True,
            "actions": actions
        }
    except Exception as e:
        print("EXTRACT ACTIONS ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Action extraction failed: {str(e)}")


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
    meeting_format: str | None = Form(None),
    record_author: str | None = Form(None),
    young_person_name: str | None = Form(None),
    record_date: str | None = Form(None),
    location_context: str | None = Form(None),
    speaker_segments_json: str | None = Form(None),
    speaker_map_json: str | None = Form(None),
    note_status: str | None = Form(None),

    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    transcript = _clamp_text(transcript)
    ai_draft = _clamp_text(ai_draft)
    final_note = _clamp_text(final_note)
    safeguarding_reason = _clean_text(safeguarding_reason)
    title = _clean_text(title)

    template_name = _clean_text(template_name)
    service_type = _clean_text(service_type)
    shift_type = _clean_text(shift_type)
    meeting_format = _clean_text(meeting_format)
    record_author = _clean_text(record_author)
    young_person_name = _clean_text(young_person_name)
    record_date = _clean_text(record_date)
    location_context = _clean_text(location_context)
    speaker_segments = _parse_speaker_segments_json(speaker_segments_json)
    speaker_map = _parse_speaker_map_json(speaker_map_json)
    final_note_status = _normalise_note_status(note_status)

    if not transcript:
        raise HTTPException(status_code=400, detail="Transcript required")
    if not ai_draft:
        raise HTTPException(status_code=400, detail="AI draft required")
    if not final_note:
        raise HTTPException(status_code=400, detail="Final note required")

    try:
        ensure_ai_meetings_table(conn)
        ensure_ai_note_versions_table(conn)

        final_title = title or _derive_title(final_note) or "I-Note"
        final_safeguarding_flag = _to_bool(safeguarding_flag)
        final_safeguarding_reason = _none_if_empty(safeguarding_reason)

        payload = dict(
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
            meeting_format=_none_if_empty(meeting_format),
            record_author=_none_if_empty(record_author),
            young_person_name=_none_if_empty(young_person_name),
            record_date=_none_if_empty(record_date),
            location_context=_none_if_empty(location_context),
            speaker_segments=speaker_segments,
            speaker_map=speaker_map,
            note_status=final_note_status
        )

        if note_id is not None:
            existing = get_ai_meeting_note(
                conn=conn,
                note_id=note_id,
                user_id=current_user["user_id"]
            )

            if not existing:
                raise HTTPException(status_code=404, detail="Note not found")

            insert_ai_note_version(
                conn=conn,
                note_id=note_id,
                user_id=current_user["user_id"],
                title=existing.get("title") or "Untitled note",
                transcript=existing.get("transcript") or "",
                ai_draft=existing.get("ai_draft") or "",
                final_note=existing.get("final_note") or "",
                speaker_segments=existing.get("speaker_segments") or []
            )

            record = update_ai_meeting_note(
                note_id=note_id,
                **payload
            )

            if not record:
                raise HTTPException(status_code=404, detail="Note not found")

            return {
                "ok": True,
                "message": "Note updated",
                "record": _build_history_note(record),
                "updated": True
            }

        record = insert_ai_meeting_note(**payload)

        insert_ai_note_version(
            conn=conn,
            note_id=record["id"],
            user_id=current_user["user_id"],
            title=record.get("title") or "Untitled note",
            transcript=record.get("transcript") or "",
            ai_draft=record.get("ai_draft") or "",
            final_note=record.get("final_note") or "",
            speaker_segments=record.get("speaker_segments") or []
        )

        return {
            "ok": True,
            "message": "Note saved",
            "record": _build_history_note(record),
            "updated": False
        }

    except HTTPException:
        raise
    except Exception as e:
        print("SAVE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Save failed: {str(e)}")


@router.get("/history")
async def list_saved_ai_notes(
    limit: int = Query(50, ge=1, le=100),
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
        print("HISTORY ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Could not load note history: {str(e)}")


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
            raise HTTPException(status_code=404, detail="Note not found")

        return {
            "ok": True,
            "note": _build_history_note(note)
        }

    except HTTPException:
        raise
    except Exception as e:
        print("GET NOTE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Could not load note: {str(e)}")


@router.get("/history/{note_id}/versions")
async def get_note_versions(
    note_id: int,
    limit: int = Query(20, ge=1, le=50),
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_ai_meetings_table(conn)
        ensure_ai_note_versions_table(conn)

        note = get_ai_meeting_note(
            conn=conn,
            note_id=note_id,
            user_id=current_user["user_id"]
        )
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        versions = list_ai_note_versions(
            conn=conn,
            note_id=note_id,
            user_id=current_user["user_id"],
            limit=limit
        )

        return {
            "ok": True,
            "versions": [_build_version_record(v) for v in versions]
        }

    except HTTPException:
        raise
    except Exception as e:
        print("VERSIONS ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Could not load note versions: {str(e)}")


@router.post("/history/{note_id}/restore-version")
async def restore_note_version(
    note_id: int,
    version_id: int = Form(...),
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_ai_meetings_table(conn)
        ensure_ai_note_versions_table(conn)

        note = get_ai_meeting_note(
            conn=conn,
            note_id=note_id,
            user_id=current_user["user_id"]
        )
        if not note:
            raise HTTPException(status_code=404, detail="Note not found")

        version = get_ai_note_version(
            conn=conn,
            version_id=version_id,
            user_id=current_user["user_id"]
        )
        if not version or int(version.get("note_id")) != int(note_id):
            raise HTTPException(status_code=404, detail="Version not found")

        insert_ai_note_version(
            conn=conn,
            note_id=note_id,
            user_id=current_user["user_id"],
            title=note.get("title") or "Untitled note",
            transcript=note.get("transcript") or "",
            ai_draft=note.get("ai_draft") or "",
            final_note=note.get("final_note") or "",
            speaker_segments=note.get("speaker_segments") or []
        )

        restored = update_ai_meeting_note(
            conn=conn,
            note_id=note_id,
            user_id=current_user["user_id"],
            title=version.get("title"),
            transcript=version.get("transcript") or "",
            ai_draft=version.get("ai_draft") or "",
            final_note=version.get("final_note") or "",
            safeguarding_flag=note.get("safeguarding_flag") or False,
            safeguarding_reason=note.get("safeguarding_reason"),
            template_name=note.get("template_name"),
            service_type=note.get("service_type"),
            shift_type=note.get("shift_type"),
            meeting_format=note.get("meeting_format"),
            record_author=note.get("record_author"),
            young_person_name=note.get("young_person_name"),
            record_date=note.get("record_date"),
            location_context=note.get("location_context"),
            speaker_segments=version.get("speaker_segments") or [],
            speaker_map=note.get("speaker_map") or {},
            note_status=note.get("note_status") or "draft"
        )

        return {
            "ok": True,
            "message": "Version restored",
            "record": _build_history_note(restored)
        }

    except HTTPException:
        raise
    except Exception as e:
        print("RESTORE VERSION ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Could not restore version: {str(e)}")


@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    conn=Depends(get_db),
    current_user=Depends(get_current_user)
):
    try:
        ensure_ai_meetings_table(conn)

        deleted = soft_delete_ai_meeting_note(
            conn=conn,
            note_id=note_id,
            user_id=current_user["user_id"]
        )

        if not deleted:
            raise HTTPException(status_code=404, detail="Note not found")

        return {
            "ok": True,
            "message": "Note deleted"
        }

    except HTTPException:
        raise
    except Exception as e:
        print("DELETE ERROR:", str(e))
        raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
