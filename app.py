from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import openai
import os
from pypdf import PdfReader

# ---------------------------------------------------------
# APP
# ---------------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    role: str
    mode: str  # "ask" or "training"

openai.api_key = os.getenv("OPENAI_API_KEY")

# ---------------------------------------------------------
# LOAD PDFs
# ---------------------------------------------------------
def load_pdf(path):
    try:
        reader = PdfReader(path)
        return "\n\n".join([p.extract_text() or "" for p in reader.pages])
    except:
        return ""

PDF_GUIDE = load_pdf("childrens_home_guide.pdf")
PDF_REGS = load_pdf("childrens_homes_regulations_2015.pdf")

PDF_TEXT = (
    "CHILDREN'S HOMES REGULATIONS 2015\n\n" +
    PDF_REGS +
    "\n\nCHILDREN'S HOME GUIDE\n\n" +
    PDF_GUIDE
)

# ---------------------------------------------------------
# UNIFIED BRITISH THERAPEUTIC STYLE BLOCK
# ---------------------------------------------------------
STYLE_BLOCK = """
WRITING STYLE (BRITISH + THERAPEUTIC):
Use British spelling, grammar, and phrasing at all times.

Write in a therapeutic, relational, and emotionally attuned style that reflects good practice in UK children’s homes.

Tone:
- calm and steady
- warm but professional
- reflective rather than directive
- supportive and confidence‑building
- grounded in trauma‑informed practice
- respectful of the child’s lived experience
- mindful of safeguarding and emotional safety

When giving examples (daily logs, key‑worker sessions, incident reports, etc.):
- write in clear, plain British English
- avoid Americanisms
- avoid jargon unless sector‑standard
- focus on the child’s voice, feelings, and experience
- show curiosity, empathy, and reflective thinking
- model good professional boundaries
- avoid judgemental language
- avoid blame
- emphasise clarity, accuracy, and emotional safety

When giving feedback:
- be gentle, constructive, and encouraging
- highlight strengths first
- offer improvements in a supportive way
- avoid shaming or critical language
- frame guidance as “you might consider…” or “a helpful next step could be…”

When giving scenarios:
- keep them realistic and grounded in UK children’s homes practice
- avoid sensational or extreme situations
- focus on relational practice, safety, and emotional containment
"""

# ---------------------------------------------------------
# ROLE PROFILES
# ---------------------------------------------------------
ROLE_BLOCK = """
ROLE BEHAVIOUR:

MANAGER:
Calm, confident, operationally focused. Connects practice to staffing, rota planning, audits, and leadership decisions.

SENIOR SUPPORT WORKER:
Practical, experienced, shift‑focused. Translates regulations into safe, consistent practice.

SUPPORT WORKER:
Clear, simple, confidence‑building. Focuses on what to do, why it matters, and how to keep children safe.

RESPONSIBLE INDIVIDUAL:
Strategic, governance‑focused. Connects practice to systems, monitoring, quality assurance, and Ofsted expectations.

OFSTED INSPECTOR:
Analytical, evidence‑based. Interprets practice through judgement areas and impact on children.
"""

# ---------------------------------------------------------
# BEST PRACTICE EXAMPLES
# ---------------------------------------------------------
BEST_PRACTICE = """
BEST‑PRACTICE EXAMPLES (allowed):
You ARE allowed to create examples of:
- daily logs
- key‑worker sessions
- incident reports
- handovers
- risk assessments
- behaviour support plans
- restorative conversations
- staff reflections

Rules:
- These are examples of good practice, not official templates.
- Must be realistic, professional, and aligned with Ofsted expectations.
- Must not contradict the Regulations or statutory guidance.
"""

# ---------------------------------------------------------
# TRAINING MODE
# ---------------------------------------------------------
TRAINING_BLOCK = """
TRAINING MODE:
Provide:
- scenarios
- reflective questions
- quizzes
- step‑by‑step practice
- supportive feedback
- opportunities to rehearse safe decision‑making

Training should feel:
- calm
- safe
- reflective
- confidence‑building
- role‑appropriate
"""

# ---------------------------------------------------------
# FORMATTING RULES
# ---------------------------------------------------------
FORMAT_BLOCK = """
FORMAT RULES:
- Plain text only.
- Simple headings (frontend will style them).
- Short paragraphs.
- Blank line between paragraphs.
- No markdown symbols (#, *, -, >).
- No bullet points unless the user asks.
"""

# ---------------------------------------------------------
# MAIN ENDPOINT
# ---------------------------------------------------------
@app.post("/ask")
async def ask(request: ChatRequest):

    BASE_PROMPT = f"""
You are supporting a staff member in a UK children’s home.

{STYLE_BLOCK}
{ROLE_BLOCK}
{BEST_PRACTICE}
{FORMAT_BLOCK}

PRIMARY SOURCES:
Children's Homes Regulations 2015
Children's Home Guide

SECONDARY SOURCES (allowed):
Ofsted inspection frameworks
DfE publications
Statutory guidance

Never contradict the PDFs.

DOCUMENT CONTENT:
{PDF_TEXT}
"""

    if request.mode == "training":
        SYSTEM_PROMPT = BASE_PROMPT + TRAINING_BLOCK
    else:
        SYSTEM_PROMPT = BASE_PROMPT

    completion = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": request.message}
        ],
        stream=True
    )

    async def stream():
        for chunk in completion:
            if "choices" in chunk:
                delta = chunk["choices"][0]["delta"]
                if "content" in delta:
                    yield delta["content"]

    return StreamingResponse(stream(), media_type="text/plain")
