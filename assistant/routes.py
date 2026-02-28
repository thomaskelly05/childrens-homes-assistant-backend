# assistant/routes.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse, JSONResponse
from pydantic import BaseModel
import markdown
import logging

from auth.dependencies import get_current_user
from db import get_db

from assistant.prompts import build_chat_prompt, build_template_prompt
from assistant.streaming import run_chat_stream
from assistant.logging import log_chat, log_template

router = APIRouter()
logger = logging.getLogger("uvicorn.error")


class ChatRequest(BaseModel):
    message: str
    role: str | None = None
    mode: str | None = "default"
    speed: str | None = "fast"
    ld_lens: bool | None = False
    home_id: int | None = None


class TemplateRequest(BaseModel):
    templateRequest: str
    home_id: int | None = None


@router.post("/chat")
async def chat_endpoint(
    req: ChatRequest,
    user=Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        system_prompt, user_prompt = build_chat_prompt(
            message=req.message,
            role=req.role or user.role,
            ld_lens=req.ld_lens,
            training_mode=(req.mode == "training"),
            speed=req.speed,
        )

        home_id = req.home_id

        def stream_and_log():
            full = []
            for chunk in run_chat_stream(system_prompt, user_prompt):
                full.append(chunk)
                yield chunk

            try:
                log_chat(
                    conn,
                    user_email=user.sub,
                    role=user.role,
                    home_id=home_id,
                    message=user_prompt,
                    response="".join(full),
                )
            except Exception as log_err:
                logger.error(f"Failed to log chat: {log_err}")

        return StreamingResponse(stream_and_log(), media_type="text/plain")

    except Exception as e:
        logger.error(f"/chat error: {e}")
        return JSONResponse({"error": "Something went wrong."}, status_code=500)


@router.post("/generate-template")
async def generate_template(
    req: TemplateRequest,
    user=Depends(get_current_user),
    conn=Depends(get_db),
):
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

        raw_markdown = completion.choices[0].message["content"]
        html_output = markdown.markdown(raw_markdown, extensions=["tables"])

        log_template(
            conn,
            user_email=user.sub,
            role=user.role,
            home_id=req.home_id,
            template_name="default",
            prompt=req.templateRequest,
            output=html_output,
        )

        return JSONResponse({"template": html_output})

    except Exception as e:
        logger.error(f"/generate-template error: {e}")
        raise HTTPException(status_code=500, detail="Template generation failed.")
