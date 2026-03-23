from fastapi import APIRouter, Depends, HTTPException, Header, Query, Request
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor

from db.connection import get_db
from auth.tokens import decode_session_token

router = APIRouter(prefix="/documents", tags=["Document Library"])

SESSION_COOKIE_NAME = "indicare_session"


class CreateLibraryDocumentRequest(BaseModel):
    title: str
    document_type: str | None = "policy"
    input_text: str | None = None
    generated_text: str | None = None
    issue_date: str | None = None
    review_date: str | None = None
    expiry_date: str | None = None
    owner_id: int | None = None
    approval_required: bool = False
    approval_status: str | None = "not_required"
    confidentiality_level: str | None = "standard"


class UpdateLibraryDocumentRequest(BaseModel):
    title: str | None = None
    document_type: str | None = None
    input_text: str | None = None
    generated_text: str | None = None
    issue_date: str | None = None
    review_date: str | None = None
    expiry_date: str | None = None
    owner_id: int | None = None
    approval_required: bool | None = None
    approval_status: str | None = None
    confidentiality_level: str | None = None


def get_current_user_payload(
    request: Request,
    authorization: str | None = Header(default=None),
):
    cookie_token = request.cookies.get(SESSION_COOKIE_NAME)

    token = cookie_token
    if not token and authorization:
        parts = authorization.split(" ", 1)
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1].strip()

    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_session_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    return payload


def get_role_and_home(current_user: dict):
    role = (current_user.get("role") or "").strip().lower()
    home_id = current_user.get("home_id")

    try:
        home_id = int(home_id) if home_id is not None else None
    except (TypeError, ValueError):
        home_id = None

    return role, home_id


def ensure_document_access(conn, document_id: int, current_user: dict):
    role, home_id = get_role_and_home(current_user)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                home_id,
                title,
                document_type,
                input_text,
                generated_text,
                issue_date,
                review_date,
                expiry_date,
                owner_id,
                approval_required,
                approval_status,
                confidentiality_level,
                created_at,
                updated_at
            FROM documents
            WHERE id = %s
            LIMIT 1
            """,
            (document_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Document not found")

    if role in {"admin", "provider_admin"}:
        return row

    if home_id is None or row["home_id"] != home_id:
        raise HTTPException(status_code=403, detail="You do not have access to this document")

    return row


def ensure_manager_or_admin(current_user: dict):
    role, home_id = get_role_and_home(current_user)

    if role not in {"admin", "provider_admin", "manager"}:
        raise HTTPException(status_code=403, detail="Manager or admin access required")

    if role == "manager" and home_id is None:
        raise HTTPException(status_code=403, detail="Manager is not assigned to a home")

    return role, home_id


@router.get("/library")
def list_document_library(
    q: str | None = Query(default=None),
    document_type: str | None = Query(default=None),
    approval_status: str | None = Query(default=None),
    current_user=Depends(get_current_user_payload),
    conn=Depends(get_db),
):
    role, home_id = get_role_and_home(current_user)

    query = """
        SELECT
            d.id,
            d.home_id,
            d.document_type,
            d.title,
            d.input_text,
            d.generated_text,
            d.issue_date,
            d.review_date,
            d.expiry_date,
            d.owner_id,
            d.approval_required,
            d.approval_status,
            d.confidentiality_level,
            d.created_at,
            d.updated_at,
            h.name AS home_name
        FROM documents d
        LEFT JOIN homes h
            ON h.id = d.home_id
        WHERE 1=1
    """
    values = []

    if role not in {"admin", "provider_admin"}:
        if home_id is None:
            return {"ok": True, "documents": []}
        query += " AND d.home_id = %s"
        values.append(home_id)

    if q:
        query += """
            AND (
                LOWER(COALESCE(d.title, '')) LIKE %s
                OR LOWER(COALESCE(d.document_type, '')) LIKE %s
                OR LOWER(COALESCE(d.input_text, '')) LIKE %s
            )
        """
        search = f"%{q.strip().lower()}%"
        values.extend([search, search, search])

    if document_type:
        query += " AND d.document_type = %s"
        values.append(document_type.strip())

    if approval_status:
        query += " AND d.approval_status = %s"
        values.append(approval_status.strip())

    query += " ORDER BY d.updated_at DESC NULLS LAST, d.created_at DESC LIMIT 200"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(values))
        rows = cur.fetchall()

    return {"ok": True, "documents": rows}


@router.get("/library/{document_id}")
def get_document_library_item(
    document_id: int,
    current_user=Depends(get_current_user_payload),
    conn=Depends(get_db),
):
    row = ensure_document_access(conn, document_id, current_user)
    return {"ok": True, "document": row}


@router.post("/library")
def create_library_document(
    payload: CreateLibraryDocumentRequest,
    current_user=Depends(get_current_user_payload),
    conn=Depends(get_db),
):
    role, home_id = ensure_manager_or_admin(current_user)

    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")

    target_home_id = home_id

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO documents (
                user_id,
                home_id,
                document_type,
                input_text,
                generated_text,
                created_at,
                title,
                issue_date,
                review_date,
                expiry_date,
                owner_id,
                approval_required,
                approval_status,
                confidentiality_level,
                updated_at
            )
            VALUES (%s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING
                id,
                home_id,
                document_type,
                title,
                input_text,
                generated_text,
                issue_date,
                review_date,
                expiry_date,
                owner_id,
                approval_required,
                approval_status,
                confidentiality_level,
                created_at,
                updated_at
            """,
            (
                int(current_user.get("sub")),
                target_home_id,
                (payload.document_type or "policy").strip(),
                payload.input_text,
                payload.generated_text,
                payload.title.strip(),
                payload.issue_date,
                payload.review_date,
                payload.expiry_date,
                payload.owner_id,
                payload.approval_required,
                payload.approval_status or "not_required",
                payload.confidentiality_level or "standard",
            ),
        )
        row = cur.fetchone()

    conn.commit()
    return {"ok": True, "document": row}


@router.patch("/library/{document_id}")
def update_library_document(
    document_id: int,
    payload: UpdateLibraryDocumentRequest,
    current_user=Depends(get_current_user_payload),
    conn=Depends(get_db),
):
    ensure_manager_or_admin(current_user)
    ensure_document_access(conn, document_id, current_user)

    fields = []
    values = []

    if payload.title is not None:
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        fields.append("title = %s")
        values.append(title)

    if payload.document_type is not None:
        fields.append("document_type = %s")
        values.append(payload.document_type.strip() or None)

    if payload.input_text is not None:
        fields.append("input_text = %s")
        values.append(payload.input_text)

    if payload.generated_text is not None:
        fields.append("generated_text = %s")
        values.append(payload.generated_text)

    if payload.issue_date is not None:
        fields.append("issue_date = %s")
        values.append(payload.issue_date)

    if payload.review_date is not None:
        fields.append("review_date = %s")
        values.append(payload.review_date)

    if payload.expiry_date is not None:
        fields.append("expiry_date = %s")
        values.append(payload.expiry_date)

    if payload.owner_id is not None:
        fields.append("owner_id = %s")
        values.append(payload.owner_id)

    if payload.approval_required is not None:
        fields.append("approval_required = %s")
        values.append(payload.approval_required)

    if payload.approval_status is not None:
        fields.append("approval_status = %s")
        values.append(payload.approval_status)

    if payload.confidentiality_level is not None:
        fields.append("confidentiality_level = %s")
        values.append(payload.confidentiality_level)

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    fields.append("updated_at = NOW()")
    values.append(document_id)

    query = f"""
        UPDATE documents
        SET {", ".join(fields)}
        WHERE id = %s
        RETURNING
            id,
            home_id,
            document_type,
            title,
            input_text,
            generated_text,
            issue_date,
            review_date,
            expiry_date,
            owner_id,
            approval_required,
            approval_status,
            confidentiality_level,
            created_at,
            updated_at
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(values))
        row = cur.fetchone()

    conn.commit()
    return {"ok": True, "document": row}


@router.delete("/library/{document_id}")
def delete_library_document(
    document_id: int,
    current_user=Depends(get_current_user_payload),
    conn=Depends(get_db),
):
    ensure_manager_or_admin(current_user)
    ensure_document_access(conn, document_id, current_user)

    with conn.cursor() as cur:
        cur.execute("DELETE FROM documents WHERE id = %s", (document_id,))

    conn.commit()
    return {"ok": True, "message": "Document deleted"}
