from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException

from core.policy_engine import context_from_user, policy_engine
from repositories.os_repository_utils import quote_ident, safe_int, table_exists
from schemas.operational_memory import (
    OperationalMemoryReplayEvent,
    OperationalMemoryReplayResult,
    ReplayIntegrity,
)

OPERATIONAL_MEMORY_REPLAY_TABLES: tuple[str, ...] = (
    "operational_lifecycle_history",
    "operational_audit_timeline",
    "operational_event_log",
    "chronology_snapshot_history",
    "evidence_relationship_history",
    "governance_signoff_history",
)


class OperationalMemoryReplayService:
    """Deterministic replay over the append-only operational memory tables."""

    def replay(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        provider_id: int | None = None,
        home_id: int | None = None,
        child_id: int | None = None,
        staff_id: int | None = None,
        entity_type: str | None = None,
        entity_id: str | None = None,
        after_cursor: int | None = None,
        since: str | None = None,
        replay_at: str | None = None,
        correlation_id: str | None = None,
        tables: list[str] | tuple[str, ...] | None = None,
        limit: int = 100,
        export: bool = False,
        permission: str = "records:read",
    ) -> OperationalMemoryReplayResult:
        context = context_from_user(current_user)
        if permission and not policy_engine.has_permission(current_user, permission, home_id=home_id, provider_id=provider_id):
            raise HTTPException(status_code=403, detail="Operational memory replay access denied.")
        scope = self._scope(context, provider_id=provider_id, home_id=home_id)
        selected_tables = self._available_tables(conn, tables)
        if not selected_tables:
            return OperationalMemoryReplayResult(ok=True, scope=scope, events=[], next_cursor=after_cursor or 0)

        rows = self._query_tables(
            conn,
            selected_tables,
            provider_id=scope.get("provider_id"),
            home_id=scope.get("home_id"),
            child_id=child_id,
            staff_id=staff_id,
            entity_type=entity_type,
            entity_id=entity_id,
            after_cursor=after_cursor,
            since=since,
            replay_at=replay_at,
            correlation_id=correlation_id,
            limit=limit,
        )
        events = [self._event(row) for row in rows]
        events.sort(key=lambda event: (event.created_at or "", event.id, event.source_table))
        integrity = self.integrity(events)
        next_cursor = max((event.id for event in events), default=after_cursor or 0)
        return OperationalMemoryReplayResult(
            ok=True,
            scope=scope,
            events=events,
            next_cursor=next_cursor,
            integrity=integrity,
            export=self._export(events, scope) if export else None,
        )

    def entity_history(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        entity_type: str,
        entity_id: str,
        **kwargs: Any,
    ) -> OperationalMemoryReplayResult:
        return self.replay(
            conn,
            current_user=current_user,
            entity_type=entity_type,
            entity_id=entity_id,
            tables=OPERATIONAL_MEMORY_REPLAY_TABLES,
            **kwargs,
        )

    def integrity(self, events: list[OperationalMemoryReplayEvent]) -> ReplayIntegrity:
        duplicate_keys: list[str] = []
        replay_gap_after_ids: list[int] = []
        stale_event_ids: list[str] = []
        seen: set[str] = set()
        ordered = True
        previous: tuple[str, int, str] | None = None
        by_table: dict[str, list[int]] = {}
        now = datetime.now(timezone.utc)
        for event in events:
            order_key = (event.created_at or "", event.id, event.source_table)
            if previous and order_key < previous:
                ordered = False
            previous = order_key
            duplicate_key = f"{event.source_table}:{event.correlation_id}:{event.event_type}:{event.entity_type}:{event.entity_id}"
            if duplicate_key in seen:
                duplicate_keys.append(duplicate_key)
            seen.add(duplicate_key)
            by_table.setdefault(event.source_table, []).append(event.id)
            try:
                created = datetime.fromisoformat(event.created_at.replace("Z", "+00:00"))
                if created > now:
                    stale_event_ids.append(event.replay_key)
            except ValueError:
                stale_event_ids.append(event.replay_key)
        for ids in by_table.values():
            for previous_id, next_id in zip(sorted(ids), sorted(ids)[1:]):
                if next_id - previous_id > 1:
                    replay_gap_after_ids.append(previous_id)
        return ReplayIntegrity(
            ordering_valid=ordered,
            duplicate_event_keys=duplicate_keys,
            replay_gap_after_ids=sorted(set(replay_gap_after_ids)),
            stale_event_ids=stale_event_ids,
        )

    def _scope(self, context: Any, *, provider_id: int | None, home_id: int | None) -> dict[str, Any]:
        resolved_provider = safe_int(provider_id) if provider_id is not None else context.provider_id
        resolved_home = safe_int(home_id) if home_id is not None else None
        if resolved_home is not None:
            context.require_home(resolved_home)
        if provider_id is not None:
            context.require_provider(provider_id)
        if context.tenancy_scope == "home" and resolved_home is None and len(context.home_ids) == 1:
            resolved_home = context.home_ids[0]
        return {
            "provider_id": resolved_provider,
            "home_id": resolved_home,
            "home_ids": list(context.home_ids),
            "tenancy_scope": context.tenancy_scope,
        }

    def _available_tables(self, conn: Any, tables: list[str] | tuple[str, ...] | None) -> list[str]:
        requested = list(tables or OPERATIONAL_MEMORY_REPLAY_TABLES)
        selected: list[str] = []
        for table_name in requested:
            if table_name not in OPERATIONAL_MEMORY_REPLAY_TABLES:
                raise ValueError(f"Unsupported operational memory replay table: {table_name}")
            if table_exists(conn, table_name):
                selected.append(table_name)
        return selected

    def _query_tables(
        self,
        conn: Any,
        tables: list[str],
        *,
        provider_id: int | None,
        home_id: int | None,
        child_id: int | None,
        staff_id: int | None,
        entity_type: str | None,
        entity_id: str | None,
        after_cursor: int | None,
        since: str | None,
        replay_at: str | None,
        correlation_id: str | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        union_parts: list[str] = []
        params: list[Any] = []
        for table_name in tables:
            where = ["1 = 1"]
            if provider_id is not None:
                where.append("provider_id = %s")
                params.append(provider_id)
            if home_id is not None:
                where.append("home_id = %s")
                params.append(home_id)
            if child_id is not None:
                where.append("(next_state->>'young_person_id' = %s OR previous_state->>'young_person_id' = %s OR metadata->'lifecycle'->>'young_person_id' = %s)")
                params.extend([str(child_id), str(child_id), str(child_id)])
            if staff_id is not None:
                where.append("(actor_id = %s OR next_state->>'staff_id' = %s OR previous_state->>'staff_id' = %s)")
                params.extend([staff_id, str(staff_id), str(staff_id)])
            if entity_type:
                where.append("entity_type = %s")
                params.append(entity_type)
            if entity_id:
                where.append("entity_id = %s")
                params.append(str(entity_id))
            if after_cursor is not None:
                where.append("id > %s")
                params.append(after_cursor)
            if since:
                where.append("created_at >= %s::timestamptz")
                params.append(since)
            if replay_at:
                where.append("created_at <= %s::timestamptz")
                params.append(replay_at)
            if correlation_id:
                where.append("correlation_id = %s")
                params.append(correlation_id)
            union_parts.append(
                f"""
                SELECT id, %s AS source_table, provider_id, home_id, entity_type, entity_id,
                       actor_id, correlation_id, schema_version, created_at, event_type,
                       previous_state, next_state, transition_type, escalation_metadata,
                       signoff_metadata, evidence_references, chronology_references,
                       governance_references, replay_references, metadata
                FROM public.{quote_ident(table_name)}
                WHERE {" AND ".join(where)}
                """
            )
            params.insert(len(params) - (len(where) - 1), table_name)
        capped_limit = max(1, min(limit, 1000))
        sql = f"""
            SELECT *
            FROM ({' UNION ALL '.join(union_parts)}) AS operational_memory
            ORDER BY created_at ASC NULLS LAST, id ASC, source_table ASC
            LIMIT %s
        """
        params.append(capped_limit)
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            return [dict(row) for row in cur.fetchall() or []]

    def _event(self, row: dict[str, Any]) -> OperationalMemoryReplayEvent:
        source_table = str(row.get("source_table") or "operational_event_log")
        event_id = int(row.get("id") or 0)
        return OperationalMemoryReplayEvent(
            id=event_id,
            replay_key=f"{source_table}:{event_id}",
            source_table=source_table,
            provider_id=safe_int(row.get("provider_id")),
            home_id=safe_int(row.get("home_id")),
            entity_type=str(row.get("entity_type") or "record"),
            entity_id=str(row.get("entity_id") or ""),
            actor_id=safe_int(row.get("actor_id")),
            correlation_id=str(row.get("correlation_id") or f"{source_table}:{event_id}"),
            schema_version=str(row.get("schema_version") or "2026-05-16.v1"),
            created_at=str(row.get("created_at") or ""),
            event_type=str(row.get("event_type") or "recorded"),
            transition_type=str(row.get("transition_type")) if row.get("transition_type") is not None else None,
            previous_state=self._dict(row.get("previous_state")),
            next_state=self._dict(row.get("next_state")),
            evidence_references=self._list(row.get("evidence_references")),
            chronology_references=self._list(row.get("chronology_references")),
            governance_references=self._list(row.get("governance_references")),
            replay_references=self._dict(row.get("replay_references")),
            metadata={
                **self._dict(row.get("metadata")),
                "escalation_metadata": self._dict(row.get("escalation_metadata")),
                "signoff_metadata": self._dict(row.get("signoff_metadata")),
            },
        )

    def _export(self, events: list[OperationalMemoryReplayEvent], scope: dict[str, Any]) -> dict[str, Any]:
        return {
            "format": "operational-memory-replay.v1",
            "scope": scope,
            "event_count": len(events),
            "events": [event.model_dump(mode="json") for event in events],
        }

    def _dict(self, value: Any) -> dict[str, Any]:
        return value if isinstance(value, dict) else {}

    def _list(self, value: Any) -> list[str]:
        if value is None:
            return []
        if isinstance(value, (list, tuple, set)):
            return [str(item) for item in value if str(item)]
        return [str(value)] if str(value) else []


operational_memory_replay_service = OperationalMemoryReplayService()
