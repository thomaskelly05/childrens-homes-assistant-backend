from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict

from db.connection import get_db

router = APIRouter(prefix="/young-people", tags=["Young People Keywork"])


# =========================================================
# Helpers
# =========================================================

def now():
    return datetime.utcnow()


def ensure_young_person_exists(cur, young_person_id: int):
    cur.execute("SELECT id FROM young_people WHERE id = %s LIMIT 1", (young_person_id,))
    if not cur.fetchone():
        raise HTTPException(status_code=404, detail="Young person not found")


def normalise_status(value: Optional[str]) -> str:
    v = (value or "").lower()
    if v in ["draft", "submitted", "approved", "returned", "archived"]:
        return v
    return "draft"


def transform(row):
    return {
        "id": row["id"],
        "young_person_id": row["young_person_id"],
        "session_date": row["session_date"],
        "worker_id": row["worker_id"],
        "worker_name": f"{row.get('worker_first_name','')} {row.get('worker_last_name','')}".strip(),
        "topic": row["topic"],
        "purpose": row["purpose"],
        "summary": row["summary"],
        "child_voice": row["child_voice"],
        "reflective_analysis": row["reflective_analysis"],
        "actions_agreed": row["actions_agreed"],
        "next_session_date": row["next_session_date"],
        "status": normalise_status(row.get("status")),
        "archived": row.get("archived", False),
        "manager_review_comment": row.get("manager_review_comment"),
        "submitted_at": row.get("submitted_at"),
        "approved_at": row.get("approved_at"),
        "returned_at": row.get("returned_at"),
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],

        # Shell compatibility
        "title": f"Keywork: {row.get('topic') or 'Session'}",
        "narrative": row.get("summary") or "Keywork session recorded",
        "event_type": "keywork",
        "workflow_status": normalise_status(row.get("status")),
        "requires_manager_review": True,
        "quality_standards": ["positive_relationships", "wishes_and_feelings"],
    }


def select_sql(where):
    return f"""
        SELECT
            k.*,
            u.first_name AS worker_first_name,
            u.last_name AS worker_last_name
        FROM keywork_sessions k
        LEFT JOIN users u ON k.worker_id = u.id
        {where}
    """


def get_one(cur, id):
    cur.execute(select_sql("WHERE k.id = %s LIMIT 1"), (id,))
    row = cur.fetchone()
    if not row:
        raise HTTPException(404, "Keywork session not found")
    return row


# =========================================================
# Models
# =========================================================

class KeyworkCreate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    young_person_id: int
    session_date: str
    worker_id: int | None = None
    topic: str

    purpose: str | None = None
    summary: str | None = None
    child_voice: str | None = None
    reflective_analysis: str | None = None
    actions_agreed: str | None = None
    next_session_date: str | None = None

    status: str | None = "draft"
    archived: bool | None = False


class KeyworkUpdate(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    session_date: str | None = None
    worker_id: int | None = None
    topic: str | None = None
    purpose: str | None = None
    summary: str | None = None
    child_voice: str | None = None
    reflective_analysis: str | None = None
    actions_agreed: str | None = None
    next_session_date: str | None = None

    status: str | None = None
    archived: bool | None = None
    manager_review_comment: str | None = None


class ReviewPayload(BaseModel):
    review_note: str | None = None
    approved_by: int | None = None


# =========================================================
# READ
# =========================================================

@router.get("/{young_person_id}/keywork")
def list_keywork(young_person_id: int, conn=Depends(get_db)):
    with conn.cursor() as cur:
        ensure_young_person_exists(cur, young_person_id)

        cur.execute(select_sql("""
            WHERE k.young_person_id = %s
            AND COALESCE(k.archived, FALSE) = FALSE
            ORDER BY k.session_date DESC
        """), (young_person_id,))

        return {"items": [transform(r) for r in cur.fetchall()]}


@router.get("/keywork/{id}")
def get_keywork(id: int, conn=Depends(get_db)):
    with conn.cursor() as cur:
        return transform(get_one(cur, id))


# =========================================================
# CREATE / UPDATE
# =========================================================

@router.post("/keywork")
def create_keywork(payload: KeyworkCreate, conn=Depends(get_db)):
    now_ = now()

    with conn.cursor() as cur:
        ensure_young_person_exists(cur, payload.young_person_id)

        cur.execute("""
            INSERT INTO keywork_sessions (
                young_person_id, session_date, worker_id, topic,
                purpose, summary, child_voice, reflective_analysis,
                actions_agreed, next_session_date, status, archived,
                created_at, updated_at
            )
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
            RETURNING id
        """, (
            payload.young_person_id,
            payload.session_date,
            payload.worker_id,
            payload.topic,
            payload.purpose,
            payload.summary,
            payload.child_voice,
            payload.reflective_analysis,
            payload.actions_agreed,
            payload.next_session_date,
            normalise_status(payload.status),
            payload.archived,
            now_,
            now_
        ))

        row = cur.fetchone()

    conn.commit()
    return {"id": row["id"]}


@router.put("/keywork/{id}")
def update_keywork(id: int, payload: KeyworkUpdate, conn=Depends(get_db)):
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(400, "No fields")

    data["updated_at"] = now()

    set_parts = []
    values = []

    for k, v in data.items():
        set_parts.append(f"{k} = %s")
        values.append(v)

    values.append(id)

    with conn.cursor() as cur:
        cur.execute(f"""
            UPDATE keywork_sessions
            SET {", ".join(set_parts)}
            WHERE id = %s
            RETURNING id
        """, values)

        if not cur.fetchone():
            raise HTTPException(404, "Not found")

    conn.commit()
    return {"ok": True}


# =========================================================
# WORKFLOW
# =========================================================

@router.post("/keywork/{id}/submit")
def submit(id: int, conn=Depends(get_db)):
    with conn.cursor() as cur:
        get_one(cur, id)

        cur.execute("""
            UPDATE keywork_sessions
            SET status='submitted', submitted_at=%s
            WHERE id=%s
        """, (now(), id))

    conn.commit()
    return {"status": "submitted"}


@router.post("/keywork/{id}/approve")
def approve(id: int, payload: ReviewPayload, conn=Depends(get_db)):
    with conn.cursor() as cur:
        get_one(cur, id)

        cur.execute("""
            UPDATE keywork_sessions
            SET status='approved',
                manager_review_comment=%s,
                approved_at=%s
            WHERE id=%s
        """, (payload.review_note, now(), id))

    conn.commit()
    return {"status": "approved"}


@router.post("/keywork/{id}/return")
def return_item(id: int, payload: ReviewPayload, conn=Depends(get_db)):
    with conn.cursor() as cur:
        get_one(cur, id)

        cur.execute("""
            UPDATE keywork_sessions
            SET status='returned',
                manager_review_comment=%s,
                returned_at=%s
            WHERE id=%s
        """, (payload.review_note, now(), id))

    conn.commit()
    return {"status": "returned"}


@router.post("/keywork/{id}/archive")
def archive(id: int, conn=Depends(get_db)):
    with conn.cursor() as cur:
        get_one(cur, id)

        cur.execute("""
            UPDATE keywork_sessions
            SET archived=TRUE, status='archived'
            WHERE id=%s
        """, (id,))

    conn.commit()
    return {"status": "archived"}
