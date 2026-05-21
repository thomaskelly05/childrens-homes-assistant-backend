from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import (
    build_scope_where,
    current_provider_id,
    current_user_id,
    isoformat,
    quote_ident,
    safe_int,
    table_columns,
    table_exists,
)
from schemas.isn_contracts import ISNAlertRecord, ISNSignalRecord

ISN_SIGNAL_TABLE = "isn_safeguarding_signals"
ISN_ALERT_TABLE = "isn_safeguarding_alerts"


def _json_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    if isinstance(value, tuple):
        return [str(item) for item in value if str(item)]
    return [str(value)] if str(value) else []


def _signal_row(row: dict[str, Any]) -> ISNSignalRecord:
    return ISNSignalRecord(
        id=str(row["id"]),
        provider_id=safe_int(row.get("provider_id")),
        home_id=safe_int(row.get("home_id")),
        young_person_id=safe_int(row.get("young_person_id")),
        signal_type=str(row.get("signal_type") or "professional_intelligence"),
        occurred_at=isoformat(row.get("occurred_at")),
        title=str(row.get("title") or "Safeguarding signal"),
        summary=str(row.get("summary") or ""),
        risk_level=str(row.get("risk_level") or "medium"),
        location_text=row.get("location_text"),
        postcode_prefix=row.get("postcode_prefix"),
        transport_route=row.get("transport_route"),
        vehicle_description=row.get("vehicle_description"),
        alias_or_nickname=row.get("alias_or_nickname"),
        digital_handle=row.get("digital_handle"),
        source_record_type=row.get("source_record_type"),
        source_record_id=row.get("source_record_id"),
        indicator_tags=_json_list(row.get("indicator_tags")),
        evidence_refs=_json_list(row.get("evidence_refs")),
        intelligence_notes=row.get("intelligence_notes"),
        anonymised_context=row.get("anonymised_context") if isinstance(row.get("anonymised_context"), dict) else {},
        metadata=row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
        created_by=safe_int(row.get("created_by")),
        created_at=isoformat(row.get("created_at")),
    )


def _alert_row(row: dict[str, Any]) -> ISNAlertRecord:
    return ISNAlertRecord(
        id=str(row["id"]),
        alert_type=str(row.get("alert_type") or "pattern"),
        title=str(row.get("title") or "Safeguarding pattern"),
        summary=str(row.get("summary") or ""),
        risk_level=str(row.get("risk_level") or "medium"),
        status=str(row.get("status") or "new"),
        linked_signal_ids=_json_list(row.get("linked_signal_ids")),
        hotspot_key=row.get("hotspot_key"),
        pattern=row.get("pattern") if isinstance(row.get("pattern"), dict) else {},
        recommended_action=row.get("recommended_action"),
        created_at=isoformat(row.get("created_at")),
        updated_at=isoformat(row.get("updated_at")),
    )


class ISNRepository:
    """Persistence for the IndiCare Safeguarding Network intelligence layer."""

    signal_table = ISN_SIGNAL_TABLE
    alert_table = ISN_ALERT_TABLE

    def ensure_storage(self, conn: Any) -> None:
        if not table_exists(conn, self.signal_table):
            raise HTTPException(status_code=400, detail="ISN safeguarding signal storage is not available in this schema.")

    def ensure_alert_storage(self, conn: Any) -> None:
        if not table_exists(conn, self.alert_table):
            raise HTTPException(status_code=400, detail="ISN safeguarding alert storage is not available in this schema.")

    def create_signal(self, conn: Any, *, payload: dict[str, Any], current_user: dict[str, Any]) -> ISNSignalRecord:
        self.ensure_storage(conn)
        now = datetime.now(timezone.utc)
        insert = {
            "provider_id": safe_int(payload.get("provider_id")) or current_provider_id(current_user),
            "home_id": safe_int(payload.get("home_id")),
            "young_person_id": safe_int(payload.get("young_person_id")),
            "signal_type": payload.get("signal_type") or "professional_intelligence",
            "occurred_at": payload.get("occurred_at") or now,
            "title": payload.get("title"),
            "summary": payload.get("summary"),
            "risk_level": payload.get("risk_level") or "medium",
            "location_text": payload.get("location_text"),
            "postcode_prefix": payload.get("postcode_prefix"),
            "transport_route": payload.get("transport_route"),
            "vehicle_description": payload.get("vehicle_description"),
            "alias_or_nickname": payload.get("alias_or_nickname"),
            "digital_handle": payload.get("digital_handle"),
            "source_record_type": payload.get("source_record_type"),
            "source_record_id": payload.get("source_record_id"),
            "indicator_tags": payload.get("indicator_tags") or [],
            "evidence_refs": payload.get("evidence_refs") or [],
            "intelligence_notes": payload.get("intelligence_notes"),
            "anonymised_context": payload.get("anonymised_context") or {},
            "metadata": payload.get("metadata") or {},
            "created_by": current_user_id(current_user),
            "created_at": now,
        }
        columns = list(insert)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                INSERT INTO public.{quote_ident(self.signal_table)} ({", ".join(quote_ident(col) for col in columns)})
                VALUES ({", ".join(["%s"] * len(columns))})
                RETURNING *
                """,
                tuple(
                    Json(insert[col])
                    if col in {"indicator_tags", "evidence_refs", "anonymised_context", "metadata"}
                    else insert[col]
                    for col in columns
                ),
            )
            row = cur.fetchone()
        return _signal_row(dict(row))

    def list_signals(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        limit: int = 100,
    ) -> list[ISNSignalRecord]:
        self.ensure_storage(conn)
        filters = filters or {}
        cols = table_columns(conn, self.signal_table)
        where, params = build_scope_where(
            cols,
            current_user,
            provider_id=safe_int(filters.get("provider_id")),
            home_id=safe_int(filters.get("home_id")),
            young_person_id=safe_int(filters.get("young_person_id")),
        )
        if filters.get("signal_type"):
            where.append("signal_type = %s")
            params.append(filters["signal_type"])
        if filters.get("risk_level"):
            where.append("risk_level = %s")
            params.append(filters["risk_level"])
        params.append(max(1, min(int(limit or 100), 500)))
        where_sql = "WHERE " + " AND ".join(where) if where else ""
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT *
                FROM public.{quote_ident(self.signal_table)}
                {where_sql}
                ORDER BY occurred_at DESC, created_at DESC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = cur.fetchall() or []
        return [_signal_row(dict(row)) for row in rows]

    def create_alert(self, conn: Any, *, payload: dict[str, Any]) -> ISNAlertRecord:
        self.ensure_alert_storage(conn)
        now = datetime.now(timezone.utc)
        insert = {
            "alert_type": payload.get("alert_type") or "pattern",
            "title": payload.get("title") or "Safeguarding pattern detected",
            "summary": payload.get("summary") or "",
            "risk_level": payload.get("risk_level") or "medium",
            "status": payload.get("status") or "new",
            "linked_signal_ids": payload.get("linked_signal_ids") or [],
            "hotspot_key": payload.get("hotspot_key"),
            "pattern": payload.get("pattern") or {},
            "recommended_action": payload.get("recommended_action"),
            "created_at": now,
            "updated_at": now,
        }
        columns = list(insert)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                INSERT INTO public.{quote_ident(self.alert_table)} ({", ".join(quote_ident(col) for col in columns)})
                VALUES ({", ".join(["%s"] * len(columns))})
                RETURNING *
                """,
                tuple(
                    Json(insert[col]) if col in {"linked_signal_ids", "pattern"} else insert[col]
                    for col in columns
                ),
            )
            row = cur.fetchone()
        return _alert_row(dict(row))

    def list_alerts(self, conn: Any, *, status: str | None = None, limit: int = 100) -> list[ISNAlertRecord]:
        self.ensure_alert_storage(conn)
        params: list[Any] = []
        where = ""
        if status:
            where = "WHERE status = %s"
            params.append(status)
        params.append(max(1, min(int(limit or 100), 500)))
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT *
                FROM public.{quote_ident(self.alert_table)}
                {where}
                ORDER BY created_at DESC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = cur.fetchall() or []
        return [_alert_row(dict(row)) for row in rows]


isn_repository = ISNRepository()
