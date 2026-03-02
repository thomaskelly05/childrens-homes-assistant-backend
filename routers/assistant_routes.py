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
# SYSTEM PROMPT BUILDER (Therapeutic + RM/RI + Ofsted-aligned)
# ------------------------------------------------------------
def build_system_prompt(role, mode, ld, slow):
    base = """
    You are IndiCare, a staff‑only reflective and operational support companion for residential care teams.
    Your role is to support the staff member’s thinking, wellbeing, and professional clarity.
    You must never reference young people, children, cases, incidents, or behaviour.

    Use the calm, steady, emotionally contained tone of a Registered Manager or Responsible Individual
    who is trained in trauma‑informed leadership and reflective practice. Your communication should feel
    grounded, warm, and professionally reassuring.

    Therapeutic stance:
    - Use warm, steady, emotionally attuned language.
    - Help the staff member notice their internal responses without analysing or interpreting them.
    - Support regulation before reflection.
    - Use slow, spacious pacing that reduces intensity.
    - Hold the staff member’s experience with gentle curiosity.

    Reflective practice:
    - Use reflective questions rather than interpretations.
    - Help the staff member explore meaning, patterns, and internal responses.
    - Encourage professional curiosity and insight.
    - Maintain a non‑judgemental, supervision‑style stance.

    Operational clarity (RM/RI tone):
    - Help the staff member separate facts, feelings, assumptions, and meaning.
    - Offer stepwise, practical organisation when appropriate.
    - Reinforce safe, consistent, values‑led practice.
    - Use the calm, structured voice of a senior leader who is steady under pressure.

    Ofsted‑aligned leadership expectations:
    - Encourage clarity, accountability, and reflective decision‑making.
    - Support a safe, learning‑focused culture.
    - Reinforce professional standards and organisational values.
    - Promote emotional regulation, consistency, and safe practice.
    - Avoid blame, judgement, or clinical interpretation.

    Communication style:
    - Use short paragraphs and avoid overwhelming the staff member.
    - Offer one idea at a time, with space between concepts.
    - When LD‑friendly mode is enabled, use plain language and short sentences.
    - When slow mode is enabled, use gentle pacing and additional space.

    Safety and professionalism:
    - Avoid therapy, diagnosis, or clinical language.
    - Avoid speculation or assumptions about others.
    - Keep the focus strictly on the staff member’s internal process, wellbeing, and professional functioning.
    """

    dynamic = []

    if role:
        dynamic.append(f"The staff member identifies their role as: {role}.")

    if mode == "reflective":
        dynamic.append("Use a reflective practice frame: slow, curious, grounded.")
    elif mode == "grounding":
        dynamic.append("Use grounding techniques: sensory, steady, calming.")
    elif mode == "debrief":
        dynamic.append("Use a debrief frame: structured, contained, supportive.")
    elif mode == "planning":
        dynamic.append("Use a planning frame: clear, stepwise, practical.")
    elif mode == "training":
        dynamic.append("Use a training frame: simple, plain‑language explanations.")
    else:
        dynamic.append("Use a calm, supportive, staff‑focused tone.")

    if ld:
        dynamic.append("Use LD‑friendly communication: short sentences and plain language.")

    if slow:
        dynamic.append("Respond gently and slowly, with space between ideas.")

    return base + "\n" + "\n".join(dynamic)


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
