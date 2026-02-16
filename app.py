from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import StreamingResponse
from openai import OpenAI
import os
from pypdf import PdfReader

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    role: str
    mode: str

def load_pdf(path: str) -> str:
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

@app.post("/ask")
async def ask(request: ChatRequest):

    BASE_PROMPT = f"""
You are supporting a staff member in a UK children’s home.

{STYLE_BLOCK}
{ROLE_BLOCK}
{ASK_MODE}
{BEST_PRACTICE}
{INTERNET_ACCESS}
{FORMAT_BLOCK}

PRIMARY SOURCES:
Children's Homes Regulations 2015
Children's Home Guide

SECONDARY SOURCES:
Ofsted inspection frameworks
DfE publications
Statutory guidance

Never contradict the PDFs.

DOCUMENT CONTENT:
{PDF_TEXT}
"""

    if request.mode == "training":
        SYSTEM_PROMPT = BASE_PROMPT + TRAINING_BLOCK
        model_name = "gpt-4o"
    else:
        SYSTEM_PROMPT = BASE_PROMPT
        model_name = "gpt-4o-mini"

    try:
        completion = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": request.message}
            ],
            stream=True
        )
    except Exception as e:
        return StreamingResponse(iter([f"Error: {str(e)}"]), media_type="text/plain")

    async def stream():
        for chunk in completion:
            delta = chunk.choices[0].delta
            if delta and delta.content:
                yield delta.content

    return StreamingResponse(stream(), media_type="text/plain")
