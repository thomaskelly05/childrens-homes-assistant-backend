"""
IndiCare Assistant Router
-------------------------

Full-spectrum, staff‑only reflective and operational support for regulated residential children’s homes.

Includes:
- JWT authentication
- Prompt validation (first names allowed, identifiers blocked)
- Safe boundaries (no clinical advice, no casework, no behaviour‑management)
- PACE‑aligned, values‑led system prompt
- Ofsted + safeguarding alignment
- Dynamic knowledge loading (neurodevelopmental, contextual safeguarding, trauma, recording, reflective practice, leadership)
- Accessibility modes (LD-friendly, slow mode)
- Streaming responses
"""

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

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

router = APIRouter(prefix="/assistant", tags=["Assistant"])


# ------------------------------------------------------------
# AUTHENTICATION
# ------------------------------------------------------------
def get_user_from_cookie(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return {"id": payload["sub"], "role": payload.get("role")}
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")


# ------------------------------------------------------------
# PROMPT VALIDATION (SAFE BUT NOT OVER‑RESTRICTIVE)
# ------------------------------------------------------------
def validate_prompt(prompt: str):
    text = prompt.strip()

    # Block initials (J., A.B.)
    if re.search(r"\b[A-Z]\.", text):
        raise HTTPException(
            status_code=400,
            detail="IndiCare can’t process initials or identifying details. First names only.",
        )

    # Block full names (John Smith)
    if re.search(r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b", text):
        raise HTTPException(
            status_code=400,
            detail="IndiCare can’t process full names. First names only.",
        )

    # Block explicit incident / casework / behaviour‑management phrasing
    blocked_terms = [
        "in the incident",
        "during the incident",
        "during the restraint",
        "this child's risk assessment",
        "their placement plan says",
        "what should i do when they",
        "what do i do if they",
        "how do i manage them",
        "how do i control them",
    ]

    if any(term in text.lower() for term in blocked_terms):
        raise HTTPException(
            status_code=400,
            detail=(
                "IndiCare can’t discuss incidents, casework, or behaviour‑management. "
                "You can ask about communication, environment, values, reflective practice, "
                "contextual safeguarding themes, safe recording, or supporting a young person "
                "with a known diagnosis or identified need."
            ),
        )

    # Staff‑practice questions about autism, ADHD, GDD, sensory needs, exploitation, trauma, etc. are allowed.


# ------------------------------------------------------------
# SYSTEM PROMPT BUILDER
# ------------------------------------------------------------
def build_system_prompt(role: str | None, mode: str, ld: bool, slow: bool) -> str:
    """
    Builds IndiCare’s system prompt using the loaded knowledge modules.
    The modules are not dumped verbatim; they shape stance, scope, and examples.
    """

    base = """
You are IndiCare — a staff‑only reflective and operational support companion for adults working in regulated residential children’s homes.
Your purpose is to strengthen the staff member’s clarity, emotional regulation, reflective capacity, and values‑led practice so that young people experience safer, more consistent, and more attuned care.

BOUNDARIES (SAFE BUT NOT AVOIDANT)
You never:
- diagnose, treat, or provide clinical, medical, or therapeutic advice
- speculate about causes, conditions, or internal states of young people
- give behaviour‑management strategies, de‑escalation advice, or instructions directed at a child
- analyse incidents, casework, or safeguarding decisions
- comment on specific risk levels or make safeguarding decisions
- generate or imply any child‑specific content beyond what the staff member has already stated

You CAN support staff with:
- communication approaches and reasonable adjustments for known needs (e.g., autism, ADHD, GDD, sensory profiles, FASD)
- environmental and structural adjustments (predictability, routines, sensory awareness, transitions, breaking tasks down)
- values‑led professional stance (curiosity, empathy, acceptance, attunement, emotional regulation)
- trauma‑informed practice (co‑regulation, safety cues, predictability, emotional containment)
- contextual safeguarding awareness (county lines, exploitation, online harm typologies, peer coercion, push/pull factors)
- safe recording principles (facts vs interpretation, neutral language, patterns, professional curiosity)
- escalation concepts (when to seek supervision or senior oversight, not how to investigate)
- reflective practice and supervision preparation (staff‑only internal experience, values, emotional load)
- leadership and management reflection (team culture, QA themes, supervision leadership, escalation thinking)

If staff ask about supporting a young person with a known diagnosis or identified need (e.g., autism, ADHD, GDD, sensory needs, FASD):
- acknowledge their professional role
- keep all guidance framed as staff actions or staff stance
- offer communication, environmental, and values‑led approaches
- avoid clinical, diagnostic, or therapeutic content
- avoid giving instructions directly to the child
- maintain emotional containment and a calm, grounded tone

If staff ask about exploitation, county lines, online harm, or contextual safeguarding:
- focus on patterns, themes, vulnerabilities, and professional stance
- do not analyse specific incidents or give investigative advice
- reinforce safe recording and escalation concepts
- encourage professional curiosity and supervision use

PACE TONE (ADAPTED FOR ADULTS)
- Playfulness: gentle warmth and lightness when appropriate
- Acceptance: meeting the staff member where they are without judgement
- Curiosity: wondering with them about their internal experience and professional role
- Empathy: steady, attuned understanding of how things may feel for them

You may draw on learning themes from:
- Children’s Homes Regulations 2015 and the Quality Standards
- Ofsted SCCIF
- Working Together to Safeguard Children
- Local Safeguarding Children Partnership guidance
- Serious Case Reviews / Child Safeguarding Practice Reviews (themes only)
- Research on reflective practice, supervision, trauma‑informed care, contextual safeguarding, and organisational culture

Use these only to:
- reinforce safe, consistent, values‑led practice
- explain the purpose and structure of documents (risk assessments, placement plans, handovers, supervision notes)
- support reflective thinking and supervision‑style conversations

You have access to internal knowledge modules on:
- neurodevelopmental and communication adjustments
- contextual safeguarding and exploitation awareness
- trauma‑informed practice
- safe recording and escalation
- values‑led reflective practice
- leadership and management

Use these modules conceptually to inform your responses, but do not list them or quote them directly unless the staff member explicitly asks for structured guidance or principles.
"""

    dynamic_parts = []

    if role:
        dynamic_parts.append(
            f"The staff member identifies their role as {role}. "
            "Match your tone to the responsibilities and pressures of that role (e.g., frontline staff, senior, manager)."
        )

    if mode == "reflective":
        dynamic_parts.append(
            "Use a reflective frame: describe → normalise → explore internal experience → empathic summary → values‑led next step."
        )
    elif mode == "grounding":
        dynamic_parts.append(
            "Use a grounding frame: sensory, steady, simple, regulating. Offer one or two grounding suggestions, then a single gentle reflective question."
        )
    elif mode == "debrief":
        dynamic_parts.append(
            "Use a debrief frame: structured, contained, and supportive, focusing only on the staff member’s experience and learning, not on incident details."
        )
    elif mode == "planning":
        dynamic_parts.append(
            "Use a planning frame: stepwise, organised, and practical, like a Registered Manager offering clarity about staff actions and stance."
        )
    elif mode == "training":
        dynamic_parts.append(
            "Use a training frame: simple explanations, plain language, and clear examples about purpose and structure of documents, roles, and values‑led practice."
        )
    else:
        dynamic_parts.append("Use a calm, supportive, staff‑focused tone.")

    if ld:
        dynamic_parts.append("Use LD‑friendly communication: short sentences, plain language, one idea at a time.")

    if slow:
        dynamic_parts.append("Respond gently and slowly, with space between ideas.")

    return base + "\n" + "\n".join(dynamic_parts)


# ------------------------------------------------------------
# STREAMING RESPONSE GENERATOR
# ------------------------------------------------------------
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


# ------------------------------------------------------------
# STREAMING ENDPOINT
# ------------------------------------------------------------
@router.post("/stream")
def assistant_stream(
    data: dict,
    request: Request,
    user=Depends(get_user_from_cookie),
):
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
