"""Session-backed OS scope — lightweight home/child lists only."""

from __future__ import annotations

import logging
import time
from typing import Any

from db.connection import (
    DatabaseUnavailableError,
    acquire_optional_dashboard_connection,
    is_pool_under_pressure,
    release_db_connection,
)
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


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, "", "null", "None"):
            return None
        parsed = int(value)
        return parsed if parsed > 0 else None
    except (TypeError, ValueError):
        return None


def _user_home_id(user: dict[str, Any]) -> int | None:
    return _safe_int(user.get("home_id") or user.get("selected_home_id") or user.get("default_home_id"))


def _user_provider_id(user: dict[str, Any]) -> int | None:
    return _safe_int(user.get("provider_id") or user.get("providerId"))


def _role(user: dict[str, Any]) -> str:
    return str(user.get("role") or "staff").lower()


def _is_wide_access(role: str) -> bool:
    return role in {
        "admin",
        "administrator",
        "super_admin",
        "provider",
        "provider_admin",
        "ri",
        "responsible_individual",
    } or "admin" in role


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
        routes.child_workspace = f"/young-people/{child_id}/workspace"
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
    if scope_type == "child" and child_id and not home_id:
        pass
    return scope_type, home_id, child_id, str(home_name) if home_name else None, str(child_name) if child_name else None  # type: ignore[return-value]


def _fallback_homes(user: dict[str, Any]) -> list[OsScopeHomeOption]:
    home_id = _user_home_id(user)
    if not home_id:
        return []
    name = str(user.get("home_name") or user.get("selected_home_name") or "Current home")
    return [OsScopeHomeOption(id=home_id, name=name, status="active")]


def _list_homes_lightweight(user: dict[str, Any]) -> tuple[list[OsScopeHomeOption], list[str], bool]:
    warnings: list[str] = []
    degraded = False
    if is_pool_under_pressure():
        return _fallback_homes(user), ["Database busy — showing your current home only."], True

    conn = acquire_optional_dashboard_connection(timeout=0.15)
    if conn is None:
        return _fallback_homes(user), ["Database busy — home list deferred."], True

    role = _role(user)
    provider_id = _user_provider_id(user)
    home_id = _user_home_id(user)
    rows: list[OsScopeHomeOption] = []
    try:
        with conn.cursor() as cur:
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
                if not id_col or not name_col:
                    continue
                where: list[str] = []
                params: list[Any] = []
                if not _is_wide_access(role) and home_id:
                    where.append(f'"{id_col}" = %s')
                    params.append(home_id)
                elif provider_id and "provider_id" in cols:
                    where.append("provider_id = %s")
                    params.append(provider_id)
                where_sql = "WHERE " + " AND ".join(where) if where else ""
                status_sql = ", status" if "status" in cols else ""
                cur.execute(
                    f'SELECT "{id_col}" AS id, "{name_col}" AS name{status_sql} FROM public."{table}" {where_sql} ORDER BY "{name_col}" ASC LIMIT 50',
                    tuple(params),
                )
                for row in cur.fetchall():
                    data = dict(row)
                    hid = _safe_int(data.get("id"))
                    if not hid:
                        continue
                    rows.append(
                        OsScopeHomeOption(
                            id=hid,
                            name=str(data.get("name") or f"Home {hid}"),
                            status=str(data.get("status")) if data.get("status") else None,
                        )
                    )
                if rows:
                    break
    except DatabaseUnavailableError:
        degraded = True
        warnings.append("Database busy — home list unavailable.")
        rows = _fallback_homes(user)
    except Exception as exc:
        logger.warning("os_scope_homes_failed error=%s", exc)
        warnings.append("Home list could not be loaded.")
        rows = _fallback_homes(user)
        degraded = True
    finally:
        release_db_connection(conn)

    if not rows:
        rows = _fallback_homes(user)
    return rows, warnings, degraded


def _child_name(row: dict[str, Any]) -> str:
    preferred = row.get("preferred_name")
    if preferred:
        return str(preferred)
    first = str(row.get("first_name") or "").strip()
    last = str(row.get("last_name") or "").strip()
    combined = " ".join(part for part in (first, last) if part).strip()
    return combined or str(row.get("name") or row.get("full_name") or "Young person")


def _list_children_for_home(user: dict[str, Any], home_id: int | None) -> tuple[list[OsScopeChildOption], list[str], bool]:
    warnings: list[str] = []
    degraded = False
    if not home_id:
        return [], [], False
    if is_pool_under_pressure():
        return [], ["Database busy — child list deferred."], True

    conn = acquire_optional_dashboard_connection(timeout=0.15)
    if conn is None:
        return [], ["Database busy — child list deferred."], True

    children: list[OsScopeChildOption] = []
    try:
        from services import young_people_service as yp

        rows = yp.list_young_people(conn, home_id=home_id, provider_id=_user_provider_id(user), limit=80)
        for row in rows:
            cid = _safe_int(row.get("id"))
            if not cid:
                continue
            children.append(
                OsScopeChildOption(
                    id=cid,
                    name=_child_name(row),
                    home_id=_safe_int(row.get("home_id")) or home_id,
                    placement_status=str(row.get("placement_status") or row.get("status") or "") or None,
                )
            )
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
        homes, home_warnings, home_degraded = _list_homes_lightweight(user)
        target_home = home_id or sel_home or _user_home_id(user)
        children, child_warnings, child_degraded = _list_children_for_home(user, target_home)

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

        state = OsScopeState(
            scope_type=scope_type,
            selected_home_id=sel_home,
            selected_home_name=sel_home_name,
            selected_child_id=sel_child,
            selected_child_name=sel_child_name,
            recent_homes=recent_homes,
            recent_children=recent_children,
            available_homes=homes,
            available_children_for_home=children,
            routes=_routes_for(scope_type, sel_home, sel_child),
            warnings=[*home_warnings, *child_warnings],
            degraded=home_degraded or child_degraded,
            cache_status=lookup.status if lookup.hit else "miss",
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
        if home_id and scope_type in {"home", "child"}:
            children, child_warnings, child_degraded = _list_children_for_home(user, home_id)
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
            conn = acquire_optional_dashboard_connection(timeout=0.12)
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
