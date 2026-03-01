from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
import openai
import jwt
from auth.tokens import JWT_SECRET, JWT_ALGORITHM

router = APIRouter(prefix="/assistant", tags=["Assistant"])

def get_user_from_cookie(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "role": payload["role"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


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
def assistant_stream(
    data: dict,
    request: Request,
    user = Depends(get_user_from_cookie)
):
    prompt = data.get("message", "")
    return StreamingResponse(stream_response(prompt), media_type="text/plain")
