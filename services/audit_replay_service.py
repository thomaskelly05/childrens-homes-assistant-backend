from __future__ import annotations

from typing import Any

from psycopg2.extras import Json


class AuditReplayService:
    """Replay audit events for internal diagnostics without exposing care content."""

    redacted_metadata_keys = {"content", "prompt", "response", "transcript", "child_name", "young_person_name"}

    def replay_batch(
        self,
        conn: Any,
        *,
        replay_name: str,
        event_types: list[str] | None = None,
        limit: int = 100,
    ) -> dict[str, Any]:
        cursor = self._cursor(conn, replay_name)
        params: list[Any] = [cursor, max(1, min(limit, 500))]
        where = "id > %s"
        if event_types:
            where += " AND event_type = ANY(%s)"
            params = [cursor, event_types, max(1, min(limit, 500))]
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, created_at, event_type, actor_user_id, actor_role, home_id,
                       provider_id, resource_type, resource_id, action, outcome,
                       request_id, metadata
                FROM audit_events
                WHERE {where}
                ORDER BY id ASC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = [dict(row) for row in cur.fetchall() or []]
        events = [self._safe_event(row) for row in rows]
        if rows:
            self._store_cursor(conn, replay_name=replay_name, last_id=max(int(row["id"]) for row in rows), filters={"event_types": event_types or []})
        return {"ok": True, "replay_name": replay_name, "events": events, "last_audit_event_id": events[-1]["id"] if events else cursor}

    def _cursor(self, conn: Any, replay_name: str) -> int:
        with conn.cursor() as cur:
            cur.execute("SELECT last_audit_event_id FROM audit_replay_cursors WHERE replay_name=%s", (replay_name,))
            row = cur.fetchone()
        if not row:
            return 0
        return int(row["last_audit_event_id"] if isinstance(row, dict) else row[0])

    def _store_cursor(self, conn: Any, *, replay_name: str, last_id: int, filters: dict[str, Any]) -> None:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO audit_replay_cursors (replay_name, last_audit_event_id, filters, updated_at)
                VALUES (%s, %s, %s, NOW())
                ON CONFLICT (replay_name) DO UPDATE SET
                    last_audit_event_id=EXCLUDED.last_audit_event_id,
                    filters=EXCLUDED.filters,
                    updated_at=NOW()
                """,
                (replay_name, last_id, Json(filters)),
            )

    def _safe_event(self, row: dict[str, Any]) -> dict[str, Any]:
        metadata = dict(row.get("metadata") or {})
        for key in list(metadata):
            if str(key).lower() in self.redacted_metadata_keys:
                metadata[key] = "[redacted]"
        return {
            "id": int(row["id"]),
            "created_at": str(row.get("created_at")),
            "event_type": row.get("event_type"),
            "actor_user_id": row.get("actor_user_id"),
            "actor_role": row.get("actor_role"),
            "home_id": row.get("home_id"),
            "provider_id": row.get("provider_id"),
            "resource_type": row.get("resource_type"),
            "resource_id": row.get("resource_id"),
            "action": row.get("action"),
            "outcome": row.get("outcome"),
            "request_id": row.get("request_id"),
            "metadata": metadata,
        }


audit_replay_service = AuditReplayService()
