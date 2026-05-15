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

router = APIRouter(prefix="/admin", tags=["Admin"])

ALLOWED_ROLES = {"admin", "provider_admin", "manager", "staff"}
ADMIN_ROLES = {"admin", "provider_admin"}


class CreateUserRequest(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    password: str
    role: str
    home_id: int
    is_active: bool = True


class UpdateUserRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
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
    safeguarding_lead_email: EmailStr | None = None
    archived: bool = False


class UpdateProviderRequest(BaseModel):
    name: str | None = None
    region: str | None = None
    address: str | None = None
    postcode: str | None = None
    local_authority: str | None = None
    safeguarding_lead_name: str | None = None
    safeguarding_lead_email: EmailStr | None = None
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
    if not isinstance(current_user, dict):
        raise HTTPException(status_code=401, detail="Invalid user session")

    role = str(current_user.get("role") or "").strip().lower()
    user_id = current_user.get("user_id")

    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid user session")

    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=403, detail="Admin access required")

    return current_user


def normalise_role(role: str) -> str:
    value = role.strip().lower()
    if value not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid role. Allowed roles: {', '.join(sorted(ALLOWED_ROLES))}",
        )
    return value


def normalise_optional_text(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned or None


def parse_admin_user_id(admin: dict) -> int | None:
    try:
        return int(admin.get("user_id")) if admin.get("user_id") is not None else None
    except (TypeError, ValueError):
        return None


def log_admin_action(
    conn,
    admin_user_id: int | None,
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
                admin_user_id,
                action,
                target_type,
                target_id,
                json.dumps(details) if details is not None else None,
            ),
        )


def handle_integrity_error(exc: Exception, fallback_detail: str = "Database integrity error"):
    logger.warning("Integrity error: %s", str(exc))
    raise HTTPException(status_code=400, detail=fallback_detail)


@router.get("/users/legacy")
def list_users(
    q: str | None = Query(default=None),
    role: str | None = Query(default=None),
    home_id: int | None = Query(default=None),
    active: bool | None = Query(default=None),
    archived: bool | None = Query(default=None),
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
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
    values: list = []

    if q:
        search = f"%{q.strip().lower()}%"
        query += """
            AND (
                LOWER(first_name) LIKE %s
                OR LOWER(last_name) LIKE %s
                OR LOWER(email) LIKE %s
            )
        """
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


@router.post("/users/legacy")
def create_user(
    payload: CreateUserRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
):
    admin_user_id = parse_admin_user_id(admin)
    email = str(payload.email).strip().lower()
    role = normalise_role(payload.role)

    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    password = payload.password.strip()

    if not first_name:
        raise HTTPException(status_code=400, detail="First name is required")
    if not last_name:
        raise HTTPException(status_code=400, detail="Last name is required")
    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM users WHERE lower(email) = %s LIMIT 1", (email,))
            existing = cur.fetchone()
            if existing:
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
                    payload.home_id,
                    payload.is_active,
                ),
            )
            user = cur.fetchone()

        log_admin_action(
            conn,
            admin_user_id=admin_user_id,
            action="create_user",
            target_type="user",
            target_id=user["id"],
            details={
                "email": user["email"],
                "role": user["role"],
                "home_id": user["home_id"],
            },
        )

        return {"ok": True, "user": user}

    except HTTPException:
        raise
    except IntegrityError as exc:
        handle_integrity_error(exc, "Unable to create user. Check related records and unique fields.")
    except OperationalError:
        logger.exception("Database operational error in create_user")
        raise HTTPException(status_code=500, detail="Database unavailable")


@router.patch("/users/{user_id}")
def update_user(
    user_id: int,
    payload: UpdateUserRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
):
    admin_user_id = parse_admin_user_id(admin)
    fields: list[str] = []
    values: list = []

    try:
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
                    "SELECT id FROM users WHERE lower(email) = %s AND id != %s LIMIT 1",
                    (new_email, user_id),
                )
                existing = cur.fetchone()
            if existing:
                raise HTTPException(status_code=400, detail="Email already exists")
            fields.append("email = %s")
            values.append(new_email)

        if payload.role is not None:
            new_role = normalise_role(payload.role)
            if admin_user_id == user_id and new_role not in ADMIN_ROLES:
                raise HTTPException(status_code=400, detail="You cannot remove your own admin role")
            fields.append("role = %s")
            values.append(new_role)

        if payload.home_id is not None:
            fields.append("home_id = %s")
            values.append(payload.home_id)

        if payload.is_active is not None:
            if admin_user_id == user_id and payload.is_active is False:
                raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
            fields.append("is_active = %s")
            values.append(payload.is_active)

        if payload.archived is not None:
            if admin_user_id == user_id and payload.archived is True:
                raise HTTPException(status_code=400, detail="You cannot archive your own account")
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

        log_admin_action(
            conn,
            admin_user_id=admin_user_id,
            action="update_user",
            target_type="user",
            target_id=user_id,
            details={"email": user["email"]},
        )

        return {"ok": True, "user": user}

    except HTTPException:
        raise
    except IntegrityError as exc:
        handle_integrity_error(exc, "Unable to update user. Check related records and unique fields.")
    except OperationalError:
        logger.exception("Database operational error in update_user")
        raise HTTPException(status_code=500, detail="Database unavailable")


@router.post("/users/{user_id}/reset-password")
def reset_password(
    user_id: int,
    payload: ResetPasswordRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
):
    admin_user_id = parse_admin_user_id(admin)
    password = payload.password.strip()

    if not password:
        raise HTTPException(status_code=400, detail="Password is required")

    try:
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
                WHERE id = %s
                RETURNING id, email, first_name, last_name
                """,
                (password_hash, user_id),
            )
            user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=404, detail="User not found")

        log_admin_action(
            conn,
            admin_user_id=admin_user_id,
            action="reset_password",
            target_type="user",
            target_id=user_id,
            details={"email": user["email"]},
        )

        return {"ok": True, "message": "Password reset", "user": user}

    except HTTPException:
        raise
    except OperationalError:
        logger.exception("Database operational error in reset_password")
        raise HTTPException(status_code=500, detail="Database unavailable")


@router.get("/homes")
def list_homes(
    include_archived: bool = Query(default=False),
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
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
            COALESCE(uc.user_count, 0) AS user_count
        FROM homes h
        LEFT JOIN (
            SELECT
                home_id,
                COUNT(*) AS user_count
            FROM users
            WHERE COALESCE(archived, false) = false
            GROUP BY home_id
        ) uc
            ON uc.home_id = h.id
    """

    if not include_archived:
        query += " WHERE COALESCE(h.archived, false) = false"

    query += " ORDER BY h.name ASC"

    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query)
            rows = cur.fetchall()

        return {"ok": True, "homes": rows}

    except OperationalError:
        logger.exception("Database operational error in list_homes")
        raise HTTPException(status_code=500, detail="Database unavailable")


@router.post("/homes")
def create_home(
    payload: CreateHomeRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
):
    admin_user_id = parse_admin_user_id(admin)

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Home name is required")

    try:
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
                    name,
                    normalise_optional_text(payload.address),
                    normalise_optional_text(payload.postcode),
                    normalise_optional_text(payload.region),
                    normalise_optional_text(payload.local_authority),
                    normalise_optional_text(payload.ofsted_urn),
                    payload.provider_id,
                    payload.registered_manager_id,
                    payload.latitude,
                    payload.longitude,
                    payload.geofence_radius_m,
                    payload.archived,
                ),
            )
            home = cur.fetchone()

        log_admin_action(
            conn,
            admin_user_id=admin_user_id,
            action="create_home",
            target_type="home",
            target_id=home["id"],
            details={"name": home["name"]},
        )

        return {"ok": True, "home": home}

    except HTTPException:
        raise
    except IntegrityError as exc:
        handle_integrity_error(exc, "Unable to create home. Check provider and manager references.")
    except OperationalError:
        logger.exception("Database operational error in create_home")
        raise HTTPException(status_code=500, detail="Database unavailable")


@router.patch("/homes/{home_id}")
def update_home(
    home_id: int,
    payload: UpdateHomeRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
):
    admin_user_id = parse_admin_user_id(admin)
    fields: list[str] = []
    values: list = []

    try:
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

        log_admin_action(
            conn,
            admin_user_id=admin_user_id,
            action="update_home",
            target_type="home",
            target_id=home_id,
            details={"name": home["name"]},
        )

        return {"ok": True, "home": home}

    except HTTPException:
        raise
    except IntegrityError as exc:
        handle_integrity_error(exc, "Unable to update home. Check provider and manager references.")
    except OperationalError:
        logger.exception("Database operational error in update_home")
        raise HTTPException(status_code=500, detail="Database unavailable")


@router.get("/providers")
def list_providers(
    include_archived: bool = Query(default=False),
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
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
    conn=Depends(get_db),
):
    admin_user_id = parse_admin_user_id(admin)

    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Provider name is required")

    try:
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
                    name,
                    normalise_optional_text(payload.region),
                    normalise_optional_text(payload.address),
                    normalise_optional_text(payload.postcode),
                    normalise_optional_text(payload.local_authority),
                    normalise_optional_text(payload.safeguarding_lead_name),
                    str(payload.safeguarding_lead_email).strip().lower() if payload.safeguarding_lead_email else None,
                    payload.archived,
                ),
            )
            provider = cur.fetchone()

        log_admin_action(
            conn,
            admin_user_id=admin_user_id,
            action="create_provider",
            target_type="provider",
            target_id=provider["id"],
            details={"name": provider["name"]},
        )

        return {"ok": True, "provider": provider}

    except HTTPException:
        raise
    except IntegrityError as exc:
        handle_integrity_error(exc, "Unable to create provider.")
    except OperationalError:
        logger.exception("Database operational error in create_provider")
        raise HTTPException(status_code=500, detail="Database unavailable")


@router.patch("/providers/{provider_id}")
def update_provider(
    provider_id: int,
    payload: UpdateProviderRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
):
    admin_user_id = parse_admin_user_id(admin)
    fields: list[str] = []
    values: list = []

    try:
        if payload.name is not None:
            name = payload.name.strip()
            if not name:
                raise HTTPException(status_code=400, detail="Provider name cannot be empty")
            fields.append("name = %s")
            values.append(name)

        if payload.region is not None:
            fields.append("region = %s")
            values.append(normalise_optional_text(payload.region))

        if payload.address is not None:
            fields.append("address = %s")
            values.append(normalise_optional_text(payload.address))

        if payload.postcode is not None:
            fields.append("postcode = %s")
            values.append(normalise_optional_text(payload.postcode))

        if payload.local_authority is not None:
            fields.append("local_authority = %s")
            values.append(normalise_optional_text(payload.local_authority))

        if payload.safeguarding_lead_name is not None:
            fields.append("safeguarding_lead_name = %s")
            values.append(normalise_optional_text(payload.safeguarding_lead_name))

        if payload.safeguarding_lead_email is not None:
            fields.append("safeguarding_lead_email = %s")
            values.append(str(payload.safeguarding_lead_email).strip().lower())

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

        log_admin_action(
            conn,
            admin_user_id=admin_user_id,
            action="update_provider",
            target_type="provider",
            target_id=provider_id,
            details={"name": provider["name"]},
        )

        return {"ok": True, "provider": provider}

    except HTTPException:
        raise
    except IntegrityError as exc:
        handle_integrity_error(exc, "Unable to update provider.")
    except OperationalError:
        logger.exception("Database operational error in update_provider")
        raise HTTPException(status_code=500, detail="Database unavailable")


@router.get("/documents")
def list_documents(
    q: str | None = Query(default=None),
    home_id: int | None = Query(default=None),
    document_type: str | None = Query(default=None),
    approval_status: str | None = Query(default=None),
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
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
    values: list = []

    if q:
        search = f"%{q.strip().lower()}%"
        query += " AND (LOWER(COALESCE(d.title, '')) LIKE %s OR LOWER(COALESCE(d.document_type, '')) LIKE %s)"
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
    conn=Depends(get_db),
):
    admin_user_id = parse_admin_user_id(admin)

    try:
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
                    normalise_optional_text(payload.document_type),
                    payload.input_text,
                    payload.generated_text,
                    payload.young_person_id,
                    normalise_optional_text(payload.title),
                    payload.issue_date,
                    payload.review_date,
                    payload.expiry_date,
                    payload.owner_id,
                    payload.approval_required,
                    payload.approval_status or "not_required",
                    payload.confidentiality_level or "standard",
                ),
            )
            document = cur.fetchone()

        log_admin_action(
            conn,
            admin_user_id=admin_user_id,
            action="create_document",
            target_type="document",
            target_id=document["id"],
            details={"title": document["title"], "document_type": document["document_type"]},
        )

        return {"ok": True, "document": document}

    except HTTPException:
        raise
    except IntegrityError as exc:
        handle_integrity_error(exc, "Unable to create document. Check related records.")
    except OperationalError:
        logger.exception("Database operational error in create_document")
        raise HTTPException(status_code=500, detail="Database unavailable")


@router.patch("/documents/{document_id}")
def update_document(
    document_id: int,
    payload: UpdateDocumentRequest,
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
):
    admin_user_id = parse_admin_user_id(admin)
    fields: list[str] = []
    values: list = []

    try:
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
            values.append(normalise_optional_text(payload.document_type))

        if payload.title is not None:
            fields.append("title = %s")
            values.append(normalise_optional_text(payload.title))

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

        log_admin_action(
            conn,
            admin_user_id=admin_user_id,
            action="update_document",
            target_type="document",
            target_id=document_id,
            details={"title": document["title"], "document_type": document["document_type"]},
        )

        return {"ok": True, "document": document}

    except HTTPException:
        raise
    except IntegrityError as exc:
        handle_integrity_error(exc, "Unable to update document. Check related records.")
    except OperationalError:
        logger.exception("Database operational error in update_document")
        raise HTTPException(status_code=500, detail="Database unavailable")


@router.get("/billing/overview")
def billing_overview(
    admin=Depends(get_current_admin),
    conn=Depends(get_db),
):
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                COUNT(*) AS total_users,
                COUNT(*) FILTER (WHERE COALESCE(is_active, false) = true) AS active_users,
                COUNT(*) FILTER (WHERE COALESCE(archived, false) = true) AS archived_users,
                COUNT(*) FILTER (WHERE COALESCE(subscription_active, false) = true) AS active_subscriptions,
                COUNT(*) FILTER (WHERE COALESCE(subscription_active, false) = false) AS inactive_subscriptions
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
                subscription_active,
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
    conn=Depends(get_db),
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
            (limit,),
        )
        rows = cur.fetchall()

    return {"ok": True, "audit": rows}
