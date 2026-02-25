# -*- coding: utf-8 -*-
import os
import logging
import datetime
import traceback

from fastapi import FastAPI, Depends, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from openai import OpenAI
import markdown

import bcrypt
import jwt
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2.pool import SimpleConnectionPool

from log_helpers import log_chat, log_template
from prompt_engine import build_chat_prompt, run_chat_stream
from prompt_engine import build_template_prompt, run_template_completion

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    require_role,
    CurrentUser,
)

# ---------------------------------------------------------
# LOGGING
# ---------------------------------------------------------
logger = logging.getLogger("uvicorn.error")

# ---------------------------------------------------------
# CONFIG
# ---------------------------------------------------------
SECRET_KEY = os.getenv("JWT_SECRET", "change-me-in-prod")
ALGORITHM = "HS256"

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# ---------------------------------------------------------
# PROMPTS & OVERLAYS
# ---------------------------------------------------------
from prompts.reflective_brain_prompt import REFLECTIVE_BRAIN_SYSTEM_PROMPT
from prompts.template_engine_prompt import TEMPLATE_ENGINE_SYSTEM_PROMPT

from prompts.overlays.role_overlay import ROLE_OVERLAY
from prompts.overlays.ld_overlay import LD_OVERLAY
from prompts.overlays.training_overlay import TRAINING_OVERLAY

# ---------------------------------------------------------
# APP + CORS
# ---------------------------------------------------------
app = FastAPI(title="IndiCare Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://www.indicare.co.uk",
        "https://indicare.co.uk",
        "https://indicarelimited.squarespace.com",
        "https://*.squarespace.com",
        "https://*.squarespace-cdn.com",
        "http://localhost:3000",
        "http://localhost:8000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.options("/{path:path}")
def preflight_handler(path: str):
    return {}

# ---------------------------------------------------------
# HEALTH
# ---------------------------------------------------------
@app.get("/", summary="Service health check")
def root_health():
    return {"status": "ok", "service": "IndiCare backend running"}

@app.head("/")
def root_health_head():
    return {}

@app.get("/health")
def health():
    return {"status": "ok"}

from db import get_db

# ---------------------------------------------------------
# OPENAI CLIENT
# ---------------------------------------------------------
client = OpenAI(api_key=OPENAI_API_KEY)

# ---------------------------------------------------------
# ROLE NORMALISATION
# ---------------------------------------------------------
ROLE_MAP = {
    "rcw": "rcw",
    "care worker": "rcw",
    "residential childcare worker": "rcw",
    "childcare worker": "rcw",
    "support worker": "rcw",
    "team leader": "team_leader",
    "tl": "team_leader",
    "senior": "team_leader",
    "shift leader": "team_leader",
    "registered manager": "registered_manager",
    "rm": "registered_manager",
    "manager": "registered_manager",
    "reg manager": "registered_manager",
    "home manager": "registered_manager",
}

def normalise_role(role: str | None) -> str | None:
    if not role:
        return None
    return ROLE_MAP.get(role.lower().strip(), None)

# ---------------------------------------------------------
# MODELS
# ---------------------------------------------------------
class CurrentUser(BaseModel):
    sub: str
    role: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

class CreateUserRequest(BaseModel):
    email: str
    password: str
    role: str = "staff"

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

class CreateHomeRequest(BaseModel):
    name: str

class AssignUserRequest(BaseModel):
    email: str
    home_id: int


# ---------------------------------------------------------
# AUTH ENDPOINTS
# ---------------------------------------------------------
@app.options("/login")
async def login_options():
    return {}

@app.post("/login", response_model=LoginResponse)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    conn=Depends(get_db),
):
    email = form_data.username
    password = form_data.password

    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()

    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user["email"], "role": user["role"]})
    return LoginResponse(access_token=token, role=user["role"])

@app.get("/me")
async def me(user: CurrentUser = Depends(get_current_user)):
    return {"email": user.sub, "role": user.role}

@app.post("/admin/create-user")
async def create_user(
    body: CreateUserRequest,
    user: CurrentUser = Depends(require_role("manager", "company", "admin")),
    conn=Depends(get_db),
):
    if body.role not in ["staff", "manager", "company", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    hashed_pw = hash_password(body.password)
    cur = conn.cursor()
    try:
        cur.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s)",
            (body.email, hashed_pw, body.role),
        )
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")
    return {"message": "User created successfully"}

@app.delete("/admin/delete-user/{email}")
async def delete_user(
    email: str,
    user: CurrentUser = Depends(require_role("admin")),
    conn=Depends(get_db),
):
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE email = %s", (email,))
    conn.commit()
    return {"message": "User deleted successfully"}

# ---------------------------------------------------------
# HOMES
# ---------------------------------------------------------
@app.post("/admin/create-home")
async def create_home(
    body: CreateHomeRequest,
    user: CurrentUser = Depends(require_role("manager", "company", "admin")),
    conn=Depends(get_db),
):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Home name is required")

    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO homes (name) VALUES (%s) RETURNING id", (name,))
        home_id = cur.fetchone()["id"]
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Home name already exists")
    return {"id": home_id, "name": name}

@app.get("/admin/list-homes")
async def list_homes(
    user: CurrentUser = Depends(require_role("manager", "company", "admin")),
    conn=Depends(get_db),
):
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM homes ORDER BY id ASC")
    rows = cur.fetchall()
    return {"homes": rows}

@app.delete("/admin/delete-home/{home_id}")
async def delete_home(
    home_id: int,
    user: CurrentUser = Depends(require_role("admin")),
    conn=Depends(get_db),
):
    cur = conn.cursor()
    cur.execute("DELETE FROM home_assignments WHERE home_id = %s", (home_id,))
    cur.execute("DELETE FROM homes WHERE id = %s", (home_id,))
    conn.commit()
    return {"message": "Home deleted successfully"}

# ---------------------------------------------------------
# HOME ASSIGNMENTS
# ---------------------------------------------------------
@app.post("/admin/assign-user-to-home")
async def assign_user_to_home(
    body: AssignUserRequest,
    user: CurrentUser = Depends(require_role("manager", "company", "admin")),
    conn=Depends(get_db),
):
    email = body.email.strip()
    home_id = body.home_id

    if not email or not home_id:
        raise HTTPException(status_code=400, detail="email and home_id are required")

    cur = conn.cursor()
    # Ensure user exists
    cur.execute("SELECT email FROM users WHERE email = %s", (email,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="User not found")

    # Ensure home exists
    cur.execute("SELECT id FROM homes WHERE id = %s", (home_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Home not found")

    cur.execute(
        """
        INSERT INTO home_assignments (home_id, user_email)
        VALUES (%s, %s)
        ON CONFLICT DO NOTHING
        """,
        (home_id, email),
    )
    conn.commit()
    return {"message": "User assigned to home"}

@app.delete("/admin/remove-user-from-home")
async def remove_user_from_home(
    body: AssignUserRequest,
    user: CurrentUser = Depends(require_role("manager", "company", "admin")),
    conn=Depends(get_db),
):
    email = body.email.strip()
    home_id = body.home_id

    if not email or not home_id:
        raise HTTPException(status_code=400, detail="email and home_id are required")

    cur = conn.cursor()
    cur.execute(
        "DELETE FROM home_assignments WHERE home_id = %s AND user_email = %s",
        (home_id, email),
    )
    conn.commit()
    return {"message": "User removed from home"}

@app.get("/admin/home-users/{home_id}")
async def home_users(
    home_id: int,
    user: CurrentUser = Depends(require_role("manager", "company", "admin")),
    conn=Depends(get_db),
):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT u.email, u.role
        FROM home_assignments ha
        JOIN users u ON ha.user_email = u.email
        WHERE ha.home_id = %s
        ORDER BY u.email ASC
        """,
        (home_id,),
    )
    rows = cur.fetchall()
    return {"users": rows}

@app.get("/admin/list-users")
async def list_users(
    user: CurrentUser = Depends(require_role("manager", "company", "admin")),
    conn=Depends(get_db),
):
    cur = conn.cursor()
    cur.execute("SELECT email, role FROM users ORDER BY email ASC")
    rows = cur.fetchall()
    return {"users": rows}

# ---------------------------------------------------------
# CHAT ENDPOINT
# ---------------------------------------------------------
@app.post("/chat")
async def chat_endpoint(
    req: ChatRequest,
    user: CurrentUser = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        user_message = req.message

        effective_role = req.role or user.role
        normalised_role = normalise_role(effective_role)

        if normalised_role:
            overlay = ROLE_OVERLAY.get(normalised_role, "")
            if overlay:
                user_message = overlay + "\n\n" + user_message

        if req.ld_lens:
            user_message = LD_OVERLAY + "\n\n" + user_message

        if req.mode == "training":
            user_message = TRAINING_OVERLAY + "\n\n" + user_message

        if req.speed == "slow":
            user_message = (
                "SLOW MODE: Take your time, offer slightly more detail, "
                "but stay clear and grounded.\n\n" + user_message
            )

        home_id = req.home_id  # optional but logged if present

        def stream_and_log():
            full_response = []
            try:
                response = client.chat.completions.create(
                    model="gpt-4.1-mini",
                    messages=[
                        {"role": "system", "content": REFLECTIVE_BRAIN_SYSTEM_PROMPT},
                        {"role": "user", "content": user_message},
                    ],
                    temperature=0.4,
                    max_tokens=900,
                    stream=True,
                )

                for chunk in response:
                    try:
                        delta = chunk.choices[0].delta
                        if delta and delta.content:
                            full_response.append(delta.content)
                            yield delta.content
                    except Exception as stream_err:
                        logger.error(f"Streaming error: {stream_err}")
                        break

                # After streaming completes, log to DB
                try:
                    log_chat(
                        conn,
                        email=user.sub,
                        home_id=home_id,
                        message=user_message,
                        response="".join(full_response),
                    )
                except Exception as log_err:
                    logger.error(f"Failed to log chat: {log_err}")

            except Exception as e:
                logger.error(f"OpenAI /chat error: {e}")
                yield "\n[Sorry, something went wrong generating this response.]"

        return StreamingResponse(stream_and_log(), media_type="text/plain")

    except Exception as e:
        logger.error(f"/chat error: {e}")
        return JSONResponse(
            {"error": "Something went wrong processing your request."},
            status_code=500,
        )
        system_prompt, user_prompt = build_chat_prompt(
    message=req.message,
    role=req.role or user.role,
    ld_lens=req.ld_lens,
    training_mode=(req.mode == "training"),
    speed=req.speed,
)

def stream_and_log():
    full = []
    for chunk in run_chat_stream(system_prompt, user_prompt):
        full.append(chunk)
        yield chunk

    log_chat(
        conn,
        email=user.sub,
        home_id=req.home_id,
        message=user_prompt,
        response="".join(full),
    )

# ---------------------------------------------------------
# TEMPLATE ENGINE
# ---------------------------------------------------------
def render_markdown(md: str) -> str:
    return markdown.markdown(md, extensions=["tables"])

@app.post("/generate-template")
async def generate_template(
    req: TemplateRequest,
    user: CurrentUser = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        try:
            raw_markdown = client.chat.completions.create(
                model="gpt-4.1-mini",
                messages=[
                    {"role": "system", "content": TEMPLATE_ENGINE_SYSTEM_PROMPT},
                    {"role": "user", "content": req.templateRequest},
                ],
                temperature=0.4,
                max_tokens=900,
            ).choices[0].message.content
        except Exception as model_err:
            logger.error(f"Template model error: {model_err}")
            raise HTTPException(status_code=500, detail="Template generation failed")

        html_output = render_markdown(raw_markdown)

        try:
            log_template(
                conn,
                email=user.sub,
                home_id=req.home_id,
                role=user.role,
                input_md=req.templateRequest,
                output_html=html_output,
            )
        except Exception as log_err:
            logger.error(f"Failed to log template: {log_err}")

        return JSONResponse({"template": html_output})

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"/generate-template error: {e}")
        raise HTTPException(status_code=500, detail="Something went wrong processing your request.")

@app.post("/v1/generate-template")
async def generate_template_v1(
    req: TemplateRequest,
    user: CurrentUser = Depends(get_current_user),
    conn=Depends(get_db),
):
    # Same behaviour as /generate-template for consistency
    return await generate_template(req, user, conn)

system_prompt, user_prompt = build_template_prompt(req.templateRequest)
raw_markdown = run_template_completion(system_prompt, user_prompt)

# ---------------------------------------------------------
# USER DASHBOARD ENDPOINTS
# ---------------------------------------------------------
@app.get("/me/chats")
async def my_chats(
    user: CurrentUser = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT c.id, c.message, c.response, c.created_at
            FROM chat_logs c
            JOIN users u ON c.user_id = u.id
            WHERE u.email = %s
            ORDER BY c.created_at DESC
            LIMIT 50
            """,
            (user.sub,),
        )
        rows = cur.fetchall()
        return {"chats": rows}
    except Exception as e:
        logger.error(f"/me/chats error: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch chats")

@app.get("/me/templates")
async def my_templates(
    user: CurrentUser = Depends(get_current_user),
    conn=Depends(get_db),
):
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT t.id, t.input_markdown, t.output_html, t.created_at
            FROM template_logs t
            JOIN users u ON t.user_id = u.id
            WHERE u.email = %s
            ORDER BY t.created_at DESC
            LIMIT 50
            """,
            (user.sub,),
        )
        rows = cur.fetchall()
        return {"templates": rows}
    except Exception as e:
        logger.error(f"/me/templates error: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch templates")

# ---------------------------------------------------------
# ADMIN ANALYTICS
# ---------------------------------------------------------
@app.get("/admin/home-chats/{home_id}")
async def home_chats(
    home_id: int,
    user: CurrentUser = Depends(require_role("manager", "company", "admin")),
    conn=Depends(get_db),
):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT email, message, timestamp
        FROM chat_logs_view_by_home
        WHERE home_id = %s
        ORDER BY timestamp DESC
        LIMIT 200
        """,
        (home_id,),
    )
    rows = cur.fetchall()
    return {"logs": rows}

@app.get("/admin/user-chats/{email}")
async def user_chats(
    email: str,
    user: CurrentUser = Depends(require_role("manager", "company", "admin")),
    conn=Depends(get_db),
):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT home_id, message, timestamp
        FROM chat_logs_view_by_user
        WHERE email = %s
        ORDER BY timestamp DESC
        LIMIT 200
        """,
        (email,),
    )
    rows = cur.fetchall()
    return {"logs": rows}

@app.get("/admin/home-usage/{home_id}")
async def home_usage(
    home_id: int,
    user: CurrentUser = Depends(require_role("manager", "company", "admin")),
    conn=Depends(get_db),
):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
          COUNT(*) AS total_messages,
          COUNT(DISTINCT email) AS unique_users
        FROM chat_logs_view_by_home
        WHERE home_id = %s
        """,
        (home_id,),
    )
    summary = cur.fetchone()
    cur.execute(
        """
        SELECT email, COUNT(*) AS messages
        FROM chat_logs_view_by_home
        WHERE home_id = %s
        GROUP BY email
        ORDER BY messages DESC
        """,
        (home_id,),
    )
    by_user = cur.fetchall()
    return {"summary": summary, "by_user": by_user}

@app.get("/admin/user-usage/{email}")
async def user_usage(
    email: str,
    user: CurrentUser = Depends(require_role("manager", "company", "admin")),
    conn=Depends(get_db),
):
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
          COUNT(*) AS total_messages,
          COUNT(DISTINCT home_id) AS homes_used
        FROM chat_logs_view_by_user
        WHERE email = %s
        """,
        (email,),
    )
    summary = cur.fetchone()
    cur.execute(
        """
        SELECT home_id, COUNT(*) AS messages
        FROM chat_logs_view_by_user
        WHERE email = %s
        GROUP BY home_id
        ORDER BY messages DESC
        """,
        (email,),
    )
    by_home = cur.fetchall()
    return {"summary": summary, "by_home": by_home}






