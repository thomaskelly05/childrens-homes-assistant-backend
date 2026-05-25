"""Handover workspace drafts — PostgreSQL with in-memory fallback."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import table_exists
from schemas.handover_drafts import (
    HandoverDraftListResponse,
    HandoverDraftRecord,
    HandoverDraftRequest,
    HandoverDraftResponse,
    HandoverDraftSection,
    HandoverDraftStatus,
    HandoverDraftUpdateRequest,
)
from schemas.handover_intelligence import HandoverHealth

logger = logging.getLogger("indicare.handover_drafts")

FORMAL_HANDOVER_NOTICE = (
    "This completes the handover workspace draft only. "
    "It does not create or approve a formal handover_records entry."
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _user_display_name(current_user: dict[str, Any]) -> str:
    first = _text(current_user.get("first_name"))
    last = _text(current_user.get("last_name"))
    if first or last:
        return f"{first} {last}".strip()
    return _text(current_user.get("email"), "User")


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


def _normalize_sections(sections: list[Any] | None) -> list[dict[str, Any]]:
    output: list[dict[str, Any]] = []
    for raw in sections or []:
        if isinstance(raw, HandoverDraftSection):
            output.append(raw.model_dump())
        elif isinstance(raw, dict):
            output.append(raw)
    return output


class HandoverDraftService:
    def __init__(self) -> None:
        self._memory: dict[str, dict[str, Any]] = {}

    def _use_db(self) -> bool:
        try:
            conn = get_db_connection()
            release_db_connection(conn)
            return True
        except (DatabaseUnavailableError, Exception):
            return False

    def _detect_storage_mode(self, conn: Any | None = None) -> str:
        if conn is not None:
            try:
                if table_exists(conn, "handover_drafts"):
                    return "postgresql"
            except Exception:
                pass
            return "memory"
        if not self._use_db():
            return "memory"
        try:
            conn = get_db_connection()
            try:
                mode = "postgresql" if table_exists(conn, "handover_drafts") else "memory"
            finally:
                release_db_connection(conn)
            return mode
        except Exception:
            return "memory"

    def get_health(self, conn: Any | None = None) -> HandoverHealth:
        mode = self._detect_storage_mode(conn)
        count = len(self._memory) if mode == "memory" else self._count_db(conn)
        return HandoverHealth(
            status="ok",
            service="handover_draft_service",
            storage_mode=mode,
            persistence_available=mode == "postgresql",
            draft_count=count,
        )

    def _count_db(self, conn: Any | None) -> int:
        if conn is None:
            try:
                conn = get_db_connection()
                own = True
            except Exception:
                return len(self._memory)
        else:
            own = False
        try:
            with conn.cursor() as cur:
                cur.execute(
                    "SELECT COUNT(*) FROM handover_drafts WHERE status != 'archived'"
                )
                row = cur.fetchone()
                return int(row[0]) if row else 0
        except Exception:
            return len(self._memory)
        finally:
            if own:
                release_db_connection(conn)

    def _row_to_record(self, row: dict[str, Any]) -> HandoverDraftRecord:
        return HandoverDraftRecord(
            id=str(row["id"]),
            title=_text(row.get("title"), "Shift handover"),
            scope=row.get("scope") or "home",
            shift_label=row.get("shift_label"),
            child_id=row.get("child_id"),
            child_name=row.get("child_name"),
            home_id=row.get("home_id"),
            body=_text(row.get("body")),
            sections=_parse_json(row.get("sections"), []),
            source_context=_parse_json(row.get("source_context"), {}),
            status=row.get("status") or "draft",
            created_by_user_id=row.get("created_by_user_id"),
            created_by_name=row.get("created_by_name"),
            reviewed_by_user_id=row.get("reviewed_by_user_id"),
            reviewed_at=row.get("reviewed_at"),
            completed_by_user_id=row.get("completed_by_user_id"),
            completed_at=row.get("completed_at"),
            metadata=_parse_json(row.get("metadata"), {}),
            created_at=_text(row.get("created_at"), _now_iso()),
            updated_at=_text(row.get("updated_at"), _now_iso()),
        )

    def _memory_create(self, payload: dict[str, Any]) -> HandoverDraftRecord:
        draft_id = str(uuid4())
        now = _now_iso()
        row = {**payload, "id": draft_id, "created_at": now, "updated_at": now}
        self._memory[draft_id] = row
        return self._row_to_record(row)

    def create_draft(
        self,
        current_user: dict[str, Any],
        request: HandoverDraftRequest,
        conn: Any | None = None,
    ) -> HandoverDraftResponse:
        sections = _normalize_sections(request.sections)
        payload = {
            "title": request.title,
            "scope": request.scope,
            "shift_label": request.shift_label,
            "child_id": request.child_id,
            "child_name": None,
            "home_id": request.home_id or current_user.get("home_id"),
            "body": request.body,
            "sections": sections,
            "source_context": request.source_context,
            "status": "draft",
            "created_by_user_id": _user_id(current_user),
            "created_by_name": _user_display_name(current_user),
            "metadata": {**request.metadata, "workspace_only": True},
        }
        mode = self._detect_storage_mode(conn)
        if mode == "postgresql" and conn is not None:
            draft_id = str(uuid4())
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    """
                    INSERT INTO handover_drafts (
                        id, title, scope, shift_label, child_id, child_name, home_id,
                        body, sections, source_context, status,
                        created_by_user_id, created_by_name, metadata
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s, %s
                    )
                    RETURNING *
                    """,
                    (
                        draft_id,
                        payload["title"],
                        payload["scope"],
                        payload["shift_label"],
                        payload["child_id"],
                        payload["child_name"],
                        payload["home_id"],
                        payload["body"],
                        Json(sections),
                        Json(payload["source_context"]),
                        "draft",
                        payload["created_by_user_id"],
                        payload["created_by_name"],
                        Json(payload["metadata"]),
                    ),
                )
                row = dict(cur.fetchone() or {})
            conn.commit()
            record = self._row_to_record(row)
        else:
            record = self._memory_create(payload)

        return HandoverDraftResponse(
            draft_id=record.id,
            status=record.status,
            title=record.title,
            body=record.body,
            sections=record.sections,
            warnings=[FORMAL_HANDOVER_NOTICE],
            next_steps=["Continue editing", "Mark ready for review when complete"],
            route=f"/handover?draft_id={record.id}",
            draft=record,
        )

    def update_draft(
        self,
        current_user: dict[str, Any],
        draft_id: str,
        request: HandoverDraftUpdateRequest,
        conn: Any | None = None,
    ) -> HandoverDraftResponse:
        existing = self.get_draft(current_user, draft_id, conn=conn)
        if existing.status in ("completed", "archived"):
            return HandoverDraftResponse(
                success=False,
                draft_id=draft_id,
                status=existing.status,
                title=existing.title,
                warnings=["Cannot edit a completed or archived handover draft."],
                draft=existing,
            )
        updates = request.model_dump(exclude_unset=True)
        if "sections" in updates and updates["sections"] is not None:
            updates["sections"] = _normalize_sections(updates["sections"])
        mode = self._detect_storage_mode(conn)
        if mode == "postgresql" and conn is not None:
            set_parts = ["updated_at = NOW()"]
            values: list[Any] = []
            for field, value in updates.items():
                if field in ("sections", "source_context", "metadata"):
                    set_parts.append(f"{field} = %s")
                    values.append(Json(value))
                else:
                    set_parts.append(f"{field} = %s")
                    values.append(value)
            values.append(draft_id)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    UPDATE handover_drafts
                    SET {", ".join(set_parts)}
                    WHERE id = %s
                    RETURNING *
                    """,
                    values,
                )
                row = dict(cur.fetchone() or {})
            conn.commit()
            record = self._row_to_record(row)
        else:
            row = self._memory.get(draft_id)
            if not row:
                raise KeyError(draft_id)
            row.update(updates)
            row["updated_at"] = _now_iso()
            record = self._row_to_record(row)

        return HandoverDraftResponse(
            draft_id=record.id,
            status=record.status,
            title=record.title,
            body=record.body,
            sections=record.sections,
            warnings=[FORMAL_HANDOVER_NOTICE],
            draft=record,
        )

    def get_draft(
        self,
        current_user: dict[str, Any],
        draft_id: str,
        conn: Any | None = None,
    ) -> HandoverDraftRecord:
        _ = current_user
        mode = self._detect_storage_mode(conn)
        if mode == "postgresql" and conn is not None:
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM handover_drafts WHERE id = %s LIMIT 1",
                    (draft_id,),
                )
                row = cur.fetchone()
            if not row:
                raise KeyError(draft_id)
            return self._row_to_record(dict(row))
        row = self._memory.get(draft_id)
        if not row:
            raise KeyError(draft_id)
        return self._row_to_record(row)

    def list_drafts(
        self,
        current_user: dict[str, Any],
        *,
        status: str | None = None,
        child_id: int | None = None,
        home_id: int | None = None,
        limit: int = 50,
        conn: Any | None = None,
    ) -> HandoverDraftListResponse:
        uid = _user_id(current_user)
        mode = self._detect_storage_mode(conn)
        items: list[HandoverDraftRecord] = []
        if mode == "postgresql" and conn is not None:
            clauses = ["created_by_user_id = %s"]
            values: list[Any] = [uid]
            if status:
                clauses.append("status = %s")
                values.append(status)
            if child_id is not None:
                clauses.append("child_id = %s")
                values.append(child_id)
            if home_id is not None:
                clauses.append("home_id = %s")
                values.append(home_id)
            values.append(limit)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT * FROM handover_drafts
                    WHERE {" AND ".join(clauses)}
                    ORDER BY updated_at DESC
                    LIMIT %s
                    """,
                    values,
                )
                rows = cur.fetchall() or []
            items = [self._row_to_record(dict(r)) for r in rows]
        else:
            for row in sorted(
                self._memory.values(),
                key=lambda r: r.get("updated_at") or "",
                reverse=True,
            ):
                if row.get("created_by_user_id") != uid:
                    continue
                if status and row.get("status") != status:
                    continue
                if child_id is not None and row.get("child_id") != child_id:
                    continue
                if home_id is not None and row.get("home_id") != home_id:
                    continue
                items.append(self._row_to_record(row))
                if len(items) >= limit:
                    break
        return HandoverDraftListResponse(
            items=items, total=len(items), storage_mode=mode
        )

    def _set_status(
        self,
        current_user: dict[str, Any],
        draft_id: str,
        status: HandoverDraftStatus,
        *,
        conn: Any | None = None,
        extra_fields: dict[str, Any] | None = None,
    ) -> HandoverDraftResponse:
        extra_fields = extra_fields or {}
        mode = self._detect_storage_mode(conn)
        warnings = [FORMAL_HANDOVER_NOTICE]
        next_steps: list[str] = []
        if status == "ready_for_review":
            next_steps = ["A manager may review this draft", "Complete when signed off in workspace"]
        elif status == "completed":
            next_steps = [
                "Copy handover for shift log if needed",
                "Formal young-person handover records remain separate",
            ]
        elif status == "archived":
            next_steps = ["Draft archived — not a formal handover record"]

        if mode == "postgresql" and conn is not None:
            set_parts = ["status = %s", "updated_at = NOW()"]
            values: list[Any] = [status]
            for field, value in extra_fields.items():
                set_parts.append(f"{field} = %s")
                values.append(value)
            values.append(draft_id)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    UPDATE handover_drafts
                    SET {", ".join(set_parts)}
                    WHERE id = %s
                    RETURNING *
                    """,
                    values,
                )
                row = dict(cur.fetchone() or {})
            conn.commit()
            record = self._row_to_record(row)
        else:
            row = self._memory.get(draft_id)
            if not row:
                raise KeyError(draft_id)
            row["status"] = status
            row.update(extra_fields)
            row["updated_at"] = _now_iso()
            record = self._row_to_record(row)

        return HandoverDraftResponse(
            draft_id=record.id,
            status=record.status,
            title=record.title,
            body=record.body,
            sections=record.sections,
            warnings=warnings,
            next_steps=next_steps,
            route=f"/handover?draft_id={record.id}",
            draft=record,
        )

    def mark_ready_for_review(
        self,
        current_user: dict[str, Any],
        draft_id: str,
        conn: Any | None = None,
    ) -> HandoverDraftResponse:
        return self._set_status(
            current_user,
            draft_id,
            "ready_for_review",
            conn=conn,
            extra_fields={
                "reviewed_by_user_id": None,
                "reviewed_at": None,
            },
        )

    def complete_draft(
        self,
        current_user: dict[str, Any],
        draft_id: str,
        conn: Any | None = None,
    ) -> HandoverDraftResponse:
        return self._set_status(
            current_user,
            draft_id,
            "completed",
            conn=conn,
            extra_fields={
                "completed_by_user_id": _user_id(current_user),
                "completed_at": _now_iso(),
            },
        )

    def archive_draft(
        self,
        current_user: dict[str, Any],
        draft_id: str,
        conn: Any | None = None,
    ) -> HandoverDraftResponse:
        return self._set_status(current_user, draft_id, "archived", conn=conn)


handover_draft_service = HandoverDraftService()
