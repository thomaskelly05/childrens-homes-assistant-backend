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
from services.handover_formal_mapping_service import handover_formal_mapping_service
from services.handover_review_detection import detect_review_requirements
from services.handover_shift_timeline_service import handover_shift_timeline_service

logger = logging.getLogger("indicare.handover_drafts")

FORMAL_HANDOVER_NOTICE = (
    "This completes the handover workspace draft only. "
    "It does not create or approve a formal handover_records entry unless formal mapping succeeds."
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

    def apply_review_detection(
        self, source_context: dict[str, Any] | None
    ) -> dict[str, Any]:
        detected = detect_review_requirements(source_context)
        review_status = "draft"
        if detected["manager_review_required"] or detected["safeguarding_review_required"]:
            review_status = "draft"
        return {**detected, "review_status": review_status}

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
            review_status=row.get("review_status") or "draft",
            review_comments=row.get("review_comments"),
            reviewed_by_user_id=row.get("reviewed_by_user_id"),
            reviewed_by_name=row.get("reviewed_by_name"),
            reviewed_at=row.get("reviewed_at"),
            approved_at=row.get("approved_at"),
            completed_by_user_id=row.get("completed_by_user_id"),
            completed_at=row.get("completed_at"),
            formal_record_created=bool(row.get("formal_record_created")),
            formal_record_id=row.get("formal_record_id"),
            formal_record_type=row.get("formal_record_type"),
            formal_status=row.get("formal_status") or "not_attempted",
            timeline_linked=bool(row.get("timeline_linked")),
            linked_timeline_id=row.get("linked_timeline_id"),
            safeguarding_review_required=bool(row.get("safeguarding_review_required")),
            manager_review_required=bool(row.get("manager_review_required")),
            review_required_reason=row.get("review_required_reason"),
            completion_warnings=_parse_json(row.get("completion_warnings"), []),
            next_steps=_parse_json(row.get("next_steps"), []),
            created_by_user_id=row.get("created_by_user_id"),
            created_by_name=row.get("created_by_name"),
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

    def _response_from_record(
        self,
        record: HandoverDraftRecord,
        *,
        warnings: list[str] | None = None,
        next_steps: list[str] | None = None,
        success: bool = True,
    ) -> HandoverDraftResponse:
        return HandoverDraftResponse(
            success=success,
            draft_id=record.id,
            status=record.status,
            review_status=record.review_status,
            title=record.title,
            body=record.body,
            sections=record.sections,
            warnings=warnings or [FORMAL_HANDOVER_NOTICE],
            next_steps=next_steps or record.next_steps,
            route=f"/handover?draft_id={record.id}",
            formal_record_created=record.formal_record_created,
            formal_record_id=record.formal_record_id,
            formal_status=record.formal_status,
            timeline_linked=record.timeline_linked,
            linked_timeline_id=record.linked_timeline_id,
            completion_warnings=record.completion_warnings,
            draft=record,
        )

    def create_draft(
        self,
        current_user: dict[str, Any],
        request: HandoverDraftRequest,
        conn: Any | None = None,
    ) -> HandoverDraftResponse:
        sections = _normalize_sections(request.sections)
        detected = self.apply_review_detection(request.source_context)
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
            "review_status": "draft",
            "safeguarding_review_required": detected["safeguarding_review_required"],
            "manager_review_required": detected["manager_review_required"],
            "review_required_reason": detected.get("review_required_reason"),
            "formal_status": "not_attempted",
            "completion_warnings": [],
            "next_steps": [],
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
                        body, sections, source_context, status, review_status,
                        safeguarding_review_required, manager_review_required,
                        review_required_reason, formal_status,
                        completion_warnings, next_steps,
                        created_by_user_id, created_by_name, metadata
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s,
                        %s, %s, %s, %s, %s,
                        %s, %s, %s, %s,
                        %s, %s,
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
                        "draft",
                        payload["safeguarding_review_required"],
                        payload["manager_review_required"],
                        payload["review_required_reason"],
                        "not_attempted",
                        Json([]),
                        Json([]),
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

        steps = ["Continue editing", "Send to review when complete"]
        if detected["manager_review_required"]:
            steps.append("Manager review will be required before completion.")
        return self._response_from_record(
            record,
            next_steps=steps,
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
                review_status=existing.review_status,
                title=existing.title,
                warnings=["Cannot edit a completed or archived handover draft."],
                draft=existing,
            )
        updates = request.model_dump(exclude_unset=True)
        if "sections" in updates and updates["sections"] is not None:
            updates["sections"] = _normalize_sections(updates["sections"])
        if "source_context" in updates:
            detected = self.apply_review_detection(updates.get("source_context"))
            updates.update(
                {
                    "safeguarding_review_required": detected["safeguarding_review_required"],
                    "manager_review_required": detected["manager_review_required"],
                    "review_required_reason": detected.get("review_required_reason"),
                }
            )
        mode = self._detect_storage_mode(conn)
        if mode == "postgresql" and conn is not None:
            set_parts = ["updated_at = NOW()"]
            values: list[Any] = []
            for field, value in updates.items():
                if field in ("sections", "source_context", "metadata", "completion_warnings", "next_steps"):
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

        return self._response_from_record(record)

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
        review_status: str | None = None,
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
            if review_status:
                clauses.append("review_status = %s")
                values.append(review_status)
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
                if review_status and row.get("review_status") != review_status:
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
            next_steps = ["Awaiting manager review", "Open handover review queue"]
        elif status == "completed":
            next_steps = [
                "Copy handover for shift log if needed",
                "Check formal record and timeline status below",
            ]
        elif status == "archived":
            next_steps = ["Draft archived — not a formal handover record"]

        if mode == "postgresql" and conn is not None:
            set_parts = ["status = %s", "updated_at = NOW()"]
            values: list[Any] = [status]
            for field, value in extra_fields.items():
                if field in ("sections", "source_context", "metadata", "completion_warnings", "next_steps"):
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
            row["status"] = status
            row.update(extra_fields)
            row["updated_at"] = _now_iso()
            record = self._row_to_record(row)

        return self._response_from_record(record, warnings=warnings, next_steps=next_steps)

    def mark_ready_for_review(
        self,
        current_user: dict[str, Any],
        draft_id: str,
        conn: Any | None = None,
    ) -> HandoverDraftResponse:
        draft = self.get_draft(current_user, draft_id, conn=conn)
        detected = self.apply_review_detection(draft.source_context)
        review_status = "awaiting_review"
        if detected["safeguarding_review_required"]:
            review_status = "awaiting_review"
        extra = {
            "review_status": review_status,
            "safeguarding_review_required": detected["safeguarding_review_required"]
            or draft.safeguarding_review_required,
            "manager_review_required": detected["manager_review_required"]
            or draft.manager_review_required,
            "review_required_reason": detected.get("review_required_reason")
            or draft.review_required_reason,
            "reviewed_by_user_id": None,
            "reviewed_at": None,
            "next_steps": [
                "Open handover review queue",
                "Manager review required before completion",
            ],
        }
        return self._set_status(
            current_user,
            draft_id,
            "ready_for_review",
            conn=conn,
            extra_fields=extra,
        )

    def complete_draft(
        self,
        current_user: dict[str, Any],
        draft_id: str,
        conn: Any | None = None,
    ) -> HandoverDraftResponse:
        draft = self.get_draft(current_user, draft_id, conn=conn)
        if draft.manager_review_required and draft.review_status not in (
            "approved",
            "completed",
        ):
            return HandoverDraftResponse(
                success=False,
                draft_id=draft_id,
                status=draft.status,
                review_status=draft.review_status,
                title=draft.title,
                warnings=[
                    "Manager review required before completion.",
                    "Send to review and obtain approval first.",
                ],
                next_steps=["Open handover review queue", "/handover/reviews"],
                route=f"/handover/reviews?draft_id={draft.id}",
                draft=draft,
            )
        if draft.review_status == "changes_requested":
            return HandoverDraftResponse(
                success=False,
                draft_id=draft_id,
                status=draft.status,
                review_status=draft.review_status,
                title=draft.title,
                warnings=["Changes were requested — update the draft and resubmit for review."],
                next_steps=["Open handover review queue"],
                draft=draft,
            )

        formal = handover_formal_mapping_service.create_formal_record(draft, current_user, conn=conn)
        timeline = handover_shift_timeline_service.create_or_prepare_link(
            draft, formal, current_user, conn=conn
        )
        completion_warnings = list(formal.get("warnings") or [])
        next_steps = handover_formal_mapping_service.build_next_steps(draft, formal)
        next_steps.extend(timeline.get("next_steps") or [])

        extra = {
            "completed_by_user_id": _user_id(current_user),
            "completed_at": _now_iso(),
            "review_status": "completed",
            "formal_record_created": formal.get("formal_record_created"),
            "formal_record_id": formal.get("formal_record_id"),
            "formal_record_type": formal.get("formal_record_type"),
            "formal_status": formal.get("formal_status"),
            "timeline_linked": timeline.get("timeline_linked"),
            "linked_timeline_id": timeline.get("linked_timeline_id"),
            "completion_warnings": Json(completion_warnings),
            "next_steps": Json(next_steps),
        }
        result = self._set_status(
            current_user,
            draft_id,
            "completed",
            conn=conn,
            extra_fields=extra,
        )
        result.formal_record_created = bool(formal.get("formal_record_created"))
        result.formal_record_id = formal.get("formal_record_id")
        result.formal_status = formal.get("formal_status") or "not_attempted"
        result.timeline_linked = bool(timeline.get("timeline_linked"))
        result.linked_timeline_id = timeline.get("linked_timeline_id")
        result.completion_warnings = completion_warnings
        result.warnings = [FORMAL_HANDOVER_NOTICE] + completion_warnings
        result.next_steps = next_steps
        if not formal.get("formal_record_created"):
            result.metadata["workspace_only_completion"] = True
        return result

    def archive_draft(
        self,
        current_user: dict[str, Any],
        draft_id: str,
        conn: Any | None = None,
    ) -> HandoverDraftResponse:
        return self._set_status(
            current_user,
            draft_id,
            "archived",
            conn=conn,
            extra_fields={"review_status": "archived"},
        )


handover_draft_service = HandoverDraftService()
