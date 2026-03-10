import os
import asyncio

from openai import AsyncOpenAI

from assistant.mode_detector import detect_mode
from assistant.prompts import build_chat_prompt
from assistant.web_search import web_search


client = AsyncOpenAI(
    api_key=os.environ.get("OPENAI_API_KEY")
)


async def generate_ai_stream(message: str, history=None):

    if history is None:
        history = []

    # Detect response mode
    mode = detect_mode(message)

    # Run web search
    search_results = web_search(message)

    # Build system prompt
    system_prompt, user_message = build_chat_prompt(
        message=message,
        role="residential care staff",
        ld_lens=False,
        training_mode=False,
        speed="normal"
    )

    # Add web guidance context
    if search_results:

        system_prompt += f"""

------------------------------------------------------------
INDICARE WEB GUIDANCE CONTEXT

The following public guidance may support accuracy:

{search_results}

Use this information only as supporting context.
Encourage checking organisational policy or statutory guidance where appropriate.
Do not treat these sources as definitive.
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
