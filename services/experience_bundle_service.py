from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from psycopg2.extras import RealDictCursor

from core.policy_engine import context_from_user, policy_engine
from core.provider_context import ProviderContext
from services.connect_service import ConnectService

_COLUMN_CACHE: dict[str, set[str]] = {}
_TABLE_EXISTS_CACHE: dict[str, bool] = {}
HEAVY_FIELD_HINTS = (
    "image_data",
    "photo_data",
    "avatar_data",
    "file_data",
    "document_data",
    "binary",
    "blob",
    "base64",
    "raw_audio",
    "transcript_raw",
)
MAX_INLINE_VALUE_LENGTH = 1200


def _serialise(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    return value


def _trim_value(key: str, value: Any) -> Any:
    if value is None:
        return None
    lower_key = key.lower()
    if any(hint in lower_key for hint in HEAVY_FIELD_HINTS):
        return "[omitted-heavy-field]"
    value = _serialise(value)
    if isinstance(value, str) and len(value) > MAX_INLINE_VALUE_LENGTH:
        return value[:MAX_INLINE_VALUE_LENGTH] + "... [truncated]"
    return value


def _rowdict(row: Any) -> dict[str, Any]:
    return {key: _trim_value(key, value) for key, value in dict(row).items()} if row else {}


def _safe_int(value: Any) -> int | None:
    try:
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def _display_name(row: dict[str, Any]) -> str:
    return (
        row.get("display_name")
        or row.get("preferred_name")
        or " ".join(str(part).strip() for part in (row.get("first_name"), row.get("last_name")) if str(part or "").strip())
        or row.get("full_name")
        or row.get("email")
        or ""
    )


def _age_from_dob(value: Any) -> int | None:
    if not value:
        return None
    try:
        dob = value if isinstance(value, date) else date.fromisoformat(str(value)[:10])
    except Exception:
        return None
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class ExperienceBundleService:
    """Schema-backed UI bundles with honest empty sections when optional tables are absent."""

    def __init__(self, connect_service: ConnectService | None = None) -> None:
        self.connect_service = connect_service or ConnectService()

    def adult_workspace_bundle(self, conn: Any, current_user: dict[str, Any]) -> dict[str, Any]:
        context = self._authorise(current_user, "records:read")
        user_id = _safe_int(current_user.get("user_id") or current_user.get("id"))
        user = self._one_by_id(conn, "users", user_id) if user_id else {}
        staff = self._staff_for_user(conn, user or current_user)
        profile = self._first_for_user(conn, "user_profile_preferences", user_id) if user_id else {}
        preferences = self._dashboard_preferences(conn, user_id)
        home_id = _safe_int(user.get("home_id") or staff.get("home_id") or context.primary_home_id)
        home = self._home(conn, home_id, context)
        handover = self.connect_service.handover_today(conn, current_user, home_id=home_id)
        notifications = self._notifications(conn, current_user, context, home_id=home_id, limit=8)
        connect = self._connect(conn, current_user, context, home_id=home_id)
        children = self._visible_children(conn, context, home_id=home_id)
        actions = self._actions(conn, context, user_id=user_id, home_id=home_id, limit=12)
        chronology = self._chronology(conn, context, home_id=home_id, limit=8)

        display_name = _display_name({**user, **profile}) or _display_name(staff) or _display_name(current_user)
        return {
            "identity": {
                "user_id": user_id,
                "staff_id": staff.get("id") or user.get("staff_profile_id"),
                "display_name": display_name,
                "preferred_name": profile.get("preferred_name") or profile.get("display_name") or user.get("first_name"),
                "email": user.get("email") or current_user.get("email"),
                "role": user.get("role") or staff.get("role") or current_user.get("role"),
                "home_id": home_id,
                "provider_id": user.get("provider_id") or staff.get("provider_id") or context.provider_id,
                "avatar_url": profile.get("profile_image_url") or user.get("avatar_url") or staff.get("avatar_url"),
                "profile_notes": profile.get("notes"),
                "status": staff.get("employment_status") or user.get("status") or "active",
            },
            "home": home,
            "today": {
                "date": date.today().isoformat(),
                "shift": self._current_shift_label(),
                "greeting": f"Good {self._daypart()}, {display_name.split()[0] if display_name else 'there'}",
                "summary": "Live workspace sections are shown when schema-backed records exist.",
            },
            "handover": {
                "status": "available" if handover.get("available") else "unavailable",
                "items": (handover.get("items") or [])[:8],
                "unread_required_count": int((handover.get("summary") or {}).get("unacknowledged") or 0),
                "summary": handover.get("summary") or {},
            },
            "notifications": notifications,
            "connect": connect,
            "children": {
                "visible": children,
                "priority": [child for child in children if str(child.get("summary_risk_level") or "").lower() in {"high", "critical"}],
                "favourites": self._favourites(children, preferences),
            },
            "actions": {
                "open": actions,
                "overdue": [item for item in actions if self._is_overdue(item.get("due_date"))],
                "assigned_to_me": [item for item in actions if user_id and _safe_int(item.get("assigned_to_user_id") or item.get("action_owner_user_id")) == user_id],
            },
            "recent_chronology": chronology,
            "preferences": preferences,
        }

    def child_profile_bundle(self, conn: Any, current_user: dict[str, Any], young_person_id: int) -> dict[str, Any]:
        context = self._authorise(current_user, "records:read")
        child = self._one_by_id(conn, "young_people", young_person_id)
        if not child:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Young person not found")
        self._assert_record_scope(context, child)

        identity_profile = self._first_for_child(conn, "young_person_identity_profile", young_person_id)
        communication = self._first_for_child(conn, "young_person_communication_profile", young_person_id)
        about_me = self._first_for_child(conn, "young_person_all_about_me", young_person_id)
        key_worker = self._one_by_id(conn, "staff", _safe_int(child.get("primary_keyworker_id")))
        active_safeguarding = self._records_for_child(conn, "safeguarding_records", young_person_id, limit=4)
        missing = self._records_for_child(conn, "missing_episodes", young_person_id, limit=4)

        return {
            "identity": {
                "id": child.get("id"),
                "first_name": child.get("first_name"),
                "last_name": child.get("last_name"),
                "preferred_name": child.get("preferred_name") or child.get("first_name"),
                "age": child.get("age") or _age_from_dob(child.get("date_of_birth")),
                "date_of_birth": child.get("date_of_birth"),
                "home_id": child.get("home_id"),
                "provider_id": child.get("provider_id"),
                "placement_status": child.get("placement_status"),
                "key_worker": key_worker or None,
                "photo_url": child.get("photo_url") or child.get("profile_photo_path"),
                "risk_level": child.get("summary_risk_level"),
            },
            "personhood": {
                "what_matters_to_me": identity_profile.get("what_matters_to_me") or about_me.get("what_matters_to_me"),
                "interests": identity_profile.get("interests") or about_me.get("interests"),
                "strengths": identity_profile.get("strengths_summary") or about_me.get("strengths"),
                "aspirations": identity_profile.get("aspirations") or about_me.get("aspirations"),
                "cultural_identity": identity_profile.get("cultural_identity"),
                "religion_or_faith": identity_profile.get("religion_or_faith"),
                "first_language": identity_profile.get("first_language"),
                "dietary_needs": identity_profile.get("dietary_needs"),
            },
            "communication": {
                "communication_style": communication.get("communication_style"),
                "sensory_needs": communication.get("sensory_needs") or communication.get("sensory_profile"),
                "what_helps": communication.get("what_helps") or about_me.get("what_helps"),
                "what_does_not_help": communication.get("what_to_avoid") or communication.get("what_does_not_help"),
                "routines": communication.get("routines_and_predictability") or about_me.get("routines"),
            },
            "relationships": self._records_for_child(conn, "young_person_contacts", young_person_id, limit=12),
            "safety": {
                "current_risk_level": child.get("summary_risk_level"),
                "safeguarding_status": "active" if active_safeguarding else "no_active_records_returned",
                "missing_status": "active" if missing else "no_active_records_returned",
                "active_concerns": active_safeguarding[:4],
            },
            "plans": self._plans(conn, young_person_id),
            "documents": self._records_for_child(conn, "documents", young_person_id, limit=12),
            "recent_chronology": self._records_for_child(conn, "chronology_events", young_person_id, limit=8),
            "evidence": self._records_for_child(conn, "inspection_evidence_facts", young_person_id, limit=8),
            "actions": self._records_for_child(conn, "actions", young_person_id, limit=12),
        }

    def home_operational_bundle(self, conn: Any, current_user: dict[str, Any], home_id: int) -> dict[str, Any]:
        context = self._authorise(current_user, "records:read", home_id=home_id)
        home = self._home(conn, home_id, context)
        if not home:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Home not found")
        children = self._visible_children(conn, context, home_id=home_id)
        safeguarding = self._records_for_home(conn, "safeguarding_records", home_id, limit=12)
        missing = self._records_for_home(conn, "missing_episodes", home_id, limit=12)
        actions = self._actions(conn, context, home_id=home_id, limit=20)
        notifications = self._notifications(conn, current_user, context, home_id=home_id, limit=10)
        connect = self._connect(conn, current_user, context, home_id=home_id)
        handover = self.connect_service.handover_today(conn, current_user, home_id=home_id)
        reg44 = self._records_for_home(conn, "reg44_actions", home_id, limit=10)
        reg45 = self._records_for_home(conn, "reg45_actions", home_id, limit=10)

        return {
            "home": home,
            "today": {"date": date.today().isoformat(), "shift": self._current_shift_label()},
            "children_needing_attention": [
                child for child in children if str(child.get("summary_risk_level") or "").lower() in {"high", "critical"}
            ],
            "safeguarding": {"open_count": len(safeguarding), "items": safeguarding},
            "missing": {"open_count": len(missing), "items": missing},
            "handover": {
                "status": "available" if handover.get("available") else "unavailable",
                "items": (handover.get("items") or [])[:8],
                "summary": handover.get("summary") or {},
            },
            "notifications": notifications,
            "connect": connect,
            "inspection": {
                "reg44_open": reg44,
                "reg45_open": reg45,
                "readiness": self._latest_for_home(conn, "inspection_readiness_runs", home_id),
            },
            "actions": actions,
            "recent_chronology": self._records_for_home(conn, "chronology_events", home_id, limit=10),
            "operational_pressure": {
                "children_count": len(children),
                "safeguarding_open": len(safeguarding),
                "missing_open": len(missing),
                "actions_open": len(actions),
                "notifications_unread": notifications["unread_count"],
                "connect_unread": connect["unread_count"],
            },
        }

    def _authorise(self, current_user: dict[str, Any], permission: str, home_id: int | None = None) -> ProviderContext:
        decision = policy_engine.evaluate(current_user, permission, home_id=home_id)
        if not decision.allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission for this workspace.")
        return context_from_user(current_user)

    def _table_exists(self, conn: Any, table_name: str) -> bool:
        if table_name in _TABLE_EXISTS_CACHE:
            return _TABLE_EXISTS_CACHE[table_name]
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists",
                (table_name,),
            )
            row = cur.fetchone()
        exists = bool(row and row.get("exists"))
        _TABLE_EXISTS_CACHE[table_name] = exists
        return exists

    def _columns(self, conn: Any, table_name: str) -> set[str]:
        if table_name in _COLUMN_CACHE:
            return _COLUMN_CACHE[table_name]
        if not self._table_exists(conn, table_name):
            _COLUMN_CACHE[table_name] = set()
            return set()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s",
                (table_name,),
            )
            columns = {str(row["column_name"]) for row in cur.fetchall()}
        _COLUMN_CACHE[table_name] = columns
        return columns

    def _select_sql(self, table_name: str, columns: set[str]) -> str:
        selected = [column for column in columns if not any(hint in column.lower() for hint in HEAVY_FIELD_HINTS)]
        if not selected:
            selected = list(columns)
        ordered = sorted(selected, key=lambda value: (value != "id", value))
        return f'SELECT {", ".join(f"\"{column}\"" for column in ordered)} FROM "{table_name}"'

    def _one_by_id(self, conn: Any, table_name: str, record_id: int | None) -> dict[str, Any]:
        if not record_id:
            return {}
        columns = self._columns(conn, table_name)
        if "id" not in columns:
            return {}
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'{self._select_sql(table_name, columns)} WHERE id = %s LIMIT 1', (record_id,))
            return _rowdict(cur.fetchone())

    def _first_for_user(self, conn: Any, table_name: str, user_id: int | None) -> dict[str, Any]:
        columns = self._columns(conn, table_name)
        user_col = "user_id" if "user_id" in columns else "id" if "id" in columns else None
        if not user_id or not user_col:
            return {}
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'{self._select_sql(table_name, columns)} WHERE {user_col} = %s LIMIT 1', (user_id,))
            return _rowdict(cur.fetchone())

    def _first_for_child(self, conn: Any, table_name: str, young_person_id: int) -> dict[str, Any]:
        columns = self._columns(conn, table_name)
        if "young_person_id" not in columns:
            return {}
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'{self._select_sql(table_name, columns)} WHERE young_person_id = %s ORDER BY id DESC LIMIT 1', (young_person_id,))
            return _rowdict(cur.fetchone())

    def _staff_for_user(self, conn: Any, user: dict[str, Any]) -> dict[str, Any]:
        columns = self._columns(conn, "staff")
        if not columns:
            return {}
        staff_id = _safe_int(user.get("staff_profile_id") or user.get("staff_id"))
        clauses: list[str] = []
        params: list[Any] = []
        if staff_id and "id" in columns:
            clauses.append("id = %s")
            params.append(staff_id)
        if user.get("email") and "email" in columns:
            clauses.append("email = %s")
            params.append(user["email"])
        if not clauses:
            return {}
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(f'{self._select_sql("staff", columns)} WHERE {" OR ".join(clauses)} LIMIT 1', tuple(params))
            return _rowdict(cur.fetchone())

    def _home(self, conn: Any, home_id: int | None, context: ProviderContext) -> dict[str, Any]:
        home = self._one_by_id(conn, "homes", home_id)
        if home:
            self._assert_record_scope(context, home)
        return home

    def _visible_children(self, conn: Any, context: ProviderContext, home_id: int | None = None) -> list[dict[str, Any]]:
        columns = self._columns(conn, "young_people")
        if not columns:
            return []
        where: list[str] = []
        params: list[Any] = []
        if "archived" in columns:
            where.append("COALESCE(archived, FALSE) = FALSE")
        if home_id and "home_id" in columns:
            where.append("home_id = %s")
            params.append(home_id)
        elif context.tenancy_scope == "home" and "home_id" in columns:
            where.append("home_id = ANY(%s)")
            params.append(list(context.home_ids))
        if context.provider_id and context.tenancy_scope != "platform" and "provider_id" in columns:
            where.append("provider_id = %s")
            params.append(context.provider_id)
        sql = self._select_sql("young_people", columns)
        if where:
            sql += f" WHERE {' AND '.join(where)}"
        sql += " ORDER BY first_name, last_name LIMIT 30" if {"first_name", "last_name"} <= columns else " ORDER BY id LIMIT 30"
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, tuple(params))
            return [_rowdict(row) for row in cur.fetchall()]

    def _records_for_child(self, conn: Any, table_name: str, young_person_id: int, limit: int) -> list[dict[str, Any]]:
        columns = self._columns(conn, table_name)
        if "young_person_id" not in columns:
            return []
        order_col = self._order_column(columns)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f'{self._select_sql(table_name, columns)} WHERE young_person_id = %s ORDER BY "{order_col}" DESC LIMIT %s',
                (young_person_id, limit),
            )
            return [_rowdict(row) for row in cur.fetchall()]

    def _records_for_home(self, conn: Any, table_name: str, home_id: int, limit: int) -> list[dict[str, Any]]:
        columns = self._columns(conn, table_name)
        if "home_id" not in columns:
            return []
        order_col = self._order_column(columns)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f'{self._select_sql(table_name, columns)} WHERE home_id = %s ORDER BY "{order_col}" DESC LIMIT %s',
                (home_id, limit),
            )
            return [_rowdict(row) for row in cur.fetchall()]

    def _latest_for_home(self, conn: Any, table_name: str, home_id: int) -> dict[str, Any]:
        records = self._records_for_home(conn, table_name, home_id, limit=1)
        return records[0] if records else {}

    def _plans(self, conn: Any, young_person_id: int) -> list[dict[str, Any]]:
        plans: list[dict[str, Any]] = []
        for table_name in ("risk_assessments", "placement_plans", "support_plans", "behaviour_support_plans", "safety_plans"):
            for row in self._records_for_child(conn, table_name, young_person_id, limit=3):
                plans.append({"source": table_name, **row})
        return plans[:12]

    def _actions(self, conn: Any, context: ProviderContext, user_id: int | None = None, home_id: int | None = None, limit: int = 20) -> list[dict[str, Any]]:
        for table_name in ("actions", "care_actions", "tasks", "handover_items"):
            rows = self._scoped_rows(conn, table_name, context, user_id=user_id, home_id=home_id, limit=limit)
            if rows:
                return rows
        return []

    def _chronology(self, conn: Any, context: ProviderContext, home_id: int | None, limit: int) -> list[dict[str, Any]]:
        if home_id:
            return self._records_for_home(conn, "chronology_events", home_id, limit=limit)
        return self._scoped_rows(conn, "chronology_events", context, limit=limit)

    def _scoped_rows(
        self,
        conn: Any,
        table_name: str,
        context: ProviderContext,
        *,
        user_id: int | None = None,
        home_id: int | None = None,
        limit: int = 20,
    ) -> list[dict[str, Any]]:
        columns = self._columns(conn, table_name)
        if not columns:
            return []
        where: list[str] = []
        params: list[Any] = []
        if home_id and "home_id" in columns:
            where.append("home_id = %s")
            params.append(home_id)
        elif context.tenancy_scope == "home" and "home_id" in columns:
            where.append("home_id = ANY(%s)")
            params.append(list(context.home_ids))
        if context.provider_id and context.tenancy_scope != "platform" and "provider_id" in columns:
            where.append("provider_id = %s")
            params.append(context.provider_id)
        if user_id:
            user_cols = [col for col in ("assigned_to_user_id", "action_owner_user_id", "user_id") if col in columns]
            if user_cols:
                where.append("(" + " OR ".join(f"{col} = %s" for col in user_cols) + ")")
                params.extend([user_id] * len(user_cols))
        order_col = self._order_column(columns)
        sql = self._select_sql(table_name, columns)
        if where:
            sql += f" WHERE {' AND '.join(where)}"
        sql += f' ORDER BY "{order_col}" DESC LIMIT %s'
        params.append(limit)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(sql, tuple(params))
            return [_rowdict(row) for row in cur.fetchall()]

    def _dashboard_preferences(self, conn: Any, user_id: int | None) -> dict[str, Any]:
        try:
            result = self.connect_service.dashboard_preferences(conn, {"id": user_id, "role": "admin"} if user_id else {"id": 0, "role": "admin"})
            preferences = result.get("preferences") or {}
        except Exception:
            preferences = {}
        return {
            "layout": preferences.get("layout") or [],
            "pinned_widgets": preferences.get("pinned_widgets") or preferences.get("pinnedWidgets") or [],
            "hidden_optional_widgets": preferences.get("hidden_optional_widgets") or [],
            "favourite_children": preferences.get("favourite_children") or [],
            "favourite_templates": preferences.get("favourite_templates") or [],
        }

    def _notifications(self, conn: Any, current_user: dict[str, Any], context: ProviderContext, home_id: int | None, limit: int) -> dict[str, Any]:
        connect_notifications = self.connect_service.notifications(conn, current_user, unread_only=False, limit=limit)
        items = connect_notifications.get("items") or []
        operational = self._scoped_rows(conn, "notifications", context, home_id=home_id, limit=limit)
        if operational:
            items = [*items, *operational]
        return {
            "unread_count": len([item for item in items if not item.get("read_at") and not item.get("acknowledged_at")]),
            "items": items[:limit],
        }

    def _connect(self, conn: Any, current_user: dict[str, Any], context: ProviderContext, home_id: int | None) -> dict[str, Any]:
        unread = self.connect_service.unread(conn, current_user)
        threads = self.connect_service.list_threads(conn, current_user, home_id=home_id, limit=5)
        home_channel = next((thread for thread in threads.get("items", []) if thread.get("thread_type") == "home_channel"), None)
        return {
            "unread_count": int(unread.get("count") or 0),
            "recent_threads": threads.get("items") or [],
            "home_channel": home_channel,
        }

    def _favourites(self, children: list[dict[str, Any]], preferences: dict[str, Any]) -> list[dict[str, Any]]:
        favourite_ids = {str(item) for item in preferences.get("favourite_children") or []}
        return [child for child in children if str(child.get("id")) in favourite_ids]

    def _assert_record_scope(self, context: ProviderContext, record: dict[str, Any]) -> None:
        provider_id = _safe_int(record.get("provider_id"))
        home_id = _safe_int(record.get("home_id"))
        if provider_id and context.tenancy_scope != "platform" and context.provider_id and provider_id != context.provider_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Provider scope is not permitted.")
        if home_id and context.tenancy_scope == "home" and not context.can_access_home(home_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Home scope is not permitted.")

    def _order_column(self, columns: set[str]) -> str:
        for column in ("event_datetime", "created_at", "updated_at", "due_date", "date", "id"):
            if column in columns:
                return column
        return next(iter(columns))

    def _is_overdue(self, value: Any) -> bool:
        if not value:
            return False
        try:
            return date.fromisoformat(str(value)[:10]) < date.today()
        except Exception:
            return False

    def _current_shift_label(self) -> str:
        hour = datetime.now(timezone.utc).hour
        if 5 <= hour < 12:
            return "morning"
        if 12 <= hour < 18:
            return "afternoon"
        return "evening"

    def _daypart(self) -> str:
        return self._current_shift_label()