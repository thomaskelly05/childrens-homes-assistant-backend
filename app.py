# -*- coding: utf-8 -*-
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastapi.responses import JSONResponse
from openai import OpenAI
import os
import logging

from prompts.reflective_brain_prompt import REFLECTIVE_BRAIN_SYSTEM_PROMPT
from prompts.template_engine_prompt import TEMPLATE_ENGINE_SYSTEM_PROMPT

# Overlays
from prompts.overlays.role_overlay import ROLE_OVERLAY
from prompts.overlays.ld_overlay import LD_OVERLAY
from prompts.overlays.training_overlay import TRAINING_OVERLAY

# ---------------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    role: str | None = None           # rcw, team_leader, registered_manager
    mode: str | None = "default"      # "default" or "training"
    speed: str | None = "fast"        # "fast" or "slow"
    ld_lens: bool | None = False      # optional

class TemplateRequest(BaseModel):
    templateRequest: str

# ---------------------------------------------------------
# LOGGING
# ---------------------------------------------------------
logger = logging.getLogger("uvicorn.error")

# ---------------------------------------------------------
# OPENAI CLIENT
# ---------------------------------------------------------
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# ---------------------------------------------------------
# SHARED MODEL CALL
# ---------------------------------------------------------
def call_model(system_prompt: str, user_message: str) -> str:
    completion = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message}
        ],
        temperature=0.4,
        max_tokens=900,
    )
    return completion.choices[0].message.content

# ---------------------------------------------------------
# ROLE NORMALISATION MAP
# ---------------------------------------------------------
ROLE_MAP = {
    # RCW
    "rcw": "rcw",
    "care worker": "rcw",
    "residential childcare worker": "rcw",
    "childcare worker": "rcw",
    "support worker": "rcw",

    # Team Leader
    "team leader": "team_leader",
    "tl": "team_leader",
    "senior": "team_leader",
    "shift leader": "team_leader",

    # Registered Manager
    "registered manager": "registered_manager",
    "rm": "registered_manager",
    "manager": "registered_manager",
    "reg manager": "registered_manager",
    "home manager": "registered_manager",
}

def normalise_role(role: str | None) -> str | None:
    if not role:
        return None
    key = role.lower().strip()
    return ROLE_MAP.get(key, None)

# ---------------------------------------------------------
# FASTAPI APP
# ---------------------------------------------------------
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.indicare.co.uk",
        "https://indicare.co.uk",
        "https://indicarelimited.squarespace.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# /chat — Reflective Brain with Overlays
# ---------------------------------------------------------
@app.post("/chat")
async def chat_endpoint(req: ChatRequest):
    try:
        # Start with the raw user message
        user_message = req.message

        # -------------------------------------------------
        # Apply overlays in a safe, predictable order
        # -------------------------------------------------

        # 1. Role overlay (normalised)
        normalised_role = normalise_role(req.role)
        if normalised_role:
            role_text = ROLE_OVERLAY.get(normalised_role, "")
            if role_text:
                user_message = role_text + "\n\n" + user_message

        # 2. LD lens overlay
        if req.ld_lens:
            user_message = LD_OVERLAY + "\n\n" + user_message

        # 3. Training mode overlay
        if req.mode == "training":
            user_message = TRAINING_OVERLAY + "\n\n" + user_message

        # 4. Speed setting (future‑proofed)
        if req.speed == "slow":
            user_message = (
                "SLOW MODE: Take your time, offer slightly more detail, "
                "but stay clear and grounded.\n\n" + user_message
            )

        # -------------------------------------------------
        # Call the Reflective Brain
        # -------------------------------------------------
        reply = call_model(
            system_prompt=REFLECTIVE_BRAIN_SYSTEM_PROMPT,
            user_message=user_message
        )

        return JSONResponse({"reply": reply})

    except Exception as e:
        logger.error(f"/chat error: {e}")
        return JSONResponse(
            {"error": "Something went wrong processing your request."},
            status_code=500
        )

# ---------------------------------------------------------
# /generate-template — Template Brain
# ---------------------------------------------------------
@app.post("/generate-template")
async def generate_template_endpoint(req: TemplateRequest):
    try:
        reply = call_model(
            system_prompt=TEMPLATE_ENGINE_SYSTEM_PROMPT,
            user_message=req.templateRequest
        )
        return JSONResponse({"template": reply})

    except Exception as e:
        logger.error(f"/generate-template error: {e}")
        return JSONResponse(
            {"error": "Something went wrong processing your request."},
            status_code=500
        )
