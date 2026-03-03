from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import json
import asyncio

app = FastAPI()

# ---------------------------------------------------------
# CORS (allow frontend to call backend)
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # you can restrict later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# STATIC FRONTEND (critical for Render)
# ---------------------------------------------------------
# This serves:
#   /index.html
#   /styles.css
#   /app.js
#   /static/sections/*.html
#
# EXACTLY what your UI expects.
# ---------------------------------------------------------
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")


# ---------------------------------------------------------
# ASSISTANT STREAMING ENDPOINT
# ---------------------------------------------------------
@app.post("/api/assistant/stream")
async def assistant_stream(request: Request):
    """
    Streams the assistant response token-by-token.
    """

    body = await request.json()
    user_message = body.get("message", "")
    role = body.get("role", "support_worker")
    mode = body.get("mode", "reflective")
    ld = body.get("ld_friendly", False)
    slow = body.get("slow_mode", False)

    async def event_stream():
        # Replace this with your actual LLM call
        # This is a placeholder streaming generator
        text = f"Reflecting with you in {mode} mode. You said: {user_message}"

        for chunk in text.split(" "):
            yield chunk + " "
            await asyncio.sleep(0.05 if slow else 0.005)

    return StreamingResponse(event_stream(), media_type="text/plain")


# ---------------------------------------------------------
# ROOT CHECK (optional)
# ---------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------
# LOCAL DEV
# ---------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=10000, reload=True)
