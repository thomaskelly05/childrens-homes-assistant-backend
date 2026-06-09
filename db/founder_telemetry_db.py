"""Founder OS telemetry — PostgreSQL storage for anonymised platform events."""

from __future__ import annotations

import json
import re
import uuid
from datetime import datetime, timezone
from typing import Any

from db.connection import get_db_connection, release_db_connection
from db.founder_persistence_db import IDENTIFIABLE_FIELD_KEYS, sanitise_payload

CREATE_FOUNDER_TELEMETRY_SQL = """
CREATE TABLE IF NOT EXISTS founder_os_telemetry_events (
    id TEXT PRIMARY KEY,
    user_id INTEGER,
    event_type TEXT NOT NULL,
    category TEXT NOT NULL,
    source TEXT NOT NULL,
    route TEXT,
    user_role TEXT,
    session_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_founder_os_telemetry_event_type
    ON founder_os_telemetry_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_os_telemetry_category
    ON founder_os_telemetry_events (category, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_founder_os_telemetry_created
    ON founder_os_telemetry_events (created_at DESC);
"""

BLOCKED_METADATA_KEYS = frozenset(
    IDENTIFIABLE_FIELD_KEYS
    | {
        "child_name",
        "staff_name",
        "provider_name",
        "young_person_name",
        "first_name",
        "last_name",
        "display_name",
        "home_name",
        "email",
        "name",
        "prompt",
        "prompt_body",
        "promptBody",
        "message",
        "messages",
        "answer",
        "response",
        "transcript",
        "comment",
        "question",
        "question_snapshot",
        "answer_snapshot",
        "content",
        "body",
        "narrative",
        "safeguarding_narrative",
        "record_text",
        "child_record",
        "document_text",
        "input_text",
        "professional_note",
    }
)

MAX_METADATA_STRING_LENGTH = 200
MAX_METADATA_DEPTH = 4

IDENTIFIABLE_VALUE_PATTERNS = (
    re.compile(r"\bchild(?:ren)?['']?s?\s+name[s]?\b", re.I),
    re.compile(r"\bstaff\s+name[s]?\b", re.I),
    re.compile(r"\bprovider\s+name[s]?\b", re.I),
    re.compile(r"\byoung\s+person['']?s?\s+name\b", re.I),
)


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    if dt is None:
        return None
    return dt.astimezone(timezone.utc).isoformat()


def _contains_identifiable_text(value: str) -> bool:
    return any(pattern.search(value) for pattern in IDENTIFIABLE_VALUE_PATTERNS)


def sanitise_telemetry_metadata(value: Any, *, depth: int = 0) -> Any:
    if depth > MAX_METADATA_DEPTH:
        return None
    if isinstance(value, dict):
        cleaned: dict[str, Any] = {}
        for key, inner in value.items():
            if key in BLOCKED_METADATA_KEYS:
                continue
            cleaned[key] = sanitise_telemetry_metadata(inner, depth=depth + 1)
        return cleaned
    if isinstance(value, list):
        return [sanitise_telemetry_metadata(item, depth=depth + 1) for item in value[:20]]
    if isinstance(value, str):
        if _contains_identifiable_text(value):
            return "[redacted]"
        if len(value) > MAX_METADATA_STRING_LENGTH:
            return value[:MAX_METADATA_STRING_LENGTH] + "…"
        return value
    if isinstance(value, (int, float, bool)) or value is None:
        return value
    return str(value)[:MAX_METADATA_STRING_LENGTH]


def reject_identifiable_metadata(metadata: dict[str, Any]) -> list[str]:
    """Return field paths that contain blocked identifiable keys (pre-redaction)."""
    violations: list[str] = []

    def walk(value: Any, prefix: str) -> None:
        if isinstance(value, dict):
            for key, inner in value.items():
                path = f"{prefix}.{key}" if prefix else key
                if key in BLOCKED_METADATA_KEYS or key in IDENTIFIABLE_FIELD_KEYS:
                    violations.append(path)
                walk(inner, path)
        elif isinstance(value, list):
            for index, item in enumerate(value[:20]):
                walk(item, f"{prefix}[{index}]")

    walk(metadata, "")
    return violations


def _row_to_event(row: Any) -> dict[str, Any]:
    metadata = row["metadata"]
    if isinstance(metadata, str):
        metadata = json.loads(metadata)
    return {
        "id": row["id"],
        "eventType": row["event_type"],
        "category": row["category"],
        "source": row["source"],
        "route": row["route"],
        "userRole": row["user_role"],
        "sessionId": row["session_id"],
        "metadata": metadata if isinstance(metadata, dict) else {},
        "timestamp": _iso(row["created_at"]),
    }


async def ensure_founder_telemetry_tables() -> None:
    conn = await get_db_connection()
    try:
        await conn.execute(CREATE_FOUNDER_TELEMETRY_SQL)
    finally:
        await release_db_connection(conn)


async def append_telemetry_event(
    *,
    user_id: int | None,
    event_type: str,
    category: str,
    source: str,
    route: str | None,
    user_role: str | None,
    session_id: str | None,
    metadata: dict[str, Any],
) -> dict[str, Any]:
    await ensure_founder_telemetry_tables()
    violations = reject_identifiable_metadata(metadata)
    if violations:
        raise ValueError(f"identifiable_metadata:{','.join(violations[:5])}")

    redacted = sanitise_telemetry_metadata(metadata)
    if not isinstance(redacted, dict):
        redacted = {}

    event_id = f"tel-{uuid.uuid4().hex[:16]}"
    conn = await get_db_connection()
    try:
        row = await conn.fetchrow(
            """
            INSERT INTO founder_os_telemetry_events (
                id, user_id, event_type, category, source, route, user_role, session_id, metadata
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
            RETURNING *
            """,
            event_id,
            user_id,
            event_type,
            category,
            source,
            route,
            user_role,
            session_id,
            json.dumps(redacted),
        )
        return sanitise_payload(_row_to_event(row))
    finally:
        await release_db_connection(conn)


async def build_telemetry_summary(*, days: int = 30) -> dict[str, Any]:
    await ensure_founder_telemetry_tables()
    conn = await get_db_connection()
    try:
        totals = await conn.fetchrow(
            """
            SELECT
                COUNT(*)::int AS total_events,
                COUNT(*) FILTER (
                    WHERE created_at >= date_trunc('day', NOW() AT TIME ZONE 'UTC')
                )::int AS events_today,
                COUNT(*) FILTER (
                    WHERE event_type IN ('orb-conversation', 'orb-chat-submitted', 'orb-response-generated')
                )::int AS orb_conversations,
                COUNT(*) FILTER (
                    WHERE event_type IN ('ai-request', 'ai-token-usage')
                )::int AS ai_requests,
                COUNT(*) FILTER (WHERE event_type = 'error')::int AS errors,
                COUNT(*) FILTER (WHERE event_type = 'feedback')::int AS feedback_count,
                COALESCE(
                    SUM(
                        CASE
                            WHEN event_type = 'ai-cost-estimate'
                                THEN COALESCE((metadata->>'estimatedCostGbp')::float, 0)
                            ELSE 0
                        END
                    ),
                    0
                )::float AS estimated_ai_cost,
                MAX(created_at) AS last_updated
            FROM founder_os_telemetry_events
            WHERE created_at >= NOW() - ($1::int || ' days')::interval
            """,
            days,
        )

        mode_rows = await conn.fetch(
            """
            SELECT COALESCE(metadata->>'mode', metadata->>'orbMode', 'unknown') AS mode,
                   COUNT(*)::int AS count
            FROM founder_os_telemetry_events
            WHERE event_type IN ('orb-mode-usage', 'orb-conversation', 'orb-chat-submitted')
              AND created_at >= NOW() - ($1::int || ' days')::interval
            GROUP BY 1
            ORDER BY count DESC
            LIMIT 8
            """,
            days,
        )

        feature_rows = await conn.fetch(
            """
            SELECT COALESCE(metadata->>'feature', category, event_type) AS feature,
                   COUNT(*)::int AS count
            FROM founder_os_telemetry_events
            WHERE category IN ('features', 'platform', 'orb', 'ai', 'auth')
              AND created_at >= NOW() - ($1::int || ' days')::interval
            GROUP BY 1
            ORDER BY count DESC
            LIMIT 12
            """,
            days,
        )

        return sanitise_payload(
            {
                "totalEvents": totals["total_events"] if totals else 0,
                "eventsToday": totals["events_today"] if totals else 0,
                "orbConversations": totals["orb_conversations"] if totals else 0,
                "topOrbModes": [
                    {"mode": row["mode"], "count": row["count"]} for row in mode_rows
                ],
                "featureUsage": [
                    {"feature": row["feature"], "count": row["count"]} for row in feature_rows
                ],
                "aiRequests": totals["ai_requests"] if totals else 0,
                "estimatedAiCost": round(float(totals["estimated_ai_cost"] or 0), 4)
                if totals
                else 0,
                "errors": totals["errors"] if totals else 0,
                "feedbackCount": totals["feedback_count"] if totals else 0,
                "lastUpdated": _iso(totals["last_updated"]) if totals else None,
            }
        )
    finally:
        await release_db_connection(conn)
