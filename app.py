from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
import os

# ---------------------------------------------------------
# CREATE APP
# ---------------------------------------------------------
app = FastAPI()

# ---------------------------------------------------------
# CORS (TEMP: allow all to confirm working)
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # After testing, change to ["https://www.indicare.co.uk"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# OPENAI CLIENT (new API)
# ---------------------------------------------------------
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------------------------------------------------------
# REQUEST MODEL
# ---------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    role: str

# ---------------------------------------------------------
# STREAMING ENDPOINT
# ---------------------------------------------------------
@app.post("/ask")
async def ask(request: ChatRequest):

    # Start streaming response from OpenAI
    stream = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": f"You are in {request.role} mode."},
            {"role": "user", "content": request.message}
        ],
        stream=True
    )

    async def event_stream():
        for chunk in stream:
            if chunk.choices and chunk.choices[0].delta and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    return StreamingResponse(event_stream(), media_type="text/plain")
