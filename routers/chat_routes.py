from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
import asyncio
import json

router = APIRouter()

# Example LLM call placeholder
# Replace this with your real model logic
async def generate_ai_stream(message):

    response = (
        "This is a streamed response from IndiCare. "
        "It demonstrates real token streaming so responses appear instantly."
    )

    for token in response.split(" "):
        yield token + " "
        await asyncio.sleep(0.04)


@router.post("/chat/")
async def chat(request: Request):

    try:
        body = await request.json()

        message = body.get("message")
        conversation_id = body.get("conversation_id")

        if not message:
            raise HTTPException(status_code=400, detail="Message required")

        async def token_stream():

            async for token in generate_ai_stream(message):
                yield token

        return StreamingResponse(
            token_stream(),
            media_type="text/plain",
            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no"
            }
        )

    except Exception as e:

        raise HTTPException(status_code=500, detail=str(e))
