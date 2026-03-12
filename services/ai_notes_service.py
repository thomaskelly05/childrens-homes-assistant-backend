import os
from openai import OpenAI
from services.ai_prompts import NOTE_PROMPT, SAFEGUARD_PROMPT

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


async def transcribe_audio(file_path):

    with open(file_path, "rb") as audio:

        transcript = client.audio.transcriptions.create(
            model="gpt-4o-mini-transcribe",
            file=audio
        )

    return transcript.text


async def generate_note(transcript):

    response = client.chat.completions.create(

        model="gpt-4.1-mini",

        messages=[
            {"role": "system", "content": "You write professional children's home notes"},
            {"role": "user", "content": NOTE_PROMPT + transcript}
        ]
    )

    return response.choices[0].message.content


async def safeguarding_check(transcript):

    response = client.chat.completions.create(

        model="gpt-4.1-mini",

        messages=[
            {"role": "system", "content": "Safeguarding detection"},
            {"role": "user", "content": SAFEGUARD_PROMPT + transcript}
        ]
    )

    answer = response.choices[0].message.content

    return "TRUE" in answer.upper()
