import os
from datetime import datetime, timezone

from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)


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

    return transcript.text


# --------------------------------------------------
# GENERATE MEETING NOTE
# --------------------------------------------------

async def generate_note(transcript: str) -> str:
    today = datetime.now(timezone.utc).strftime("%d %B %Y")

    prompt = f"""
Create a structured internal adult staff meeting record from the transcript below.

Important rules:
- This is for internal adult staff meetings only.
- Do not mention children or young people unless they are explicitly discussed in the transcript.
- Do not invent names, decisions, actions, dates, or attendees.
- If something is unclear, write "Not specified".
- Write in a professional, concise, readable style suitable for operational records.
- Turn rough speech into a clean structured document.

Return the note using this exact format:

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


Transcript:
{transcript}
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": "You write structured professional internal staff meeting notes."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2
    )

    return (response.choices[0].message.content or "").strip()


# --------------------------------------------------
# EDIT FINAL NOTE WITH AI
# --------------------------------------------------

async def edit_note(text: str, mode: str) -> str:
    mode_map = {
        "improve": "Improve the wording while keeping the meaning the same.",
        "shorten": "Make the document shorter and clearer without losing important meaning.",
        "formal": "Make the document more formal and professional.",
        "bullet": "Rewrite the document with clearer bullet points and structure where helpful.",
        "grammar": "Correct grammar, spelling, punctuation, and readability."
    }

    instruction = mode_map.get(mode.lower(), "Improve the wording while keeping the meaning the same.")

    prompt = f"""
Edit the following internal staff meeting document.

Rules:
- Keep the original meaning.
- Do not invent facts.
- Do not add names, dates, actions, or decisions that are not already present.
- Keep it suitable for an internal adult staff meeting record.
- Return only the revised document text.

Instruction:
{instruction}

Document:
{text}
"""

    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": "You edit professional meeting documents carefully without inventing facts."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=0.2
    )

    return (response.choices[0].message.content or "").strip()
