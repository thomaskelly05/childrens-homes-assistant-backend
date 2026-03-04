import os
import asyncio
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
from openai import AsyncOpenAI

# ---------------------------------------------------------
# OpenAI client
# ---------------------------------------------------------
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise RuntimeError("OPENAI_API_KEY not set")

client = AsyncOpenAI(api_key=OPENAI_API_KEY)

app = FastAPI()

# ---------------------------------------------------------
# CORS (must include your Render domain)
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.indicare.co.uk",
        "https://indicare.co.uk",
        "https://childrens-homes-assistant-backend-new.onrender.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Helper: build reflective system prompt
# ---------------------------------------------------------
def build_system_prompt(mode: str, ld_friendly: bool):
    base = (
        "You are IndiCare, a calm, reflective assistant for staff in regulated care settings. "
        "You support staff to think about their practice, feelings, values, and next steps in a "
        "contained, non-judgemental way. You never give medical advice or diagnostic labels. "
        "You keep responses grounded, practical, and emotionally safe."
    )

    if mode == "reflective":
        base += (
            " Focus on helping the staff member slow down, notice what stayed with them, "
            "what they felt in their body, and what values they were holding."
        )
    elif mode == "debrief":
        base += (
            " Focus on helping them process an incident, separate facts from feelings, "
            "and think about what support they need."
        )
    elif mode == "team":
        base += (
            " Focus on team dynamics, communication, and how they can bring this into supervision or team meetings."
        )
    elif mode == "grounding":
        base += (
            " Focus on grounding, regulation, and helping them come back to a steadier place before reflecting in depth."
        )

    if ld_friendly:
        base += (
            " Use clear, simple language. Short sentences. Avoid jargon. "
            "Explain any complex ideas in everyday words."
        )

    return base

# ---------------------------------------------------------
# Streaming endpoint
# ---------------------------------------------------------
@app.post("/api/assistant/stream")
async def assistant_stream(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    user_message = body.get("message", "") or ""
    mode = body.get("mode", "reflective")
    role = body.get("role", "support_worker")
    ld = body.get("ld_friendly", False)
    slow = body.get("slow_mode", False)

    if not user_message.strip():
        raise HTTPException(status_code=400, detail="Message is required")

    system_prompt = build_system_prompt(mode, ld)

    async def event_stream():
        try:
            stream = await client.chat.completions.create(
                model="gpt-4.1",
                stream=True,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {
                        "role": "user",
                        "content": (
                            f"Staff role: {role}.\n"
                            f"Mode: {mode}.\n\n"
                            f"Staff reflection:\n{user_message}"
                        ),
                    },
                ],
            )

            async for chunk in stream:
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    yield delta.content
                    if slow:
                        await asyncio.sleep(0.03)

        except Exception:
            yield "\n\nI ran into a technical issue while responding. "
            yield "You can try again in a moment, or bring this reflection to supervision."

    return StreamingResponse(event_stream(), media_type="text/plain")

# ---------------------------------------------------------
# Health check
# ---------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# ---------------------------------------------------------
# Static frontend (must be last)
# ---------------------------------------------------------
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

# ---------------------------------------------------------
# Local dev
# ---------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=10000, reload=True)
