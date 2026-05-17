from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import (
    build_scope_where,
    can_write_records,
    current_provider_id,
    current_user_id,
    isoformat,
    quote_ident,
    safe_int,
    table_columns,
    table_exists,
)
from schemas.safeguarding_contracts import SafeguardingRecord

SAFEGUARDING_TABLE = "safeguarding_domain_records"


def _json_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    if isinstance(value, tuple):
        return [str(item) for item in value if str(item)]
    return [str(value)] if str(value) else []


def _row_to_record(row: dict[str, Any]) -> SafeguardingRecord:
    return SafeguardingRecord(
        id=str(row["id"]),
        provider_id=safe_int(row.get("provider_id")),
        home_id=int(row["home_id"]),
        young_person_id=int(row["young_person_id"]),
        title=str(row.get("title") or "Safeguarding record"),
        concern_summary=str(row.get("concern_summary") or ""),
        concern_category=str(row.get("concern_category") or "safeguarding"),
        lifecycle_state=str(row.get("lifecycle_state") or "draft"),
        severity=str(row.get("severity") or "high"),
        child_voice=row.get("child_voice"),
        immediate_actions=row.get("immediate_actions"),
        external_notification_required=bool(row.get("external_notification_required")),
        external_notification_at=isoformat(row.get("external_notification_at")),
        review_due_at=isoformat(row.get("review_due_at")),
        resolved_at=isoformat(row.get("resolved_at")),
        evidence_ids=_json_list(row.get("evidence_ids")),
        linked_action_ids=_json_list(row.get("linked_action_ids")),
        chronology_event_ids=_json_list(row.get("chronology_event_ids")),
        replay_event_ids=_json_list(row.get("replay_event_ids")),
        created_by=safe_int(row.get("created_by")),
        updated_by=safe_int(row.get("updated_by")),
        created_at=isoformat(row.get("created_at")),
        updated_at=isoformat(row.get("updated_at")),
        metadata=row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
    )


class SafeguardingRepository:
    """Schema-backed persistence for first-class safeguarding lifecycle records."""

    table_name = SAFEGUARDING_TABLE

    def require_storage(self, conn: Any) -> None:
        if not table_exists(conn, self.table_name):
            raise HTTPException(status_code=400, detail="Safeguarding domain storage is not available in this schema.")

    def create(self, conn: Any, *, payload: dict[str, Any], current_user: dict[str, Any]) -> SafeguardingRecord:
        self.require_storage(conn)
        if not can_write_records(current_user):
            raise HTTPException(status_code=403, detail="You do not have permission to create safeguarding records.")
        provider_id = safe_int(payload.get("provider_id")) or current_provider_id(current_user)
        now = datetime.now(timezone.utc)
        insert = {
            "provider_id": provider_id,
            "home_id": safe_int(payload.get("home_id")),
            "young_person_id": safe_int(payload.get("young_person_id")),
            "title": payload.get("title"),
            "concern_summary": payload.get("concern_summary"),
            "concern_category": payload.get("concern_category") or "safeguarding",
            "lifecycle_state": payload.get("lifecycle_state") or "draft",
            "severity": payload.get("severity") or "high",
            "child_voice": payload.get("child_voice"),
            "immediate_actions": payload.get("immediate_actions"),
            "external_notification_required": bool(payload.get("external_notification_required")),
            "review_due_at": payload.get("review_due_at"),
            "evidence_ids": payload.get("evidence_ids") or [],
            "linked_action_ids": payload.get("linked_action_ids") or [],
            "created_by": current_user_id(current_user),
            "updated_by": current_user_id(current_user),
            "created_at": now,
            "updated_at": now,
            "metadata": payload.get("metadata") or {},
        }
        columns = list(insert)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                INSERT INTO public.{quote_ident(self.table_name)} ({", ".join(quote_ident(col) for col in columns)})
                VALUES ({", ".join(["%s"] * len(columns))})
                RETURNING *
                """,
                tuple(Json(insert[col]) if col in {"evidence_ids", "linked_action_ids", "metadata"} else insert[col] for col in columns),
            )
            row = cur.fetchone()
        return _row_to_record(dict(row))

    def get(self, conn: Any, *, safeguarding_id: str, current_user: dict[str, Any]) -> SafeguardingRecord | None:
        self.require_storage(conn)
        cols = table_columns(conn, self.table_name)
        where, params = build_scope_where(cols, current_user)
        where.append("id::text = %s")
        params.append(safeguarding_id)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"SELECT * FROM public.{quote_ident(self.table_name)} WHERE {' AND '.join(where)} LIMIT 1",
                tuple(params),
            )
            row = cur.fetchone()
        return _row_to_record(dict(row)) if row else None

    def list(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        limit: int = 100,
    ) -> list[SafeguardingRecord]:
        self.require_storage(conn)
        filters = filters or {}
        cols = table_columns(conn, self.table_name)
        where, params = build_scope_where(
            cols,
            current_user,
            home_id=safe_int(filters.get("home_id")),
            young_person_id=safe_int(filters.get("young_person_id")),
        )
        if filters.get("lifecycle_state"):
            where.append("lifecycle_state = %s")
            params.append(filters["lifecycle_state"])
        params.append(max(1, min(int(limit or 100), 500)))
        where_sql = "WHERE " + " AND ".join(where) if where else ""
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT *
                FROM public.{quote_ident(self.table_name)}
                {where_sql}
                ORDER BY created_at DESC, id DESC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = cur.fetchall() or []
        return [_row_to_record(dict(row)) for row in rows]

    def update_state(
        self,
        conn: Any,
        *,
        safeguarding_id: str,
        lifecycle_state: str,
        payload: dict[str, Any],
        current_user: dict[str, Any],
    ) -> tuple[SafeguardingRecord, SafeguardingRecord]:
        before = self.get(conn, safeguarding_id=safeguarding_id, current_user=current_user)
        if before is None:
            raise HTTPException(status_code=404, detail="Safeguarding record not found.")
        updates: dict[str, Any] = {
            "lifecycle_state": lifecycle_state,
            "updated_by": current_user_id(current_user),
            "updated_at": datetime.now(timezone.utc),
        }
        for column in [
            "child_voice",
            "review_due_at",
            "external_notification_required",
            "external_notification_at",
            "evidence_ids",
            "linked_action_ids",
            "metadata",
        ]:
            if column in payload and payload[column] not in (None, ""):
                updates[column] = payload[column]
        if lifecycle_state == "resolved":
            updates["resolved_at"] = datetime.now(timezone.utc)
        set_sql = ", ".join(f"{quote_ident(col)} = %s" for col in updates)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                UPDATE public.{quote_ident(self.table_name)}
                SET {set_sql}
                WHERE id::text = %s
                RETURNING *
                """,
                tuple(Json(updates[col]) if col in {"evidence_ids", "linked_action_ids", "metadata"} else updates[col] for col in updates)
                + (safeguarding_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Safeguarding record not found.")
        return before, _row_to_record(dict(row))

    def attach_chronology_and_replay(
        self,
        conn: Any,
        *,
        safeguarding_id: str,
        chronology_event_id: str | None,
        replay_event_ids: list[str],
    ) -> None:
        if not chronology_event_id and not replay_event_ids:
            return
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE public.{quote_ident(self.table_name)}
                SET chronology_event_ids = (
                    SELECT jsonb_agg(DISTINCT value)
                    FROM jsonb_array_elements_text(chronology_event_ids || %s::jsonb) AS value
                ),
                    replay_event_ids = (
                    SELECT jsonb_agg(DISTINCT value)
                    FROM jsonb_array_elements_text(replay_event_ids || %s::jsonb) AS value
                )
                WHERE id::text = %s
                """,
                (Json([chronology_event_id] if chronology_event_id else []), Json(replay_event_ids), safeguarding_id),
            )


safeguarding_repository = SafeguardingRepository()
