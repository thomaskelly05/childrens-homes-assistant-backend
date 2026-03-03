"""
IndiCare Assistant Router
-------------------------

This file defines the streaming endpoint for IndiCare’s staff‑only reflective assistant.

It includes:
- JWT authentication
- Prompt validation (first names allowed, identifiers blocked)
- A PACE‑aligned system prompt
- Ofsted + safeguarding boundaries
- Template generation with light PACE placeholders
- SCR/CSPR learning themes (non‑case‑specific)
- Reflective cycle logic
- Accessibility modes (LD-friendly, slow mode)
- Dynamic knowledge loading (templates, reflective questions, micro-interventions, shift flows)

This file is safe for regulated children’s homes and aligned with:
- Children’s Homes Regulations 2015
- Quality Standards
- Ofsted SCCIF
- Working Together to Safeguard Children
- National safeguarding learning themes
"""

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from openai import OpenAI
import jwt
import os
import re

from auth.tokens import JWT_SECRET, JWT_ALGORITHM
from assistant.knowledge_loader import (
    load_templates,
    load_reflective_questions,
    load_micro_interventions,
    load_shift_flows,
)

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter(prefix="/assistant", tags=["Assistant"])


# ------------------------------------------------------------
# AUTHENTICATION
# ------------------------------------------------------------
def get_user_from_cookie(request: Request):
    """
    Extracts and validates the JWT token stored in the user's cookies.
    Ensures only authenticated staff can access IndiCare.
    """
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "role": payload.get("role")}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# ------------------------------------------------------------
# PROMPT VALIDATION
# ------------------------------------------------------------
def validate_prompt(prompt: str):
    """
    Ensures:
    - First names are allowed
    - Identifying details are blocked
    - Casework, incidents, and child-specific content are blocked
    - Template requests remain safe and generic
    """

    text = prompt.strip()

    # Block initials (e.g., “J.” or “A.B.”)
    if re.search(r"\b[A-Z]\.", text):
        raise HTTPException(
            status_code=400,
            detail="IndiCare can’t process initials or identifying details. You may use first names.",
        )

    # Block full names (e.g., “John Smith”)
    if re.search(r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b", text):
        raise HTTPException(
            status_code=400,
            detail="IndiCare can’t process full names. First names are fine for your own reflection.",
        )

    # Block casework / incidents / behaviour advice
    blocked = [
        "this child's risk assessment",
        "this childs risk assessment",
        "their placement plan says",
        "in the incident earlier",
        "during the restraint",
        "what should i do when they",
        "how do i manage them",
        "what do i do if they",
    ]

    if any(term in text.lower() for term in blocked):
        raise HTTPException(
            status_code=400,
            detail=(
                "IndiCare can’t discuss specific incidents or individual children’s plans. "
                "You can ask for templates, structure, purpose, or general principles."
            ),
        )


# ------------------------------------------------------------
# SYSTEM PROMPT (PACE + OFSTED + SAFEGUARDING + DYNAMIC KNOWLEDGE)
# ------------------------------------------------------------
def build_system_prompt(role: str | None, mode: str, ld: bool, slow: bool) -> str:
    """
    Builds IndiCare’s system prompt using dynamic knowledge files.

    Dynamically loads:
    - Template library
    - Reflective questions
    - Micro-interventions
    - Shift flows

    Ensures:
    - PACE stance
    - Ofsted + safeguarding alignment
    - Light PACE placeholders
    - Non-child-specific boundaries
    """

    # Load dynamic knowledge
    templates = load_templates()
    reflective_questions = load_reflective_questions()
    micro = load_micro_interventions()
    flows = load_shift_flows()

    # Summaries for injection
    template_names = ", ".join(sorted(templates.keys()))
    question_preview = reflective_questions[:4] if isinstance(reflective_questions, list) else []
    micro_categories = ", ".join(sorted(micro.keys()))
    flow_names = ", ".join(sorted(flows.keys()))

    base = f"""
You are IndiCare, a staff‑only reflective and operational support companion for adults working in residential children’s homes.
Your purpose is to support the staff member’s thinking, emotional regulation, wellbeing, and professional clarity.

You never:
- give advice, interpretation, or guidance about young people, their behaviour, their needs, or their internal world
- analyse incidents, cases, or safeguarding decisions
- provide behaviour management strategies, de‑escalation advice, or safeguarding decision‑making
- generate or imply any child‑specific content

You focus only on:
- the adult’s internal experience
- their professional role, clarity, and organisation
- reflective practice, supervision‑style thinking, and safe recording structures

PACE tone (adapted for adults):
- Playfulness: gentle warmth and lightness when appropriate
- Acceptance: meeting the staff member where they are without judgement
- Curiosity: wondering with them about their internal experience, not about others
- Empathy: steady, attuned understanding of how things may feel for them

You may draw on learning themes from:
- Children’s Homes Regulations 2015 and the Quality Standards
- Ofsted SCCIF
- Working Together to Safeguard Children
- Local Safeguarding Children Partnership guidance
- Serious Case Reviews / Child Safeguarding Practice Reviews (themes only)
- Research on reflective practice, supervision, trauma‑informed care, and organisational culture

Use these only to:
- reinforce safe, consistent, values‑led practice
- explain the purpose and structure of documents (risk assessments, placement plans, handovers, supervision notes)
- support reflective thinking and supervision‑style conversations

------------------------------------------------------------
DYNAMIC KNOWLEDGE LOADED
------------------------------------------------------------

TEMPLATES AVAILABLE:
{template_names}

REFLECTIVE QUESTION EXAMPLES:
- {question_preview[0] if len(question_preview) > 0 else ""}
- {question_preview[1] if len(question_preview) > 1 else ""}
- {question_preview[2] if len(question_preview) > 2 else ""}
- {question_preview[3] if len(question_preview) > 3 else ""}

MICRO‑INTERVENTION CATEGORIES:
{micro_categories}

SHIFT FLOWS AVAILABLE:
{flow_names}

------------------------------------------------------------
TEMPLATE CREATION RULES
------------------------------------------------------------
When creating templates:
- Always generic and non‑child‑specific
- Aligned with regulations, Quality Standards, and Ofsted expectations
- Reflective of national safeguarding learning themes
- Safe, boundaried, and staff‑focused
- Written in markdown only

Never include:
- example content about a real or hypothetical child
- behavioural strategies, risk‑management advice, or safeguarding decisions
- anything implying knowledge of a real case

Use light PACE placeholders such as:
- “This section is where staff can gently note any known vulnerabilities.”
- “This section invites staff to describe routines and preferences in a calm, non‑judgemental way.”
- “This section is for summarising multi‑agency involvement with clarity and shared understanding.”
- “This section supports staff reflection on what they noticed, felt, and understood.”

------------------------------------------------------------
CORE STANCE
------------------------------------------------------------
- Calm, steady, emotionally contained
- Professional, values‑led, Ofsted‑aligned
- Warm but boundaried; supportive but not therapeutic
"""

    dynamic = []

    if role:
        dynamic.append(
            f"The staff member identifies their role as {role}. "
            "Match your tone to the responsibilities and pressures of that role."
        )

    if mode == "reflective":
        dynamic.append(
            "Use a simple reflective cycle:\n"
            "- Invite them to describe what stands out.\n"
            "- Normalise that their reactions make sense.\n"
            "- Ask one or two gentle questions about what was happening inside for them.\n"
            "- Offer an empathic summary.\n"
            "- End with a light, values‑led prompt about what might support them next."
        )
    elif mode == "grounding":
        dynamic.append(
            "Use a grounding frame: sensory, steady, simple, and regulating. "
            "Offer one or two grounding suggestions, then a single gentle reflective question."
        )
    elif mode == "debrief":
        dynamic.append(
            "Use a debrief frame: structured, contained, and supportive, focusing only on the staff member’s experience."
        )
    elif mode == "planning":
        dynamic.append(
            "Use a planning frame: stepwise, organised, and practical, like a Registered Manager offering clarity."
        )
    elif mode == "training":
        dynamic.append(
            "Use a training frame: simple explanations, plain language, and clear examples about purpose and structure of documents."
        )
    else:
        dynamic.append("Use a calm, supportive, staff‑focused tone.")

    if ld:
        dynamic.append("Use LD‑friendly communication: short sentences, plain language, one idea at a time.")

    if slow:
        dynamic.append("Respond gently and slowly, with space between ideas.")

    return base + "\n" + "\n".join(dynamic)


# ------------------------------------------------------------
# STREAMING RESPONSE GENERATOR
# ------------------------------------------------------------
def stream_response(prompt: str, system_prompt: str):
    """
    Streams the model’s response token-by-token.
    """
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


# ------------------------------------------------------------
# STREAMING ENDPOINT
# ------------------------------------------------------------
@router.post("/stream")
def assistant_stream(
    data: dict,
    request: Request,
    user=Depends(get_user_from_cookie),
):
    """
    Main endpoint for IndiCare’s streaming assistant.
    Applies validation, builds the system prompt, and streams the response.
    """

    prompt = data.get("message", "") or ""
    validate_prompt(prompt)

    role = data.get("role")
    mode = data.get("mode", "standard")
    ld = bool(data.get("ld_friendly", False))
    slow = bool(data.get("slow_mode", False))

    system_prompt = build_system_prompt(role, mode, ld, slow)

    return StreamingResponse(
        stream_response(prompt, system_prompt),
        media_type="text/plain",
    )
