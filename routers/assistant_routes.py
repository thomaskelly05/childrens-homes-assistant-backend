from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from openai import OpenAI
import jwt
import os
import re

from auth.tokens import JWT_SECRET, JWT_ALGORITHM

from assistant.knowledge.neurodevelopmental import NEURODEVELOPMENTAL_MODULE
from assistant.knowledge.contextual_safeguarding import CONTEXTUAL_SAFEGUARDING_MODULE
from assistant.knowledge.trauma_informed import TRAUMA_INFORMED_MODULE
from assistant.knowledge.safe_recording import SAFE_RECORDING_MODULE
from assistant.knowledge.reflective_practice import REFLECTIVE_PRACTICE_MODULE
from assistant.knowledge.leadership_management import LEADERSHIP_MANAGEMENT_MODULE
from assistant.knowledge.therapeutic_language import THERAPEUTIC_LANGUAGE_MODULE
from assistant.knowledge.reflective_debrief import REFLECTIVE_DEBRIEF_MODULE
from assistant.knowledge.team_learning_loop import TEAM_LEARNING_LOOP_MODULE
from assistant.knowledge.emotional_load import EMOTIONAL_LOAD_MODULE
from assistant.knowledge.boundaries_identity import BOUNDARIES_IDENTITY_MODULE
from assistant.knowledge.environment_routines import ENVIRONMENT_ROUTINES_MODULE

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter(prefix="/assistant", tags=["Assistant"])


# ---------------------------
# AUTH
# ---------------------------
def get_user_from_cookie(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(401, "Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "role": payload.get("role")}
    except Exception:
        raise HTTPException(401, "Invalid token")


# ---------------------------
# VALIDATOR
# ---------------------------
blocked_patterns = [
    r"\bhow do i restrain\b",
    r"\bhow to restrain\b",
    r"\brestraint technique\b",
    r"\bcontrol them\b",
    r"\bmake them\b",
    r"\bfix their behaviour\b",
    r"\bmanage their behaviour\b",
    r"\bwhat should i do when they\b",
    r"\bwhat do i do if they\b",
    r"\bstop them from\b",
]


def validate_prompt(prompt: str):
    text = prompt.strip().lower()

    # Block initials
    if re.search(r"\b[A-Z]\.", prompt):
        raise HTTPException(400, "IndiCare can’t process initials or identifying details.")

    # Block full names
    if re.search(r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b", prompt):
        raise HTTPException(400, "IndiCare can’t process full names.")

    # Block unsafe operational requests
    for pattern in blocked_patterns:
        if re.search(pattern, text):
            raise HTTPException(
                400,
                (
                    "IndiCare can support you to reflect on your experience, "
                    "your stance, your values, and your emotional load — "
                    "but it can’t give behaviour‑management, restraint guidance, "
                    "or instructions directed at a child."
                ),
            )


# ---------------------------
# SYSTEM PROMPT
# ---------------------------
def build_system_prompt(role: str | None, mode: str, ld: bool, slow: bool) -> str:
    base = """
You are IndiCare — a staff‑only reflective and operational support companion for adults working in regulated residential children’s homes.

You support staff with:
- communication and reasonable adjustments (autism, ADHD, GDD, sensory profiles, FASD)
- trauma‑informed practice (co‑regulation, safety cues, predictability)
- contextual safeguarding (county lines, exploitation, online harm typologies)
- safe recording (facts, neutrality, patterns, professional curiosity)
- escalation concepts (supervision, oversight, noticing themes)
- reflective practice (values, emotional regulation, supervision prep)
- reflective debriefing after incidents or restraints (adult‑focused, values‑led)
- team learning loops (shared emotional patterns, communication, values, consistency)
- leadership and management reflection (team culture, QA themes, escalation thinking)
- therapeutic language (attunement, containment, validation, curiosity, predictability, boundaries)

You never:
- diagnose, treat, or provide clinical/therapeutic advice
- analyse incidents or reconstruct events
- give behaviour‑management strategies
- give restraint guidance
- interpret the child’s motives or emotions
- give instructions to children
- comment on risk levels or safeguarding decisions

DEBRIEF MODE:
When staff mention an incident, restraint, escalation, or difficult moment, use a reflective debrief stance:
- acknowledge and contain
- normalise the adult’s experience
- explore internal responses
- connect to values
- support grounding
- identify what to bring to supervision
- avoid analysing the child or the event
- avoid operational advice

TEAM MODE:
When staff ask about team reflection or learning from patterns, focus on:
- shared emotional experience
- communication patterns
- values that were held or stretched
- environmental and pacing factors
- team support needs
- one or two values‑led intentions for next time
- never analysing the child or giving operational strategies
"""

    dynamic = []

    if role:
        dynamic.append(f"The staff member is working in the role of {role}. Match your tone accordingly.")

    if mode == "reflective":
        dynamic.append("Use a reflective frame: describe → normalise → explore → summarise → values‑led next step.")
    elif mode == "debrief":
        dynamic.append("Use a debrief frame: slow, steady, reflective, values‑led, adult‑focused.")
    elif mode == "team":
        dynamic.append("Use a team‑reflection frame: focus on shared emotional patterns, communication, and values.")
    elif mode == "grounding":
        dynamic.append("Use grounding language: slow, steady, sensory, simple.")
    elif mode == "planning":
        dynamic.append("Use a planning frame: structured, stepwise, clear.")
    elif mode == "training":
        dynamic.append("Use a training frame: simple explanations, plain language, clear examples.")
    else:
        dynamic.append("Use a calm, supportive, staff‑focused tone.")

    if ld:
        dynamic.append("Use LD‑friendly communication: short sentences, plain language, one idea at a time.")

    if slow:
        dynamic.append("Respond gently and slowly, with space between ideas.")

    return base + "\n" + "\n".join(dynamic)


# ---------------------------
# STREAMING
# ---------------------------
def stream_response(prompt: str, system_prompt: str):
    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        stream=True,
    )

    for chunk in response:
        delta = chunk.choices[0].delta
        if delta and delta.content:
            yield delta.content


# ---------------------------
# ENDPOINT
# ---------------------------
@router.post("/stream")
def assistant_stream(data: dict, request: Request, user=Depends(get_user_from_cookie)):
    prompt = data.get("message", "") or ""
    validate_prompt(prompt)

    role = data.get("role")
    mode = data.get("mode", "standard")
    ld = bool(data.get("ld_friendly", False))
    slow = bool(data.get("slow_mode", False))

    system_prompt = build_system_prompt(role, mode, ld, slow)

    return StreamingResponse(stream_response(prompt, system_prompt), media_type="text/plain")
