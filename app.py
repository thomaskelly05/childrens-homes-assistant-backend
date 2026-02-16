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

# Weighted combination: Regulations first, Guide second
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
    # SYSTEM PROMPT — headings, spacing, depth, internet knowledge
    # -----------------------------------------------------
    system_context = f"""
You are in {request.role} mode.

PRIMARY SOURCES:
Children's Homes Regulations 2015
Children's Home Guide

SECONDARY SOURCES (allowed):
General knowledge about Ofsted, Children’s Homes, statutory guidance, inspection frameworks, and DfE publications.
You may use this ONLY when it is directly relevant AND does not contradict the PDFs.

If the answer is not in the PDFs or trusted secondary sources, say:
"I cannot find this information in the documents provided."

FORMATTING RULES:
Write in plain text only.
You MAY use simple headings written as normal text, for example:
Regulation 32 – Independent Visits
Ofsted Judgement Structure

Always place a blank line before and after each heading.

Use short paragraphs with a blank line between each paragraph.
Always output two newline characters between paragraphs.
Do not use bullet points unless the user specifically asks for them.
Do not use markdown symbols (#, *, -, >).

STYLE & DEPTH:
Provide clear, structured, in‑depth explanations.
Write in a calm, professional, therapeutic tone.
Expand on meaning, purpose, and implications of the information.
Say which document you are drawing from (for example: "This comes from the Regulations PDF").
Prioritise the Regulations over the Guide when both contain relevant material.
Never invent information not present in the PDFs or trusted secondary sources.
If the user asks for interpretation, provide it, but stay grounded in the text.

ROLE BEHAVIOUR:
You should behave like a thoughtful, reflective colleague in a children's home,
helping staff understand the regulatory and therapeutic context.

Document content begins below:
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
