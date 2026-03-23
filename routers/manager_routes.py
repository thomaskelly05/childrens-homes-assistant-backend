import json
import logging

import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr
from psycopg2 import IntegrityError, OperationalError
from psycopg2.extras import RealDictCursor

from auth.current_user import get_current_user
from db.connection import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/manager", tags=["Manager"])

ALLOWED_MANAGER_ROLES = {"manager"}
MANAGEABLE_USER_ROLES = {"staff", "manager"}


class CreateManagerUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str = "staff"
    is_active: bool = True


class UpdateManagerUserRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    role: str | None = None
    is_active: bool | None = None
    archived: bool | None = None


class ResetPasswordRequest(BaseModel):
    password: str


class UpdateManagerHomeRequest(BaseModel):
    name: str | None = None
    address: str | None = None
    postcode: str | None = None
    region: str | None = None
    local_authority: str | None = None
    ofsted_urn: str | None = None
    geofence_radius_m: int | None = None


class CreateManagerDocumentRequest(BaseModel):
    title: str
    document_type: str = "home_document"
    input_text: str | None = None
    issue_date: str | None = None
    review_date: str | None = None
    expiry_date: str | None = None
    owner_id: int | None = None
    approval_status: str = "pending"
    confidentiality_level: str = "standard"


class UpdateManagerDocumentRequest(BaseModel):
    title: str | None = None
    document_type: str | None = None
    input_text: str | None = None
    issue_date: str | None = None
    review_date: str | None = None
    expiry_date: str | None = None
    owner_id: int | None = None
    approval_status: str | None = None
    confidentiality_level: str | None = None


def get_current_manager(current_user=Depends(get_current_user)):
    if not isinstance(current_user, dict):
        raise HTTPException(status_code=401, detail="Invalid user session")

    role = str(current_user.get("role") or "").strip().lower()
    home_id = current_user.get("home_id")

    if role not in ALLOWED_MANAGER_ROLES:
        raise HTTPException(status_code=403, detail="Manager access required")

    if not home_id:
        raise HTTPException(status_code=400, detail="Manager is not assigned to a home")

    return current_user


def parse_user_id(user: dict) -> int | None:
    try:
        return int(user.get("user_id")) if user.get("user_id") is not None else None
    except (TypeError, ValueError):
        return None


def normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def normalise_manageable_role(role: str) -> str:
    value = role.strip().lower()
    if value not in MANAGEABLE_USER_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Managers can assign: {', '.join(sorted(MANAGEABLE_USER_ROLES))}",
        )
    return value


def log_manager_action(
    conn,
    manager_user_id: int | None,
    action: str,
    target_type: str,
    target_id: int | None,
    details: dict | None = None,
):
    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO admin_audit_log (
                admin_user_id,
                action,
                target_type,
                target_id,
                details,
                created_at
            )
            VALUES (%s, %s, %s, %s, %s::jsonb, NOW())
            """,
            (
                manager_user_id,
                action,
                target_type,
                target_id,
                json.dumps(details) if details is not None else None,
            ),
        )


def ensure_same_home_user(conn, user_id: int, home_id: int):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT id, role, home_id, email, first_name, last_name, is_active, archived
            FROM users
            WHERE id = %s AND home_id = %s
            LIMIT 1
            """,
            (user_id, home_id),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found in your home")

    return row


def ensure_same_home_document(conn, document_id: int, home_id: int):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT *
            FROM documents
            WHERE id = %s AND home_id = %s
            LIMIT 1
            """,
            (document_id, home_id),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Document not found in your home")

    return row


@router.get("/overview")
def manager_overview(
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    home_id = int(manager["home_id"])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                h.id,
                h.name,
                h.address,
                h.postcode,
                h.region,
                h.local_authority,
                h.ofsted_urn,
                h.geofence_radius_m,
                h.created_at,
                h.updated_at
            FROM homes h
            WHERE h.id = %s
            LIMIT 1
            """,
            (home_id,),
        )
        home = cur.fetchone()

        cur.execute(
            """
            SELECT COUNT(*) AS total_users
            FROM users
            WHERE home_id = %s AND COALESCE(archived, false) = false
            """,
            (home_id,),
        )
        users_total = cur.fetchone()

        cur.execute(
            """
            SELECT COUNT(*) AS total_documents
            FROM documents
            WHERE home_id = %s
            """,
            (home_id,),
        )
        docs_total = cur.fetchone()

    return {
        "ok": True,
        "home": home,
        "totals": {
            "users": users_total["total_users"] if users_total else 0,
            "documents": docs_total["total_documents"] if docs_total else 0,
        },
    }


@router.get("/users")
def list_manager_users(
    q: str | None = Query(default=None),
    archived: bool | None = Query(default=None),
    active: bool | None = Query(default=None),
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    home_id = int(manager["home_id"])

    query = """
        SELECT
            id,
            first_name,
            last_name,
            email,
            role,
            home_id,
            is_active,
            archived,
            created_at,
            updated_at
        FROM users
        WHERE home_id = %s
    """
    values = [home_id]

    if q:
        query += """
            AND (
                LOWER(first_name) LIKE %s
                OR LOWER(last_name) LIKE %s
                OR LOWER(email) LIKE %s
            )
        """
        search = f"%{q.strip().lower()}%"
        values.extend([search, search, search])

    if archived is not None:
        query += " AND archived = %s"
        values.append(archived)

    if active is not None:
        query += " AND is_active = %s"
        values.append(active)

    query += " ORDER BY created_at DESC"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(values))
        rows = cur.fetchall()

    return {"ok": True, "users": rows}


@router.post("/users")
def create_manager_user(
    payload: CreateManagerUserRequest,
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    manager_user_id = parse_user_id(manager)
    home_id = int(manager["home_id"])

    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    email = str(payload.email).strip().lower()
    password = payload.password.strip()
    role = normalise_manageable_role(payload.role)

    if not first_name or not last_name or not email or not password:
        raise HTTPException(status_code=400, detail="All user fields are required")

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM users WHERE LOWER(email) = %s LIMIT 1", (email,))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already exists")

            password_hash = bcrypt.hashpw(
                password.encode("utf-8"),
                bcrypt.gensalt(),
            ).decode("utf-8")

            cur.execute(
                """
                INSERT INTO users (
                    first_name,
                    last_name,
                    email,
                    password_hash,
                    role,
                    home_id,
                    is_active,
                    archived,
                    created_at,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, false, NOW(), NOW())
                RETURNING
                    id,
                    first_name,
                    last_name,
                    email,
                    role,
                    home_id,
                    is_active,
                    archived,
                    created_at,
                    updated_at
                """,
                (
                    first_name,
                    last_name,
                    email,
                    password_hash,
                    role,
                    home_id,
                    payload.is_active,
                ),
            )
            user = cur.fetchone()

        log_manager_action(
            conn,
            manager_user_id,
            "manager_create_user",
            "user",
            user["id"],
            {"email": user["email"], "role": user["role"], "home_id": home_id},
        )

        return {"ok": True, "user": user}

    except HTTPException:
        raise
    except IntegrityError:
        logger.exception("Integrity error in create_manager_user")
        raise HTTPException(status_code=400, detail="Unable to create user")
    except OperationalError:
        logger.exception("Database error in create_manager_user")
        raise HTTPException(status_code=500, detail="Database unavailable")


@router.patch("/users/{user_id}")
def update_manager_user(
    user_id: int,
    payload: UpdateManagerUserRequest,
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    manager_user_id = parse_user_id(manager)
    home_id = int(manager["home_id"])

    existing_user = ensure_same_home_user(conn, user_id, home_id)

    fields: list[str] = []
    values: list = []

    if payload.first_name is not None:
        first_name = payload.first_name.strip()
        if not first_name:
            raise HTTPException(status_code=400, detail="First name cannot be empty")
        fields.append("first_name = %s")
        values.append(first_name)

    if payload.last_name is not None:
        last_name = payload.last_name.strip()
        if not last_name:
            raise HTTPException(status_code=400, detail="Last name cannot be empty")
        fields.append("last_name = %s")
        values.append(last_name)

    if payload.email is not None:
        new_email = str(payload.email).strip().lower()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id FROM users WHERE LOWER(email) = %s AND id != %s LIMIT 1",
                (new_email, user_id),
            )
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Email already exists")
        fields.append("email = %s")
        values.append(new_email)

    if payload.role is not None:
        new_role = normalise_manageable_role(payload.role)
        fields.append("role = %s")
        values.append(new_role)

    if payload.is_active is not None:
        fields.append("is_active = %s")
        values.append(payload.is_active)

    if payload.archived is not None:
        fields.append("archived = %s")
        values.append(payload.archived)

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    fields.append("updated_at = NOW()")
    values.append(user_id)

    query = f"""
        UPDATE users
        SET {", ".join(fields)}
        WHERE id = %s AND home_id = %s
        RETURNING
            id,
            first_name,
            last_name,
            email,
            role,
            home_id,
            is_active,
            archived,
            created_at,
            updated_at
    """
    values.append(home_id)

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(values))
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    log_manager_action(
        conn,
        manager_user_id,
        "manager_update_user",
        "user",
        user_id,
        {"email": user["email"], "previous_email": existing_user["email"]},
    )

    return {"ok": True, "user": user}


@router.post("/users/{user_id}/reset-password")
def reset_manager_user_password(
    user_id: int,
    payload: ResetPasswordRequest,
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    manager_user_id = parse_user_id(manager)
    home_id = int(manager["home_id"])

    target_user = ensure_same_home_user(conn, user_id, home_id)

    password = payload.password.strip()
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    password_hash = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt(),
    ).decode("utf-8")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE users
            SET
                password_hash = %s,
                password_reset_expiry = NULL,
                updated_at = NOW()
            WHERE id = %s AND home_id = %s
            RETURNING id, email, first_name, last_name
            """,
            (password_hash, user_id, home_id),
        )
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    log_manager_action(
        conn,
        manager_user_id,
        "manager_reset_password",
        "user",
        user_id,
        {"email": target_user["email"]},
    )

    return {"ok": True, "message": "Password reset", "user": user}


@router.get("/home")
def get_manager_home(
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    home_id = int(manager["home_id"])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                id,
                name,
                address,
                postcode,
                region,
                local_authority,
                ofsted_urn,
                provider_id,
                registered_manager_id,
                latitude,
                longitude,
                geofence_radius_m,
                archived,
                created_at,
                updated_at
            FROM homes
            WHERE id = %s
            LIMIT 1
            """,
            (home_id,),
        )
        home = cur.fetchone()

    if not home:
        raise HTTPException(status_code=404, detail="Home not found")

    return {"ok": True, "home": home}


@router.patch("/home")
def update_manager_home(
    payload: UpdateManagerHomeRequest,
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    manager_user_id = parse_user_id(manager)
    home_id = int(manager["home_id"])

    fields: list[str] = []
    values: list = []

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Home name cannot be empty")
        fields.append("name = %s")
        values.append(name)

    if payload.address is not None:
        fields.append("address = %s")
        values.append(normalise_optional_text(payload.address))

    if payload.postcode is not None:
        fields.append("postcode = %s")
        values.append(normalise_optional_text(payload.postcode))

    if payload.region is not None:
        fields.append("region = %s")
        values.append(normalise_optional_text(payload.region))

    if payload.local_authority is not None:
        fields.append("local_authority = %s")
        values.append(normalise_optional_text(payload.local_authority))

    if payload.ofsted_urn is not None:
        fields.append("ofsted_urn = %s")
        values.append(normalise_optional_text(payload.ofsted_urn))

    if payload.geofence_radius_m is not None:
        fields.append("geofence_radius_m = %s")
        values.append(payload.geofence_radius_m)

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    fields.append("updated_at = NOW()")
    values.append(home_id)

    query = f"""
        UPDATE homes
        SET {", ".join(fields)}
        WHERE id = %s
        RETURNING
            id,
            name,
            address,
            postcode,
            region,
            local_authority,
            ofsted_urn,
            provider_id,
            registered_manager_id,
            latitude,
            longitude,
            geofence_radius_m,
            archived,
            created_at,
            updated_at
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(values))
        home = cur.fetchone()

    if not home:
        raise HTTPException(status_code=404, detail="Home not found")

    log_manager_action(
        conn,
        manager_user_id,
        "manager_update_home",
        "home",
        home_id,
        {"name": home["name"]},
    )

    return {"ok": True, "home": home}


@router.get("/documents")
def list_manager_documents(
    q: str | None = Query(default=None),
    document_type: str | None = Query(default=None),
    approval_status: str | None = Query(default=None),
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    home_id = int(manager["home_id"])

    query = """
        SELECT
            d.id,
            d.user_id,
            d.home_id,
            d.document_type,
            d.input_text,
            d.generated_text,
            d.created_at,
            d.young_person_id,
            d.title,
            d.issue_date,
            d.review_date,
            d.expiry_date,
            d.owner_id,
            d.approval_required,
            d.approval_status,
            d.confidentiality_level,
            d.updated_at,
            h.name AS home_name
        FROM documents d
        LEFT JOIN homes h
            ON h.id = d.home_id
        WHERE d.home_id = %s
    """
    values = [home_id]

    if q:
        search = f"%{q.strip().lower()}%"
        query += " AND (LOWER(COALESCE(d.title, '')) LIKE %s OR LOWER(COALESCE(d.document_type, '')) LIKE %s)"
        values.extend([search, search])

    if document_type:
        query += " AND d.document_type = %s"
        values.append(document_type.strip())

    if approval_status:
        query += " AND d.approval_status = %s"
        values.append(approval_status.strip())

    query += " ORDER BY d.created_at DESC LIMIT 200"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(values))
        rows = cur.fetchall()

    return {"ok": True, "documents": rows}


@router.post("/documents")
def create_manager_document(
    payload: CreateManagerDocumentRequest,
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    manager_user_id = parse_user_id(manager)
    home_id = int(manager["home_id"])

    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")

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
                young_person_id,
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
            VALUES (%s, %s, %s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            RETURNING
                id,
                user_id,
                home_id,
                document_type,
                input_text,
                generated_text,
                created_at,
                young_person_id,
                title,
                issue_date,
                review_date,
                expiry_date,
                owner_id,
                approval_required,
                approval_status,
                confidentiality_level,
                updated_at
            """,
            (
                manager_user_id,
                home_id,
                payload.document_type.strip(),
                payload.input_text,
                None,
                None,
                payload.title.strip(),
                payload.issue_date,
                payload.review_date,
                payload.expiry_date,
                payload.owner_id,
                True,
                payload.approval_status,
                payload.confidentiality_level,
            ),
        )
        document = cur.fetchone()

    log_manager_action(
        conn,
        manager_user_id,
        "manager_create_document",
        "document",
        document["id"],
        {"title": document["title"], "document_type": document["document_type"]},
    )

    return {"ok": True, "document": document}


@router.patch("/documents/{document_id}")
def update_manager_document(
    document_id: int,
    payload: UpdateManagerDocumentRequest,
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    manager_user_id = parse_user_id(manager)
    home_id = int(manager["home_id"])

    ensure_same_home_document(conn, document_id, home_id)

    fields: list[str] = []
    values: list = []

    if payload.title is not None:
        title = payload.title.strip()
        if not title:
            raise HTTPException(status_code=400, detail="Title cannot be empty")
        fields.append("title = %s")
        values.append(title)

    if payload.document_type is not None:
        fields.append("document_type = %s")
        values.append(payload.document_type.strip())

    if payload.input_text is not None:
        fields.append("input_text = %s")
        values.append(payload.input_text)

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

    if payload.approval_status is not None:
        fields.append("approval_status = %s")
        values.append(payload.approval_status)

    if payload.confidentiality_level is not None:
        fields.append("confidentiality_level = %s")
        values.append(payload.confidentiality_level)

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    fields.append("updated_at = NOW()")
    values.extend([document_id, home_id])

    query = f"""
        UPDATE documents
        SET {", ".join(fields)}
        WHERE id = %s AND home_id = %s
        RETURNING
            id,
            user_id,
            home_id,
            document_type,
            input_text,
            generated_text,
            created_at,
            young_person_id,
            title,
            issue_date,
            review_date,
            expiry_date,
            owner_id,
            approval_required,
            approval_status,
            confidentiality_level,
            updated_at
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(values))
        document = cur.fetchone()

    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    log_manager_action(
        conn,
        manager_user_id,
        "manager_update_document",
        "document",
        document_id,
        {"title": document["title"], "document_type": document["document_type"]},
    )

    return {"ok": True, "document": document}


@router.delete("/documents/{document_id}")
def delete_manager_document(
    document_id: int,
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    manager_user_id = parse_user_id(manager)
    home_id = int(manager["home_id"])

    doc = ensure_same_home_document(conn, document_id, home_id)

    with conn.cursor() as cur:
        cur.execute(
            "DELETE FROM documents WHERE id = %s AND home_id = %s",
            (document_id, home_id),
        )

    log_manager_action(
        conn,
        manager_user_id,
        "manager_delete_document",
        "document",
        document_id,
        {"title": doc["title"]},
    )

    return {"ok": True, "message": "Document deleted"}


@router.get("/audit")
def list_manager_audit(
    limit: int = Query(default=100, ge=1, le=300),
    manager=Depends(get_current_manager),
    conn=Depends(get_db),
):
    home_id = int(manager["home_id"])

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                a.id,
                a.admin_user_id,
                a.action,
                a.target_type,
                a.target_id,
                a.details,
                a.created_at,
                u.first_name,
                u.last_name,
                u.email
            FROM admin_audit_log a
            LEFT JOIN users u
                ON u.id = a.admin_user_id
            WHERE
                (a.details->>'home_id')::int = %s
                OR (
                    a.target_type = 'home'
                    AND a.target_id = %s
                )
                OR (
                    a.target_type = 'user'
                    AND EXISTS (
                        SELECT 1
                        FROM users ux
                        WHERE ux.id = a.target_id AND ux.home_id = %s
                    )
                )
                OR (
                    a.target_type = 'document'
                    AND EXISTS (
                        SELECT 1
                        FROM documents dx
                        WHERE dx.id = a.target_id AND dx.home_id = %s
                    )
                )
            ORDER BY a.created_at DESC
            LIMIT %s
            """,
            (home_id, home_id, home_id, home_id, limit),
        )
        rows = cur.fetchall()

    return {"ok": True, "audit": rows}
