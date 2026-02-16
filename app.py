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
    allow_origins=["*"],   # tighten later to ["https://www.indicare.co.uk"]
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
# LOAD PDF ON STARTUP
# ---------------------------------------------------------
def load_pdf_text(path: str) -> str:
    try:
        reader = PdfReader(path)
        pages = [page.extract_text() or "" for page in reader.pages]
        return "\n\n".join(pages)
    except Exception as e:
        print("Error loading PDF:", e)
        return ""

PDF_TEXT = load_pdf_text("core_policy.pdf")  # <-- your PDF filename

# ---------------------------------------------------------
# STREAMING ENDPOINT
# ---------------------------------------------------------
@app.post("/ask")
async def ask(request: ChatRequest):

    system_context = (
        f"You are in {request.role} mode. "
        f"Use the following PDF content as your primary reference where relevant:\n\n{PDF_TEXT}"
    )

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
