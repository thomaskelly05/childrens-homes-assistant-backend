from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor
from pydantic import BaseModel

from db.connection import get_db
from auth.tokens import decode_session_token

import asyncio


router = APIRouter(prefix="/chat", tags=["Chat"])


# --------------------------------------------------
# AUTO CONVERSATION TITLE
# --------------------------------------------------

def generate_title(message: str):

    message = message.strip()

    if len(message) > 60:
        message = message[:60]

    return message


# --------------------------------------------------
# GET CONVERSATIONS
# --------------------------------------------------

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


# --------------------------------------------------
# LOAD CONVERSATION
# --------------------------------------------------

@router.get("/conversations/{cid}")
def load(cid: int, conn=Depends(get_db)):

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

        rows = cur.fetchall()

    return rows


# --------------------------------------------------
# INCIDENT REPORT TEMPLATE
# --------------------------------------------------

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
- Review behaviour support plan
"""


# --------------------------------------------------
# RISK ASSESSMENT TEMPLATE
# --------------------------------------------------

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
Risk to be monitored and reviewed regularly.
"""


# --------------------------------------------------
# SAFEGUARDING ADVICE TEMPLATE
# --------------------------------------------------

def safeguarding_template(message):

    return f"""
## Safeguarding Advice

### Concern
{message}

### Immediate Actions
- Ensure young person's safety
- Inform senior staff
- Record safeguarding concern

### Next Steps
- Follow safeguarding policy
- Consider referral to safeguarding lead
- Document all actions taken
"""


# --------------------------------------------------
# STAFF REFLECTION TEMPLATE
# --------------------------------------------------

def reflection_template(message):

    return f"""
## Staff Reflection

### Situation
{message}

### What Happened
Staff responded to the situation and attempted to de-escalate behaviour.

### Reflection
Consider what strategies were effective and what could be improved.

### Learning
Identify any support, training, or adjustments that may help in future situations.
"""


# --------------------------------------------------
# AI RESPONSE STREAM
# --------------------------------------------------

async def generate_stream(message):

    lower = message.lower()

    if "incident" in lower:
        response = incident_template(message)

    elif "risk" in lower:
        response = risk_template(message)

    elif "safeguarding" in lower:
        response = safeguarding_template(message)

    elif "reflect" in lower or "reflection" in lower:
        response = reflection_template(message)

    else:
        response = f"""
## IndiCare AI Response

{message}

IndiCare can assist with safeguarding guidance, reports, and staff reflections.
"""

    for token in response.split(" "):

        yield token + " "

        await asyncio.sleep(0.03)


# --------------------------------------------------
# CHAT STREAM
# --------------------------------------------------

@router.post("/")
async def chat(request: Request, conn=Depends(get_db)):

    body = await request.json()

    message = body["message"]
    cid = body.get("conversation_id")

    token = request.cookies.get("access_token")
    payload = decode_session_token(token)

    user_id = payload["sub"]


    # CREATE CONVERSATION

    if not cid:

        title = generate_title(message)

        with conn.cursor(cursor_factory=RealDictCursor) as cur:

            cur.execute(
                """
                INSERT INTO conversations(user_id,title)
                VALUES(%s,%s)
                RETURNING id
                """,
                (user_id,title)
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


    # STREAM AI RESPONSE

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

    return StreamingResponse(stream(), media_type="text/plain")


# --------------------------------------------------
# RENAME CONVERSATION
# --------------------------------------------------

class RenameConversation(BaseModel):
    title: str


@router.post("/conversations/{conversation_id}/rename")
def rename_conversation(conversation_id: int, payload: RenameConversation, conn=Depends(get_db)):

    with conn.cursor() as cur:

        cur.execute(
            """
            UPDATE conversations
            SET title=%s
            WHERE id=%s
            """,
            (payload.title, conversation_id)
        )

        conn.commit()

    return {"status": "ok"}


# --------------------------------------------------
# DELETE CONVERSATION
# --------------------------------------------------

@router.delete("/conversations/{conversation_id}")
def delete_conversation(conversation_id: int, conn=Depends(get_db)):

    with conn.cursor() as cur:

        cur.execute(
            """
            DELETE FROM conversations
            WHERE id=%s
            """,
            (conversation_id,)
        )

        conn.commit()

    return {"status": "deleted"}
