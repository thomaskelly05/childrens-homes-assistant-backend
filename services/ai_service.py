import asyncio

from assistant.mode_detector import detect_mode
from assistant.prompts import build_prompt
from assistant.streaming import stream_response


# --------------------------------------------------
# MAIN AI STREAM FUNCTION
# --------------------------------------------------

async def generate_ai_stream(message: str, history=None):

    """
    Generates a streamed AI response using the assistant brain
    """

    if history is None:
        history = []

    # Detect assistant mode (incident, safeguarding, risk etc)

    mode = detect_mode(message)

    # Build prompt using assistant prompts + knowledge

    prompt = build_prompt(
        mode=mode,
        message=message,
        history=history
    )

    # Stream response from the AI engine

    async for token in stream_response(prompt):

        yield token

        await asyncio.sleep(0.01)
