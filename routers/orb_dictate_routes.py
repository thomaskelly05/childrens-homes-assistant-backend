"""ORB Dictate API — voice-to-recording companion for ORB Residential."""

from __future__ import annotations

import os
import shutil
import uuid
from typing import Any

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse

from auth.orb_dictate_dependency import require_orb_dictate_access
from auth.orb_residential_dependencies import require_orb_residential_auth
from schemas.orb_dictate import (
    OrbDictateAnalyzeRequest,
    OrbDictateEditRequest,
    OrbDictateExportRequest,
    OrbDictateFinaliseRequest,
    OrbDictateGenerateRequest,
    OrbDictateNotePatch,
    OrbDictatePrepareWriteRequest,
    OrbDictateSaveRequest,
    OrbDictateTranscribeRequest,
)
from services.ai_external_call_governance import governance_ids_from_user
from services.orb_dictate_edit_service import edit_dictate_document
from services.orb_dictate_service import (
    STANDALONE_BOUNDARY,
    analyze_dictate_session,
    export_dictate_note,
    finalise_dictate_document,
    generate_dictate_note,
    get_templates_payload,
    list_dictate_notes_for_user,
    prepare_write_document,
    save_dictate_note,
    transcribe_dictate_audio,
)
from services.orb_ai_abuse_guard_service import enforce_daily_ai_call_budget, enforce_transcript_length
from services.orb_realtime_provider_service import orb_realtime_provider_service
from services.orb_voice_realtime_config import _openai_realtime_configured

router = APIRouter(prefix="/orb/dictate", tags=["ORB Dictate"])

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_DIR = os.path.join(BASE_DIR, "_tmp_dictate_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

MAX_AUDIO_BYTES = 25 * 1024 * 1024
ALLOWED_AUDIO_SUFFIXES = frozenset(
    {".webm", ".wav", ".mp3", ".m4a", ".ogg", ".mp4", ".mpeg", ".flac", ".aac", ".opus"}
)
BLOCKED_UPLOAD_SUFFIXES = frozenset(
    {".exe", ".bat", ".cmd", ".com", ".msi", ".scr", ".sh", ".bash", ".php", ".html", ".htm", ".js", ".jar"}
)


def _user_id_from(current_user: dict[str, Any]) -> int | None:
    raw = current_user.get("user_id") or current_user.get("id")
    try:
        return int(raw) if raw is not None else None
    except (TypeError, ValueError):
        return None


def _success(data: Any, **extra: Any) -> dict[str, Any]:
    payload: dict[str, Any] = {"success": True, "data": data}
    payload.update(extra)
    return payload


DICTATE_REALTIME_INSTRUCTIONS = (
    "You are a silent transcription assistant for ORB Dictate in residential childcare. "
    "Transcribe the user's speech accurately. Do not speak or generate responses unless explicitly asked."
)


@router.post("/realtime/session")
async def dictate_realtime_session(current_user=Depends(require_orb_dictate_access)):
    """Create a server-backed realtime transcription session (ephemeral client secret only)."""
    if not _openai_realtime_configured():
        return {
            "ok": True,
            "configured": False,
            "provider": None,
            "reason": "not_configured",
            "message": "Realtime transcription is not configured. Paste transcript or upload audio.",
        }

    session_id = f"dictate_{uuid.uuid4().hex[:16]}"
    provider_result = await orb_realtime_provider_service.create_dictate_transcription_session(
        instructions=DICTATE_REALTIME_INSTRUCTIONS,
        current_user=current_user,
        orb_session_id=session_id,
    )
    if not provider_result.get("configured") or provider_result.get("fallback_text_mode"):
        return {
            "ok": True,
            "configured": False,
            "provider": None,
            "reason": "not_configured",
            "message": provider_result.get("unavailable_reason")
            or "Realtime transcription is not configured. Paste transcript or upload audio.",
        }

    session_payload = provider_result.get("session") or {}
    return {
        "ok": True,
        "configured": True,
        "session_id": session_id,
        "provider": "openai",
        "model": provider_result.get("model"),
        "openai_session": session_payload,
        "reason": "configured",
    }


@router.get("/templates")
async def dictate_templates(current_user=Depends(require_orb_residential_auth)):
    return _success(
        get_templates_payload(),
        standalone_boundary=STANDALONE_BOUNDARY,
    )


@router.get("/recording-framework")
async def dictate_recording_framework(current_user=Depends(require_orb_residential_auth)):
    from services.orb_recording_framework_service import get_framework_payload

    return _success(
        get_framework_payload(),
        standalone_boundary=STANDALONE_BOUNDARY,
    )


@router.post("/transcribe")
async def dictate_transcribe(
    payload: OrbDictateTranscribeRequest,
    current_user=Depends(require_orb_dictate_access),
):
    if payload.conversation_consent_confirmed is False:
        raise HTTPException(
            status_code=400,
            detail="Confirm consent before transcribing conversation or debrief audio.",
        )
    user_id = _user_id_from(current_user)
    enforce_daily_ai_call_budget(user_id)
    text = (payload.text or "").strip()
    enforce_transcript_length(text, user_id=user_id)
    if not text:
        raise HTTPException(status_code=400, detail="Provide transcript text or upload audio.")
    from services.orb_dictate_speaker import (
        SPEAKER_BOUNDARY_COPY,
        build_speaker_summary,
        suggest_participants_from_text,
        text_to_segments,
    )

    participants = suggest_participants_from_text(text)
    segments = text_to_segments(text, source="paste", participants=participants)
    return _success(
        {
            "transcript": text,
            "segments": [s.model_dump() for s in segments],
            "participants": [p.model_dump() for p in participants],
            "speaker_summary": build_speaker_summary(participants, segments).model_dump(),
            "speaker_boundary_notice": SPEAKER_BOUNDARY_COPY,
        }
    )


@router.post("/transcribe/audio")
async def dictate_transcribe_audio(
    file: UploadFile = File(...),
    conversation_consent_confirmed: bool | None = None,
    current_user=Depends(require_orb_dictate_access),
):
    if conversation_consent_confirmed is False:
        raise HTTPException(
            status_code=400,
            detail="Confirm consent before transcribing conversation or debrief audio.",
        )
    suffix = (os.path.splitext(file.filename or "audio.webm")[1] or ".webm").lower()
    if suffix in BLOCKED_UPLOAD_SUFFIXES or suffix not in ALLOWED_AUDIO_SUFFIXES:
        raise HTTPException(status_code=400, detail="Unsupported audio file type.")
    path = os.path.join(UPLOAD_DIR, f"{uuid.uuid4().hex}{suffix}")
    try:
        with open(path, "wb") as handle:
            shutil.copyfileobj(file.file, handle)
        if os.path.getsize(path) > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=400, detail="Audio file is too large.")
        result = await transcribe_dictate_audio(path)
        return _success(result)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=503, detail="Transcription is temporarily unavailable.")
    finally:
        if os.path.exists(path):
            try:
                os.remove(path)
            except OSError:
                pass


@router.post("/edit")
async def dictate_edit(
    payload: OrbDictateEditRequest,
    current_user=Depends(require_orb_dictate_access),
):
    ids = governance_ids_from_user(current_user)
    try:
        result = edit_dictate_document(
            payload,
            provider_id=ids["provider_id"],
            home_id=ids["home_id"],
            user_id=ids["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(status_code=503, detail="Document editing is temporarily unavailable.")
    return _success(result.model_dump())


@router.post("/analyze")
async def dictate_analyze(
    payload: OrbDictateAnalyzeRequest,
    current_user=Depends(require_orb_dictate_access),
):
    try:
        result = analyze_dictate_session(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(status_code=503, detail="Analysis is temporarily unavailable.")
    return _success(result.model_dump())


@router.post("/prepare-write")
async def dictate_prepare_write(
    payload: OrbDictatePrepareWriteRequest,
    current_user=Depends(require_orb_dictate_access),
):
    """Template-to-Write auto-fill — structured sections with prompts, no invented content."""
    try:
        result = prepare_write_document(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return _success(result.model_dump())


@router.post("/finalise")
async def dictate_finalise(
    payload: OrbDictateFinaliseRequest,
    current_user=Depends(require_orb_dictate_access),
):
    ids = governance_ids_from_user(current_user)
    try:
        result = finalise_dictate_document(
            payload,
            provider_id=ids["provider_id"],
            home_id=ids["home_id"],
            user_id=ids["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(status_code=503, detail="Finalise is temporarily unavailable.")
    return _success(result.model_dump())


@router.post("/generate")
async def dictate_generate(
    payload: OrbDictateGenerateRequest,
    current_user=Depends(require_orb_dictate_access),
):
    ids = governance_ids_from_user(current_user)
    try:
        result = generate_dictate_note(
            payload,
            provider_id=ids["provider_id"],
            home_id=ids["home_id"],
            user_id=ids["user_id"],
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception:
        raise HTTPException(status_code=503, detail="Note generation is temporarily unavailable.")
    return _success(result.model_dump())


@router.post("/save")
async def dictate_save(
    payload: OrbDictateSaveRequest,
    current_user=Depends(require_orb_dictate_access),
):
    try:
        result = save_dictate_note(current_user, payload)
    except Exception:
        raise HTTPException(status_code=503, detail="Could not save this note.")
    return _success(result.model_dump())


@router.post("/export")
async def dictate_export(
    payload: OrbDictateExportRequest,
    current_user=Depends(require_orb_dictate_access),
):
    note = (payload.professional_note or "").strip()
    if not note:
        raise HTTPException(status_code=400, detail="Note content is required.")
    if payload.format == "markdown":
        return _success(
            {
                "format": "markdown",
                "content": f"# {payload.title}\n\n{note}",
                "standalone_boundary": STANDALONE_BOUNDARY,
            }
        )
    try:
        path, filename, media_type = export_dictate_note(
            payload.title, note, payload.format
        )
    except Exception:
        raise HTTPException(status_code=503, detail="Export is temporarily unavailable.")
    return FileResponse(path=path, filename=filename, media_type=media_type)


@router.get("/notes")
async def dictate_list_notes(current_user=Depends(require_orb_dictate_access)):
    items = list_dictate_notes_for_user(current_user)
    return _success(
        [item.model_dump() for item in items],
        standalone_boundary=STANDALONE_BOUNDARY,
    )


@router.get("/notes/{note_id}")
async def dictate_get_note(
    note_id: str,
    current_user=Depends(require_orb_dictate_access),
):
    for item in list_dictate_notes_for_user(current_user):
        if item.note_id == note_id:
            return _success(item.model_dump())
    raise HTTPException(status_code=404, detail="Note not found.")


@router.patch("/notes/{note_id}")
async def dictate_patch_note(
    note_id: str,
    payload: OrbDictateNotePatch,
    current_user=Depends(require_orb_dictate_access),
):
    if not payload.professional_note and not payload.title and not payload.summary:
        raise HTTPException(status_code=400, detail="No updates provided.")
    save_payload = OrbDictateSaveRequest(
        note_id=note_id,
        title=payload.title or "ORB Dictate note",
        note_type="daily_record",
        professional_note=payload.professional_note or "",
        summary=payload.summary,
        create_version=payload.create_version,
        tags=["orb-dictate"],
    )
    if not save_payload.professional_note:
        raise HTTPException(status_code=400, detail="professional_note is required.")
    result = save_dictate_note(current_user, save_payload)
    return _success(result.model_dump())


@router.delete("/notes/{note_id}")
async def dictate_delete_note(
    note_id: str,
    current_user=Depends(require_orb_dictate_access),
):
    return _success(
        {"note_id": note_id, "deleted": True},
        message="Removed from ORB Dictate list. Saved Outputs may still hold a copy.",
        standalone_boundary=STANDALONE_BOUNDARY,
    )
