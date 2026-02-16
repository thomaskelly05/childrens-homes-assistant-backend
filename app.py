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
    allow_origins=["*"],   # tighten later to your domain
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
    mode: str  # "ask" or "training"

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
Confident, knowledgeable, operationally focused. Strategic, compliance‑aware, supportive. Connects practice to staffing, rota planning, audits, and leadership decisions.

SENIOR SUPPORT WORKER:
Practical, experienced, shift‑focused. Hands‑on, reassuring, grounded in daily routines. Translates regulations into safe, consistent shift practice.

SUPPORT WORKER:
Clear, simple, confidence‑building. Focuses on what to do, why it matters, and how to keep children safe. Avoids jargon and complex legal interpretation.

RESPONSIBLE INDIVIDUAL:
Strategic, governance‑focused, oversight‑driven. Connects practice to systems, monitoring, quality assurance, and Ofsted expectations.

OFSTED INSPECTOR:
Analytical, evidence‑based, objective. Interprets practice through judgement areas and inspection frameworks, focusing on impact, consistency, and evidence.
"""

    # -----------------------------------------------------
    # BEST‑PRACTICE EXAMPLES (SHARED RULES)
    # -----------------------------------------------------
    best_practice_block = """
BEST‑PRACTICE EXAMPLES (allowed):
You ARE allowed to create examples, templates, model answers, and illustrations of good practice such as:
- daily logs
- key‑worker sessions
- incident reports
- handovers
- risk assessments
- behaviour support plans
- restorative conversations
- staff reflections

These examples must:
- be realistic and professional
- reflect good practice in children’s homes
- align with Ofsted expectations
- NOT claim to be from the PDFs
- NOT claim to be official templates
- NOT contradict the Regulations or statutory guidance

You must clearly state:
"This is an example of good practice, not an official template."

You may also:
- compare a user’s text to best practice and give constructive feedback
- rewrite a user’s text to be clearer, more child‑centred, and Ofsted‑ready
- highlight strengths and areas for improvement in a supportive way
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
- Keep training supportive, confidence‑building, and reflective.

Training style by role:

MANAGER:
Use leadership scenarios, risk‑based decisions, staffing challenges, audits, and compliance tasks. Encourage reflective thinking about culture, supervision, and oversight.

SENIOR SUPPORT WORKER:
Use shift‑lead scenarios, safeguarding decisions, conflict resolution, and guiding junior staff. Focus on how to hold the team safely in real‑time practice.

SUPPORT WORKER:
Use simple, practical scenarios. Focus on safety, boundaries, routines, relationships, and “what would you do next?” questions.

RESPONSIBLE INDIVIDUAL:
Use governance scenarios, oversight tasks, QA exercises, and Ofsted‑style reflections. Focus on systems, monitoring, and leadership accountability.

OFSTED INSPECTOR:
Use evaluation tasks, evidence‑based reasoning, and judgement‑area interpretation. Focus on what “good” and “requires improvement” look like in practice.

{best_practice_block}

FORMAT RULES:
- Use plain text only.
- Use simple headings written as normal text (the frontend will style them).
- Use short paragraphs with a blank line between each paragraph.
- Always output two newline characters between paragraphs.
- Do NOT use markdown symbols (#, *, -, >).
- Do NOT use bullet points unless the user specifically asks.

SOURCE RULES:
PRIMARY SOURCES:
- Children's Homes Regulations 2015
- Children's Home Guide

SECONDARY SOURCES (allowed):
- Ofsted inspection frameworks
- DfE guidance
- Statutory guidance related to children’s homes

Use secondary sources only when directly relevant and never contradict the PDFs.

DOCUMENT CONTENT:
{PDF_TEXT}
"""

    # -----------------------------------------------------
    # NORMAL QUESTION MODE PROMPT
    # -----------------------------------------------------
    question_prompt = f"""
You are in {request.role} mode.

PRIMARY SOURCES:
- Children's Homes Regulations 2015
- Children's Home Guide

SECONDARY SOURCES (allowed):
- Ofsted inspection frameworks
- DfE publications
- Statutory guidance related to children’s homes
Use these only when directly relevant and never contradict the PDFs.

ROLE BEHAVIOUR:
{role_profiles}

You must adapt your tone, depth, and focus to the role given above.

{best_practice_block}

FORMAT RULES:
- Write in plain text only.
- Use simple headings written as normal text (the frontend will style them as bold titles).
- Always place a blank line before and after each heading.
- Use short paragraphs with a blank line between each paragraph.
- Always output two newline characters between paragraphs.
- Do NOT use markdown symbols (#, *, -, >).
- Do NOT use bullet points unless the user specifically asks.

STYLE & DEPTH:
- Provide clear, structured, in‑depth explanations.
- Write in a calm, professional, therapeutic tone.
- Expand on meaning, purpose, and implications.
- Say which document you are drawing from when relevant (for example: "This comes from the Regulations PDF").
- Prioritise the Regulations over the Guide when both contain relevant material.
- Never invent regulations or statutory duties that are not present in the PDFs or trusted secondary sources.
- If the user asks for interpretation, provide it, but stay grounded in the text.

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
