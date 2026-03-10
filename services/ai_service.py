import os
import asyncio

from openai import AsyncOpenAI

from assistant.mode_detector import detect_mode
from assistant.prompts import build_chat_prompt
from assistant.retrieval import retrieve_knowledge


client = AsyncOpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)


async def generate_ai_stream(message: str, history=None):

    if history is None:
        history = []

    # Detect response mode
    mode = detect_mode(message)

    # Retrieve relevant knowledge
    knowledge = retrieve_knowledge(message)

    # Build system prompt
    system_prompt, user_message = build_chat_prompt(
        message=message,
        role="residential care staff",
        ld_lens=False,
        training_mode=False,
        speed="normal"
    )

    # Add knowledge context
    if knowledge:

        system_prompt += f"""

------------------------------------------------------------
INDICARE KNOWLEDGE CONTEXT

The following guidance may support accuracy:

{knowledge}

Use this information where helpful but do not assume it is exhaustive.
Encourage checking organisational policy or statutory guidance where appropriate.
"""

    messages = [
        {"role": "system", "content": system_prompt}
    ]

    # Add conversation history
    for m in history:

        messages.append({
            "role": m["role"],
            "content": m["message"]
        })

    messages.append({
        "role": "user",
        "content": user_message
    })

    # Stream response
    stream = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=messages,
        stream=True
    )

    async for chunk in stream:

        if chunk.choices[0].delta.content:

            yield chunk.choices[0].delta.content

            await asyncio.sleep(0.01)
