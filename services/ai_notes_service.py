import json
import os
from openai import OpenAI
from services.ai_prompts import NOTE_PROMPT, SAFEGUARDING_PROMPT

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


async def transcribe_audio(file_path: str) -> str:
    with open(file_path, "rb") as audio_file:
        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio_file
        )

    return transcript.text


async def generate_note(transcript: str) -> str:
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": "You write professional factual notes for a UK children's home."
            },
            {
                "role": "user",
                "content": f"{NOTE_PROMPT}\n\nTranscript:\n{transcript}"
            }
        ],
        temperature=0.2
    )

    return response.choices[0].message.content or ""


async def safeguarding_check(transcript: str) -> dict:
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {
                "role": "system",
                "content": "You assess whether a transcript suggests a safeguarding concern and return valid JSON only."
            },
            {
                "role": "user",
                "content": f"{SAFEGUARDING_PROMPT}\n\nTranscript:\n{transcript}"
            }
        ],
        temperature=0
    )

    content = response.choices[0].message.content or "{}"

    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        parsed = {
            "safeguarding_flag": False,
            "reason": "Unable to parse safeguarding response"
        }

    return {
        "safeguarding_flag": bool(parsed.get("safeguarding_flag", False)),
        "reason": str(parsed.get("reason", "")).strip()
    }
