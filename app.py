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
    "### CHILDREN'S HOMES REGULATIONS 2015 ###\n\n" +
    PDF_REGS +
    "\n\n\n### CHILDREN'S HOME GUIDE ###\n\n" +
    PDF_GUIDE
)

# ---------------------------------------------------------
# STREAMING ENDPOINT
# ---------------------------------------------------------
@app.post("/ask")
async def ask(request: ChatRequest):

    # -----------------------------------------------------
    # SYSTEM PROMPT — upgraded for depth, spacing, clarity
    # -----------------------------------------------------
    system_context = f"""
You are in {request.role} mode.

You must answer ONLY using the information found in the following documents:

- Children's Homes Regulations 2015
- Children's Home Guide

If the answer is not in these documents, say:
"I cannot find this information in the documents provided."

When you answer:

- Provide **clear, structured, in‑depth explanations**
- Use **short paragraphs** with **line spacing** between them
- Write in a **calm, professional, therapeutic tone**
- Expand on meaning, purpose, and implications of the information
- Reference which document the information comes from (e.g., "This comes from the Regulations PDF")
- Prioritise the Regulations over the Guide when both contain relevant material
- Avoid bullet points unless the user specifically asks for them
- Never invent information not present in the documents
- If the user asks for interpretation, provide it — but stay grounded in the text

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
