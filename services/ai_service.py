import os
import asyncio
from openai import AsyncOpenAI

client = AsyncOpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)


# --------------------------------------------------
# STREAM AI RESPONSE
# --------------------------------------------------

async def generate_ai_stream(message: str, history=None):

    if history is None:
        history = []

    messages = [
        {
            "role": "system",
            "content": "You are IndiCare, an AI assistant for children's homes staff helping with safeguarding, incident reports, risk assessments and reflective practice."
        }
    ]

    # Add conversation history
    for m in history:
        messages.append({
            "role": m["role"],
            "content": m["message"]
        })

    # Add new user message
    messages.append({
        "role": "user",
        "content": message
    })

    # Call OpenAI streaming API

    stream = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        stream=True
    )

    async for chunk in stream:

        if chunk.choices[0].delta.content:

            yield chunk.choices[0].delta.content

            await asyncio.sleep(0.01)
