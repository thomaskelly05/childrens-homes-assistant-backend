from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor

from db.connection import get_db
from auth.tokens import decode_session_token

import asyncio

router = APIRouter(prefix="/chat", tags=["Chat"])


# -----------------------------
# GET CONVERSATIONS
# -----------------------------

@router.get("/conversations")
def conversations(request: Request, conn=Depends(get_db)):

    token = request.cookies.get("access_token")
    payload = decode_session_token(token)

    user_id = payload["sub"]

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT id,title
            FROM conversations
            WHERE user_id=%s
            ORDER BY created_at DESC
            """,
            (user_id,)
        )

        rows = cur.fetchall()

    return rows


# -----------------------------
# LOAD CONVERSATION
# -----------------------------

@router.get("/conversations/{cid}")
def load(cid:int,conn=Depends(get_db)):

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT role,message
            FROM messages
            WHERE conversation_id=%s
            ORDER BY created_at
            """,
            (cid,)
        )

        rows=cur.fetchall()

    return rows


# -----------------------------
# INCIDENT REPORT TEMPLATE
# -----------------------------

def incident_template(message):

    return f"""
## Incident Report

**Date:**  
**Time:**  
**Young Person:**  
**Staff Involved:**  

### Description of Incident
{message}

### Actions Taken
- Staff intervened appropriately
- Situation de-escalated

### Outcome
Incident resolved safely.

### Follow-up Required
- Record in safeguarding log
- Review behaviour support plan if needed
"""


# -----------------------------
# RISK TEMPLATE
# -----------------------------

def risk_template(message):

    return f"""
## Risk Assessment

### Risk Identified
{message}

### Potential Harm
Young person or others may experience harm.

### Control Measures
- Staff supervision
- Behaviour support strategies
- Environmental adjustments

### Review
Risk to be monitored by staff team.
"""


# -----------------------------
# AI RESPONSE STREAM
# -----------------------------

async def generate_stream(message):

    lower = message.lower()

    if "incident" in lower:

        response = incident_template(message)

    elif "risk" in lower:

        response = risk_template(message)

    else:

        response = f"IndiCare AI Response:\n\n{message}"

    for token in response.split(" "):

        yield token + " "

        await asyncio.sleep(0.03)


# -----------------------------
# CHAT STREAM
# -----------------------------

@router.post("/")
async def chat(request:Request,conn=Depends(get_db)):

    body = await request.json()

    message = body["message"]
    cid = body.get("conversation_id")

    token = request.cookies.get("access_token")
    payload = decode_session_token(token)

    user_id = payload["sub"]


    # CREATE CONVERSATION

    if not cid:

        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                INSERT INTO conversations(user_id,title)
                VALUES(%s,%s)
                RETURNING id
                """,
                (user_id,message[:40])
            )

            cid = cur.fetchone()["id"]

        conn.commit()


    # SAVE USER MESSAGE

    with conn.cursor() as cur:

        cur.execute(
            """
            INSERT INTO messages(conversation_id,role,message)
            VALUES(%s,'user',%s)
            """,
            (cid,message)
        )

    conn.commit()


    # STREAM AI

    async def stream():

        ai=""

        async for token in generate_stream(message):

            ai += token
            yield token

        with conn.cursor() as cur:

            cur.execute(
                """
                INSERT INTO messages(conversation_id,role,message)
                VALUES(%s,'assistant',%s)
                """,
                (cid,ai)
            )

        conn.commit()

    return StreamingResponse(stream(),media_type="text/plain")
