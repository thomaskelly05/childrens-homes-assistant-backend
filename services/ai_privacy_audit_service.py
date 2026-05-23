"""AI privacy audit events — metadata only, never raw care record text."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timedelta, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from schemas.ai_privacy import (
    AiPermissionDecision,
    AiPrivacyAlert,
    AiPrivacyAuditEvent,
    AiPrivacyDashboardSummary,
    AiPrivacyFilter,
    AiPrivacyGuardResult,
    AiPrivacyHealth,
)

logger = logging.getLogger("indicare.ai_privacy_audit")

SENSITIVE_METADATA_KEYS = frozenset(
    {
        "prompt",
        "message",
        "raw_message",
        "answer",
        "content",
        "record_body",
        "text",
        "transcript",
    }
)

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS ai_privacy_events (
    id TEXT PRIMARY KEY,
    surface TEXT NOT NULL,
    action TEXT NOT NULL,
    decision TEXT NOT NULL,
    user_id TEXT,
    user_role TEXT,
    home_id INTEGER,
    child_id INTEGER,
    staff_id INTEGER,
    output_id TEXT,
    data_classes JSONB NOT NULL DEFAULT '[]'::jsonb,
    sensitivity TEXT,
    redaction_applied BOOLEAN DEFAULT FALSE,
    minimisation_applied BOOLEAN DEFAULT FALSE,
    manager_review_required BOOLEAN DEFAULT FALSE,
    safeguarding_review_required BOOLEAN DEFAULT FALSE,
    export_allowed BOOLEAN,
    model_send_allowed BOOLEAN,
    blocked_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
    reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
"""


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _parse_json(value: Any, default: Any) -> Any:
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return default
    return default


def _safe_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    if not metadata:
        return {}
    safe: dict[str, Any] = {}
    for key, value in metadata.items():
        if str(key).lower() in SENSITIVE_METADATA_KEYS:
            safe[key] = "[redacted]"
        elif isinstance(value, str) and len(value) > 300:
            safe[key] = value[:300] + "…"
        else:
            safe[key] = value
    return safe


def _period_start(period: str) -> datetime | None:
    now = _now()
    mapping = {
        "24h": timedelta(hours=24),
        "7d": timedelta(days=7),
        "30d": timedelta(days=30),
        "90d": timedelta(days=90),
    }
    delta = mapping.get(period)
    return now - delta if delta else None


class AiPrivacyAuditService:
    def __init__(self) -> None:
        self._memory: list[AiPrivacyAuditEvent] = []

    def reset_for_tests(self) -> None:
        self._memory.clear()

    def record_event(self, event: AiPrivacyAuditEvent, conn: Any | None = None) -> AiPrivacyAuditEvent:
        if not event.id:
            event.id = f"privacy-{uuid4().hex[:16]}"
        if event.created_at is None:
            event.created_at = _now()
        event.metadata = _safe_metadata(event.metadata)
        if self._detect_storage_mode(conn) == "postgresql":
            self._insert_db(event, conn=conn)
        else:
            self._memory.append(event)
            if len(self._memory) > 2000:
                self._memory = self._memory[-1500:]
        return event

    def record_guard_result(
        self,
        result: AiPrivacyGuardResult,
        *,
        surface: str,
        action: str,
        current_user: dict[str, Any] | None = None,
        home_id: int | None = None,
        child_id: int | None = None,
        staff_id: int | None = None,
        output_id: str | None = None,
        conn: Any | None = None,
    ) -> AiPrivacyAuditEvent:
        event = AiPrivacyAuditEvent(
            id=result.audit_event_id or f"privacy-{uuid4().hex[:16]}",
            surface=surface,
            action=action,
            decision=result.decision,
            user_id=_text((current_user or {}).get("id") or (current_user or {}).get("user_id")) or None,
            user_role=_text((current_user or {}).get("role")) or None,
            home_id=home_id,
            child_id=child_id,
            staff_id=staff_id,
            output_id=output_id,
            data_classes=[str(dc) for dc in result.data_classes],
            sensitivity=result.sensitivity,
            redaction_applied=result.redaction_applied,
            minimisation_applied=result.minimisation_applied,
            manager_review_required=result.manager_review_required,
            safeguarding_review_required=result.safeguarding_review_required,
            export_allowed=result.export_allowed,
            model_send_allowed=result.model_send_allowed,
            blocked_fields=list(result.blocked_fields),
            reasons=list(result.reasons),
            warnings=list(result.warnings),
            metadata=_safe_metadata(result.metadata),
            created_at=_now(),
        )
        saved = self.record_event(event, conn=conn)
        result.audit_event_id = saved.id
        return saved

    def get_recent_events(
        self,
        filters: AiPrivacyFilter | None = None,
        conn: Any | None = None,
    ) -> list[AiPrivacyAuditEvent]:
        filters = filters or AiPrivacyFilter()
        if self._detect_storage_mode(conn) == "postgresql":
            return self._query_db(filters, conn=conn)
        events = list(self._memory)
        start = _period_start(filters.period)
        if start:
            events = [e for e in events if e.created_at and e.created_at >= start]
        if filters.surface:
            events = [e for e in events if e.surface == filters.surface]
        if filters.decision:
            events = [e for e in events if e.decision == filters.decision]
        if filters.home_id is not None:
            events = [e for e in events if e.home_id == filters.home_id]
        events.sort(key=lambda e: e.created_at or _now(), reverse=True)
        return events[: filters.limit]

    def get_privacy_summary(
        self,
        filters: AiPrivacyFilter | None = None,
        conn: Any | None = None,
    ) -> AiPrivacyDashboardSummary:
        events = self.get_recent_events(
            AiPrivacyFilter(**{**(filters or AiPrivacyFilter()).model_dump(), "limit": 500}),
            conn=conn,
        )
        summary = AiPrivacyDashboardSummary(total_events=len(events))
        for event in events:
            decision = str(event.decision)
            surface = str(event.surface)
            summary.events_by_decision[decision] = summary.events_by_decision.get(decision, 0) + 1
            summary.events_by_surface[surface] = summary.events_by_surface.get(surface, 0) + 1
            if decision in {"deny", "unavailable", "require_escalation"}:
                summary.denied_attempts += 1
            if event.redaction_applied:
                summary.redaction_applied_count += 1
            if event.minimisation_applied:
                summary.minimisation_applied_count += 1
            if event.child_id is not None:
                summary.child_scoped_attempts += 1
            if "child_record_raw" in (event.data_classes or []):
                summary.raw_record_blocked += 1
            if surface == "standalone_orb" and decision == "deny":
                summary.standalone_os_context_blocked += 1
            if event.safeguarding_review_required:
                summary.safeguarding_review_required += 1
            if event.manager_review_required:
                summary.manager_review_required += 1
            if event.export_allowed is True:
                summary.exports_allowed += 1
            elif event.export_allowed is False and str(event.action) == "export_output":
                summary.exports_blocked += 1
            if event.model_send_allowed is False:
                summary.model_send_blocked += 1
        return summary

    def get_privacy_alerts(
        self,
        filters: AiPrivacyFilter | None = None,
        conn: Any | None = None,
    ) -> list[AiPrivacyAlert]:
        summary = self.get_privacy_summary(filters, conn=conn)
        alerts: list[AiPrivacyAlert] = []
        if summary.denied_attempts >= 3:
            alerts.append(
                AiPrivacyAlert(
                    id="privacy-denied-spike",
                    level="medium",
                    title="Repeated AI access denials",
                    message=f"{summary.denied_attempts} denied AI access attempts in period.",
                )
            )
        if summary.raw_record_blocked:
            alerts.append(
                AiPrivacyAlert(
                    id="privacy-raw-blocked",
                    level="high",
                    title="Raw record model access blocked",
                    message=f"{summary.raw_record_blocked} raw-record attempts blocked.",
                )
            )
        if summary.safeguarding_review_required:
            alerts.append(
                AiPrivacyAlert(
                    id="privacy-safeguarding-review",
                    level="high",
                    title="Safeguarding review required",
                    message=f"{summary.safeguarding_review_required} events flagged for safeguarding review.",
                )
            )
        return alerts

    def build_health(self, conn: Any | None = None) -> AiPrivacyHealth:
        mode = self._detect_storage_mode(conn)
        return AiPrivacyHealth(
            status="ready",
            storage_mode=mode,
            events_table_available=mode == "postgresql",
            database_available=mode == "postgresql",
        )

    def _detect_storage_mode(self, conn: Any | None = None) -> str:
        own_conn = False
        if conn is None:
            try:
                conn = get_db_connection()
                own_conn = True
            except (DatabaseUnavailableError, Exception):
                return "memory"
        try:
            with conn.cursor() as cur:
                cur.execute(CREATE_TABLE_SQL)
                cur.execute("SELECT to_regclass('public.ai_privacy_events') IS NOT NULL AS exists")
                row = cur.fetchone()
                if row and (row[0] if not isinstance(row, dict) else row.get("exists")):
                    conn.commit()
                    return "postgresql"
        except Exception:
            logger.debug("ai_privacy_events table unavailable", exc_info=True)
        finally:
            if own_conn and conn is not None:
                release_db_connection(conn)
        return "memory"

    def _insert_db(self, event: AiPrivacyAuditEvent, conn: Any | None = None) -> None:
        own_conn = False
        if conn is None:
            conn = get_db_connection()
            own_conn = True
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO ai_privacy_events (
                        id, surface, action, decision, user_id, user_role,
                        home_id, child_id, staff_id, output_id, data_classes, sensitivity,
                        redaction_applied, minimisation_applied, manager_review_required,
                        safeguarding_review_required, export_allowed, model_send_allowed,
                        blocked_fields, reasons, warnings, metadata, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    )
                    ON CONFLICT (id) DO NOTHING
                    """,
                    (
                        event.id,
                        event.surface,
                        event.action,
                        event.decision,
                        event.user_id,
                        event.user_role,
                        event.home_id,
                        event.child_id,
                        event.staff_id,
                        event.output_id,
                        Json(event.data_classes),
                        event.sensitivity,
                        event.redaction_applied,
                        event.minimisation_applied,
                        event.manager_review_required,
                        event.safeguarding_review_required,
                        event.export_allowed,
                        event.model_send_allowed,
                        Json(event.blocked_fields),
                        Json(event.reasons),
                        Json(event.warnings),
                        Json(event.metadata),
                        event.created_at or _now(),
                    ),
                )
            conn.commit()
        except Exception as exc:
            logger.warning("Failed to persist privacy event: %s", exc)
            self._memory.append(event)
        finally:
            if own_conn:
                release_db_connection(conn)

    def _query_db(self, filters: AiPrivacyFilter, conn: Any | None = None) -> list[AiPrivacyAuditEvent]:
        own_conn = False
        if conn is None:
            try:
                conn = get_db_connection()
                own_conn = True
            except Exception:
                return self.get_recent_events(filters, conn=None)
        clauses = ["1=1"]
        params: list[Any] = []
        start = _period_start(filters.period)
        if start:
            clauses.append("created_at >= %s")
            params.append(start)
        if filters.surface:
            clauses.append("surface = %s")
            params.append(filters.surface)
        if filters.decision:
            clauses.append("decision = %s")
            params.append(filters.decision)
        if filters.home_id is not None:
            clauses.append("home_id = %s")
            params.append(filters.home_id)
        params.append(filters.limit)
        try:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT * FROM ai_privacy_events
                    WHERE {' AND '.join(clauses)}
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    params,
                )
                rows = cur.fetchall() or []
            return [self._row_to_event(dict(row)) for row in rows]
        except Exception as exc:
            logger.warning("Privacy event query failed: %s", exc)
            return []
        finally:
            if own_conn:
                release_db_connection(conn)

    def _row_to_event(self, row: dict[str, Any]) -> AiPrivacyAuditEvent:
        return AiPrivacyAuditEvent(
            id=_text(row.get("id")),
            surface=_text(row.get("surface")),
            action=_text(row.get("action")),
            decision=_text(row.get("decision")),  # type: ignore[arg-type]
            user_id=row.get("user_id"),
            user_role=row.get("user_role"),
            home_id=row.get("home_id"),
            child_id=row.get("child_id"),
            staff_id=row.get("staff_id"),
            output_id=row.get("output_id"),
            data_classes=_parse_json(row.get("data_classes"), []),
            sensitivity=row.get("sensitivity"),
            redaction_applied=bool(row.get("redaction_applied")),
            minimisation_applied=bool(row.get("minimisation_applied")),
            manager_review_required=bool(row.get("manager_review_required")),
            safeguarding_review_required=bool(row.get("safeguarding_review_required")),
            export_allowed=row.get("export_allowed"),
            model_send_allowed=row.get("model_send_allowed"),
            blocked_fields=_parse_json(row.get("blocked_fields"), []),
            reasons=_parse_json(row.get("reasons"), []),
            warnings=_parse_json(row.get("warnings"), []),
            metadata=_parse_json(row.get("metadata"), {}),
            created_at=row.get("created_at"),
        )


ai_privacy_audit_service = AiPrivacyAuditService()
