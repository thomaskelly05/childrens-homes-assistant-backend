from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor
import bcrypt
import json

from db.connection import get_db
from auth.current_user import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])

ALLOWED_ROLES = {"admin", "provider_admin", "manager", "staff"}


class CreateUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: str
    password: str
    role: str
    home_id: int
    is_active: bool = True


class UpdateUserRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: str | None = None
    role: str | None = None
    home_id: int | None = None
    is_active: bool | None = None
    archived: bool | None = None


class ResetPasswordRequest(BaseModel):
    password: str


class CreateHomeRequest(BaseModel):
    name: str
    address: str | None = None
    postcode: str | None = None
    region: str | None = None
    local_authority: str | None = None
    ofsted_urn: str | None = None
    provider_id: int | None = None
    registered_manager_id: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    geofence_radius_m: int | None = None
    archived: bool = False


class UpdateHomeRequest(BaseModel):
    name: str | None = None
    address: str | None = None
    postcode: str | None = None
    region: str | None = None
    local_authority: str | None = None
    ofsted_urn: str | None = None
    provider_id: int | None = None
    registered_manager_id: int | None = None
    latitude: float | None = None
    longitude: float | None = None
    geofence_radius_m: int | None = None
    archived: bool | None = None


class CreateProviderRequest(BaseModel):
    name: str
    region: str | None = None
    address: str | None = None
    postcode: str | None = None
    local_authority: str | None = None
    safeguarding_lead_name: str | None = None
    safeguarding_lead_email: str | None = None
    archived: bool = False


class UpdateProviderRequest(BaseModel):
    name: str | None = None
    region: str | None = None
    address: str | None = None
    postcode: str | None = None
    local_authority: str | None = None
    safeguarding_lead_name: str | None = None
    safeguarding_lead_email: str | None = None
    archived: bool | None = None


class CreateDocumentRequest(BaseModel):
    home_id: int | None = None
    user_id: int | None = None
    young_person_id: int | None = None
    document_type: str | None = None
    title: str | None = None
    input_text: str | None = None
    generated_text: str | None = None
    issue_date: str | None = None
    review_date: str | None = None
    expiry_date: str | None = None
    owner_id: int | None = None
    approval_required: bool = False
    approval_status: str | None = "not_required"
    confidentiality_level: str | None = "standard"


class UpdateDocumentRequest(BaseModel):
    home_id: int | None = None
    user_id: int | None = None
    young_person_id: int | None = None
    document_type: str | None = None
    title: str | None = None
    input_text: str | None = None
    generated_text: str | None = None
    issue_date: str | None = None
    review_date: str | None = None
    expiry_date: str | None = None
    owner_id: int | None = None
    approval_required: bool | None = None
    approval_status: str | None = None
    confidentiality_level: str | None = None


def get_current_admin(current_user=Depends(get_current_user)):
    role = (current_user.get("role") or "").strip().lower()

    if role not in {"admin", "provider_admin"}:
        raise HTTPException(status_code=403, detail="Admin access required")

    return current_user


def normalise_role(role: str) -> str:
    value = role.strip().lower()
    if value not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Allowed roles: {', '.join(sorted(ALLOWED_ROLES))}"
        )
    return value


def validate_email(email: str) -> str:
    value = email.strip().lower()
    if not value or "@" not in value or "." not in value.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email address")
    return value


def log_admin_action(
    conn,
    admin_user_id: int | None,
    action: str,
    target_type: str,
    target_id: int | None,
    details: dict | None = None
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
                admin_user_id,
                action,
                target_type,
                target_id,
                json.dumps(details) if details is not None else None
            )
        )


@router.get("/users")
def list_users(
    q: str | None = Query(default=None),
    role: str | None = Query(default=None),
    home_id: int | None = Query(default=None),
    active: bool | None = Query(default=None),
    archived: bool | None = Query(default=None),
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
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
        WHERE 1=1
    """
    values = []

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

    if role:
        query += " AND role = %s"
        values.append(role.strip().lower())

    if home_id is not None:
        query += " AND home_id = %s"
        values.append(home_id)

    if active is not None:
        query += " AND is_active = %s"
        values.append(active)

    if archived is not None:
        query += " AND archived = %s"
        values.append(archived)

    query += " ORDER BY created_at DESC"

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(values))
        rows = cur.fetchall()

    return {"ok": True, "users": rows}


@router.post("/users")
def create_user(
    payload: CreateUserRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    admin_user_id = int(admin.get("user_id")) if admin.get("user_id") else None
    email = validate_email(payload.email)
    role = normalise_role(payload.role)

    if not payload.first_name.strip():
        raise HTTPException(status_code=400, detail="First name is required")
    if not payload.last_name.strip():
        raise HTTPException(status_code=400, detail="Last name is required")
    if not payload.password.strip():
        raise HTTPException(status_code=400, detail="Password is required")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT id FROM users WHERE lower(email) = %s LIMIT 1", (email,))
        existing = cur.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")

        password_hash = bcrypt.hashpw(
            payload.password.encode("utf-8"),
            bcrypt.gensalt()
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
                payload.first_name.strip(),
                payload.last_name.strip(),
                email,
                password_hash,
                role,
                payload.home_id,
                payload.is_active,
            )
        )
        user = cur.fetchone()

    conn.commit()
    log_admin_action(
        conn,
        admin_user_id=admin_user_id,
        action="create_user",
        target_type="user",
        target_id=user["id"],
        details={"email": user["email"], "role": user["role"], "home_id": user["home_id"]}
    )
    conn.commit()

    return {"ok": True, "user": user}


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    admin_user_id = admin.get("user_id")
    try:
        admin_user_id = int(admin_user_id)
    except (TypeError, ValueError):
        admin_user_id = None

    fields = []
    values = []

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
        new_email = validate_email(payload.email)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT id FROM users WHERE lower(email) = %s AND id != %s LIMIT 1",
                (new_email, user_id)
            )
            existing = cur.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        fields.append("email = %s")
        values.append(new_email)

    if payload.role is not None:
        new_role = normalise_role(payload.role)
        if admin_user_id == user_id and new_role not in {"admin", "provider_admin"}:
            raise HTTPException(
                status_code=400,
                detail="You cannot remove your own admin role"
            )
        fields.append("role = %s")
        values.append(new_role)

    if payload.home_id is not None:
        fields.append("home_id = %s")
        values.append(payload.home_id)

    if payload.is_active is not None:
        if admin_user_id == user_id and payload.is_active is False:
            raise HTTPException(
                status_code=400,
                detail="You cannot deactivate your own account"
            )
        fields.append("is_active = %s")
        values.append(payload.is_active)

    if payload.archived is not None:
        if admin_user_id == user_id and payload.archived is True:
            raise HTTPException(
                status_code=400,
                detail="You cannot archive your own account"
            )
        fields.append("archived = %s")
        values.append(payload.archived)

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    fields.append("updated_at = NOW()")
    values.append(user_id)

    query = f"""
        UPDATE users
        SET {", ".join(fields)}
        WHERE id = %s
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

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(values))
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    conn.commit()
    log_admin_action(
        conn,
        admin_user_id=admin_user_id,
        action="update_user",
        target_type="user",
        target_id=user_id,
        details={"email": user["email"]}
    )
    conn.commit()

    return {"ok": True, "user": user}


@router.post("/users/{user_id}/reset-password")
def reset_password(
    user_id: int,
    payload: ResetPasswordRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    admin_user_id = int(admin.get("user_id")) if admin.get("user_id") else None

    if not payload.password.strip():
        raise HTTPException(status_code=400, detail="Password is required")

    password_hash = bcrypt.hashpw(
        payload.password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            UPDATE users
            SET
                password_hash = %s,
                password_reset_expiry = NULL,
                updated_at = NOW()
            WHERE id = %s
            RETURNING id, email, first_name, last_name
            """,
            (password_hash, user_id)
        )
        user = cur.fetchone()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    conn.commit()
    log_admin_action(
        conn,
        admin_user_id=admin_user_id,
        action="reset_password",
        target_type="user",
        target_id=user_id,
        details={"email": user["email"]}
    )
    conn.commit()

    return {"ok": True, "message": "Password reset", "user": user}


@router.get("/homes")
def list_homes(
    include_archived: bool = Query(default=False),
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    query = """
        SELECT
            h.id,
            h.name,
            h.address,
            h.postcode,
            h.region,
            h.local_authority,
            h.ofsted_urn,
            h.provider_id,
            h.registered_manager_id,
            h.latitude,
            h.longitude,
            h.geofence_radius_m,
            h.archived,
            h.created_at,
            h.updated_at,
            COUNT(u.id) FILTER (WHERE COALESCE(u.archived, false) = false) AS user_count
        FROM homes h
        LEFT JOIN users u
            ON u.home_id = h.id
    """

    if not include_archived:
        query += " WHERE COALESCE(h.archived, false) = false"

    query += """
        GROUP BY
            h.id, h.name, h.address, h.postcode, h.region, h.local_authority,
            h.ofsted_urn, h.provider_id, h.registered_manager_id, h.latitude,
            h.longitude, h.geofence_radius_m, h.archived, h.created_at, h.updated_at
        ORDER BY h.name ASC
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query)
        rows = cur.fetchall()

    return {"ok": True, "homes": rows}


@router.post("/homes")
def create_home(
    payload: CreateHomeRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    admin_user_id = int(admin.get("user_id")) if admin.get("user_id") else None

    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Home name is required")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO homes (
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
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
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
            """,
            (
                payload.name.strip(),
                payload.address.strip() if payload.address else None,
                payload.postcode.strip() if payload.postcode else None,
                payload.region.strip() if payload.region else None,
                payload.local_authority.strip() if payload.local_authority else None,
                payload.ofsted_urn.strip() if payload.ofsted_urn else None,
                payload.provider_id,
                payload.registered_manager_id,
                payload.latitude,
                payload.longitude,
                payload.geofence_radius_m,
                payload.archived,
            )
        )
        home = cur.fetchone()

    conn.commit()
    log_admin_action(
        conn,
        admin_user_id=admin_user_id,
        action="create_home",
        target_type="home",
        target_id=home["id"],
        details={"name": home["name"]}
    )
    conn.commit()

    return {"ok": True, "home": home}


@router.patch("/homes/{home_id}")
def update_home(
    home_id: int,
    payload: UpdateHomeRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    admin_user_id = int(admin.get("user_id")) if admin.get("user_id") else None
    fields = []
    values = []

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Home name cannot be empty")
        fields.append("name = %s")
        values.append(name)

    if payload.address is not None:
        fields.append("address = %s")
        values.append(payload.address.strip() or None)

    if payload.postcode is not None:
        fields.append("postcode = %s")
        values.append(payload.postcode.strip() or None)

    if payload.region is not None:
        fields.append("region = %s")
        values.append(payload.region.strip() or None)

    if payload.local_authority is not None:
        fields.append("local_authority = %s")
        values.append(payload.local_authority.strip() or None)

    if payload.ofsted_urn is not None:
        fields.append("ofsted_urn = %s")
        values.append(payload.ofsted_urn.strip() or None)

    if payload.provider_id is not None:
        fields.append("provider_id = %s")
        values.append(payload.provider_id)

    if payload.registered_manager_id is not None:
        fields.append("registered_manager_id = %s")
        values.append(payload.registered_manager_id)

    if payload.latitude is not None:
        fields.append("latitude = %s")
        values.append(payload.latitude)

    if payload.longitude is not None:
        fields.append("longitude = %s")
        values.append(payload.longitude)

    if payload.geofence_radius_m is not None:
        fields.append("geofence_radius_m = %s")
        values.append(payload.geofence_radius_m)

    if payload.archived is not None:
        fields.append("archived = %s")
        values.append(payload.archived)

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

    conn.commit()
    log_admin_action(
        conn,
        admin_user_id=admin_user_id,
        action="update_home",
        target_type="home",
        target_id=home_id,
        details={"name": home["name"]}
    )
    conn.commit()

    return {"ok": True, "home": home}


@router.get("/providers")
def list_providers(
    include_archived: bool = Query(default=False),
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    query = """
        SELECT
            p.id,
            p.name,
            p.region,
            p.address,
            p.postcode,
            p.local_authority,
            p.safeguarding_lead_name,
            p.safeguarding_lead_email,
            p.archived,
            p.created_at,
            p.updated_at,
            COUNT(h.id) FILTER (WHERE COALESCE(h.archived, false) = false) AS home_count
        FROM providers p
        LEFT JOIN homes h
            ON h.provider_id = p.id
    """

    if not include_archived:
        query += " WHERE COALESCE(p.archived, false) = false"

    query += """
        GROUP BY
            p.id, p.name, p.region, p.address, p.postcode, p.local_authority,
            p.safeguarding_lead_name, p.safeguarding_lead_email, p.archived,
            p.created_at, p.updated_at
        ORDER BY p.name ASC
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query)
        rows = cur.fetchall()

    return {"ok": True, "providers": rows}


@router.post("/providers")
def create_provider(
    payload: CreateProviderRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    admin_user_id = int(admin.get("user_id")) if admin.get("user_id") else None

    if not payload.name.strip():
        raise HTTPException(status_code=400, detail="Provider name is required")

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO providers (
                name,
                region,
                address,
                postcode,
                local_authority,
                safeguarding_lead_name,
                safeguarding_lead_email,
                archived,
                created_at,
                updated_at
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            RETURNING
                id,
                name,
                region,
                address,
                postcode,
                local_authority,
                safeguarding_lead_name,
                safeguarding_lead_email,
                archived,
                created_at,
                updated_at
            """,
            (
                payload.name.strip(),
                payload.region.strip() if payload.region else None,
                payload.address.strip() if payload.address else None,
                payload.postcode.strip() if payload.postcode else None,
                payload.local_authority.strip() if payload.local_authority else None,
                payload.safeguarding_lead_name.strip() if payload.safeguarding_lead_name else None,
                validate_email(payload.safeguarding_lead_email) if payload.safeguarding_lead_email else None,
                payload.archived,
            )
        )
        provider = cur.fetchone()

    conn.commit()
    log_admin_action(
        conn,
        admin_user_id,
        "create_provider",
        "provider",
        provider["id"],
        {"name": provider["name"]}
    )
    conn.commit()

    return {"ok": True, "provider": provider}


@router.patch("/providers/{provider_id}")
def update_provider(
    provider_id: int,
    payload: UpdateProviderRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    admin_user_id = int(admin.get("user_id")) if admin.get("user_id") else None
    fields = []
    values = []

    if payload.name is not None:
        name = payload.name.strip()
        if not name:
            raise HTTPException(status_code=400, detail="Provider name cannot be empty")
        fields.append("name = %s")
        values.append(name)

    if payload.region is not None:
        fields.append("region = %s")
        values.append(payload.region.strip() or None)

    if payload.address is not None:
        fields.append("address = %s")
        values.append(payload.address.strip() or None)

    if payload.postcode is not None:
        fields.append("postcode = %s")
        values.append(payload.postcode.strip() or None)

    if payload.local_authority is not None:
        fields.append("local_authority = %s")
        values.append(payload.local_authority.strip() or None)

    if payload.safeguarding_lead_name is not None:
        fields.append("safeguarding_lead_name = %s")
        values.append(payload.safeguarding_lead_name.strip() or None)

    if payload.safeguarding_lead_email is not None:
        fields.append("safeguarding_lead_email = %s")
        values.append(validate_email(payload.safeguarding_lead_email) if payload.safeguarding_lead_email.strip() else None)

    if payload.archived is not None:
        fields.append("archived = %s")
        values.append(payload.archived)

    if not fields:
        raise HTTPException(status_code=400, detail="No fields to update")

    fields.append("updated_at = NOW()")
    values.append(provider_id)

    query = f"""
        UPDATE providers
        SET {", ".join(fields)}
        WHERE id = %s
        RETURNING
            id,
            name,
            region,
            address,
            postcode,
            local_authority,
            safeguarding_lead_name,
            safeguarding_lead_email,
            archived,
            created_at,
            updated_at
    """

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(query, tuple(values))
        provider = cur.fetchone()

    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")

    conn.commit()
    log_admin_action(
        conn,
        admin_user_id,
        "update_provider",
        "provider",
        provider_id,
        {"name": provider["name"]}
    )
    conn.commit()

    return {"ok": True, "provider": provider}


@router.get("/documents")
def list_documents(
    q: str | None = Query(default=None),
    home_id: int | None = Query(default=None),
    document_type: str | None = Query(default=None),
    approval_status: str | None = Query(default=None),
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
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
        WHERE 1=1
    """
    values = []

    if q:
        query += " AND (LOWER(COALESCE(d.title, '')) LIKE %s OR LOWER(COALESCE(d.document_type, '')) LIKE %s)"
        search = f"%{q.strip().lower()}%"
        values.extend([search, search])

    if home_id is not None:
        query += " AND d.home_id = %s"
        values.append(home_id)

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
def create_document(
    payload: CreateDocumentRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    admin_user_id = int(admin.get("user_id")) if admin.get("user_id") else None

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
                payload.user_id,
                payload.home_id,
                payload.document_type.strip() if payload.document_type else None,
                payload.input_text,
                payload.generated_text,
                payload.young_person_id,
                payload.title.strip() if payload.title else None,
                payload.issue_date,
                payload.review_date,
                payload.expiry_date,
                payload.owner_id,
                payload.approval_required,
                payload.approval_status or "not_required",
                payload.confidentiality_level or "standard",
            )
        )
        document = cur.fetchone()

    conn.commit()
    log_admin_action(
        conn,
        admin_user_id,
        "create_document",
        "document",
        document["id"],
        {"title": document["title"], "document_type": document["document_type"]}
    )
    conn.commit()

    return {"ok": True, "document": document}


@router.patch("/documents/{document_id}")
def update_document(
    document_id: int,
    payload: UpdateDocumentRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    admin_user_id = int(admin.get("user_id")) if admin.get("user_id") else None
    fields = []
    values = []

    field_map = {
        "user_id": payload.user_id,
        "home_id": payload.home_id,
        "young_person_id": payload.young_person_id,
        "owner_id": payload.owner_id,
        "approval_required": payload.approval_required,
    }

    for key, value in field_map.items():
        if value is not None:
            fields.append(f"{key} = %s")
            values.append(value)

    if payload.document_type is not None:
        fields.append("document_type = %s")
        values.append(payload.document_type.strip() or None)

    if payload.title is not None:
        fields.append("title = %s")
        values.append(payload.title.strip() or None)

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

    conn.commit()
    log_admin_action(
        conn,
        admin_user_id,
        "update_document",
        "document",
        document_id,
        {"title": document["title"], "document_type": document["document_type"]}
    )
    conn.commit()

    return {"ok": True, "document": document}


@router.get("/billing/overview")
def billing_overview(
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                COUNT(*) AS total_users,
                COUNT(*) FILTER (WHERE COALESCE(is_active, false) = true) AS active_users,
                COUNT(*) FILTER (WHERE COALESCE(archived, false) = true) AS archived_users,
                COUNT(*) FILTER (WHERE subscription_status = 'active') AS active_subscriptions,
                COUNT(*) FILTER (WHERE subscription_status IS NULL OR subscription_status != 'active') AS inactive_subscriptions
            FROM users
            """
        )
        totals = cur.fetchone()

        cur.execute(
            """
            SELECT
                id,
                first_name,
                last_name,
                email,
                plan_name,
                subscription_status,
                current_period_end,
                stripe_customer_id,
                stripe_subscription_id
            FROM users
            ORDER BY created_at DESC
            LIMIT 100
            """
        )
        users = cur.fetchall()

    return {"ok": True, "totals": totals, "users": users}


@router.get("/audit")
def list_audit(
    limit: int = Query(default=100, ge=1, le=500),
    admin=Depends(get_current_admin),
    conn=Depends(get_db)
):
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
            ORDER BY a.created_at DESC
            LIMIT %s
            """,
            (limit,)
        )
        rows = cur.fetchall()

    return {"ok": True, "audit": rows}
