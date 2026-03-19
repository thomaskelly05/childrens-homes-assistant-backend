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
    clean = _normalise_text(value)
    return clean[:max_chars]


def _normalise_speaker_segments(raw_segments: Any) -> list[dict[str, Any]]:
    if not isinstance(raw_segments, list):
        return []

    normalised: list[dict[str, Any]] = []

    for index, segment in enumerate(raw_segments):
        if not isinstance(segment, dict):
            continue

        speaker = str(segment.get("speaker") or f"Speaker {index + 1}").strip()
        text = str(segment.get("text") or "").strip()

        if not text:
            continue

        normalised.append({
            "id": str(segment.get("id") or f"seg_{index + 1}"),
            "speaker": speaker,
            "text": text,
            "start": float(segment.get("start") or 0),
            "end": float(segment.get("end") or 0),
            "type": str(segment.get("type") or "transcript.text.segment")
        })

    return normalised


def _speaker_text_from_segments(segments: list[dict[str, Any]], speaker_map: dict[str, str] | None = None) -> str:
    speaker_map = speaker_map or {}
    return "\n\n".join(
        f"{speaker_map.get(segment['speaker'], segment['speaker'])}: {segment['text']}"
        for segment in segments
        if segment.get("text")
    ).strip()


def _transcribe_audio_sync(file_path: str) -> dict[str, Any]:
    if not os.path.exists(file_path):
        raise RuntimeError("Audio file not found")

    file_size = os.path.getsize(file_path)
    if file_size <= 0:
        raise RuntimeError("Audio file is empty")

    if file_size > MAX_AUDIO_BYTES:
        raise RuntimeError("Audio file is too large")

    mime_type = _get_audio_mime_type(file_path)

    with open(file_path, "rb") as audio_file:
        result = client.audio.transcriptions.create(
            model="gpt-4o-transcribe-diarize",
            file=(os.path.basename(file_path), audio_file, mime_type),
            response_format="diarized_json"
        )

    result_dict = result.model_dump() if hasattr(result, "model_dump") else result
    segments = _normalise_speaker_segments(result_dict.get("segments"))
    text = _normalise_text(result_dict.get("text"))

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
        raise RuntimeError(f"Transcription service failed: {str(e)}")


def _build_meeting_note_prompt(transcript: str) -> tuple[str, str]:
    today = datetime.now(timezone.utc).strftime("%d %B %Y")

    system_prompt = """
You create structured, professional internal staff meeting notes for a UK care setting.

Rules:
- use UK English
- keep wording factual, professional and concise
- do not invent names, actions, decisions, dates, times or outcomes
- preserve speaker meaning accurately
- if information is not present, leave it out or use 'Not specified'
- return valid JSON only

Return exactly these JSON keys:
- note
- safeguarding_flag
- safeguarding_reason
"""

    user_prompt = f"""
Create a structured internal adult staff meeting note from this speaker-aware transcript.

Use this exact structure inside "note":

Meeting Title:
Date: {today}
Attendees:

Summary
-------

Key Points Discussed
• point

Decisions Made
• decision

Actions
• action – assigned to person if stated

Next Steps
• step

Safeguarding guidance:
- safeguarding_flag should be true only if the transcript suggests a possible safeguarding, welfare, safety, protection, neglect, abuse, self-harm, missing-from-home, exploitation, serious incident, or immediate risk concern
- safeguarding_reason should be one short factual sentence
- if there is no clear concern, set safeguarding_flag to false and safeguarding_reason to "No safeguarding concern identified."

Transcript:
{transcript}
"""
    return system_prompt, user_prompt


def _generate_note_sync(transcript: str) -> dict[str, Any]:
    transcript = _truncate_text(transcript)

    if not transcript:
        return {
            "note": "",
            "safeguarding_flag": False,
            "safeguarding_reason": "No transcript provided."
        }

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

    content = _normalise_text(response.choices[0].message.content)

    try:
        parsed = json.loads(content)
    except Exception:
        return {
            "note": content,
            "safeguarding_flag": False,
            "safeguarding_reason": "Safeguarding analysis unavailable."
        }

    note = _normalise_text(parsed.get("note"))
    safeguarding_flag = bool(parsed.get("safeguarding_flag", False))
    safeguarding_reason = _normalise_text(parsed.get("safeguarding_reason"))

    if not safeguarding_reason:
        safeguarding_reason = (
            "Possible safeguarding concern identified."
            if safeguarding_flag
            else "No safeguarding concern identified."
        )

    return {
        "note": note,
        "safeguarding_flag": safeguarding_flag,
        "safeguarding_reason": safeguarding_reason
    }


async def generate_note(transcript: str) -> dict[str, Any]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_generate_note_sync, transcript),
            timeout=180
        )
    except asyncio.TimeoutError:
        raise RuntimeError("Note generation timed out")
    except Exception as e:
        raise RuntimeError(f"Note generation failed: {str(e)}")


def _edit_note_sync(text: str, mode: str, instruction: str = "") -> str:
    text = _truncate_text(text)
    mode = _normalise_text(mode).lower()
    instruction = _normalise_text(instruction)

    mode_map = {
        "improve": "Improve the wording while keeping the meaning the same.",
        "shorten": "Make the document shorter and clearer without losing important meaning.",
        "formal": "Make the document more formal and professional.",
        "bullet": "Rewrite the document with clearer bullet points and structure where helpful.",
        "grammar": "Correct grammar, spelling, punctuation, and readability.",
        "professional": "Rewrite the document in a more professional tone without changing the facts.",
        "concise": "Make the document more concise while keeping all important factual content.",
        "actions": "Rewrite the document so actions and next steps are clearer and easier to follow."
    }

    final_instruction = instruction or mode_map.get(
        mode,
        "Improve the wording while keeping the meaning the same."
    )

    system_prompt = """
You edit professional internal meeting records for a UK care setting.

Rules:
- preserve factual meaning unless the instruction explicitly asks for restructuring
- do not invent facts
- do not add names, dates, actions, risks, or decisions that are not already present
- keep the result suitable for an internal adult staff meeting record
- use UK English
- return only the revised document text
"""

    user_prompt = f"""
Edit the following internal staff meeting document.

Instruction:
{final_instruction}

Document:
{text}
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.2
    )

    return _normalise_text(response.choices[0].message.content)


async def edit_note(text: str, mode: str, instruction: str = "") -> str:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_edit_note_sync, text, mode, instruction),
            timeout=180
        )
    except asyncio.TimeoutError:
        raise RuntimeError("AI edit timed out")
    except Exception as e:
        raise RuntimeError(f"AI edit failed: {str(e)}")


def _extract_actions_sync(text: str) -> list[dict[str, Any]]:
    text = _truncate_text(text)

    if not text:
        return []

    system_prompt = """
You extract structured action points from professional meeting notes.

Rules:
- return valid JSON only
- output must be an object with one key: actions
- actions must be a list of objects
- each action object must have:
  - title
  - owner
  - due
  - priority
- if owner or due is unknown, use "Not specified"
- priority must be one of: low, medium, high
- do not invent facts
"""

    user_prompt = f"""
Extract action points from this meeting note.

Meeting note:
{text}
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.1,
        response_format={"type": "json_object"}
    )

    content = _normalise_text(response.choices[0].message.content)

    try:
        parsed = json.loads(content)
        actions = parsed.get("actions") or []
        if not isinstance(actions, list):
            return []
        cleaned = []
        for item in actions:
            if not isinstance(item, dict):
                continue
            cleaned.append({
                "title": _normalise_text(item.get("title")) or "Untitled action",
                "owner": _normalise_text(item.get("owner")) or "Not specified",
                "due": _normalise_text(item.get("due")) or "Not specified",
                "priority": (_normalise_text(item.get("priority")) or "medium").lower()
            })
        return cleaned[:20]
    except Exception:
        return []


async def extract_actions(text: str) -> list[dict[str, Any]]:
    try:
        return await asyncio.wait_for(
            asyncio.to_thread(_extract_actions_sync, text),
            timeout=120
        )
    except asyncio.TimeoutError:
        raise RuntimeError("Action extraction timed out")
    except Exception as e:
        raise RuntimeError(f"Action extraction failed: {str(e)}")
