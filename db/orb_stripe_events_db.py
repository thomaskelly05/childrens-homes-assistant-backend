from __future__ import annotations

import logging
from typing import Any

from psycopg2.extras import Json, RealDictCursor

logger = logging.getLogger(__name__)


def _has_table_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return "orb_stripe_events" in text or "does not exist" in text


def is_orb_stripe_event_processed(conn, stripe_event_id: str) -> bool:
    event_id = str(stripe_event_id or "").strip()
    if not event_id:
        return False
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT 1 FROM orb_stripe_events WHERE stripe_event_id = %s LIMIT 1",
                (event_id,),
            )
            return cur.fetchone() is not None
    except Exception as exc:
        if _has_table_error(exc):
            logger.debug("orb_stripe_events table unavailable", exc_info=True)
            try:
                conn.rollback()
            except Exception:
                pass
            return False
        raise


def record_orb_stripe_event(
    conn,
    *,
    stripe_event_id: str,
    event_type: str,
    status: str = "processed",
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    event_id = str(stripe_event_id or "").strip()
    if not event_id:
        return None
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO orb_stripe_events (stripe_event_id, event_type, status, metadata)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (stripe_event_id) DO NOTHING
                RETURNING id, stripe_event_id, event_type, status, processed_at
                """,
                (event_id, event_type, status, Json(metadata or {})),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    except Exception as exc:
        if _has_table_error(exc):
            logger.debug("Could not record orb_stripe_event", exc_info=True)
            try:
                conn.rollback()
            except Exception:
                pass
            return None
        raise
