import json
import asyncio
import os
from datetime import datetime, timezone
from typing import Any

from schemas.data_protection import DataClassification
from services.ai_external_call_governance import (
    FEATURE_AI_NOTES,
    governed_transcribe_audio_file,
    redact_plain_text,
    try_governed_draft_text,
)

MAX_AUDIO_BYTES = 25 * 1024 * 1024
MAX_TEXT_CHARS = 120000


def _normalise_text(value: str | None) -> str:
    return (value or "").strip()


def _truncate_text(value: str, max_chars: int = MAX_TEXT_CHARS) -> str:
    return _normalise_text(value)[:max_chars]


def _normalise_speaker_segments(raw_segments: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_segments, list):
        return []

    normalised = []

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


def _speaker_text_from_segments(segments: list[dict[str, Any]]) -> str:
    return "\n\n".join(
        f"{segment['speaker']}: {segment['text']}"
        for segment in segments
    ).strip()


def _transcribe_audio_sync(
    file_path: str,
    *,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    if not os.path.exists(file_path):
        raise RuntimeError("Audio file not found")

    if os.path.getsize(file_path) == 0:
        raise RuntimeError("Audio file is empty")

    if os.path.getsize(file_path) > MAX_AUDIO_BYTES:
        raise RuntimeError("Audio file is too large")

    result = governed_transcribe_audio_file(
        file_path,
        feature=FEATURE_AI_NOTES,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=DataClassification.CONFIDENTIAL_CHILD,
        metadata={"route": "ai_notes_service.transcribe"},
    )

    text = _normalise_text(result.get("transcript"))
    segments = _normalise_speaker_segments(result.get("segments") or [])

    if not segments and text:
        segments = [{
            "id": "seg_1",
            "speaker": "Speaker 1",
            "text": text,
            "start": 0,
            "end": 0,
            "type": "transcript.text.segment"
        }]

    if not text and segments:
        text = _speaker_text_from_segments(segments)

    return {
        "transcript": _truncate_text(text),
        "segments": segments,
        "duration": result.get("duration")
    }


async def transcribe_audio(
    file_path: str,
    *,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(
                _transcribe_audio_sync,
                file_path,
                provider_id=provider_id,
                home_id=home_id,
                user_id=user_id,
            ),
            timeout=180
        )
    except asyncio.TimeoutError:
        raise RuntimeError("Transcription timed out")
    except Exception as e:
        raise RuntimeError(f"Transcription failed: {str(e)}")


def _build_meeting_note_prompt(transcript: str):
    today = datetime.now(timezone.utc).strftime("%d %B %Y")

    system_prompt = """You create structured professional UK care meeting notes. Return JSON only."""

    user_prompt = f"""
Create structured meeting notes.

Date: {today}

Transcript:
{transcript}
"""

    return system_prompt, user_prompt


def _generate_note_sync(
    transcript: str,
    *,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
):
    transcript = _truncate_text(transcript)

    if not transcript:
        return {"note": "", "safeguarding_flag": False, "safeguarding_reason": "No transcript"}

    redacted, _ = redact_plain_text(transcript, mode="strict")
    system_prompt, user_prompt = _build_meeting_note_prompt(redacted)

    response = try_governed_draft_text(
        feature=FEATURE_AI_NOTES,
        system_prompt=system_prompt,
        prompt=user_prompt,
        model="gpt-4.1-mini",
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=DataClassification.CONFIDENTIAL_CHILD,
        metadata={"route": "ai_notes_service.generate_note", "draft_only": True},
    )
    if response is None:
        return {
            "note": redacted,
            "safeguarding_flag": False,
            "safeguarding_reason": "External AI disabled — draft requires human review",
            "draft_only": True,
        }

    try:
        return json.loads(response.text)
    except Exception:
        return {"note": response.text, "draft_only": True}


async def generate_note(
    transcript: str,
    *,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
):
    return await asyncio.to_thread(
        _generate_note_sync,
        transcript,
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
    )


async def edit_note(
    text: str,
    mode: str,
    instruction: str = "",
    *,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
):
    redacted, _ = redact_plain_text(text, mode="strict")
    response = try_governed_draft_text(
        feature=FEATURE_AI_NOTES,
        system_prompt="Edit professionally. Draft for human review only.",
        prompt=f"Mode: {mode}\nInstruction: {instruction}\n\nText:\n{redacted}",
        model="gpt-4.1-mini",
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=DataClassification.CONFIDENTIAL_CHILD,
        metadata={"route": "ai_notes_service.edit_note", "draft_only": True},
    )
    if response is None:
        return redacted
    return response.text


async def extract_actions(
    text: str,
    *,
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
):
    redacted, _ = redact_plain_text(text, mode="strict")
    response = try_governed_draft_text(
        feature=FEATURE_AI_NOTES,
        system_prompt="Extract actions as JSON list with key actions",
        prompt=redacted,
        model="gpt-4.1-mini",
        provider_id=provider_id,
        home_id=home_id,
        user_id=user_id,
        data_classification=DataClassification.CONFIDENTIAL_CHILD,
        metadata={"route": "ai_notes_service.extract_actions", "draft_only": True},
    )
    if response is None:
        return []

    try:
        parsed = json.loads(response.text)
        return parsed.get("actions", [])
    except Exception:
        return []
