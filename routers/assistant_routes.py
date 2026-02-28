from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from auth.dependencies import get_current_user
import openai

router = APIRouter(prefix="/assistant", tags=["Assistant"])

def stream_response(prompt: str):
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": prompt}],
        stream=True
    )
    for chunk in response:
        if "choices" in chunk:
            delta = chunk["choices"][0]["delta"]
            if "content" in delta:
                yield delta["content"]

@router.post("/stream")
def assistant_stream(data: dict, user = Depends(get_current_user)):
    prompt = data.get("message", "")
    return StreamingResponse(stream_response(prompt), media_type="text/plain")
