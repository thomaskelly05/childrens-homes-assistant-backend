# -*- coding: utf-8 -*-
import os
import logging
import datetime

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from fastapi import Header
from pydantic import BaseModel
from openai import OpenAI
import markdown

import bcrypt
import jwt
import psycopg2
from psycopg2.extras import RealDictCursor

from fastapi import FastAPI

app = FastAPI()

# -------------------------------
# Render health check endpoint
# -------------------------------
@app.get("/")
def root():
    return {"status": "ok", "service": "IndiCare backend running"}

@app.head("/")
def root_head():
    return {}

# ---------------------------------------------------------
# CONFIG
# ---------------------------------------------------------
SECRET_KEY = os.getenv("JWT_SECRET", "change-me-in-prod")
ALGORITHM = "HS256"

logger = logging.getLogger("uvicorn.error")

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
# PROMPTS & OVERLAYS
# ---------------------------------------------------------
from prompts.reflective_brain_prompt import REFLECTIVE_BRAIN_SYSTEM_PROMPT
from prompts.template_engine_prompt import TEMPLATE_ENGINE_SYSTEM_PROMPT

from prompts.overlays.role_overlay import ROLE_OVERLAY
from prompts.overlays.ld_overlay import LD_OVERLAY
from prompts.overlays.training_overlay import TRAINING_OVERLAY

# ---------------------------------------------------------
# DB
# ---------------------------------------------------------
def get_db():
    url = os.getenv("DATABASE_URL")
    if not url:
        raise Exception("DATABASE_URL is not set")
    return psycopg2.connect(url, cursor_factory=RealDictCursor)
    
# ---------------------------------------------------------
# AUTH HELPERS
# ---------------------------------------------------------
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_access_token(data: dict, expires_delta: datetime.timedelta | None = None) -> str:
    to_encode = data.copy()
    expire = datetime.datetime.utcnow() + (expires_delta or datetime.timedelta(days=7))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(authorization: str = Header(None)):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    token = authorization.replace("Bearer ", "").strip()

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def require_role(*roles):
    def dependency(user=Depends(get_current_user)):
        if user.get("role") not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return dependency

# ---------------------------------------------------------
# OPENAI CLIENT
# ---------------------------------------------------------
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def call_model(system_prompt: str, user_message: str) -> str:
    completion = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ],
        temperature=0.4,
        max_tokens=900,
    )
    return completion.choices[0].message.content

# ---------------------------------------------------------
# MODELS
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


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class CreateUserRequest(BaseModel):
    email: str
    password: str
    role: str = "staff"

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
# HEALTH + SELF
# ---------------------------------------------------------
@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/me")
async def me(user=Depends(get_current_user)):
    return {"email": user.get("sub"), "role": user.get("role")}

# ---------------------------------------------------------
# AUTH ENDPOINTS
# ---------------------------------------------------------

# Explicit OPTIONS handler for CORS preflight
@app.options("/login")
async def login_options():
    return {}

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

    # SAFE CHECKS — must be INSIDE the function
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": user["email"], "role": user["role"]})
    return LoginResponse(access_token=token, role=user["role"])


# ---------------------------------------------------------
# CREATE USER (ADMIN / MANAGER)
# ---------------------------------------------------------
@app.post("/admin/create-user")
async def create_user(
    body: CreateUserRequest,
    user=Depends(require_role("manager", "company", "admin")),
):
    if body.role not in ["staff", "manager", "company", "admin"]:
        raise HTTPException(status_code=400, detail="Invalid role")

    hashed_pw = hash_password(body.password)

    conn = get_db()
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
    finally:
        cur.close()
        conn.close()

    return {"message": "User created successfully"}


# ---------------------------------------------------------
# DELETE USER (ADMIN ONLY)
# ---------------------------------------------------------
@app.delete("/admin/delete-user/{email}")
async def delete_user(
    email: str,
    user=Depends(require_role("admin")),
):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM users WHERE email = %s", (email,))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "User deleted successfully"}

# ---------------------------------------------------------
# HOMES
# ---------------------------------------------------------
@app.post("/admin/create-home")
async def create_home(
    body: dict,
    user=Depends(require_role("manager", "company", "admin")),
):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(status_code=400, detail="Home name is required")

    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO homes (name) VALUES (%s) RETURNING id", (name,))
        home_id = cur.fetchone()["id"]
        conn.commit()
    except psycopg2.errors.UniqueViolation:
        conn.rollback()
        raise HTTPException(status_code=400, detail="Home name already exists")
    finally:
        cur.close()
        conn.close()

    return {"id": home_id, "name": name}


@app.get("/admin/list-homes")
async def list_homes(user=Depends(require_role("manager", "company", "admin"))):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT id, name FROM homes ORDER BY id ASC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"homes": rows}


@app.delete("/admin/delete-home/{home_id}")
async def delete_home(
    home_id: int,
    user=Depends(require_role("admin")),
):
    conn = get_db()
    cur = conn.cursor()
    # Remove assignments first
    cur.execute("DELETE FROM home_assignments WHERE home_id = %s", (home_id,))
    cur.execute("DELETE FROM homes WHERE id = %s", (home_id,))
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "Home deleted successfully"}


# ---------------------------------------------------------
# HOME ASSIGNMENTS
# ---------------------------------------------------------
@app.post("/admin/assign-user-to-home")
async def assign_user_to_home(
    body: dict,
    user=Depends(require_role("manager", "company", "admin")),
):
    email = body.get("email", "").strip()
    home_id = body.get("home_id")

    if not email or not home_id:
        raise HTTPException(status_code=400, detail="email and home_id are required")

    conn = get_db()
    cur = conn.cursor()
    try:
        # Ensure user exists
        cur.execute("SELECT email FROM users WHERE email = %s", (email,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="User not found")

        # Ensure home exists
        cur.execute("SELECT id FROM homes WHERE id = %s", (home_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Home not found")

        cur.execute(
            "INSERT INTO home_assignments (home_id, user_email) VALUES (%s, %s) ON CONFLICT DO NOTHING",
            (home_id, email),
        )
        conn.commit()
    finally:
        cur.close()
        conn.close()

    return {"message": "User assigned to home"}


@app.delete("/admin/remove-user-from-home")
async def remove_user_from_home(
    body: dict,
    user=Depends(require_role("manager", "company", "admin")),
):
    email = body.get("email", "").strip()
    home_id = body.get("home_id")

    if not email or not home_id:
        raise HTTPException(status_code=400, detail="email and home_id are required")

    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        "DELETE FROM home_assignments WHERE home_id = %s AND user_email = %s",
        (home_id, email),
    )
    conn.commit()
    cur.close()
    conn.close()
    return {"message": "User removed from home"}


@app.get("/admin/home-users/{home_id}")
async def home_users(
    home_id: int,
    user=Depends(require_role("manager", "company", "admin")),
):
    conn = get_db()
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
    cur.close()
    conn.close()
    return {"users": rows}


# ---------------------------------------------------------
# LIST USERS (for dashboard)
# ---------------------------------------------------------
@app.get("/admin/list-users")
async def list_users(user=Depends(require_role("manager", "company", "admin"))):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT email, role FROM users ORDER BY email ASC")
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"users": rows}


# ---------------------------------------------------------
# LOGS & ANALYTICS (assuming chat_logs table)
# ---------------------------------------------------------
@app.get("/admin/home-chats/{home_id}")
async def home_chats(
    home_id: int,
    user=Depends(require_role("manager", "company", "admin")),
):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT email, message, timestamp
        FROM chat_logs
        WHERE home_id = %s
        ORDER BY timestamp DESC
        LIMIT 200
        """,
        (home_id,),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"logs": rows}


@app.get("/admin/user-chats/{email}")
async def user_chats(
    email: str,
    user=Depends(require_role("manager", "company", "admin")),
):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT home_id, message, timestamp
        FROM chat_logs
        WHERE email = %s
        ORDER BY timestamp DESC
        LIMIT 200
        """,
        (email,),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return {"logs": rows}


@app.get("/admin/home-usage/{home_id}")
async def home_usage(
    home_id: int,
    user=Depends(require_role("manager", "company", "admin")),
):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
          COUNT(*) AS total_messages,
          COUNT(DISTINCT email) AS unique_users
        FROM chat_logs
        WHERE home_id = %s
        """,
        (home_id,),
    )
    summary = cur.fetchone()
    cur.execute(
        """
        SELECT email, COUNT(*) AS messages
        FROM chat_logs
        WHERE home_id = %s
        GROUP BY email
        ORDER BY messages DESC
        """,
        (home_id,),
    )
    by_user = cur.fetchall()
    cur.close()
    conn.close()
    return {"summary": summary, "by_user": by_user}


@app.get("/admin/user-usage/{email}")
async def user_usage(
    email: str,
    user=Depends(require_role("manager", "company", "admin")),
):
    conn = get_db()
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
          COUNT(*) AS total_messages,
          COUNT(DISTINCT home_id) AS homes_used
        FROM chat_logs
        WHERE email = %s
        """,
        (email,),
    )
    summary = cur.fetchone()
    cur.execute(
        """
        SELECT home_id, COUNT(*) AS messages
        FROM chat_logs
        WHERE email = %s
        GROUP BY home_id
        ORDER BY messages DESC
        """,
        (email,),
    )
    by_home = cur.fetchall()
    cur.close()
    conn.close()
    return {"summary": summary, "by_home": by_home}
# ---------------------------------------------------------
# /chat — STREAMING, ROLE‑AWARE, AUTH‑PROTECTED + LOGGING
# ---------------------------------------------------------
@app.post("/chat")
async def chat_endpoint(req: ChatRequest, user=Depends(get_current_user)):
    try:
        user_message = req.message

        # Use explicit role if passed, otherwise the user's stored role
        effective_role = req.role or user.get("role")
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

        # We'll capture the full response text as we stream, for logging
        def stream_and_log():
            full_response = []
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
                delta = chunk.choices[0].delta
                if delta and delta.content:
                    full_response.append(delta.content)
                    yield delta.content

            # After streaming completes, log to DB
            try:
                conn = get_db()
                cur = conn.cursor()
                cur.execute(
                    """
                    INSERT INTO chat_logs (user_id, message, response)
                    VALUES (
                        (SELECT id FROM users WHERE email = %s),
                        %s,
                        %s
                    )
                    """,
                    (user.get("sub"), user_message, "".join(full_response)),
                )
                conn.commit()
                cur.close()
                conn.close()
            except Exception as log_err:
                logger.error(f"Failed to log chat: {log_err}")

        return StreamingResponse(stream_and_log(), media_type="text/plain")

    except Exception as e:
        logger.error(f"/chat error: {e}")
        return JSONResponse(
            {"error": "Something went wrong processing your request."},
            status_code=500,
        )

# ---------------------------------------------------------
# TEMPLATE ENDPOINTS (AUTH‑PROTECTED + LOGGING)
# ---------------------------------------------------------
@app.post("/generate-template")
async def generate_template_endpoint(
    req: TemplateRequest,
    user=Depends(get_current_user),
):
    try:
        raw_markdown = call_model(
            system_prompt=TEMPLATE_ENGINE_SYSTEM_PROMPT,
            user_message=req.templateRequest,
        )

        # Log template generation
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO template_logs (user_id, input_markdown, output_html)
                VALUES (
                    (SELECT id FROM users WHERE email = %s),
                    %s,
                    %s
                )
                """,
                (user.get("sub"), req.templateRequest, raw_markdown),
            )
            conn.commit()
            cur.close()
            conn.close()
        except Exception as log_err:
            logger.error(f"Failed to log template: {log_err}")

        return JSONResponse({"template": raw_markdown})
    except Exception as e:
        logger.error(f"/generate-template error: {e}")
        return JSONResponse(
            {"error": "Something went wrong processing your request."},
            status_code=500,
        )


@app.post("/v1/generate-template")
async def generate_template_v1(
    req: TemplateRequestV1,
    user=Depends(get_current_user),
):
    try:
        raw_markdown = call_model(
            system_prompt=TEMPLATE_ENGINE_SYSTEM_PROMPT,
            user_message=req.templateRequest,
        )
        html_output = markdown.markdown(raw_markdown, extensions=["tables"])

        # Log template generation
        try:
            conn = get_db()
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO template_logs (user_id, input_markdown, output_html)
                VALUES (
                    (SELECT id FROM users WHERE email = %s),
                    %s,
                    %s
                )
                """,
                (user.get("sub"), req.templateRequest, html_output),
            )
            conn.commit()
            cur.close()
            conn.close()
        except Exception as log_err:
            logger.error(f"Failed to log template v1: {log_err}")

        return JSONResponse({"template": html_output})
    except Exception as e:
        logger.error(f"/v1/generate-template error: {e}")
        return JSONResponse(
            {"error": "Something went wrong processing your request."},
            status_code=500,
        )

# ---------------------------------------------------------
# OPTIONAL: SIMPLE DASHBOARD ENDPOINTS
# ---------------------------------------------------------
@app.get("/me/chats")
async def my_chats(user=Depends(get_current_user)):
    try:
        conn = get_db()
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
            (user.get("sub"),),
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {"chats": rows}
    except Exception as e:
        logger.error(f"/me/chats error: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch chats")


@app.get("/me/templates")
async def my_templates(user=Depends(get_current_user)):
    try:
        conn = get_db()
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
            (user.get("sub"),),
        )
        rows = cur.fetchall()
        cur.close()
        conn.close()
        return {"templates": rows}
    except Exception as e:
        logger.error(f"/me/templates error: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch templates")




