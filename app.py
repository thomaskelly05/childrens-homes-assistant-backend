# -*- coding: utf-8 -*-
import os
import logging

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel
from openai import OpenAI
import markdown

# AUTH imports
import bcrypt
import jwt
import datetime
import psycopg2
from psycopg2.extras import RealDictCursor

# ---------------------------------------------------------
# PROMPTS & OVERLAYS
# ---------------------------------------------------------
from prompts.reflective_brain_prompt import REFLECTIVE_BRAIN_SYSTEM_PROMPT
from prompts.template_engine_prompt import TEMPLATE_ENGINE_SYSTEM_PROMPT

from prompts.overlays.role_overlay import ROLE_OVERLAY
from prompts.overlays.ld_overlay import LD_OVERLAY
from prompts.overlays.training_overlay import TRAINING_OVERLAY

# ---------------------------------------------------------
# REQUEST MODELS
# ---------------------------------------------------------
class ChatRequest(BaseModel):
    message: str
    role: str | None = None
    mode: str | None = "default"
    speed: str | None = "fast"
    ld_lens: bool | None = False

class TemplateRequest(BaseModel):
    templateRequest: str

class TemplateRequestV1(BaseModel):
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
        user_message = req.message

        normalised_role = normalise_role(req.role)
        if normalised_role:
            role_text = ROLE_OVERLAY.get(normalised_role, "")
            if role_text:
                user_message = role_text + "\n\n" + user_message

        if req.ld_lens:
            user_message = LD_OVERLAY + "\n\n" + user_message

        if req.mode == "training":
            user_message = TRAINING_OVERLAY + "\n\n" + user_message

        if req.speed == "slow":
            user_message = (
                "SLOW MODE: Take your time, offer slightly more detail, "
                "but stay clear and grounded.\n\n" + user_message
            )

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
# /generate-template — legacy
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

# ---------------------------------------------------------
# /v1/generate-template — Markdown → HTML
# ---------------------------------------------------------
@app.post("/v1/generate-template")
async def generate_template_v1(req: TemplateRequestV1):
    try:
        raw_markdown = call_model(
            system_prompt=TEMPLATE_ENGINE_SYSTEM_PROMPT,
            user_message=req.templateRequest
        )

        html_output = markdown.markdown(raw_markdown, extensions=["tables"])

        return JSONResponse({"template": html_output})

    except Exception as e:
        logger.error(f"/v1/generate-template error: {e}")
        return JSONResponse(
            {"error": "Something went wrong processing your request."},
            status_code=500
        )

# ============================================================
# AUTHENTICATION MODULE (ADDED AT THE BOTTOM)
# ============================================================

# ------------------------------------------------------------
# Database connection helper
# ------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL")

def get_db():
    conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
    return conn

# ------------------------------------------------------------
# Create users table
# ------------------------------------------------------------
def init_user_table():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'staff',
            created_at TIMESTAMP DEFAULT NOW()
        );
    """)
    conn.commit()
    cur.close()
    conn.close()

init_user_table()

# ------------------------------------------------------------
# Password hashing
# ------------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

# ------------------------------------------------------------
# JWT helpers
# ------------------------------------------------------------
SECRET_KEY = os.getenv("JWT_SECRET", "indicare-secret-key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + datetime.timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def decode_token(token: str):
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

# ------------------------------------------------------------
# Role-based decorator
# ------------------------------------------------------------
def require_role(*allowed_roles):
    def decorator(func):
        async def wrapper(request: Request, *args, **kwargs):
            auth_header = request.headers.get("Authorization")
            if not auth_header or not auth_header.startswith("Bearer "):
                raise HTTPException(status_code=401, detail="Missing or invalid token")

            token = auth_header.split(" ")[1]
            payload = decode_token(token)
            user_role = payload.get("role")

            if user_role not in allowed_roles:
                raise HTTPException(status_code=403, detail="Insufficient permissions")

            request.state.user = payload
            return await func(request, *args, **kwargs)
        return wrapper
    return decorator

# ------------------------------------------------------------
# Login endpoint
# ------------------------------------------------------------
class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str

@app.post("/login", response_model=LoginResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    email = form_data.username
    password = form_data.password

    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM users WHERE email = %s", (email,))
    user = cur.fetchone()
    cur.close()
    conn.close()

    if not user or not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": email, "role": user["role"]})

    return LoginResponse(access_token=token, role=user["role"])

# ------------------------------------------------------------
# Create user endpoint (manager, company, admin)
# ------------------------------------------------------------
class CreateUserRequest(BaseModel):
    email: str
    password: str
    role: str = "staff"

@require_role("manager", "company", "admin")
@app.post("/admin/create-user")
async def create_user(request: Request, body: CreateUserRequest):
    if body.role not in ["staff", "manager", "company", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    hashed = hash_password(body.password)

    conn = get_db()
    cur = conn.cursor()

    try:
        cur.execute(
            "INSERT INTO users (email, password_hash, role) VALUES (%s, %s, %s)",
            (body.email, hashed, body.role)
        )
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Email already exists")
    finally:
        cur.close()
        conn.close()

    return {"message": "User created successfully"}

# ------------------------------------------------------------
# Delete user endpoint (admin only)
# ------------------------------------------------------------
@require_role("admin")
@app.delete("/admin/delete-user/{email}")
async def delete_user(...):
    conn = get_db()
    cur = conn.cursor()

    cur.execute("DELETE FROM users WHERE email = %s", (email,))
    deleted = cur.rowcount
    conn.commit()

    cur.close()
    conn.close()

    if deleted == 0:
        raise HTTPException(status_code=404, detail="User not found")

    return {"message": "User deleted successfully"}

# ============================================================
# END OF FILE
# ============================================================

