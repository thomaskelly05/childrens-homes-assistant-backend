from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
import openai
import os
from pypdf import PdfReader

# ---------------------------------------------------------
# CREATE APP
# ---------------------------------------------------------
app = FastAPI()

# ---------------------------------------------------------
# CORS
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# REQUEST MODEL
# ---------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    role: str
    mode: str  # NEW: "ask" or "training"

# ---------------------------------------------------------
# OPENAI CONFIG
# ---------------------------------------------------------
openai.api_key = os.getenv("OPENAI_API_KEY")

# ---------------------------------------------------------
# LOAD PDFs
# ---------------------------------------------------------
def load_pdf_text(path: str) -> str:
    try:
        reader = PdfReader(path)
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(pages)
    except Exception as e:
        print("Error loading PDF:", e)
        return ""

PDF_GUIDE = load_pdf_text("childrens_home_guide.pdf")
PDF_REGS = load_pdf_text("childrens_homes_regulations_2015.pdf")

PDF_TEXT = (
    "CHILDREN'S HOMES REGULATIONS 2015\n\n" +
    PDF_REGS +
    "\n\n\nCHILDREN'S HOME GUIDE\n\n" +
    PDF_GUIDE
)

# ---------------------------------------------------------
# STREAMING ENDPOINT
# ---------------------------------------------------------
@app.post("/ask")
async def ask(request: ChatRequest):

    # -----------------------------------------------------
    # ROLE PROFILES
    # -----------------------------------------------------
    role_profiles = """
MANAGER:
Confident, knowledgeable, operationally focused. Strategic, compliance‑aware, supportive.

SENIOR SUPPORT WORKER:
Practical, experienced, shift‑focused. Hands‑on, reassuring, grounded in daily routines.

SUPPORT WORKER:
Clear, simple, confidence‑building. Focuses on safety, boundaries, and practical steps.

RESPONSIBLE INDIVIDUAL:
Strategic, governance‑focused, oversight‑driven. Connects practice to systems and QA.

OFSTED INSPECTOR:
Analytical, evidence‑based, objective. Interprets practice through judgement areas.
"""

    # -----------------------------------------------------
    # TRAINING MODE PROMPT
    # -----------------------------------------------------
    training_prompt = f"""
You are delivering TRAINING MODE for a staff member in the role: {request.role}.

Your job is to:
- Teach skills appropriate to their role.
- Use scenarios, reflective questions, quizzes, and practice tasks.
- Base all training on the PDFs and trusted Ofsted/DfE knowledge.
- Never contradict the documents.
- Never overwhelm the user — keep training supportive and confidence‑building.

Training style by role:

MANAGER:
Use leadership scenarios, risk‑based decisions, staffing challenges, audits, and compliance tasks.

SENIOR SUPPORT WORKER:
Use shift‑lead scenarios, safeguarding decisions, conflict resolution, and guiding junior staff.

SUPPORT WORKER:
Use simple, practical scenarios. Focus on safety, boundaries, routines, and “what would you do next?”.

RESPONSIBLE INDIVIDUAL:
Use governance scenarios, oversight tasks, QA exercises, and Ofsted‑style reflections.

OFSTED INSPECTOR:
Use evaluation tasks, evidence‑based reasoning, and judgement‑area interpretation.

FORMAT RULES:
- Use plain text only.
- Use bold‑tone headings (frontend will style them).
- Short paragraphs with blank lines.
- No markdown symbols (#, *, -, >).
- No bullet points unless asked.

DOCUMENT CONTENT:
{PDF_TEXT}
"""

    # -----------------------------------------------------
    # NORMAL QUESTION MODE PROMPT
    # -----------------------------------------------------
    question_prompt = f"""
You are in {request.role} mode.

PRIMARY SOURCES:
Children's Homes Regulations 2015
Children's Home Guide

SECONDARY SOURCES:
Ofsted, DfE, statutory guidance, inspection frameworks.
Use only when relevant and never contradict the PDFs.

ROLE BEHAVIOUR:
{role_profiles}

FORMAT RULES:
Plain text only.
Short paragraphs.
Blank line between paragraphs.
Simple headings (frontend will style them).
No markdown symbols.

DOCUMENT CONTENT:
{PDF_TEXT}
"""

    # -----------------------------------------------------
    # SELECT MODE
    # -----------------------------------------------------
    system_context = training_prompt if request.mode == "training" else question_prompt

    # -----------------------------------------------------
    # OPENAI STREAMING CALL
    # -----------------------------------------------------
    completion = openai.ChatCompletion.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": system_context},
            {"role": "user", "content": request.message}
        ],
        stream=True
    )

    async def event_stream():
        for chunk in completion:
            if "choices" in chunk and len(chunk["choices"]) > 0:
                delta = chunk["choices"][0]["delta"]
                if "content" in delta:
                    yield delta["content"]

    return StreamingResponse(event_stream(), media_type="text/plain")
