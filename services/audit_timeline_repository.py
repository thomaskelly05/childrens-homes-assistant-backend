from __future__ import annotations

from typing import Any

from psycopg2.extras import Json

from schemas.audit_contracts import AuditTimelineEvent


class AuditTimelineRepository:
    """Canonical audit timeline writer/reader over the append-only memory tables."""

    def append(self, conn: Any, event: AuditTimelineEvent) -> str | None:
        payload = event.model_dump(mode="json")
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO public.operational_audit_timeline (
                    provider_id, home_id, entity_type, entity_id, actor_id,
                    correlation_id, schema_version, event_type, chronology_references,
                    evidence_references, governance_references, replay_references, metadata
                ) VALUES (
                    %s, %s, %s, %s, %s,
                    %s, %s, %s, %s::jsonb,
                    %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb
                )
                RETURNING id
                """,
                (
                    payload.get("provider_id"),
                    payload.get("home_id"),
                    payload["entity_type"],
                    payload["entity_id"],
                    payload.get("actor_id"),
                    payload.get("correlation_id") or payload.get("event_id"),
                    payload["schema_version"],
                    payload["action"],
                    Json(payload.get("chronology_ids") or []),
                    Json(payload.get("evidence_ids") or []),
                    Json(payload.get("governance_ids") or []),
                    Json(payload.get("replay_metadata") or {}),
                    Json(payload),
                ),
            )
            row = cur.fetchone()
        return str(row["id"] if isinstance(row, dict) else row[0]) if row else None

    def replay(self, conn: Any, *, provider_id: int | None, home_id: int | None = None, after_id: int = 0, limit: int = 100) -> dict[str, Any]:
        where = ["id > %s"]
        params: list[Any] = [after_id]
        if provider_id is not None:
            where.append("provider_id = %s")
            params.append(provider_id)
        if home_id is not None:
            where.append("home_id = %s")
            params.append(home_id)
        params.append(max(1, min(limit, 500)))
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT id, provider_id, home_id, entity_type, entity_id, actor_id,
                       correlation_id, schema_version, event_type, created_at, metadata
                FROM public.operational_audit_timeline
                WHERE {" AND ".join(where)}
                ORDER BY id ASC
                LIMIT %s
                """,
                tuple(params),
            )
            rows = [dict(row) for row in cur.fetchall() or []]
        return {"ok": True, "events": rows, "last_id": int(rows[-1]["id"]) if rows else after_id}


audit_timeline_repository = AuditTimelineRepository()
