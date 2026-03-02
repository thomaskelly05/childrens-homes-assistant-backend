# routers/assistant_routes.py
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from openai import OpenAI
import jwt
import os
from auth.tokens import JWT_SECRET, JWT_ALGORITHM

# Load OpenAI key
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter(prefix="/assistant", tags=["Assistant"])


# ------------------------------------------------------------
# AUTH: Extract user from JWT cookie
# ------------------------------------------------------------
def get_user_from_cookie(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "role": payload["role"]}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# ------------------------------------------------------------
# SYSTEM PROMPT BUILDER
# ------------------------------------------------------------
def build_system_prompt(role, mode, ld, slow):
    parts = []

    if role:
        parts.append(f"You are supporting a staff member in the role: {role}.")

    if mode == "reflective":
        parts.append("Use a reflective practice frame. Slow, grounded, curious.")
    elif mode == "grounding":
        parts.append("Use grounding techniques. Calm, sensory, stabilising.")
    elif mode == "debrief":
        parts.append("Use a debrief frame. Contained, structured, supportive.")
    elif mode == "planning":
        parts.append("Use a planning frame. Clear, stepwise, practical.")
    elif mode == "training":
        parts.append("Use a training frame. Explain concepts simply.")
    else:
        parts.append("Use a calm, supportive, staff‑focused tone.")

    if ld:
        parts.append("Use LD‑friendly communication: short sentences, plain language.")

    if slow:
        parts.append("Respond gently and slowly, with space between ideas.")

    parts.append("Never mention children. This is a staff‑only reflective tool.")

    return " ".join(parts)


# ------------------------------------------------------------
# STREAMING RESPONSE GENERATOR (OpenAI v1)
# ------------------------------------------------------------
def stream_response(prompt, system_prompt):
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        stream=True
    )

    for chunk in response:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content


# ------------------------------------------------------------
# STREAMING ENDPOINT
# ------------------------------------------------------------
@router.post("/stream")
def assistant_stream(
    data: dict,
    request: Request,
    user = Depends(get_user_from_cookie)
):
    prompt = data.get("message", "")

    role = data.get("role")
    mode = data.get("mode", "standard")
    ld = data.get("ld_friendly", False)
    slow = data.get("slow_mode", False)

    system_prompt = build_system_prompt(role, mode, ld, slow)

    return StreamingResponse(
        stream_response(prompt, system_prompt),
        media_type="text/plain"
    )
