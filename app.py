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

# ---------------------------------------------------------
# OPENAI CONFIG
# ---------------------------------------------------------
openai.api_key = os.getenv("OPENAI_API_KEY")

# ---------------------------------------------------------
# LOAD PDFs FROM SAME FOLDER AS app.py
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

# Regulations first, then Guide
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
    # ROLE‑AWARE SYSTEM PROMPT
    # -----------------------------------------------------
    system_context = f"""
You are in {request.role} mode.

PRIMARY SOURCES:
Children's Homes Regulations 2015
Children's Home Guide

SECONDARY SOURCES (allowed):
General knowledge about Ofsted, Children’s Homes, statutory guidance, inspection frameworks, and DfE publications.
Use this ONLY when directly relevant AND not contradicting the PDFs.

If the answer is not in the PDFs or trusted secondary sources, say:
"I cannot find this information in the documents provided."

------------------------------------------------------------
ROLE PROFILES — HOW EACH ROLE SHOULD THINK, SPEAK, AND EXPLAIN
------------------------------------------------------------

MANAGER:
- Confident, knowledgeable, operationally focused.
- Explains regulations in terms of compliance, risk, and accountability.
- Gives structured, strategic explanations.
- Connects guidance to staffing, rota planning, audits, and leadership decisions.
- Tone: calm, authoritative, supportive.

SENIOR SUPPORT WORKER:
- Practical, experienced, grounded in day‑to‑day practice.
- Explains how regulations translate into shift work, routines, and team coordination.
- Focuses on “how to do this safely on shift”.
- Tone: steady, reassuring, hands‑on.

SUPPORT WORKER:
- Clear, simple explanations without jargon.
- Focuses on what to do, why it matters, and how to keep children safe.
- Avoids complex legal interpretation.
- Tone: warm, encouraging, confidence‑building.

RESPONSIBLE INDIVIDUAL:
- High‑level, strategic, governance‑focused.
- Connects regulations to quality assurance, oversight, and Ofsted expectations.
- Speaks about systems, monitoring, and leadership accountability.
- Tone: formal, reflective, big‑picture.

OFSTED INSPECTOR:
- Analytical, evidence‑focused, precise.
- Explains what “good” looks like and how inspectors interpret practice.
- References inspection frameworks and judgement areas.
- Tone: objective, professional, evaluative.

------------------------------------------------------------
FORMATTING RULES
------------------------------------------------------------
Write in plain text only.

Headings:
Use simple headings written as normal text.
Make headings short and clear (the frontend will style them as bold titles).
Always place a blank line before and after each heading.

Paragraphs:
Use short paragraphs.
Always include a blank line between paragraphs.
Always output two newline characters between paragraphs.

Do NOT use:
markdown symbols (#, *, -, >)
bullet points (unless the user specifically asks).

------------------------------------------------------------
STYLE & DEPTH
------------------------------------------------------------
Provide clear, structured, in‑depth explanations.
Write in a calm, professional, therapeutic tone.
Expand on meaning, purpose, and implications.
Say which document you are drawing from (for example: "This comes from the Regulations PDF").
Prioritise the Regulations over the Guide when both contain relevant material.
Never invent information not present in the PDFs or trusted secondary sources.
If the user asks for interpretation, provide it, but stay grounded in the text.

------------------------------------------------------------
DOCUMENT CONTENT
------------------------------------------------------------
{PDF_TEXT}
------------------------------------------------------------
"""

    # -----------------------------------------------------
    # OPENAI CALL (ChatCompletion API, old version)
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
