from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request

from auth.current_user import get_current_user
from db.connection import get_db_connection, release_db_connection
from routers.frontend_compat import get_columns, rows_to_dicts, serialise, table_exists


router = APIRouter(prefix="/young-people", tags=["young-people-shell-item-compat"])


CHILD_ITEM_ROUTES: dict[str, dict[str, str]] = {
    "daily-notes": {"table": "daily_notes", "key": "daily_note", "order": "note_date"},
    "incidents": {"table": "incidents", "key": "incident", "order": "incident_datetime"},
    "safeguarding": {"table": "safeguarding_records", "key": "safeguarding_record", "order": "created_at"},
    "missing-episodes": {"table": "missing_episodes", "key": "missing_episode", "order": "start_datetime"},
    "plans": {"table": "support_plans", "key": "support_plan", "order": "review_date"},
    "support-plans": {"table": "support_plans", "key": "support_plan", "order": "review_date"},
    "risk": {"table": "risk_assessments", "key": "risk", "order": "review_date"},
    "keywork": {"table": "keywork_sessions", "key": "keywork", "order": "session_date"},
    "health": {"table": "health_records", "key": "health_record", "order": "event_datetime"},
    "education": {"table": "education_records", "key": "education_record", "order": "record_date"},
    "family": {"table": "family_contact_records", "key": "family_contact", "order": "contact_datetime"},
    "appointments": {"table": "young_person_appointments", "key": "appointment", "order": "appointment_date"},
    "timeline": {"table": "chronology_events", "key": "chronology_event", "order": "event_datetime"},
    "documents": {"table": "documents", "key": "document", "order": "created_at"},
    "statutory-documents": {"table": "statutory_documents", "key": "statutory_document", "order": "review_date"},
    "medication-records": {"table": "medication_records", "key": "medication_record", "order": "administered_time"},
    "handover": {"table": "handover_records", "key": "handover_record", "order": "handover_date"},
    "tasks": {"table": "tasks", "key": "task", "order": "due_date"},
    "reports": {"table": "ai_generated_reports", "key": "report", "order": "created_at"},
}


SYSTEM_COLUMNS = {
    "id",
    "created_at",
    "updated_at",
    "deleted_at",
    "archived_at",
}


def _safe_int(value: Any) -> int | None:
    try:
        if value in (None, ""):
            return None
        parsed = int(value)
        return parsed if parsed > 0 else None
    except Exception:
        return None


def _role(current_user: dict[str, Any]) -> str:
    return str(current_user.get("role") or current_user.get("user_role") or "").strip().lower()


def _user_home_id(current_user: dict[str, Any]) -> int | None:
    return _safe_int(current_user.get("home_id"))


def _assert_can_edit(current_user: dict[str, Any]) -> None:
    if _role(current_user) not in {"admin", "provider_admin", "manager", "staff"}:
        raise HTTPException(status_code=403, detail="You do not have permission to edit this record")


def _assert_home_access(current_user: dict[str, Any], record_home_id: int | None) -> None:
    if _role(current_user) in {"admin", "provider_admin"}:
        return

    if record_home_id is None:
        raise HTTPException(status_code=403, detail="Home access could not be verified")

    if _user_home_id(current_user) != record_home_id:
        raise HTTPException(status_code=403, detail="You do not have access to this record")


def _record_key(config: dict[str, str]) -> str:
    return config.get("key") or "record"


def _row_response(config: dict[str, str], row: dict[str, Any] | None) -> dict[str, Any]:
    key = _record_key(config)
    return {
        "ok": True,
        "status": "ok",
        "item": row,
        "record": row,
        key: row,
    }


def _fetch_one(cursor: Any, table_name: str, columns: set[str], record_id: int, young_person_id: int) -> dict[str, Any] | None:
    where = ['"id" = %s']
    params: list[Any] = [record_id]

    if "young_person_id" in columns:
        where.append('"young_person_id" = %s')
        params.append(young_person_id)

    sql = f'SELECT * FROM public."{table_name}" WHERE ' + " AND ".join(where) + " LIMIT 1"
    cursor.execute(sql, tuple(params))
    rows = rows_to_dicts(cursor, cursor.fetchall())
    return rows[0] if rows else None


def _filter_payload(payload: dict[str, Any], columns: set[str]) -> dict[str, Any]:
    filtered: dict[str, Any] = {}

    for key, value in payload.items():
        if key not in columns:
            continue
        if key in SYSTEM_COLUMNS:
            continue
        filtered[key] = value

    return filtered


def _select_home_id(row: dict[str, Any] | None, young_person_id: int, cursor: Any) -> int | None:
    if row:
        direct = _safe_int(row.get("home_id"))
        if direct:
            return direct

    for table_name in ("young_people", "young_persons", "children"):
        if not table_exists(cursor, table_name):
            continue

        columns = get_columns(cursor, table_name)
        if "id" not in columns or "home_id" not in columns:
            continue

        cursor.execute(
            f'SELECT home_id FROM public."{table_name}" WHERE id = %s LIMIT 1',
            (young_person_id,),
        )
        result = cursor.fetchone()
        if isinstance(result, dict):
            return _safe_int(result.get("home_id"))
        if result:
            return _safe_int(result[0])

    return None


@router.get("/{young_person_id}/{route_key}/{record_id}")
def get_shell_item(
    young_person_id: int,
    route_key: str,
    record_id: int,
    current_user=Depends(get_current_user),
):
    config = CHILD_ITEM_ROUTES.get(route_key)
    if not config:
        raise HTTPException(status_code=404, detail="Unknown shell record route")

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            table_name = config["table"]
            if not table_exists(cursor, table_name):
                raise HTTPException(status_code=404, detail="Record table does not exist")

            columns = get_columns(cursor, table_name)
            row = _fetch_one(cursor, table_name, columns, record_id, young_person_id)
            if not row:
                raise HTTPException(status_code=404, detail="Record not found")

            _assert_home_access(current_user, _select_home_id(row, young_person_id, cursor))
            return _row_response(config, row)
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.patch("/{young_person_id}/{route_key}/{record_id}")
@router.put("/{young_person_id}/{route_key}/{record_id}")
async def update_shell_item(
    young_person_id: int,
    route_key: str,
    record_id: int,
    request: Request,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)

    config = CHILD_ITEM_ROUTES.get(route_key)
    if not config:
        raise HTTPException(status_code=404, detail="Unknown shell record route")

    payload = await request.json()
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Payload must be an object")

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            table_name = config["table"]
            if not table_exists(cursor, table_name):
                raise HTTPException(status_code=404, detail="Record table does not exist")

            columns = get_columns(cursor, table_name)
            existing = _fetch_one(cursor, table_name, columns, record_id, young_person_id)
            if not existing:
                raise HTTPException(status_code=404, detail="Record not found")

            _assert_home_access(current_user, _select_home_id(existing, young_person_id, cursor))

            update_payload = _filter_payload(payload, columns)
            if not update_payload:
                return _row_response(config, existing)

            if "updated_at" in columns:
                update_payload["updated_at"] = datetime_now_expression = "NOW()"
            else:
                datetime_now_expression = None

            assignments: list[str] = []
            params: list[Any] = []

            for column, value in update_payload.items():
                if value == "NOW()" and column == "updated_at" and datetime_now_expression:
                    assignments.append(f'"{column}" = NOW()')
                    continue
                assignments.append(f'"{column}" = %s')
                params.append(value)

            where = ['"id" = %s']
            params.append(record_id)
            if "young_person_id" in columns:
                where.append('"young_person_id" = %s')
                params.append(young_person_id)

            sql = (
                f'UPDATE public."{table_name}" SET '
                + ", ".join(assignments)
                + " WHERE "
                + " AND ".join(where)
                + " RETURNING *"
            )
            cursor.execute(sql, tuple(params))
            rows = rows_to_dicts(cursor, cursor.fetchall())
            conn.commit()

            return _row_response(config, rows[0] if rows else existing)
    except HTTPException:
        if conn is not None:
            conn.rollback()
        raise
    except Exception as exc:
        if conn is not None:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Could not update record: {exc}") from exc
    finally:
        if conn is not None:
            release_db_connection(conn)


@router.delete("/{young_person_id}/{route_key}/{record_id}")
def archive_shell_item(
    young_person_id: int,
    route_key: str,
    record_id: int,
    current_user=Depends(get_current_user),
):
    _assert_can_edit(current_user)

    config = CHILD_ITEM_ROUTES.get(route_key)
    if not config:
        raise HTTPException(status_code=404, detail="Unknown shell record route")

    conn = None
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            table_name = config["table"]
            if not table_exists(cursor, table_name):
                raise HTTPException(status_code=404, detail="Record table does not exist")

            columns = get_columns(cursor, table_name)
            existing = _fetch_one(cursor, table_name, columns, record_id, young_person_id)
            if not existing:
                raise HTTPException(status_code=404, detail="Record not found")

            _assert_home_access(current_user, _select_home_id(existing, young_person_id, cursor))

            assignments: list[str] = []
            if "archived" in columns:
                assignments.append('"archived" = true')
            if "is_deleted" in columns:
                assignments.append('"is_deleted" = true')
            if "deleted_at" in columns:
                assignments.append('"deleted_at" = NOW()')
            if "archived_at" in columns:
                assignments.append('"archived_at" = NOW()')
            if "updated_at" in columns:
                assignments.append('"updated_at" = NOW()')

            if not assignments:
                raise HTTPException(status_code=400, detail="This record cannot be archived safely")

            where = ['"id" = %s']
            params: list[Any] = [record_id]
            if "young_person_id" in columns:
                where.append('"young_person_id" = %s')
                params.append(young_person_id)

            sql = (
                f'UPDATE public."{table_name}" SET '
                + ", ".join(assignments)
                + " WHERE "
                + " AND ".join(where)
                + " RETURNING *"
            )
            cursor.execute(sql, tuple(params))
            rows = rows_to_dicts(cursor, cursor.fetchall())
            conn.commit()

            return _row_response(config, rows[0] if rows else existing)
    except HTTPException:
        if conn is not None:
            conn.rollback()
        raise
    except Exception as exc:
        if conn is not None:
            conn.rollback()
        raise HTTPException(status_code=500, detail=f"Could not archive record: {exc}") from exc
    finally:
        if conn is not None:
            release_db_connection(conn)
