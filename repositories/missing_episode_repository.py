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
from schemas.missing_episode_contracts import MissingEpisodeRecord
from schemas.return_home_interview_contracts import ReturnHomeInterviewRecord

MISSING_EPISODE_TABLE = "missing_episode_domain_records"
RETURN_HOME_INTERVIEW_TABLE = "return_home_interviews"


def _json_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    if isinstance(value, tuple):
        return [str(item) for item in value if str(item)]
    return [str(value)] if str(value) else []


def _missing_row(row: dict[str, Any]) -> MissingEpisodeRecord:
    return MissingEpisodeRecord(
        id=str(row["id"]),
        provider_id=safe_int(row.get("provider_id")),
        home_id=int(row["home_id"]),
        young_person_id=int(row["young_person_id"]),
        lifecycle_state=str(row.get("lifecycle_state") or "reported_missing"),
        missing_from=isoformat(row.get("missing_from")) or "",
        returned_at=isoformat(row.get("returned_at")),
        return_home_interview_due_at=isoformat(row.get("return_home_interview_due_at")),
        return_home_interview_completed_at=isoformat(row.get("return_home_interview_completed_at")),
        last_seen_location=row.get("last_seen_location"),
        circumstances=str(row.get("circumstances") or ""),
        risk_level=str(row.get("risk_level") or "high"),
        police_reference=row.get("police_reference"),
        police_notified_at=isoformat(row.get("police_notified_at")),
        safeguarding_link_ids=_json_list(row.get("safeguarding_link_ids")),
        evidence_ids=_json_list(row.get("evidence_ids")),
        follow_up_action_ids=_json_list(row.get("follow_up_action_ids")),
        chronology_event_ids=_json_list(row.get("chronology_event_ids")),
        replay_event_ids=_json_list(row.get("replay_event_ids")),
        created_by=safe_int(row.get("created_by")),
        updated_by=safe_int(row.get("updated_by")),
        created_at=isoformat(row.get("created_at")),
        updated_at=isoformat(row.get("updated_at")),
        metadata=row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
    )


def _rhi_row(row: dict[str, Any]) -> ReturnHomeInterviewRecord:
    return ReturnHomeInterviewRecord(
        id=str(row["id"]),
        provider_id=safe_int(row.get("provider_id")),
        home_id=int(row["home_id"]),
        young_person_id=int(row["young_person_id"]),
        missing_episode_id=str(row["missing_episode_id"]),
        lifecycle_state=str(row.get("lifecycle_state") or "completed"),
        interview_at=isoformat(row.get("interview_at")) or "",
        child_voice=str(row.get("child_voice") or ""),
        push_factors=row.get("push_factors"),
        pull_factors=row.get("pull_factors"),
        what_helped=row.get("what_helped"),
        follow_up_required=row.get("follow_up_required"),
        safeguarding_link_ids=_json_list(row.get("safeguarding_link_ids")),
        evidence_ids=_json_list(row.get("evidence_ids")),
        chronology_event_ids=_json_list(row.get("chronology_event_ids")),
        replay_event_ids=_json_list(row.get("replay_event_ids")),
        created_by=safe_int(row.get("created_by")),
        created_at=isoformat(row.get("created_at")),
        metadata=row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
    )


class MissingEpisodeRepository:
    """Schema-backed persistence for missing episodes and return-home interviews."""

    missing_table = MISSING_EPISODE_TABLE
    rhi_table = RETURN_HOME_INTERVIEW_TABLE

    def require_missing_storage(self, conn: Any) -> None:
        if not table_exists(conn, self.missing_table):
            raise HTTPException(status_code=400, detail="Missing episode domain storage is not available in this schema.")

    def require_rhi_storage(self, conn: Any) -> None:
        if not table_exists(conn, self.rhi_table):
            raise HTTPException(status_code=400, detail="Return-home interview storage is not available in this schema.")

    def create_missing(self, conn: Any, *, payload: dict[str, Any], current_user: dict[str, Any]) -> MissingEpisodeRecord:
        self.require_missing_storage(conn)
        if not can_write_records(current_user):
            raise HTTPException(status_code=403, detail="You do not have permission to create missing episodes.")
        provider_id = safe_int(payload.get("provider_id")) or current_provider_id(current_user)
        police_notified = payload.get("police_notified_at")
        now = datetime.now(timezone.utc)
        insert = {
            "provider_id": provider_id,
            "home_id": safe_int(payload.get("home_id")),
            "young_person_id": safe_int(payload.get("young_person_id")),
            "lifecycle_state": "police_notified" if police_notified else "reported_missing",
            "missing_from": payload.get("missing_from"),
            "last_seen_location": payload.get("last_seen_location"),
            "circumstances": payload.get("circumstances"),
            "risk_level": payload.get("risk_level") or "high",
            "police_reference": payload.get("police_reference"),
            "police_notified_at": police_notified,
            "safeguarding_link_ids": payload.get("safeguarding_link_ids") or [],
            "evidence_ids": payload.get("evidence_ids") or [],
            "follow_up_action_ids": payload.get("follow_up_action_ids") or [],
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
                INSERT INTO public.{quote_ident(self.missing_table)} ({", ".join(quote_ident(col) for col in columns)})
                VALUES ({", ".join(["%s"] * len(columns))})
                RETURNING *
                """,
                tuple(
                    Json(insert[col])
                    if col in {"safeguarding_link_ids", "evidence_ids", "follow_up_action_ids", "metadata"}
                    else insert[col]
                    for col in columns
                ),
            )
            row = cur.fetchone()
        return _missing_row(dict(row))

    def get_missing(self, conn: Any, *, missing_episode_id: str, current_user: dict[str, Any]) -> MissingEpisodeRecord | None:
        self.require_missing_storage(conn)
        cols = table_columns(conn, self.missing_table)
        where, params = build_scope_where(cols, current_user)
        where.append("id::text = %s")
        params.append(missing_episode_id)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"SELECT * FROM public.{quote_ident(self.missing_table)} WHERE {' AND '.join(where)} LIMIT 1",
                tuple(params),
            )
            row = cur.fetchone()
        return _missing_row(dict(row)) if row else None

    def list_missing(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        limit: int = 100,
    ) -> list[MissingEpisodeRecord]:
        self.require_missing_storage(conn)
        filters = filters or {}
        cols = table_columns(conn, self.missing_table)
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
                FROM public.{quote_ident(self.missing_table)}
                {where_sql}
                ORDER BY missing_from DESC, created_at DESC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = cur.fetchall() or []
        return [_missing_row(dict(row)) for row in rows]

    def update_missing_state(
        self,
        conn: Any,
        *,
        missing_episode_id: str,
        lifecycle_state: str,
        payload: dict[str, Any],
        current_user: dict[str, Any],
    ) -> tuple[MissingEpisodeRecord, MissingEpisodeRecord]:
        before = self.get_missing(conn, missing_episode_id=missing_episode_id, current_user=current_user)
        if before is None:
            raise HTTPException(status_code=404, detail="Missing episode not found.")
        updates: dict[str, Any] = {
            "lifecycle_state": lifecycle_state,
            "updated_by": current_user_id(current_user),
            "updated_at": datetime.now(timezone.utc),
        }
        for column in [
            "returned_at",
            "return_home_interview_due_at",
            "return_home_interview_completed_at",
            "police_reference",
            "police_notified_at",
            "safeguarding_link_ids",
            "evidence_ids",
            "follow_up_action_ids",
            "metadata",
        ]:
            if column in payload and payload[column] not in (None, ""):
                updates[column] = payload[column]
        set_sql = ", ".join(f"{quote_ident(col)} = %s" for col in updates)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                UPDATE public.{quote_ident(self.missing_table)}
                SET {set_sql}
                WHERE id::text = %s
                RETURNING *
                """,
                tuple(
                    Json(updates[col])
                    if col in {"safeguarding_link_ids", "evidence_ids", "follow_up_action_ids", "metadata"}
                    else updates[col]
                    for col in updates
                )
                + (missing_episode_id,),
            )
            row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Missing episode not found.")
        return before, _missing_row(dict(row))

    def create_rhi(self, conn: Any, *, payload: dict[str, Any], current_user: dict[str, Any]) -> ReturnHomeInterviewRecord:
        self.require_rhi_storage(conn)
        if not can_write_records(current_user):
            raise HTTPException(status_code=403, detail="You do not have permission to create return-home interviews.")
        insert = {
            "provider_id": safe_int(payload.get("provider_id")) or current_provider_id(current_user),
            "home_id": safe_int(payload.get("home_id")),
            "young_person_id": safe_int(payload.get("young_person_id")),
            "missing_episode_id": payload.get("missing_episode_id"),
            "lifecycle_state": payload.get("lifecycle_state") or "completed",
            "interview_at": payload.get("interview_at"),
            "child_voice": payload.get("child_voice"),
            "push_factors": payload.get("push_factors"),
            "pull_factors": payload.get("pull_factors"),
            "what_helped": payload.get("what_helped"),
            "follow_up_required": payload.get("follow_up_required"),
            "safeguarding_link_ids": payload.get("safeguarding_link_ids") or [],
            "evidence_ids": payload.get("evidence_ids") or [],
            "created_by": current_user_id(current_user),
            "created_at": datetime.now(timezone.utc),
            "metadata": payload.get("metadata") or {},
        }
        columns = list(insert)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                INSERT INTO public.{quote_ident(self.rhi_table)} ({", ".join(quote_ident(col) for col in columns)})
                VALUES ({", ".join(["%s"] * len(columns))})
                RETURNING *
                """,
                tuple(
                    Json(insert[col])
                    if col in {"safeguarding_link_ids", "evidence_ids", "metadata"}
                    else insert[col]
                    for col in columns
                ),
            )
            row = cur.fetchone()
        return _rhi_row(dict(row))

    def attach_missing_chronology_and_replay(
        self,
        conn: Any,
        *,
        missing_episode_id: str,
        chronology_event_id: str | None,
        replay_event_ids: list[str],
    ) -> None:
        self._attach_ids(conn, self.missing_table, missing_episode_id, chronology_event_id, replay_event_ids)

    def attach_rhi_chronology_and_replay(
        self,
        conn: Any,
        *,
        return_home_interview_id: str,
        chronology_event_id: str | None,
        replay_event_ids: list[str],
    ) -> None:
        self._attach_ids(conn, self.rhi_table, return_home_interview_id, chronology_event_id, replay_event_ids)

    def _attach_ids(self, conn: Any, table_name: str, row_id: str, chronology_event_id: str | None, replay_event_ids: list[str]) -> None:
        if not chronology_event_id and not replay_event_ids:
            return
        with conn.cursor() as cur:
            cur.execute(
                f"""
                UPDATE public.{quote_ident(table_name)}
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
                (Json([chronology_event_id] if chronology_event_id else []), Json(replay_event_ids), row_id),
            )


missing_episode_repository = MissingEpisodeRepository()
