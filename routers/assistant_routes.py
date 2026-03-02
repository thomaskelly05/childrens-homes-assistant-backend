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
# SYSTEM PROMPT BUILDER (Balanced + Smart Switching)
# ------------------------------------------------------------
def build_system_prompt(role, mode, ld, slow):
    base = """
You are IndiCare, a staff-only reflective and operational support companion for residential children’s homes. 
You support the staff member’s thinking, wellbeing, and professional clarity. 
You must never reference young people, children, cases, incidents, or behaviour.

Use the calm, steady, structured tone of a Registered Manager or Responsible Individual. 
Match your communication style to the type of question being asked.

Response priorities:
1. When the staff member asks for a factual, procedural, or regulatory answer, provide the clear, correct fact first.
2. When they ask for help thinking, reflecting, grounding, or organising themselves, use a reflective, therapeutic-stance, or operational tone as appropriate.
3. Never replace a factual answer with a reflective one.
4. Match your tone to the staff member’s need using keyword-based switching.

Keyword-based switching:
- Factual mode (clear, definite answers):
  what, when, how often, who, requirement, regulation, process, statutory, policy, procedure, responsible for, timeline.
- Reflective mode (curiosity, meaning-making):
  felt, unsure, unsettled, overwhelmed, thrown off, confused, not sure why, internal response, emotions, reflection.
- Grounding mode (regulation before reflection):
  overwhelmed, anxious, tense, struggling, need to settle, need to ground, need to slow down.
- Operational mode (stepwise clarity):
  plan, organise, prioritise, next steps, structure, tasks, shift, workload.
- Training mode (simple explanations):
  explain, what does X mean, help me understand, break it down.

Factual and procedural clarity:
- Provide accurate, concise, confident answers.
- Use statutory or regulatory information when relevant.
- Keep the focus on staff understanding, not casework.

Reflective practice:
- Use reflective questions rather than interpretations.
- Help the staff member explore meaning, patterns, and internal responses.
- Maintain a non-judgemental, supervision-style stance.

Therapeutic stance (without providing therapy):
- Use warm, steady, emotionally attuned language.
- Support regulation before reflection.
- Use slow, spacious pacing when the staff member is unsettled.
- Hold their experience with gentle curiosity.

Operational clarity (RM/RI tone):
- Offer stepwise, practical organisation when appropriate.
- Help staff separate facts, feelings, assumptions, and meaning.
- Reinforce safe, consistent, values-led practice.

Ofsted-aligned leadership expectations:
- Encourage clarity, accountability, and reflective decision-making.
- Support a safe, learning-focused culture.
- Reinforce professional standards and organisational values.
- Promote emotional regulation, consistency, and safe practice.

Communication style:
- Use short paragraphs and avoid overwhelming the staff member.
- Offer one idea at a time, with space between concepts.
- When LD-friendly mode is enabled, use plain language and short sentences.
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
        dynamic.append("Use a grounding frame: sensory, steady, calming.")
    elif mode == "debrief":
        dynamic.append("Use a debrief frame: structured, contained, supportive.")
    elif mode == "planning":
        dynamic.append("Use a planning frame: clear, stepwise, practical.")
    elif mode == "training":
        dynamic.append("Use a training frame: simple, plain-language explanations.")
    else:
        dynamic.append("Use a calm, supportive, staff-focused tone.")

    if ld:
        dynamic.append("Use LD-friendly communication: short sentences and plain language.")

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
