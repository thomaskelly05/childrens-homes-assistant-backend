import os
import asyncio
from openai import AsyncOpenAI

from assistant.prompts import build_chat_prompt

client = AsyncOpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)


async def generate_ai_stream(message: str, history=None):

    if history is None:
        history = []

    # Build IndiCare prompt
    system_prompt, user_message = build_chat_prompt(
        message=message,
        role="residential care staff",
        ld_lens=False,
        training_mode=False,
        speed="normal"
    )

    messages = [
        {"role": "system", "content": system_prompt}
    ]

    # Add conversation history
    for m in history:
        messages.append({
            "role": m["role"],
            "content": m["message"]
        })

    # Add new message
    messages.append({
        "role": "user",
        "content": user_message
    })

    stream = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        stream=True
    )

    async for chunk in stream:

        if chunk.choices[0].delta.content:

            yield chunk.choices[0].delta.content

            await asyncio.sleep(0.01)
