from __future__ import annotations

import json
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from passlib.context import CryptContext
from pydantic import BaseModel, Field
from psycopg2.extras import Json, RealDictCursor

from auth.session_user import get_current_user
from db.connection import get_db

router = APIRouter(
    prefix="/account",
    tags=["Account"],
    dependencies=[Depends(get_current_user)],
)
compat_router = APIRouter(
    prefix="/api",
    tags=["Account compatibility"],
    dependencies=[Depends(get_current_user)],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

CRITICAL_DASHBOARD_WIDGETS = (
    "safeguarding-open",
    "child-wellbeing",
    "operational-actions",
)
RECOMMENDED_DASHBOARD_WIDGET_ORDER = (
    *CRITICAL_DASHBOARD_WIDGETS,
    "my-children",
    "my-recent-records",
    "my-pinned-templates",
    "documents-review",
    "inspection-evidence",
    "child-voice",
)

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
    role_title TEXT,
    operational_focus TEXT,
    dashboard_preferences JSONB DEFAULT '{}'::jsonb,
    pinned_widgets JSONB DEFAULT '[]'::jsonb,
    hidden_optional_widgets JSONB DEFAULT '[]'::jsonb,
    widget_order JSONB DEFAULT '[]'::jsonb,
    favourite_children JSONB DEFAULT '[]'::jsonb,
    favourite_templates JSONB DEFAULT '[]'::jsonb,
    quick_actions JSONB DEFAULT '[]'::jsonb,
    recent_activity JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
)
"""

PREFERENCES_ALTER_SQL = (
    "ALTER TABLE user_profile_preferences ADD COLUMN IF NOT EXISTS role_title TEXT",
    "ALTER TABLE user_profile_preferences ADD COLUMN IF NOT EXISTS operational_focus TEXT",
    "ALTER TABLE user_profile_preferences ADD COLUMN IF NOT EXISTS dashboard_preferences JSONB DEFAULT '{}'::jsonb",
    "ALTER TABLE user_profile_preferences ADD COLUMN IF NOT EXISTS pinned_widgets JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE user_profile_preferences ADD COLUMN IF NOT EXISTS hidden_optional_widgets JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE user_profile_preferences ADD COLUMN IF NOT EXISTS widget_order JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE user_profile_preferences ADD COLUMN IF NOT EXISTS favourite_children JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE user_profile_preferences ADD COLUMN IF NOT EXISTS favourite_templates JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE user_profile_preferences ADD COLUMN IF NOT EXISTS quick_actions JSONB DEFAULT '[]'::jsonb",
    "ALTER TABLE user_profile_preferences ADD COLUMN IF NOT EXISTS recent_activity JSONB DEFAULT '[]'::jsonb",
)


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
    role_title: str | None = Field(default=None, max_length=160)
    operational_focus: str | None = Field(default=None, max_length=1000)
    dashboard_preferences: dict[str, Any] | None = None
    pinned_widgets: list[str] | None = None
    hidden_optional_widgets: list[str] | None = None
    widget_order: list[str] | None = None
    favourite_children: list[str] | None = None
    favourite_templates: list[str] | None = None
    quick_actions: list[str] | None = None
    notes: str | None = Field(default=None, max_length=2000)


class DashboardPreferencesPayload(BaseModel):
    dashboard_preferences: dict[str, Any] | None = None
    pinned_widgets: list[str] | None = None
    hidden_optional_widgets: list[str] | None = None
    widget_order: list[str] | None = None
    favourite_children: list[str] | None = None
    favourite_templates: list[str] | None = None
    quick_actions: list[str] | None = None
    operational_focus: str | None = Field(default=None, max_length=1000)
    layout_density: str | None = Field(default=None, max_length=32)
    last_selected_home: str | int | None = None


class AvatarPayload(BaseModel):
    profile_image_data: str = Field(..., max_length=2_500_000)


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
        for statement in PREFERENCES_ALTER_SQL:
            cur.execute(statement)
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
                role_title,
                operational_focus,
                dashboard_preferences,
                pinned_widgets,
                hidden_optional_widgets,
                widget_order,
                favourite_children,
                favourite_templates,
                quick_actions,
                recent_activity,
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
        "role_title": None,
        "operational_focus": None,
        "dashboard_preferences": {},
        "pinned_widgets": [],
        "hidden_optional_widgets": [],
        "widget_order": [],
        "favourite_children": [],
        "favourite_templates": [],
        "quick_actions": [],
        "recent_activity": [],
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
            "critical_widgets": list(CRITICAL_DASHBOARD_WIDGETS),
            "recommended_widget_order": list(RECOMMENDED_DASHBOARD_WIDGET_ORDER),
        },
    }


def _initials(name: str) -> str:
    parts = [part for part in str(name or "").strip().split() if part]
    if not parts:
        return "IC"
    if len(parts) == 1:
        return parts[0][:2].upper()
    return f"{parts[0][0]}{parts[-1][0]}".upper()


def _as_json_object(value: Any) -> dict[str, Any]:
    if value is None:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except json.JSONDecodeError:
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def _as_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            value = parsed
        except json.JSONDecodeError:
            value = [value]
    if not isinstance(value, (list, tuple, set)):
        return []
    cleaned: list[str] = []
    for item in value:
        text = str(item).strip()
        if text and text not in cleaned:
            cleaned.append(text)
    return cleaned


def _normalise_dashboard_payload(payload: DashboardPreferencesPayload | ProfileUpdatePayload) -> dict[str, Any]:
    dashboard_preferences = _as_json_object(getattr(payload, "dashboard_preferences", None))
    density = _clean(getattr(payload, "layout_density", None))
    if density:
        dashboard_preferences["layout_density"] = density if density in {"comfortable", "compact"} else "comfortable"
    last_selected_home = getattr(payload, "last_selected_home", None)
    if last_selected_home not in (None, ""):
        dashboard_preferences["last_selected_home"] = str(last_selected_home)

    hidden_optional_widgets = [
        widget
        for widget in _as_string_list(getattr(payload, "hidden_optional_widgets", None))
        if widget not in CRITICAL_DASHBOARD_WIDGETS
    ]
    widget_order = _as_string_list(getattr(payload, "widget_order", None))
    if not widget_order:
        widget_order = list(RECOMMENDED_DASHBOARD_WIDGET_ORDER)
    for critical in reversed(CRITICAL_DASHBOARD_WIDGETS):
        if critical in widget_order:
            widget_order.remove(critical)
        widget_order.insert(0, critical)

    return {
        "dashboard_preferences": dashboard_preferences,
        "pinned_widgets": _as_string_list(getattr(payload, "pinned_widgets", None)),
        "hidden_optional_widgets": hidden_optional_widgets,
        "widget_order": widget_order,
        "favourite_children": _as_string_list(getattr(payload, "favourite_children", None)),
        "favourite_templates": _as_string_list(getattr(payload, "favourite_templates", None)),
        "quick_actions": _as_string_list(getattr(payload, "quick_actions", None)),
    }


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
    dashboard = _normalise_dashboard_payload(payload)

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
                    role_title,
                    operational_focus,
                    dashboard_preferences,
                    pinned_widgets,
                    hidden_optional_widgets,
                    widget_order,
                    favourite_children,
                    favourite_templates,
                    quick_actions,
                    notes,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
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
                    role_title = EXCLUDED.role_title,
                    operational_focus = EXCLUDED.operational_focus,
                    dashboard_preferences = EXCLUDED.dashboard_preferences,
                    pinned_widgets = EXCLUDED.pinned_widgets,
                    hidden_optional_widgets = EXCLUDED.hidden_optional_widgets,
                    widget_order = EXCLUDED.widget_order,
                    favourite_children = EXCLUDED.favourite_children,
                    favourite_templates = EXCLUDED.favourite_templates,
                    quick_actions = EXCLUDED.quick_actions,
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
                    _clean(payload.role_title),
                    _clean(payload.operational_focus),
                    Json(dashboard["dashboard_preferences"]),
                    Json(dashboard["pinned_widgets"]),
                    Json(dashboard["hidden_optional_widgets"]),
                    Json(dashboard["widget_order"]),
                    Json(dashboard["favourite_children"]),
                    Json(dashboard["favourite_templates"]),
                    Json(dashboard["quick_actions"]),
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


@router.get("/dashboard-preferences")
def get_dashboard_preferences(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    profile = _profile_payload(conn, _user_id(current_user))["profile"]
    return {
        "ok": True,
        "dashboard_preferences": _as_json_object(profile.get("dashboard_preferences")),
        "pinned_widgets": _as_string_list(profile.get("pinned_widgets")),
        "hidden_optional_widgets": _as_string_list(profile.get("hidden_optional_widgets")),
        "widget_order": _as_string_list(profile.get("widget_order")) or list(RECOMMENDED_DASHBOARD_WIDGET_ORDER),
        "favourite_children": _as_string_list(profile.get("favourite_children")),
        "favourite_templates": _as_string_list(profile.get("favourite_templates")),
        "quick_actions": _as_string_list(profile.get("quick_actions")),
        "critical_widgets": list(CRITICAL_DASHBOARD_WIDGETS),
        "recommended_widget_order": list(RECOMMENDED_DASHBOARD_WIDGET_ORDER),
        "operational_focus": profile.get("operational_focus"),
    }


@router.put("/dashboard-preferences")
def update_dashboard_preferences(
    payload: DashboardPreferencesPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _user_id(current_user)
    dashboard = _normalise_dashboard_payload(payload)
    try:
        _ensure_preferences_table(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_profile_preferences (
                    user_id,
                    operational_focus,
                    dashboard_preferences,
                    pinned_widgets,
                    hidden_optional_widgets,
                    widget_order,
                    favourite_children,
                    favourite_templates,
                    quick_actions,
                    updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, now())
                ON CONFLICT (user_id) DO UPDATE SET
                    operational_focus = EXCLUDED.operational_focus,
                    dashboard_preferences = EXCLUDED.dashboard_preferences,
                    pinned_widgets = EXCLUDED.pinned_widgets,
                    hidden_optional_widgets = EXCLUDED.hidden_optional_widgets,
                    widget_order = EXCLUDED.widget_order,
                    favourite_children = EXCLUDED.favourite_children,
                    favourite_templates = EXCLUDED.favourite_templates,
                    quick_actions = EXCLUDED.quick_actions,
                    updated_at = now()
                """,
                (
                    user_id,
                    _clean(payload.operational_focus),
                    Json(dashboard["dashboard_preferences"]),
                    Json(dashboard["pinned_widgets"]),
                    Json(dashboard["hidden_optional_widgets"]),
                    Json(dashboard["widget_order"]),
                    Json(dashboard["favourite_children"]),
                    Json(dashboard["favourite_templates"]),
                    Json(dashboard["quick_actions"]),
                ),
            )
        conn.commit()
        return get_dashboard_preferences(conn=conn, current_user=current_user)
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Could not update dashboard preferences: {exc}") from exc


@compat_router.get("/profile/dashboard-preferences")
def get_dashboard_preferences_compat(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return get_dashboard_preferences(conn=conn, current_user=current_user)


@compat_router.put("/profile/dashboard-preferences")
def update_dashboard_preferences_compat(
    payload: DashboardPreferencesPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    return update_dashboard_preferences(payload, conn=conn, current_user=current_user)


@compat_router.post("/profile/avatar")
def update_profile_avatar(
    payload: AvatarPayload,
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    image = _clean(payload.profile_image_data)
    if not image or not image.startswith("data:image/"):
        raise HTTPException(status_code=400, detail="Profile image must be an image data URL.")
    user_id = _user_id(current_user)
    try:
        _ensure_preferences_table(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO user_profile_preferences (user_id, profile_image_data, updated_at)
                VALUES (%s, %s, now())
                ON CONFLICT (user_id) DO UPDATE SET
                    profile_image_data = EXCLUDED.profile_image_data,
                    updated_at = now()
                """,
                (user_id, image),
            )
        conn.commit()
        return _profile_payload(conn, user_id)
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Could not update avatar: {exc}") from exc


@compat_router.delete("/profile/avatar")
def delete_profile_avatar(
    conn=Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = _user_id(current_user)
    try:
        _ensure_preferences_table(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE user_profile_preferences
                SET profile_image_data = NULL,
                    updated_at = now()
                WHERE user_id = %s
                """,
                (user_id,),
            )
        conn.commit()
        return _profile_payload(conn, user_id)
    except Exception as exc:
        conn.rollback()
        raise HTTPException(status_code=500, detail=f"Could not remove avatar: {exc}") from exc


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
