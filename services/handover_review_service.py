"""Handover manager review queue — safe summaries, audit events, no raw bodies in cards."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import MANAGER_ROLES, table_exists
from schemas.handover_drafts import (
    HandoverDraftRecord,
    HandoverReviewActionRequest,
    HandoverReviewActionResponse,
    HandoverReviewDetail,
    HandoverReviewQueueItem,
    HandoverReviewQueueResponse,
    HandoverReviewStatus,
)
from schemas.handover_intelligence import HandoverHealth
from services.handover_draft_service import (
    HandoverDraftService,
    handover_draft_service,
    _text,
    _user_display_name,
    _user_id,
)
from services.handover_review_detection import detect_review_requirements

FORMAL_HANDOVER_NOTICE = (
    "This completes the handover workspace draft only. "
    "It does not create or approve a formal handover_records entry unless formal mapping succeeds."
)
from services.handover_formal_mapping_service import handover_formal_mapping_service
from services.handover_shift_timeline_service import handover_shift_timeline_service

logger = logging.getLogger("indicare.handover_review")

MANAGER_JUDGEMENT_NOTICE = (
    "Handover review supports safe shift communication. Manager judgement remains required."
)

QUEUE_STATUSES = (
    "awaiting_review",
    "changes_requested",
    "safeguarding_review_required",
    "approved",
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


def _is_manager(current_user: dict[str, Any]) -> bool:
    role = _user_role(current_user)
    return role in {r.lower() for r in MANAGER_ROLES} or any(
        token in role for token in ("manager", "deputy", "senior", "registered", "admin")
    )


def _safe_summary_from_draft(draft: HandoverDraftRecord) -> str:
    """Queue cards use metadata-only summaries — not draft body text."""
    parts = [f"{draft.title} — handover draft awaiting review."]
    if draft.shift_label:
        parts.append(f"Shift: {draft.shift_label}.")
    if draft.child_name or draft.child_id:
        parts.append(
            f"Young person: {draft.child_name or draft.child_id}."
        )
    if draft.safeguarding_review_required:
        parts.append("Safeguarding review flagged.")
    if draft.manager_review_required:
        parts.append("Manager review required.")
    if draft.review_required_reason:
        parts.append(draft.review_required_reason)
    return " ".join(parts)


class HandoverReviewService:
    def __init__(self, draft_service: HandoverDraftService | None = None) -> None:
        self._drafts = draft_service or handover_draft_service
        self._memory_events: list[dict[str, Any]] = []

    def _detect_storage_mode(self, conn: Any | None = None) -> str:
        return self._drafts._detect_storage_mode(conn)

    def get_health(self, conn: Any | None = None) -> HandoverHealth:
        mode = self._detect_storage_mode(conn)
        pending = 0
        try:
            queue = self.list_review_queue(
                {"role": "manager", "id": "health"},
                conn=conn,
            )
            pending = queue.total
        except Exception:
            pending = len(self._memory_events)
        return HandoverHealth(
            status="ok",
            service="handover_review_service",
            storage_mode=mode,
            persistence_available=mode == "postgresql",
            draft_count=pending,
        )

    def enforce_review_access(
        self, draft: HandoverDraftRecord, current_user: dict[str, Any]
    ) -> None:
        if _is_manager(current_user):
            return
        uid = _user_id(current_user)
        if uid and uid == draft.created_by_user_id:
            return
        raise PermissionError("Manager access required for handover review actions.")

    def build_review_priority(
        self, draft: HandoverDraftRecord
    ) -> str:
        if draft.safeguarding_review_required:
            return "urgent"
        if draft.manager_review_required:
            return "high"
        if draft.review_status in ("changes_requested", "safeguarding_review_required"):
            return "high"
        if draft.review_status == "awaiting_review":
            return "medium"
        return "low"

    def build_review_prompts(self, draft: HandoverDraftRecord) -> list[str]:
        prompts = [
            "Is the handover clear for the next shift?",
            "Are follow-up actions explicit?",
        ]
        if draft.safeguarding_review_required:
            prompts.append(
                "Are safeguarding-sensitive themes flagged without raw narratives?"
            )
        if draft.manager_review_required:
            prompts.append("Does manager judgement remain documented where needed?")
        return prompts

    def record_review_event(
        self,
        draft: HandoverDraftRecord,
        decision: str,
        action: HandoverReviewActionRequest | dict[str, Any],
        current_user: dict[str, Any],
        *,
        response: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> None:
        comments = None
        if hasattr(action, "comments"):
            comments = action.comments
        elif isinstance(action, dict):
            comments = action.get("comments")
        event = {
            "id": str(uuid4()),
            "draft_id": draft.id,
            "decision": decision,
            "previous_status": draft.review_status,
            "new_status": (response or {}).get("review_status", draft.review_status),
            "comments": comments,
            "reviewer_user_id": _user_id(current_user),
            "reviewer_name": _user_display_name(current_user),
            "home_id": draft.home_id,
            "child_id": draft.child_id,
            "safeguarding_review_required": draft.safeguarding_review_required,
            "manager_review_required": draft.manager_review_required,
            "formal_record_created": bool((response or {}).get("formal_record_created")),
            "formal_record_id": (response or {}).get("formal_record_id"),
            "timeline_linked": bool((response or {}).get("timeline_linked")),
            "metadata": {
                "action": decision,
                "no_raw_body": True,
                "priority": self.build_review_priority(draft),
            },
            "created_at": _now_iso(),
        }
        mode = self._detect_storage_mode(conn)
        if mode == "postgresql" and conn is not None and table_exists(conn, "handover_review_events"):
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO handover_review_events (
                        id, draft_id, decision, previous_status, new_status,
                        comments, reviewer_user_id, reviewer_name,
                        home_id, child_id,
                        safeguarding_review_required, manager_review_required,
                        formal_record_created, formal_record_id, timeline_linked, metadata
                    ) VALUES (
                        %s, %s, %s, %s, %s,
                        %s, %s, %s,
                        %s, %s,
                        %s, %s,
                        %s, %s, %s, %s
                    )
                    """,
                    (
                        event["id"],
                        event["draft_id"],
                        event["decision"],
                        event["previous_status"],
                        event["new_status"],
                        event["comments"],
                        event["reviewer_user_id"],
                        event["reviewer_name"],
                        event["home_id"],
                        event["child_id"],
                        event["safeguarding_review_required"],
                        event["manager_review_required"],
                        event["formal_record_created"],
                        event["formal_record_id"],
                        event["timeline_linked"],
                        Json(event["metadata"]),
                    ),
                )
            conn.commit()
        else:
            self._memory_events.append(event)

    def list_review_queue(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> HandoverReviewQueueResponse:
        filters = filters or {}
        status_filter = filters.get("review_status")
        child_id = filters.get("child_id")
        home_id = filters.get("home_id") or current_user.get("home_id")
        items: list[HandoverReviewQueueItem] = []
        counts: dict[str, int] = {s: 0 for s in QUEUE_STATUSES}
        counts["completed"] = 0

        drafts = self._load_review_drafts(current_user, conn=conn)
        for draft in drafts:
            rs = draft.review_status or "draft"
            if rs in counts:
                counts[rs] = counts.get(rs, 0) + 1
            if status_filter and rs != status_filter:
                continue
            if rs not in QUEUE_STATUSES and rs != "completed":
                continue
            if child_id is not None and draft.child_id != child_id:
                continue
            if home_id is not None and draft.home_id not in (None, home_id):
                if not _is_manager(current_user):
                    continue
            flags: list[str] = []
            if draft.safeguarding_review_required:
                flags.append("safeguarding")
            if draft.manager_review_required:
                flags.append("manager_review")
            if draft.review_status == "changes_requested":
                flags.append("changes_requested")
            items.append(
                HandoverReviewQueueItem(
                    draft_id=draft.id,
                    title=draft.title,
                    shift_label=draft.shift_label,
                    child_id=draft.child_id,
                    child_name=draft.child_name,
                    home_id=draft.home_id,
                    review_status=rs,
                    priority=self.build_review_priority(draft),
                    safe_summary=_safe_summary_from_draft(draft),
                    flags=flags,
                    manager_review_required=draft.manager_review_required,
                    safeguarding_review_required=draft.safeguarding_review_required,
                    route=f"/handover/reviews?draft_id={draft.id}",
                    updated_at=draft.updated_at,
                )
            )
        items.sort(
            key=lambda i: (
                {"urgent": 0, "high": 1, "medium": 2, "low": 3}.get(i.priority, 9),
                i.updated_at or "",
            )
        )
        return HandoverReviewQueueResponse(
            items=items,
            total=len(items),
            counts=counts,
            storage_mode=self._detect_storage_mode(conn),
        )

    def _load_review_drafts(
        self, current_user: dict[str, Any], conn: Any | None = None
    ) -> list[HandoverDraftRecord]:
        mode = self._detect_storage_mode(conn)
        records: list[HandoverDraftRecord] = []
        if mode == "postgresql" and conn is not None:
            clauses = ["review_status = ANY(%s)"]
            values: list[Any] = [list(QUEUE_STATUSES)]
            if not _is_manager(current_user):
                clauses.append("created_by_user_id = %s")
                values.append(_user_id(current_user))
            if current_user.get("home_id") and not _is_manager(current_user):
                clauses.append("home_id = %s")
                values.append(current_user.get("home_id"))
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT * FROM handover_drafts
                    WHERE {" AND ".join(clauses)}
                    ORDER BY updated_at DESC
                    LIMIT 100
                    """,
                    values,
                )
                rows = cur.fetchall() or []
            records = [self._drafts._row_to_record(dict(r)) for r in rows]
        else:
            for row in self._drafts._memory.values():
                rs = row.get("review_status") or "draft"
                if rs not in QUEUE_STATUSES:
                    continue
                records.append(self._drafts._row_to_record(row))
        return records

    def get_review_detail(
        self,
        draft_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> HandoverReviewDetail:
        draft = self._drafts.get_draft(current_user, draft_id, conn=conn)
        formal_target = handover_formal_mapping_service.get_target(draft)
        timeline_status = {
            "timeline_linked": draft.timeline_linked,
            "linked_timeline_id": draft.linked_timeline_id,
            "supported": handover_shift_timeline_service.timeline_supported(
                draft,
                {
                    "formal_record_created": draft.formal_record_created,
                    "formal_record_id": draft.formal_record_id,
                },
            ),
            "route_hint": handover_shift_timeline_service.route_hint(draft),
        }
        linked = self._linked_intelligence_safe(draft.source_context)
        return HandoverReviewDetail(
            draft=draft,
            priority=self.build_review_priority(draft),
            review_prompts=self.build_review_prompts(draft),
            formal_target=formal_target.model_dump(),
            timeline_status=timeline_status,
            linked_intelligence=linked,
        )

    def _linked_intelligence_safe(self, source_context: dict[str, Any]) -> list[dict[str, Any]]:
        items: list[dict[str, Any]] = []
        for key in ("intelligence_items", "items"):
            for raw in source_context.get(key) or []:
                if not isinstance(raw, dict):
                    continue
                items.append(
                    {
                        "id": raw.get("id"),
                        "title": raw.get("title"),
                        "safe_summary": raw.get("safe_summary") or raw.get("summary") or "",
                        "source": raw.get("source"),
                        "route": raw.get("route"),
                        "safeguarding_sensitive": bool(raw.get("safeguarding_sensitive")),
                    }
                )
        return items[:20]

    def apply_review_action(
        self,
        draft_id: str,
        action: HandoverReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> HandoverReviewActionResponse:
        draft = self._drafts.get_draft(current_user, draft_id, conn=conn)
        if action.action in (
            "approve",
            "request_changes",
            "mark_safeguarding_review_required",
            "complete_after_approval",
        ):
            self.enforce_review_access(draft, current_user)

        if action.action == "approve":
            return self.approve_handover(draft, action, current_user, conn=conn)
        if action.action == "request_changes":
            return self.request_changes(draft, action, current_user, conn=conn)
        if action.action == "mark_safeguarding_review_required":
            return self.mark_safeguarding_review_required(draft, action, current_user, conn=conn)
        if action.action == "complete_after_approval":
            return self.complete_after_approval(draft, action, current_user, conn=conn)
        raise ValueError(f"Unsupported review action: {action.action}")

    def approve_handover(
        self,
        draft: HandoverDraftRecord,
        action: HandoverReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> HandoverReviewActionResponse:
        updated = self._update_review_fields(
            draft.id,
            {
                "review_status": "approved",
                "status": "ready_for_review",
                "reviewed_by_user_id": _user_id(current_user),
                "reviewed_by_name": _user_display_name(current_user),
                "reviewed_at": _now_iso(),
                "approved_at": _now_iso(),
                "review_comments": action.comments,
            },
            conn=conn,
        )
        response = HandoverReviewActionResponse(
            draft_id=draft.id,
            action="approve",
            review_status="approved",
            status=updated.status,
            warnings=[FORMAL_HANDOVER_NOTICE],
            next_steps=["Complete handover after approval when ready."],
            draft=updated,
        )
        self.record_review_event(draft, "approve", action, current_user, response=response.model_dump(), conn=conn)
        return response

    def request_changes(
        self,
        draft: HandoverDraftRecord,
        action: HandoverReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> HandoverReviewActionResponse:
        updated = self._update_review_fields(
            draft.id,
            {
                "review_status": "changes_requested",
                "status": "draft",
                "reviewed_by_user_id": _user_id(current_user),
                "reviewed_by_name": _user_display_name(current_user),
                "reviewed_at": _now_iso(),
                "review_comments": action.comments,
            },
            conn=conn,
        )
        response = HandoverReviewActionResponse(
            draft_id=draft.id,
            action="request_changes",
            review_status="changes_requested",
            status=updated.status,
            warnings=[FORMAL_HANDOVER_NOTICE],
            next_steps=["Author should update the draft and send back to review."],
            draft=updated,
        )
        self.record_review_event(
            draft, "request_changes", action, current_user, response=response.model_dump(), conn=conn
        )
        return response

    def mark_safeguarding_review_required(
        self,
        draft: HandoverDraftRecord,
        action: HandoverReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> HandoverReviewActionResponse:
        updated = self._update_review_fields(
            draft.id,
            {
                "review_status": "safeguarding_review_required",
                "safeguarding_review_required": True,
                "manager_review_required": True,
                "reviewed_by_user_id": _user_id(current_user),
                "reviewed_by_name": _user_display_name(current_user),
                "reviewed_at": _now_iso(),
                "review_comments": action.comments,
            },
            conn=conn,
        )
        response = HandoverReviewActionResponse(
            draft_id=draft.id,
            action="mark_safeguarding_review_required",
            review_status="safeguarding_review_required",
            status=updated.status,
            warnings=[
                "Safeguarding review flagged — manager judgement required.",
                FORMAL_HANDOVER_NOTICE,
            ],
            next_steps=["Complete safeguarding review before final completion."],
            draft=updated,
        )
        self.record_review_event(
            draft,
            "mark_safeguarding_review_required",
            action,
            current_user,
            response=response.model_dump(),
            conn=conn,
        )
        return response

    def complete_after_approval(
        self,
        draft: HandoverDraftRecord,
        action: HandoverReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> HandoverReviewActionResponse:
        if draft.review_status not in ("approved",):
            return HandoverReviewActionResponse(
                success=False,
                draft_id=draft.id,
                action="complete_after_approval",
                review_status=draft.review_status,
                status=draft.status,
                warnings=["Handover must be approved before completion."],
                draft=draft,
            )
        result = self._drafts.complete_draft(current_user, draft.id, conn=conn)
        updated = result.draft or self._drafts.get_draft(current_user, draft.id, conn=conn)
        response = HandoverReviewActionResponse(
            draft_id=draft.id,
            action="complete_after_approval",
            review_status=updated.review_status,
            status=updated.status,
            warnings=result.warnings,
            next_steps=result.next_steps,
            formal_record_created=result.formal_record_created,
            formal_record_id=result.formal_record_id,
            formal_status=result.formal_status,
            timeline_linked=result.timeline_linked,
            linked_timeline_id=result.linked_timeline_id,
            completion_warnings=result.completion_warnings,
            draft=updated,
        )
        self.record_review_event(
            draft,
            "complete_after_approval",
            action,
            current_user,
            response=response.model_dump(),
            conn=conn,
        )
        return response

    def _update_review_fields(
        self, draft_id: str, fields: dict[str, Any], conn: Any | None = None
    ) -> HandoverDraftRecord:
        mode = self._detect_storage_mode(conn)
        if mode == "postgresql" and conn is not None:
            set_parts = ["updated_at = NOW()"]
            values: list[Any] = []
            for field, value in fields.items():
                if field in ("completion_warnings", "next_steps"):
                    set_parts.append(f"{field} = %s")
                    values.append(Json(value if isinstance(value, list) else []))
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
            return self._drafts._row_to_record(row)
        row = self._drafts._memory.get(draft_id)
        if not row:
            raise KeyError(draft_id)
        row.update(fields)
        row["updated_at"] = _now_iso()
        return self._drafts._row_to_record(row)


handover_review_service = HandoverReviewService()
