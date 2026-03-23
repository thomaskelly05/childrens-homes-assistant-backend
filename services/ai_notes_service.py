import os
import json
import asyncio
from datetime import datetime, timezone
from typing import Any

from openai import OpenAI


OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set")

client = OpenAI(api_key=OPENAI_API_KEY)

MAX_AUDIO_BYTES = 25 * 1024 * 1024
MAX_TEXT_CHARS = 120000


def _get_audio_mime_type(file_path: str) -> str:
    filename = os.path.basename(file_path).lower()

    if filename.endswith(".m4a") or filename.endswith(".mp4"):
        return "audio/mp4"
    if filename.endswith(".ogg"):
        return "audio/ogg"
    if filename.endswith(".wav"):
        return "audio/wav"
    if filename.endswith(".mp3"):
        return "audio/mpeg"
    return "audio/webm"


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


# ✅ FIXED TRANSCRIPTION (THIS WAS BREAKING YOUR APP)
def _transcribe_audio_sync(file_path: str) -> dict[str, Any]:
    if not os.path.exists(file_path):
        raise RuntimeError("Audio file not found")

    if os.path.getsize(file_path) == 0:
        raise RuntimeError("Audio file is empty")

    if os.path.getsize(file_path) > MAX_AUDIO_BYTES:
        raise RuntimeError("Audio file is too large")

    mime_type = _get_audio_mime_type(file_path)

    with open(file_path, "rb") as audio_file:
        result = client.audio.transcriptions.create(
            model="gpt-4o-transcribe",  # ✅ FIXED MODEL
            file=(os.path.basename(file_path), audio_file, mime_type)
        )

    result_dict = result.model_dump() if hasattr(result, "model_dump") else result

    text = _normalise_text(result_dict.get("text"))
    segments = _normalise_speaker_segments(result_dict.get("segments") or [])

    # ✅ SAFE FALLBACK (prevents crashes)
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
        "duration": result_dict.get("duration")
    }


async def transcribe_audio(file_path: str) -> dict[str, Any]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_transcribe_audio_sync, file_path),
            timeout=180
        )
    except asyncio.TimeoutError:
        raise RuntimeError("Transcription timed out")
    except Exception as e:
        raise RuntimeError(f"Transcription failed: {str(e)}")


# =========================
# AI NOTE GENERATION
# =========================

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


def _generate_note_sync(transcript: str):
    transcript = _truncate_text(transcript)

    if not transcript:
        return {"note": "", "safeguarding_flag": False, "safeguarding_reason": "No transcript"}

    system_prompt, user_prompt = _build_meeting_note_prompt(transcript)

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.2,
        response_format={"type": "json_object"}
    )

    try:
        return json.loads(response.choices[0].message.content)
    except:
        return {"note": response.choices[0].message.content}


async def generate_note(transcript: str):
    return await asyncio.to_thread(_generate_note_sync, transcript)


# =========================
# EDIT NOTE
# =========================

async def edit_note(text: str, mode: str, instruction: str = ""):
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "Edit professionally."},
            {"role": "user", "content": text}
        ]
    )
    return response.choices[0].message.content


# =========================
# ACTION EXTRACTION
# =========================

async def extract_actions(text: str):
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": "Extract actions as JSON list"},
            {"role": "user", "content": text}
        ]
    )

    try:
        parsed = json.loads(response.choices[0].message.content)
        return parsed.get("actions", [])
    except:
        return []
