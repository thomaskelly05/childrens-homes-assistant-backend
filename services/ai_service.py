import asyncio

from assistant.mode_detector import detect_mode
from assistant.streaming import stream_response
from assistant.prompts import SYSTEM_PROMPT


# --------------------------------------------------
# MAIN AI STREAM FUNCTION
# --------------------------------------------------

async def generate_ai_stream(message: str, history=None):

    if history is None:
        history = []

    # Detect assistant mode
    mode = detect_mode(message)

    # Build messages for the AI

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT}
    ]

    # Add history
    for m in history:
        messages.append({
            "role": m["role"],
            "content": m["message"]
        })

    # Add current user message
    messages.append({
        "role": "user",
        "content": message
    })

    # Stream response from assistant engine

    async for token in stream_response(messages):

        yield token

        await asyncio.sleep(0.01)
