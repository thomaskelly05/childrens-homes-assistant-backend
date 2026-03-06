from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import logging
import re
import jwt

from db.connection import get_db
from auth.tokens import JWT_SECRET, JWT_ALGORITHM

from assistant.prompts import build_chat_prompt, build_template_prompt
from assistant.streaming import run_chat_stream
from assistant.logging import log_chat, create_supervision_summary


router = APIRouter()

logger = logging.getLogger("uvicorn.error")


# ---------------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------------

class ChatRequest(BaseModel):
    message: str
    role: str | None = None
    mode: str | None = "reflective"
    speed: str | None = "fast"
    ld_lens: bool | None = False
    home_id: int | None = None


class TemplateRequest(BaseModel):
    templateRequest: str
    home_id: int | None = None


# ---------------------------------------------------------
# USER AUTH
# ---------------------------------------------------------

def get_user_from_cookie(request):

    token = request.cookies.get("access_token")

    if not token:
        return {"email": "anonymous"}

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

        return {
            "id": payload.get("sub"),
            "email": payload.get("email"),
            "role": payload.get("role"),
            "home_id": payload.get("home_id")
        }

    except Exception:
        return {"email": "anonymous"}


# ---------------------------------------------------------
# PROMPT VALIDATION
# ---------------------------------------------------------

blocked_patterns = [
    r"\bhow do i restrain\b",
    r"\bhow to restrain\b",
    r"\brestraint technique\b",
    r"\bcontrol them\b",
    r"\bmake them\b",
    r"\bfix their behaviour\b",
    r"\bmanage their behaviour\b",
    r"\bwhat should i do when they\b",
    r"\bwhat do i do if they\b",
]


def validate_prompt(prompt: str):

    text = prompt.lower()

    if re.search(r"\b[A-Z]\.", prompt):
        raise HTTPException(
            status_code=400,
            detail="IndiCare cannot process initials or identifying details."
        )

    if re.search(r"\b[A-Z][a-z]+\s+[A-Z][a-z]+\b", prompt):
        raise HTTPException(
            status_code=400,
            detail="IndiCare cannot process full names."
        )

    for pattern in blocked_patterns:
        if re.search(pattern, text):
            raise HTTPException(
                status_code=400,
                detail="IndiCare supports reflection, not behaviour management guidance."
            )


# ---------------------------------------------------------
# CHAT ENDPOINT
# ---------------------------------------------------------

@router.post("/chat")
async def chat_endpoint(req: ChatRequest, conn=Depends(get_db)):

    try:

        validate_prompt(req.message)

        system_prompt, user_prompt = build_chat_prompt(
            message=req.message,
            role=req.role or "support_worker",
            ld_lens=req.ld_lens,
            training_mode=(req.mode == "training"),
            speed=req.speed
        )

        home_id = req.home_id

        def stream_and_log():

            full_response = []

            for chunk in run_chat_stream(system_prompt, user_prompt):

                full_response.append(chunk)

                yield chunk

            final_text = "".join(full_response)

            try:

                user_email = "anonymous"

                log_chat(
                    conn,
                    user_email=user_email,
                    role=req.role or "unknown",
                    home_id=home_id,
                    message=user_prompt,
                    response=final_text
                )

                create_supervision_summary(
                    conn,
                    user_email=user_email,
                    home_id=home_id,
                    reflection=user_prompt
                )

            except Exception as log_err:
                logger.error(f"Logging failed: {log_err}")

        return StreamingResponse(stream_and_log(), media_type="text/plain")

    except Exception as e:

        logger.error(f"/chat error: {e}")

        return JSONResponse(
            {"error": "Something went wrong."},
            status_code=500
        )


# ---------------------------------------------------------
# TEMPLATE GENERATOR
# ---------------------------------------------------------

@router.post("/generate-template")
async def generate_template(req: TemplateRequest, conn=Depends(get_db)):

    try:

        system_prompt, user_prompt = build_template_prompt(req.templateRequest)

        from openai import OpenAI
        client = OpenAI()

        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
        )

        output = completion.choices[0].message.content

        return JSONResponse({"template": output})

    except Exception as e:

        logger.error(f"/generate-template error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Template generation failed."
        )
