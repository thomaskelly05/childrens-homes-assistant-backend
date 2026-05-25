"""Session-backed OS scope — lightweight home/child lists only."""

from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Any, Literal

from auth.rbac import normalise_role
from db.connection import (
    DatabaseUnavailableError,
    acquire_optional_dashboard_connection,
    is_pool_under_pressure,
    release_db_connection,
)
from core.policy_engine import context_from_user
from schemas.os_scope import (
    OsScopeChildOption,
    OsScopeHomeOption,
    OsScopeMenuSummary,
    OsScopeRoutes,
    OsScopeSelectRequest,
    OsScopeState,
    OsScopeType,
)
from services.os_cache_service import os_cache_service

logger = logging.getLogger("indicare.os_scope")

SESSION_SCOPE_TYPE = "os_scope_type"
SESSION_HOME_ID = "os_selected_home_id"
SESSION_HOME_NAME = "os_selected_home_name"
SESSION_CHILD_ID = "os_selected_child_id"
SESSION_CHILD_NAME = "os_selected_child_name"
SESSION_RECENT_HOMES = "os_recent_homes"
SESSION_RECENT_CHILDREN = "os_recent_children"

OPTIONS_CACHE_TTL = 20.0
MENU_SUMMARY_CACHE_TTL = 15.0

HomeAccessSource = Literal[
    "admin_all_homes",
    "provider_scope",
    "assigned_home",
    "allowed_home_ids",
    "none",
]

PLATFORM_ROLES = frozenset(
    {
        "super_admin",
        "superadmin",
        "system_admin",
        "founder",
        "owner",
    }
)

PROVIDER_SCOPE_ROLES = frozenset(
    {
        "admin",
        "administrator",
        "provider",
        "provider_admin",
        "ri",
        "responsible_individual",
        "registered_manager",
        "operations_manager",
        "regional_manager",
    }
)

MANAGER_ASSIGNED_ROLES = frozenset(
    {
        "manager",
        "deputy_manager",
        "deputy",
        "senior",
        "senior_support_worker",
    }
)

STAFF_ASSIGNED_ROLES = frozenset(
    {
        "support_worker",
        "staff",
        "rsw",
        "residential_support_worker",
        "key_worker",
    }
)

ADMIN_METADATA_ROLES = PLATFORM_ROLES | frozenset({"admin", "administrator", "provider_admin"})

ACTIVE_CHILD_STATUSES = frozenset({"active", "planned", "emergency", "transition", ""})


@dataclass(frozen=True)
class HomeAccessResolution:
    source: HomeAccessSource
    mode: Literal["all_active", "provider", "ids", "none"]
    home_ids: tuple[int, ...] = ()
    provider_id: int | None = None


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, "", "null", "None"):
            return None
        parsed = int(value)
        return parsed if parsed > 0 else None
    except (TypeError, ValueError):
        return None


def _int_values(value: Any) -> tuple[int, ...]:
    if value in (None, ""):
        return ()
    values = value if isinstance(value, (list, tuple, set)) else [value]
    clean = {_safe_int(item) for item in values}
    return tuple(sorted(item for item in clean if item is not None))


def _user_home_id(user: dict[str, Any]) -> int | None:
    return _safe_int(user.get("home_id") or user.get("selected_home_id") or user.get("default_home_id"))


def _user_provider_id(user: dict[str, Any]) -> int | None:
    return _safe_int(user.get("provider_id") or user.get("providerId"))


def _raw_role(user: dict[str, Any]) -> str:
    return str(user.get("role") or "staff").strip().lower().replace("-", "_").replace(" ", "_")


def _role(user: dict[str, Any]) -> str:
    return normalise_role(user.get("role")) or _raw_role(user)


def _user_id(user: dict[str, Any]) -> int | None:
    return _safe_int(user.get("user_id") or user.get("id"))


def _can_show_admin_metadata(user: dict[str, Any]) -> bool:
    raw = _raw_role(user)
    role = _role(user)
    return raw in ADMIN_METADATA_ROLES or role in ADMIN_METADATA_ROLES


def _resolve_home_access(user: dict[str, Any]) -> HomeAccessResolution:
    """Determine which homes the scope selector may list for this user."""
    context = context_from_user(user)
    raw = _raw_role(user)
    role = _role(user)
    provider_id = _user_provider_id(user) or context.provider_id
    explicit_ids = _int_values(
        user.get("allowed_home_ids")
        or user.get("allowedHomeIds")
        or user.get("home_ids")
        or user.get("homeIds")
    )
    context_ids = tuple(context.home_ids)

    if context.tenancy_scope == "platform" or raw in PLATFORM_ROLES:
        return HomeAccessResolution("admin_all_homes", "all_active")

    if (
        context.tenancy_scope == "provider"
        or (provider_id and (raw in PROVIDER_SCOPE_ROLES or role in PROVIDER_SCOPE_ROLES))
        or context.provider_oversight_access
    ) and provider_id:
        return HomeAccessResolution("provider_scope", "provider", provider_id=provider_id)

    if len(explicit_ids) > 1:
        return HomeAccessResolution("allowed_home_ids", "ids", home_ids=explicit_ids)

    if context_ids:
        source: HomeAccessSource = "assigned_home" if len(context_ids) == 1 else "allowed_home_ids"
        return HomeAccessResolution(source, "ids", home_ids=context_ids)

    if explicit_ids:
        return HomeAccessResolution("assigned_home", "ids", home_ids=explicit_ids)

    if raw in MANAGER_ASSIGNED_ROLES | STAFF_ASSIGNED_ROLES or role in MANAGER_ASSIGNED_ROLES | STAFF_ASSIGNED_ROLES:
        primary = _user_home_id(user)
        if primary:
            return HomeAccessResolution("assigned_home", "ids", home_ids=(primary,))

    return HomeAccessResolution("none", "none")


def _user_can_access_home(user: dict[str, Any], home_id: int | None, access: HomeAccessResolution | None = None) -> bool:
    if not home_id:
        return False
    resolved = access or _resolve_home_access(user)
    if resolved.mode == "all_active":
        return True
    if resolved.mode == "provider":
        return True
    if resolved.mode == "ids":
        return home_id in resolved.home_ids
    return False


def _fetch_assigned_home_ids_from_db(conn: Any, user_id: int) -> tuple[int, ...]:
    ids: set[int] = set()
    queries = (
        (
            "os_user_home_access",
            """
            SELECT home_id
            FROM os_user_home_access
            WHERE user_id = %s
              AND active = TRUE
              AND (ends_at IS NULL OR ends_at > NOW())
            """,
        ),
        (
            "staff_home_assignments",
            """
            SELECT home_id
            FROM staff_home_assignments
            WHERE user_id = %s
              AND COALESCE(active, TRUE) = TRUE
            """,
        ),
    )
    with conn.cursor() as cur:
        for table, sql in queries:
            cur.execute(
                "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists",
                (table,),
            )
            exists_row = cur.fetchone()
            exists = bool(exists_row.get("exists") if isinstance(exists_row, dict) else exists_row and exists_row[0])
            if not exists:
                continue
            try:
                cur.execute(sql, (user_id,))
                for row in cur.fetchall():
                    data = dict(row) if isinstance(row, dict) else {"home_id": row[0]}
                    hid = _safe_int(data.get("home_id"))
                    if hid:
                        ids.add(hid)
            except Exception as exc:
                logger.debug("os_scope_assigned_homes_skip table=%s error=%s", table, exc)
    return tuple(sorted(ids))


def _merge_db_assigned_homes(user: dict[str, Any], access: HomeAccessResolution, conn: Any) -> HomeAccessResolution:
    if access.mode in {"all_active", "provider", "none"}:
        return access
    user_id = _user_id(user)
    if not user_id:
        return access
    db_ids = _fetch_assigned_home_ids_from_db(conn, user_id)
    if not db_ids:
        return access
    merged = tuple(sorted(set(access.home_ids).union(db_ids)))
    source: HomeAccessSource = access.source
    if len(merged) > 1 and source == "assigned_home":
        source = "allowed_home_ids"
    return HomeAccessResolution(source, "ids", home_ids=merged, provider_id=access.provider_id)


def _read_session_list(session: dict[str, Any], key: str) -> list[dict[str, Any]]:
    raw = session.get(key)
    if not isinstance(raw, list):
        return []
    return [item for item in raw if isinstance(item, dict) and _safe_int(item.get("id"))]


def _write_session_list(session: dict[str, Any], key: str, items: list[dict[str, Any]], *, limit: int = 6) -> None:
    session[key] = items[:limit]


def _push_recent(session: dict[str, Any], key: str, item: dict[str, Any]) -> None:
    item_id = _safe_int(item.get("id"))
    if not item_id:
        return
    recent = [row for row in _read_session_list(session, key) if _safe_int(row.get("id")) != item_id]
    recent.insert(0, item)
    _write_session_list(session, key, recent)


def _routes_for(scope_type: OsScopeType, home_id: int | None, child_id: int | None) -> OsScopeRoutes:
    routes = OsScopeRoutes()
    if scope_type == "home" and home_id:
        routes.home_workspace = f"/homes/{home_id}/workspace"
    if scope_type == "child" and child_id:
        routes.child_workspace = f"/os/young-people/{child_id}/workspace"
    return routes


def _scope_from_session(session: dict[str, Any]) -> tuple[OsScopeType, int | None, int | None, str | None, str | None]:
    scope_type = str(session.get(SESSION_SCOPE_TYPE) or "none").lower()
    if scope_type not in {"none", "home", "child"}:
        scope_type = "none"
    home_id = _safe_int(session.get(SESSION_HOME_ID))
    child_id = _safe_int(session.get(SESSION_CHILD_ID))
    home_name = session.get(SESSION_HOME_NAME)
    child_name = session.get(SESSION_CHILD_NAME)
    if scope_type == "child" and not child_id:
        scope_type = "none"
    if scope_type == "home" and not home_id:
        scope_type = "none"
    return scope_type, home_id, child_id, str(home_name) if home_name else None, str(child_name) if child_name else None  # type: ignore[return-value]


def _home_option_from_row(data: dict[str, Any]) -> OsScopeHomeOption | None:
    hid = _safe_int(data.get("id"))
    if not hid:
        return None
    name = str(data.get("name") or f"Home {hid}")
    return OsScopeHomeOption(
        id=hid,
        name=name,
        status=str(data.get("status")) if data.get("status") else None,
        address=str(data.get("address")) if data.get("address") else None,
        provider_id=_safe_int(data.get("provider_id")),
        route=f"/homes/{hid}/workspace",
    )


def _discover_home_table(cur: Any) -> tuple[str, str, str, set[str]] | None:
    for table in ("homes", "care_homes", "children_homes"):
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists",
            (table,),
        )
        exists_row = cur.fetchone()
        exists = bool(exists_row.get("exists") if isinstance(exists_row, dict) else exists_row and exists_row[0])
        if not exists:
            continue
        cur.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = %s",
            (table,),
        )
        cols = {str(r["column_name"] if isinstance(r, dict) else r[0]) for r in cur.fetchall()}
        id_col = "id" if "id" in cols else "home_id" if "home_id" in cols else None
        name_col = "name" if "name" in cols else "home_name" if "home_name" in cols else "title" if "title" in cols else None
        if id_col and name_col:
            return table, id_col, name_col, cols
    return None


def _query_homes_from_db(cur: Any, access: HomeAccessResolution) -> list[OsScopeHomeOption]:
    if access.mode == "none":
        return []

    discovered = _discover_home_table(cur)
    if not discovered:
        return []

    table, id_col, name_col, cols = discovered
    where: list[str] = []
    params: list[Any] = []

    if "archived" in cols:
        where.append("COALESCE(archived, FALSE) = FALSE")
    elif "status" in cols:
        where.append("(status IS NULL OR LOWER(status) IN ('active', 'open'))")

    if access.mode == "provider" and access.provider_id is not None and "provider_id" in cols:
        where.append("provider_id = %s")
        params.append(access.provider_id)
    elif access.mode == "ids" and access.home_ids:
        placeholders = ", ".join(["%s"] * len(access.home_ids))
        where.append(f'"{id_col}" IN ({placeholders})')
        params.extend(access.home_ids)

    where_sql = "WHERE " + " AND ".join(where) if where else ""
    extra_cols: list[str] = []
    if "status" in cols:
        extra_cols.append("status")
    if "address" in cols:
        extra_cols.append("address")
    elif "address_line_1" in cols:
        extra_cols.append("address_line_1 AS address")
    if "provider_id" in cols:
        extra_cols.append("provider_id")
    extra_sql = ", " + ", ".join(extra_cols) if extra_cols else ""

    cur.execute(
        f'SELECT "{id_col}" AS id, "{name_col}" AS name{extra_sql} FROM public."{table}" {where_sql} ORDER BY "{name_col}" ASC LIMIT 200',
        tuple(params),
    )

    rows: list[OsScopeHomeOption] = []
    seen: set[int] = set()
    for row in cur.fetchall():
        option = _home_option_from_row(dict(row))
        if not option or option.id in seen:
            continue
        if access.mode == "ids" and option.id not in access.home_ids:
            continue
        seen.add(option.id)
        rows.append(option)
    return rows


def _fallback_homes(user: dict[str, Any], access: HomeAccessResolution) -> list[OsScopeHomeOption]:
    if access.mode == "none":
        return []
    homes: list[OsScopeHomeOption] = []
    for home_id in access.home_ids:
        name = str(user.get("home_name") or user.get("selected_home_name") or f"Home {home_id}")
        homes.append(
            OsScopeHomeOption(
                id=home_id,
                name=name,
                status="active",
                route=f"/homes/{home_id}/workspace",
            )
        )
    if access.mode == "all_active" or access.mode == "provider":
        return []
    primary = _user_home_id(user)
    if primary and not homes:
        homes.append(
            OsScopeHomeOption(
                id=primary,
                name=str(user.get("home_name") or f"Home {primary}"),
                status="active",
                route=f"/homes/{primary}/workspace",
            )
        )
    return homes


def _list_homes_lightweight(user: dict[str, Any]) -> tuple[list[OsScopeHomeOption], list[str], bool, HomeAccessResolution]:
    warnings: list[str] = []
    degraded = False
    access = _resolve_home_access(user)

    if access.mode == "none":
        warnings.append("No homes are currently linked to your account.")
        return [], warnings, False, access

    if is_pool_under_pressure():
        fallback = _fallback_homes(user, access)
        if fallback:
            return fallback, ["Database busy — showing permitted homes from your profile."], True, access
        return [], ["Home and child list unavailable. Retry shortly."], True, access

    with acquire_optional_dashboard_connection(timeout=0.15) as conn:
        if conn is None:
            fallback = _fallback_homes(user, access)
            if fallback:
                return fallback, ["Database busy — home list deferred."], True, access
            return [], ["Home and child list unavailable. Retry shortly."], True, access

        access = _merge_db_assigned_homes(user, access, conn)
        if access.mode == "ids" and not access.home_ids:
            warnings.append("No homes are currently linked to your account.")
            return [], warnings, False, access

        rows: list[OsScopeHomeOption] = []
        try:
            with conn.cursor() as cur:
                rows = _query_homes_from_db(cur, access)
        except DatabaseUnavailableError:
            degraded = True
            warnings.append("Home and child list unavailable. Retry shortly.")
            rows = _fallback_homes(user, access)
        except Exception as exc:
            logger.warning("os_scope_homes_failed error=%s", exc)
            warnings.append("Home list could not be loaded.")
            rows = _fallback_homes(user, access)
            degraded = True
        finally:
            release_db_connection(conn)

    if not rows:
        rows = _fallback_homes(user, access)
        if not rows and access.mode != "none":
            warnings.append("No homes are currently linked to your account.")

    return rows, warnings, degraded, access


def _child_name(row: dict[str, Any]) -> str:
    preferred = row.get("preferred_name")
    if preferred:
        return str(preferred)
    first = str(row.get("first_name") or "").strip()
    last = str(row.get("last_name") or "").strip()
    combined = " ".join(part for part in (first, last) if part).strip()
    return combined or str(row.get("name") or row.get("full_name") or "Young person")


def _is_active_child(row: dict[str, Any]) -> bool:
    if _normalise_bool(row.get("archived")):
        return False
    status = str(row.get("placement_status") or row.get("status") or "active").strip().lower()
    return status in ACTIVE_CHILD_STATUSES


def _normalise_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if value is None:
        return False
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes", "y", "on"}
    return bool(value)


def _list_children_for_home(
    user: dict[str, Any],
    home_id: int | None,
    *,
    access: HomeAccessResolution | None = None,
) -> tuple[list[OsScopeChildOption], list[str], bool]:
    warnings: list[str] = []
    degraded = False
    if not home_id:
        return [], [], False

    resolved = access or _resolve_home_access(user)
    if not _user_can_access_home(user, home_id, resolved):
        return [], ["You do not have access to children in that home."], False

    if is_pool_under_pressure():
        return [], ["Database busy — child list deferred."], True

    with acquire_optional_dashboard_connection(timeout=0.15) as conn:
        if conn is None:
            return [], ["Database busy — child list deferred."], True

        children: list[OsScopeChildOption] = []
        try:
            from services import young_people_service as yp

            rows = yp.list_young_people(
                conn,
                home_id=home_id,
                provider_id=_user_provider_id(user) if resolved.mode == "provider" else None,
                limit=80,
            )
            for row in rows:
                if not _is_active_child(row):
                    continue
                cid = _safe_int(row.get("id"))
                if not cid:
                    continue
                row_home = _safe_int(row.get("home_id")) or home_id
                if row_home != home_id:
                    continue
                children.append(
                    OsScopeChildOption(
                        id=cid,
                        name=_child_name(row),
                        home_id=row_home,
                        placement_status=str(row.get("placement_status") or row.get("status") or "") or None,
                    )
                )
            if not children:
                warnings.append("No children are currently available for this home.")
        except DatabaseUnavailableError:
            degraded = True
            warnings.append("Database busy — children unavailable.")
        except Exception as exc:
            logger.warning("os_scope_children_failed home_id=%s error=%s", home_id, exc)
            warnings.append("Child list could not be loaded.")
            degraded = True
        finally:
            release_db_connection(conn)

        return children, warnings, degraded


class OsScopeService:
    def get_options(self, user: dict[str, Any], session: dict[str, Any], *, home_id: int | None = None) -> OsScopeState:
        cache_key = f"os_scope:options:{user.get('id')}:{home_id or 'all'}"
        lookup = os_cache_service.get(cache_key)
        if lookup.hit and isinstance(lookup.value, dict):
            return OsScopeState.model_validate(lookup.value)

        scope_type, sel_home, sel_child, sel_home_name, sel_child_name = _scope_from_session(session)
        homes, home_warnings, home_degraded, access = _list_homes_lightweight(user)
        target_home = home_id or sel_home
        children: list[OsScopeChildOption] = []
        child_warnings: list[str] = []
        child_degraded = False
        if target_home:
            children, child_warnings, child_degraded = _list_children_for_home(user, target_home, access=access)

        recent_homes = [
            OsScopeHomeOption.model_validate(item)
            for item in _read_session_list(session, SESSION_RECENT_HOMES)
            if _safe_int(item.get("id"))
        ]
        recent_children = [
            OsScopeChildOption.model_validate(item)
            for item in _read_session_list(session, SESSION_RECENT_CHILDREN)
            if _safe_int(item.get("id"))
        ]

        metadata: dict[str, Any] = {}
        if _can_show_admin_metadata(user):
            metadata = {
                "home_access_source": access.source,
                "home_count": len(homes),
                "child_count": len(children),
                "selected_home_id": target_home,
            }

        state = OsScopeState(
            scope_type=scope_type,
            selected_home_id=sel_home,
            selected_home_name=sel_home_name,
            selected_child_id=sel_child,
            selected_child_name=sel_child_name,
            recent_homes=recent_homes,
            recent_children=recent_children,
            available_homes=homes,
            available_children=children,
            available_children_for_home=children,
            routes=_routes_for(scope_type, sel_home, sel_child),
            warnings=[*home_warnings, *child_warnings],
            degraded=home_degraded or child_degraded,
            cache_status=lookup.status if lookup.hit else "miss",
            metadata=metadata,
        )
        if not (home_degraded or child_degraded or is_pool_under_pressure()):
            os_cache_service.set(cache_key, state.model_dump(), ttl_seconds=OPTIONS_CACHE_TTL)
        return state

    def get_current(self, user: dict[str, Any], session: dict[str, Any]) -> OsScopeState:
        scope_type, home_id, child_id, home_name, child_name = _scope_from_session(session)
        recent_homes = [
            OsScopeHomeOption.model_validate(item)
            for item in _read_session_list(session, SESSION_RECENT_HOMES)
            if _safe_int(item.get("id"))
        ]
        recent_children = [
            OsScopeChildOption.model_validate(item)
            for item in _read_session_list(session, SESSION_RECENT_CHILDREN)
            if _safe_int(item.get("id"))
        ]
        children: list[OsScopeChildOption] = []
        warnings: list[str] = []
        degraded = False
        access = _resolve_home_access(user)
        if home_id and scope_type in {"home", "child"}:
            children, child_warnings, child_degraded = _list_children_for_home(user, home_id, access=access)
            warnings.extend(child_warnings)
            degraded = degraded or child_degraded

        return OsScopeState(
            scope_type=scope_type,
            selected_home_id=home_id,
            selected_home_name=home_name,
            selected_child_id=child_id,
            selected_child_name=child_name,
            recent_homes=recent_homes,
            recent_children=recent_children,
            available_homes=[],
            available_children=children if scope_type in {"home", "child"} else [],
            available_children_for_home=children if scope_type in {"home", "child"} else [],
            routes=_routes_for(scope_type, home_id, child_id),
            warnings=warnings,
            degraded=degraded,
        )

    def select_scope(self, user: dict[str, Any], session: dict[str, Any], payload: OsScopeSelectRequest) -> OsScopeState:
        scope_type = payload.scope_type
        home_id = _safe_int(payload.home_id) or _user_home_id(user)
        child_id = _safe_int(payload.child_id)
        home_name = payload.home_name
        child_name = payload.child_name

        if scope_type == "home":
            if not home_id:
                raise ValueError("home_id is required for home scope")
            if not _user_can_access_home(user, home_id):
                raise ValueError("You do not have access to that home.")
            session[SESSION_SCOPE_TYPE] = "home"
            session[SESSION_HOME_ID] = home_id
            session[SESSION_HOME_NAME] = home_name or f"Home {home_id}"
            session.pop(SESSION_CHILD_ID, None)
            session.pop(SESSION_CHILD_NAME, None)
            _push_recent(session, SESSION_RECENT_HOMES, {"id": home_id, "name": session[SESSION_HOME_NAME]})
        elif scope_type == "child":
            if not child_id:
                raise ValueError("child_id is required for child scope")
            session[SESSION_SCOPE_TYPE] = "child"
            session[SESSION_CHILD_ID] = child_id
            session[SESSION_CHILD_NAME] = child_name or f"Young person {child_id}"
            if home_id:
                if not _user_can_access_home(user, home_id):
                    raise ValueError("You do not have access to that home.")
                session[SESSION_HOME_ID] = home_id
                if home_name:
                    session[SESSION_HOME_NAME] = home_name
            _push_recent(
                session,
                SESSION_RECENT_CHILDREN,
                {"id": child_id, "name": session[SESSION_CHILD_NAME], "home_id": home_id},
            )
            if home_id:
                _push_recent(session, SESSION_RECENT_HOMES, {"id": home_id, "name": session.get(SESSION_HOME_NAME) or f"Home {home_id}"})
        else:
            self.clear_scope(session)
            return self.get_current(user, session)

        os_cache_service.invalidate_prefix(f"os_scope:options:{user.get('id')}")
        os_cache_service.invalidate_prefix(f"os_scope:menu:{user.get('id')}")
        return self.get_current(user, session)

    def clear_scope(self, session: dict[str, Any]) -> None:
        for key in (
            SESSION_SCOPE_TYPE,
            SESSION_HOME_ID,
            SESSION_HOME_NAME,
            SESSION_CHILD_ID,
            SESSION_CHILD_NAME,
        ):
            session.pop(key, None)
        session[SESSION_SCOPE_TYPE] = "none"

    def menu_summary(
        self,
        user: dict[str, Any],
        *,
        scope_type: OsScopeType = "none",
        home_id: int | None = None,
        child_id: int | None = None,
    ) -> OsScopeMenuSummary:
        cache_key = f"os_scope:menu:{user.get('id')}:{scope_type}:{home_id}:{child_id}"
        lookup = os_cache_service.get(cache_key)
        if lookup.hit and isinstance(lookup.value, dict):
            return OsScopeMenuSummary.model_validate(lookup.value)

        started = time.perf_counter()
        warnings: list[str] = []
        degraded = is_pool_under_pressure()

        if scope_type == "none" or (not home_id and not child_id):
            summary = OsScopeMenuSummary(
                scope_type="none",
                warnings=["Select a home or child for scoped counts."],
                degraded=degraded,
                cache_status="fast_empty",
            )
            os_cache_service.set(cache_key, summary.model_dump(), ttl_seconds=MENU_SUMMARY_CACHE_TTL)
            return summary

        recording_count = 0
        action_count = 0
        notification_count = 0
        handover_count = 0

        if degraded:
            warnings.append("Database busy — menu counts deferred.")
        else:
            with acquire_optional_dashboard_connection(timeout=0.12) as conn:
                if conn is None:
                    degraded = True
                    warnings.append("Database busy — menu counts deferred.")
                else:
                    try:
                        recording_count, action_count, notification_count, handover_count = self._scoped_counts_light(
                            conn, user, home_id=home_id, child_id=child_id
                        )
                    except DatabaseUnavailableError:
                        degraded = True
                        warnings.append("Database busy — menu counts unavailable.")
                    except Exception as exc:
                        logger.warning("os_scope_menu_summary_failed error=%s", exc)
                        degraded = True
                        warnings.append("Scoped menu counts could not be loaded.")
                    finally:
                        release_db_connection(conn)

        elapsed_ms = (time.perf_counter() - started) * 1000
        if elapsed_ms > 200:
            degraded = True
            warnings.append("Menu summary served in degraded mode.")

        summary = OsScopeMenuSummary(
            scope_type=scope_type,
            home_id=home_id,
            child_id=child_id,
            recording_alert_count=recording_count,
            action_count=action_count,
            notification_count=notification_count,
            handover_review_count=handover_count,
            warnings=warnings,
            degraded=degraded,
            cache_status="hit" if lookup.hit else "miss",
        )
        os_cache_service.set(cache_key, summary.model_dump(), ttl_seconds=MENU_SUMMARY_CACHE_TTL)
        return summary

    def _scoped_counts_light(
        self,
        conn: Any,
        user: dict[str, Any],
        *,
        home_id: int | None,
        child_id: int | None,
    ) -> tuple[int, int, int, int]:
        recording = 0
        actions = 0
        notifications = 0
        handover = 0
        with conn.cursor() as cur:
            if child_id and self._table_exists(cur, "recording_alerts"):
                cur.execute(
                    """
                    SELECT COUNT(*) AS c FROM recording_alerts
                    WHERE young_person_id = %s AND COALESCE(status, 'open') IN ('open', 'pending', 'active')
                    LIMIT 50
                    """,
                    (child_id,),
                )
                row = cur.fetchone()
                recording = int((row.get("c") if isinstance(row, dict) else row[0]) or 0) if row else 0
            elif home_id and self._table_exists(cur, "recording_alerts"):
                cur.execute(
                    """
                    SELECT COUNT(*) AS c FROM recording_alerts
                    WHERE home_id = %s AND COALESCE(status, 'open') IN ('open', 'pending', 'active')
                    LIMIT 50
                    """,
                    (home_id,),
                )
                row = cur.fetchone()
                recording = int((row.get("c") if isinstance(row, dict) else row[0]) or 0) if row else 0

            for table, sql, params in (
                (
                    "actions",
                    "SELECT COUNT(*) AS c FROM actions WHERE young_person_id = %s AND COALESCE(status, 'open') != 'completed' LIMIT 50",
                    (child_id,),
                ),
                (
                    "os_actions",
                    "SELECT COUNT(*) AS c FROM os_actions WHERE young_person_id = %s AND COALESCE(status, 'open') != 'completed' LIMIT 50",
                    (child_id,),
                ),
            ):
                if child_id and self._table_exists(cur, table):
                    try:
                        cur.execute(sql, params)
                        row = cur.fetchone()
                        actions += int((row.get("c") if isinstance(row, dict) else row[0]) or 0) if row else 0
                    except Exception:
                        continue
                    break

            if self._table_exists(cur, "notifications"):
                if child_id:
                    cur.execute(
                        "SELECT COUNT(*) AS c FROM notifications WHERE young_person_id = %s AND read_at IS NULL LIMIT 30",
                        (child_id,),
                    )
                elif home_id:
                    cur.execute(
                        "SELECT COUNT(*) AS c FROM notifications WHERE home_id = %s AND read_at IS NULL LIMIT 30",
                        (home_id,),
                    )
                else:
                    cur.execute("SELECT COUNT(*) AS c FROM notifications WHERE read_at IS NULL LIMIT 30")
                row = cur.fetchone()
                notifications = int((row.get("c") if isinstance(row, dict) else row[0]) or 0) if row else 0

            for table in ("handovers", "handover_reviews", "shift_handovers"):
                if self._table_exists(cur, table):
                    clause = "young_person_id = %s" if child_id else "home_id = %s" if home_id else "1=1"
                    param = child_id or home_id
                    if param is None:
                        break
                    try:
                        cur.execute(
                            f"SELECT COUNT(*) AS c FROM {table} WHERE {clause} AND COALESCE(review_status, status, 'pending') IN ('pending', 'review', 'open') LIMIT 20",
                            (param,),
                        )
                        row = cur.fetchone()
                        handover = int((row.get("c") if isinstance(row, dict) else row[0]) or 0) if row else 0
                    except Exception:
                        continue
                    break
        return recording, actions, notifications, handover

    @staticmethod
    def _table_exists(cur: Any, table: str) -> bool:
        cur.execute(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = %s) AS exists",
            (table,),
        )
        row = cur.fetchone()
        return bool(row.get("exists") if isinstance(row, dict) else row and row[0])


os_scope_service = OsScopeService()
