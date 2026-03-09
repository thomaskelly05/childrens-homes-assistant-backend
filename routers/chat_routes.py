from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse
from psycopg2.extras import RealDictCursor

from db.connection import get_db
from auth.tokens import decode_session_token

import asyncio

router = APIRouter(prefix="/chat", tags=["Chat"])


# ------------------------------
# GET CONVERSATIONS
# ------------------------------

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


# ------------------------------
# SEARCH
# ------------------------------

@router.get("/search")
def search(q:str,request:Request,conn=Depends(get_db)):

    token=request.cookies.get("access_token")
    payload=decode_session_token(token)

    user_id=payload["sub"]

    with conn.cursor(cursor_factory=RealDictCursor) as cur:

        cur.execute(
            """
            SELECT id,title
            FROM conversations
            WHERE user_id=%s
            AND title ILIKE %s
            """,
            (user_id,f"%{q}%")
        )

        rows=cur.fetchall()

    return rows


# ------------------------------
# LOAD MESSAGES
# ------------------------------

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


# ------------------------------
# RENAME
# ------------------------------

@router.post("/rename/{cid}")
async def rename(cid:int,request:Request,conn=Depends(get_db)):

    body=await request.json()

    title=body.get("title")

    with conn.cursor() as cur:

        cur.execute(
            """
            UPDATE conversations
            SET title=%s
            WHERE id=%s
            """,
            (title,cid)
        )

    conn.commit()

    return {"ok":True}


# ------------------------------
# DELETE
# ------------------------------

@router.delete("/delete/{cid}")
def delete(cid:int,conn=Depends(get_db)):

    with conn.cursor() as cur:

        cur.execute("DELETE FROM messages WHERE conversation_id=%s",(cid,))
        cur.execute("DELETE FROM conversations WHERE id=%s",(cid,))

    conn.commit()

    return {"ok":True}


# ------------------------------
# STREAM CHAT
# ------------------------------

async def fake_ai_stream(message):

    response=f"IndiCare AI response for: {message}"

    for token in response.split(" "):

        yield token+" "

        await asyncio.sleep(0.04)


@router.post("/")
async def chat(request:Request,conn=Depends(get_db)):

    body=await request.json()

    message=body["message"]
    cid=body.get("conversation_id")

    token=request.cookies.get("access_token")
    payload=decode_session_token(token)

    user_id=payload["sub"]

    # create conversation

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

            cid=cur.fetchone()["id"]

        conn.commit()

    # save user msg

    with conn.cursor() as cur:

        cur.execute(
            """
            INSERT INTO messages(conversation_id,role,message)
            VALUES(%s,'user',%s)
            """,
            (cid,message)
        )

    conn.commit()


    async def stream():

        ai=""

        async for token in fake_ai_stream(message):

            ai+=token
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
