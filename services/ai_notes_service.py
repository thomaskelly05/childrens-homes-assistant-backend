import os
from datetime import datetime, timezone

from openai import OpenAI


OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY is not set")

client = OpenAI(api_key=OPENAI_API_KEY)


# --------------------------------------------------
# AUDIO TRANSCRIPTION
# --------------------------------------------------

async def transcribe_audio(file_path: str) -> str:
    filename = os.path.basename(file_path).lower()

    if filename.endswith(".m4a") or filename.endswith(".mp4"):
        mime_type = "audio/mp4"
    elif filename.endswith(".ogg"):
        mime_type = "audio/ogg"
    elif filename.endswith(".wav"):
        mime_type = "audio/wav"
    elif filename.endswith(".mp3"):
        mime_type = "audio/mpeg"
    else:
        mime_type = "audio/webm"

    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=(os.path.basename(file_path), audio_file, mime_type)
        )

    text = getattr(transcript, "text", "") or ""
    return text.strip()


# --------------------------------------------------
# GENERATE MEETING NOTE
# --------------------------------------------------

async def generate_note(transcript: str) -> dict:
    transcript = transcript.strip()

    if not transcript:
        return {
            "note": "",
            "safeguarding_flag": False,
            "safeguarding_reason": "No transcript provided."
        }

    today = datetime.now(timezone.utc).strftime("%d %B %Y")

    system_prompt = """
You create structured, professional internal staff meeting notes for a UK care setting.

You must:
- write in clear UK English
- be concise, factual, and professional
- never invent facts
- never invent names, dates, actions, attendees, or outcomes
- use 'Not specified' where information is missing
- keep the output suitable for internal adult staff operational records
- only mention children or young people if they are explicitly discussed in the transcript

You must also assess whether the transcript contains a possible safeguarding, welfare, risk, or protection concern.

Return valid JSON only with exactly these keys:
- note
- safeguarding_flag
- safeguarding_reason
"""

    user_prompt = f"""
Create a structured internal adult staff meeting record from the transcript below.

Return the note using this exact structure inside the "note" field:

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

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        temperature=0.2,
        response_format={"type": "json_object"}
    )

    content = (response.choices[0].message.content or "").strip()

    try:
        import json
        parsed = json.loads(content)
    except Exception:
        return {
            "note": content,
            "safeguarding_flag": False,
            "safeguarding_reason": "Safeguarding analysis unavailable."
        }

    note = (parsed.get("note") or "").strip()
    safeguarding_flag = bool(parsed.get("safeguarding_flag", False))
    safeguarding_reason = (parsed.get("safeguarding_reason") or "").strip()

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


# --------------------------------------------------
# EDIT FINAL NOTE WITH AI
# --------------------------------------------------

async def edit_note(text: str, mode: str, instruction: str = "") -> str:
    text = text.strip()
    mode = (mode or "").strip().lower()
    instruction = (instruction or "").strip()

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
- preserve the original factual meaning unless the instruction explicitly asks for restructuring
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
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        temperature=0.2
    )

    return (response.choices[0].message.content or "").strip()
