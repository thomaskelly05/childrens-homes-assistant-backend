from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
import uvicorn
import asyncio

app = FastAPI()

# ---------------------------------------------------------
# CORS (lock to IndiCare domains)
# ---------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.indicare.co.uk",
        "https://indicare.co.uk",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# ASSISTANT STREAMING ENDPOINT
# ---------------------------------------------------------
@app.post("/api/assistant/stream")
async def assistant_stream(request: Request):
    body = await request.json()
    user_message = body.get("message", "")
    role = body.get("role", "support_worker")
    mode = body.get("mode", "reflective")
    ld = body.get("ld_friendly", False)
    slow = body.get("slow_mode", False)

    async def event_stream():
        text = f"Reflecting with you in {mode} mode. You said: {user_message}"
        for chunk in text.split(" "):
            yield chunk + " "
            await asyncio.sleep(0.05 if slow else 0.005)

    return StreamingResponse(event_stream(), media_type="text/plain")

# ---------------------------------------------------------
# HEALTH CHECK
# ---------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}

# ---------------------------------------------------------
# STATIC FRONTEND (MUST BE LAST)
# ---------------------------------------------------------
app.mount("/", StaticFiles(directory="frontend", html=True), name="frontend")

# ---------------------------------------------------------
# LOCAL DEV
# ---------------------------------------------------------
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=10000, reload=True)
