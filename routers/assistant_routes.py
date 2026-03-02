# routers/assistant_routes.py
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
import openai
import jwt
import os
from auth.tokens import JWT_SECRET, JWT_ALGORITHM

# Load OpenAI API key from environment
openai.api_key = os.getenv("OPENAI_API_KEY")

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
# SYSTEM PROMPT BUILDER (IndiCare reflective brain)
# ------------------------------------------------------------
def build_system_prompt(role, mode, ld, slow):
    parts = []

    # Role awareness
    if role:
        parts.append(f"You are supporting a staff member in the role: {role}.")

    # Reflective modes
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

    # LD-friendly adjustments
    if ld:
        parts.append("Use LD‑friendly communication: short sentences, plain language.")

    # Slow mode
    if slow:
        parts.append("Respond gently and slowly, with space between ideas.")

    # Safety boundary
    parts.append("Never mention children. This is a staff‑only reflective tool.")

    return " ".join(parts)


# ------------------------------------------------------------
# STREAMING RESPONSE GENERATOR
# ------------------------------------------------------------
def stream_response(prompt, system_prompt):
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        stream=True
    )

    for chunk in response:
        if "choices" in chunk:
            delta = chunk["choices"][0]["delta"]
            if "content" in delta:
                yield delta["content"]


# ------------------------------------------------------------
# STREAMING ENDPOINT (matches new frontend)
# ------------------------------------------------------------
@router.post("/stream")
def assistant_stream(
    data: dict,
    request: Request,
    user = Depends(get_user_from_cookie)
):
    prompt = data.get("message", "")

    # These match the new frontend exactly
    role = data.get("role")
    mode = data.get("mode", "standard")
    ld = data.get("ld_friendly", False)
    slow = data.get("slow_mode", False)

    system_prompt = build_system_prompt(role, mode, ld, slow)

    return StreamingResponse(
        stream_response(prompt, system_prompt),
        media_type="text/plain"
    )
