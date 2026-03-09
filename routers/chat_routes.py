from fastapi import APIRouter, Request, HTTPException
from fastapi.responses import StreamingResponse
import asyncio

router = APIRouter()


async def generate_ai_stream(message):

    response = (
        "This is a streamed response from IndiCare. "
        "Streaming makes the assistant feel much faster and more responsive."
    )

    for token in response.split(" "):
        yield token + " "
        await asyncio.sleep(0.04)


@router.post("/chat/")
async def chat(request: Request):

    body = await request.json()

    message = body.get("message")
    conversation_id = body.get("conversation_id")

    if not message:
        raise HTTPException(status_code=400, detail="Message required")

    async def stream():

        async for token in generate_ai_stream(message):
            yield token

    return StreamingResponse(
        stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no"
        }
    )
