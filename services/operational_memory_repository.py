from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from psycopg2.extras import Json

from core.policy_engine import context_from_user
from schemas.operational_state import OPERATIONAL_STATE_SCHEMA_VERSION

OPERATIONAL_MEMORY_TABLES = {
    "operational_lifecycle_history",
    "operational_audit_timeline",
    "operational_event_log",
    "governance_signoff_history",
    "evidence_relationship_history",
    "chronology_snapshot_history",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any) -> str | None:
    if value in (None, ""):
        return None
    return str(value)


@dataclass(frozen=True)
class OperationalMemoryEvent:
    provider_id: int | None
    home_id: int | None
    entity_type: str
    entity_id: str
    actor_id: int | None
    correlation_id: str
    schema_version: str = OPERATIONAL_STATE_SCHEMA_VERSION
    created_at: str = field(default_factory=_now)
    event_type: str = "recorded"
    previous_state: dict[str, Any] | None = None
    next_state: dict[str, Any] | None = None
    transition_type: str | None = None
    escalation_metadata: dict[str, Any] = field(default_factory=dict)
    signoff_metadata: dict[str, Any] = field(default_factory=dict)
    evidence_references: list[str] = field(default_factory=list)
    chronology_references: list[str] = field(default_factory=list)
    governance_references: list[str] = field(default_factory=list)
    replay_references: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_record(self) -> dict[str, Any]:
        return {
            "provider_id": self.provider_id,
            "home_id": self.home_id,
            "entity_type": self.entity_type,
            "entity_id": self.entity_id,
            "actor_id": self.actor_id,
            "correlation_id": self.correlation_id,
            "schema_version": self.schema_version,
            "created_at": self.created_at,
            "event_type": self.event_type,
            "previous_state": self.previous_state or {},
            "next_state": self.next_state or {},
            "transition_type": self.transition_type,
            "escalation_metadata": self.escalation_metadata,
            "signoff_metadata": self.signoff_metadata,
            "evidence_references": self.evidence_references,
            "chronology_references": self.chronology_references,
            "governance_references": self.governance_references,
            "replay_references": self.replay_references,
            "metadata": self.metadata,
        }


class OperationalMemoryRepository:
    """Append-only operational memory persistence for replay and inspection export."""

    def append(self, conn: Any, table_name: str, event: OperationalMemoryEvent) -> str | None:
        if table_name not in OPERATIONAL_MEMORY_TABLES:
            raise ValueError(f"Unsupported operational memory table: {table_name}")
        record = event.to_record()
        columns = list(record)
        with conn.cursor() as cur:
            cur.execute(
                f"""
                INSERT INTO public.{table_name} ({", ".join(columns)})
                VALUES ({", ".join(["%s"] * len(columns))})
                RETURNING id
                """,
                tuple(self._sql_value(record[column]) for column in columns),
            )
            row = cur.fetchone()
        return str(row["id"] if isinstance(row, dict) else row[0]) if row else None

    def append_lifecycle_transition(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        entity_type: str,
        entity_id: str,
        previous_state: dict[str, Any] | None,
        next_state: dict[str, Any],
        transition_type: str,
        lifecycle_context: dict[str, Any],
        correlation_id: str | None = None,
    ) -> dict[str, str | None]:
        context = context_from_user(current_user)
        home_id = _safe_int((next_state or {}).get("home_id") or (previous_state or {}).get("home_id") or context.primary_home_id)
        event = OperationalMemoryEvent(
            provider_id=_safe_int((next_state or {}).get("provider_id") or (previous_state or {}).get("provider_id") or context.provider_id),
            home_id=home_id,
            entity_type=entity_type,
            entity_id=str(entity_id),
            actor_id=context.user_id,
            correlation_id=correlation_id or f"corr_{uuid.uuid4().hex}",
            event_type="lifecycle.transition",
            previous_state=previous_state,
            next_state=next_state,
            transition_type=transition_type,
            escalation_metadata=dict(lifecycle_context.get("escalation") or {}),
            signoff_metadata=dict(lifecycle_context.get("signoff") or {}),
            evidence_references=self._ids(lifecycle_context, "evidence_edges"),
            chronology_references=list(lifecycle_context.get("chronology_ids") or []),
            governance_references=list(lifecycle_context.get("governance_ids") or []),
            replay_references={"source": "operational_writeback"},
            metadata={"lifecycle": lifecycle_context},
        )
        inserted = {
            "operational_lifecycle_history_id": self.append(conn, "operational_lifecycle_history", event),
            "operational_event_log_id": self.append(conn, "operational_event_log", event),
            "operational_audit_timeline_id": self.append(conn, "operational_audit_timeline", event),
        }
        if event.signoff_metadata:
            inserted["governance_signoff_history_id"] = self.append(conn, "governance_signoff_history", event)
        if event.evidence_references:
            inserted["evidence_relationship_history_id"] = self.append(conn, "evidence_relationship_history", event)
        if event.chronology_references:
            inserted["chronology_snapshot_history_id"] = self.append(conn, "chronology_snapshot_history", event)
        return inserted

    def _ids(self, lifecycle_context: dict[str, Any], key: str) -> list[str]:
        if key == "evidence_edges":
            return [
                str(edge.get("target_id"))
                for edge in lifecycle_context.get("evidence_edges") or []
                if isinstance(edge, dict) and edge.get("target_id")
            ]
        values = lifecycle_context.get(key) or []
        return [str(value) for value in values if str(value)]

    def _sql_value(self, value: Any) -> Any:
        if isinstance(value, (dict, list)):
            return Json(value)
        return value


def _safe_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


operational_memory_repository = OperationalMemoryRepository()
