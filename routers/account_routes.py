from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from psycopg2.extras import RealDictCursor

from auth.session_user import get_current_user
from db.connection import get_db

router = APIRouter(
    prefix="/account",
    tags=["Account"],
    dependencies=[Depends(get_current_user)],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

PREFERENCES_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS user_profile_preferences (
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT,
    phone TEXT,
    profile_image_data TEXT,
    theme TEXT DEFAULT 'system',
    accent_color TEXT DEFAULT 'blue',
    assistant_default_mode TEXT DEFAULT 'ofsted',
    assistant_tone TEXT DEFAULT 'professional',
    compact_mode BOOLEAN DEFAULT FALSE,
    email_notifications BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
)
"""


class ProfileUpdatePayload(BaseModel):
    first_name: str | None = Field(default=None, max_length=120)
    last_name: str | None = Field(default=None, max_length=120)
    display_name: str | None = Field(default=None, max_length=180)
    phone: str | None = Field(default=None, max_length=80)
    profile_image_data: str | None = Field(default=None, max_length=2_500_000)
    theme: str | None = Field(default="system", max_length=32)
    accent_color: str | None = Field(default="blue", max_length=32)
    assistant_default_mode: str | None = Field(default="ofsted", max_length=32)
    assistant_tone: str | None = Field(default="professional", max_length=32)
    compact_mode: bool | None = False
    email_notifications: bool | None = True
    notes: str | None = Field(default=None, max_length=2000)


class PasswordChangePayload(BaseModel):
    current_password: str = Field(..., min_length=1, max_length=500)
    new_password: str = Field(..., min_length=8, max_length=500)


def _user_id(current_user: dict[str, Any]) -> int:
    value = current_user.get("id") or current_user.get("user_id")
    if not value:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return int(value)


def _clean(value: Any, fallback: str | None = None) -> str | None:
    if value is None:
        return fallback
    text = str(value).strip()
    return text if text else fallback


def _column_exists(conn, table_name: str, column_name: str) -> bool:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.columns
                    WHERE table_schema = 'public'
                      AND table_name = %s
                      AND column_name = %s
                ) AS exists
                """,
                (table_name, column_name),
            )
            row = cur.fetchone()
            return bool(row and row.get("exists"))
    except Exception:
        return False


def _ensure_preferences_table(conn) -> None:
    with conn.cursor() as cur:
        cur.execute(PREFERENCES_TABLE_SQL)
    conn.commit()


def _select_user_columns(conn) -> list[str]:
    preferred = [
        "id",
        "email",
        "role",
        "home_id",
        "provider_id",
        "first_name",
        "last_name",
        "is_active",
        "account_status",
        "created_at",
        "updated_at",
    ]
    return [column for column in preferred if _column_exists(conn, "users", column)] or ["id", "email"]


def _get_user(conn, user_id: int, include_password: bool = False) -> dict[str, Any]:
    columns = _select_user_columns(conn)
    password_column = None
    if include_password:
        for candidate in ("password_hash", "hashed_password", "password"):
            if _column_exists(conn, "users", candidate):
                password_column = candidate
                columns.append(candidate)
                break

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            f"SELECT {', '.join(columns)} FROM users WHERE id = %s LIMIT 1",
            (user_id,),
        )
        row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="User not found.")

    user = dict(row)
    if password_column:
        user["_password_column"] = password_column
    return user


def _get_preferences(conn, user_id: int) -> dict[str, Any]:
    _ensure_preferences_table(conn)
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT
                display_name,
                phone,
                profile_image_data,
                theme,
                accent_color,
                assistant_default_mode,
                assistant_tone,
                compact_mode,
                email_notifications,
                notes,
                updated_at
            FROM user_profile_preferences
            WHERE user_id = %s
            LIMIT 1
            """,
            (user_id,),
        )
        row = cur.fetchone()

    return dict(row) if row else {
        "display_name": None,
        "phone": None,
        "profile_image_data": None,
        "theme": "system",
        "accent_color": "blue",
        "assistant_default_mode": "ofsted",
        "assistant_tone": "professional",
        "compact_mode": False,
        "email_notifications": True,
        "notes": None,
    }


def _profile_payload(conn, user_id: int) -> dict[str, Any]:
    user = _get_user(conn, user_id)
    preferences = _get_preferences(conn, user_id)
    first_name = user.get("first_name") or ""
    last_name = user.get("last_name") or ""
    display_name = preferences.get("display_name") or " ".join([first_name, last_name]).strip() or user.get("email") or "My profile"

    return {
        "ok": True,
        "user": {
            key: value
            for key, value in user.items()
            if not str(key).startswith("_")
        },
        "profile": {
            **preferences,
            "display_name": display_name,
            "initials": _initials(display_name),
        },
    }


def _initials(name: str) -> str:
    parts = [part for part in str(name or "").strip().split() if part]
    if not parts:
        return "IC"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()


@router.get("/me")
def get_account(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return _profile_payload(conn, _user_id(current_user))


@router.get("/profile")
def get_profile(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return _profile_payload(conn, _user_id(current_user))


@router.put("/profile")
def update_profile(
    payload: ProfileUpdatePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _user_id(current_user)

    theme = _clean(payload.theme, "system")
    if theme not in {"system", "light", "dark"}:
        raise HTTPException(status_code=400, detail="Invalid theme.")

    assistant_default_mode = _clean(payload.assistant_default_mode, "ofsted")
    if assistant_default_mode not in {"ofsted", "safeguarding", "records", "practice"}:
        raise HTTPException(status_code=400, detail="Invalid assistant mode.")

    assistant_tone = _clean(payload.assistant_tone, "professional")
    if assistant_tone not in {"professional", "warm", "concise", "reflective", "inspection_ready"}:
        raise HTTPException(status_code=400, detail="Invalid assistant tone.")

    image = _clean(payload.profile_image_data)
    if image and not image.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Profile image must be an image data URL.")

    try:
        _ensure_preferences_table(conn)
        updates: list[str] = []
        values: list[Any] = []
        if _column_exists(conn, "users", "first_name"):
            updates.append("first_name = %s")
            values.append(_clean(payload.first_name))
        if _column_exists(conn, "users", "last_name"):
            updates.append("last_name = %s")
            values.append(_clean(payload.last_name))
        if updates:
            if _column_exists(conn, "users", "updated_at"):
                updates.append("updated_at = now()")
            with conn.cursor() as cur:
                cur.execute(
                    f"UPDATE users SET {', '.join(updates)} WHERE id = %s",
                    (*values, user_id),
                )

        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_profile_preferences (
                    user_id,
                    display_name,
                    phone,
                    profile_image_data,
                    theme,
                    accent_color,
                    assistant_default_mode,
                    assistant_tone,
                    compact_mode,
                    email_notifications,
                    notes,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
                ON CONFLICT (user_id) DO UPDATE SET
                    display_name = EXCLUDED.display_name,
                    phone = EXCLUDED.phone,
                    profile_image_data = COALESCE(EXCLUDED.profile_image_data, user_profile_preferences.profile_image_data),
                    theme = EXCLUDED.theme,
                    accent_color = EXCLUDED.accent_color,
                    assistant_default_mode = EXCLUDED.assistant_default_mode,
                    assistant_tone = EXCLUDED.assistant_tone,
                    compact_mode = EXCLUDED.compact_mode,
                    email_notifications = EXCLUDED.email_notifications,
                    notes = EXCLUDED.notes,
                    updated_at = now()
                """,
                (
                    user_id,
                    _clean(payload.display_name),
                    _clean(payload.phone),
                    image,
                    theme,
                    _clean(payload.accent_color, "blue"),
                    assistant_default_mode,
                    assistant_tone,
                    bool(payload.compact_mode),
                    bool(payload.email_notifications),
                    _clean(payload.notes),
                ),
            )

        conn.commit()
        return _profile_payload(conn, user_id)

    except HTTPException:
        conn.rollback()
        raise
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Could not update profile: {exc}") from exc


@router.post("/change-password")
def change_password(
    payload: PasswordChangePayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _user_id(current_user)
    if len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="New password must be at least 8 characters.")

    user = _get_user(conn, user_id, include_password=True)
    password_column = user.get("_password_column")
    stored_hash = user.get(password_column) if password_column else None
    if not password_column or not stored_hash:
        raise HTTPException(status_code=400, detail="Password changes are not available for this account.")

    try:
        valid = pwd_context.verify(payload.current_password, stored_hash)
    except Exception:
        valid = False

    if not valid:
        raise HTTPException(status_code=400, detail="Current password is incorrect.")

    try:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE users SET {password_column} = %s{', updated_at = now()' if _column_exists(conn, 'users', 'updated_at') else ''} WHERE id = %s",
                (pwd_context.hash(payload.new_password), user_id),
            )
        conn.commit()
        return {"ok": True, "message": "Password updated."}
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Could not update password: {exc}") from exc
