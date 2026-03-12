import os
from openai import OpenAI

client = OpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)


# --------------------------------------------------
# AUDIO TRANSCRIPTION
# --------------------------------------------------

async def transcribe_audio(file_path: str) -> str:

    with open(file_path, "rb") as audio_file:

        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file
        )

    return transcript.text


# --------------------------------------------------
# GENERATE MEETING NOTE
# --------------------------------------------------

async def generate_note(transcript: str) -> str:

    prompt = f"""
Create a structured internal staff meeting record.

Return the note using this format:

Meeting Title:
Date:
Attendees:

Summary
-------

Key Points Discussed
• point

Decisions Made
• decision

Actions
• action – assigned to

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
                "content": "You write structured professional meeting notes."
            },
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content
