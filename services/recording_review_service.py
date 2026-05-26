"""Manager review queue for operational recording drafts."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.recording_drafts import RecordingDraftListRequest, RecordingDraftRecord, RecordingDraftUpdate
from schemas.recording_review import (
    RecordingReviewActionRequest,
    RecordingReviewActionResponse,
    RecordingReviewDetail,
    RecordingReviewEventRecord,
    RecordingReviewHealth,
    RecordingReviewPriority,
    RecordingReviewQueueFilters,
    RecordingReviewQueueItem,
    RecordingReviewQueueResponse,
    RecordingReviewSummary,
)
from schemas.recording_submission import RecordingSubmissionRequest
from services.audit_event_service import record_audit_event
from services.recording_draft_service import recording_draft_service
from services.recording_submission_target_registry import recording_submission_target_registry

logger = logging.getLogger("indicare.recording_review")

MANAGER_JUDGEMENT_NOTICE = "AI supports review. Manager judgement remains required."

QUEUE_REVIEW_STATUSES = frozenset(
    {
        "awaiting_review",
        "changes_requested",
        "approved",
        "safeguarding_escalation_required",
        "manager_review_required",
        "safeguarding_review_required",
        "reviewed",
    }
)

HIGH_RISK_TYPES = frozenset(
    {
        "safeguarding-concern",
        "disclosure",
        "allegation",
        "physical-intervention",
        "restraint",
        "injury",
        "body-map",
        "medication-error",
        "missing",
        "missing-episode",
        "police-involvement",
        "hospital",
        "emergency-services",
        "child-on-child",
        "exploitation",
        "room-search",
        "prohibited-item",
        "complaint-concern",
    }
)


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _iso_dt(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


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


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _user_display_name(current_user: dict[str, Any]) -> str:
    first = _text(current_user.get("first_name"))
    last = _text(current_user.get("last_name"))
    if first or last:
        return f"{first} {last}".strip()
    return _text(current_user.get("email"), "User")


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


def _is_manager_role(current_user: dict[str, Any]) -> bool:
    return _user_role(current_user) in {r.lower() for r in MANAGER_ROLES}


class RecordingReviewService:
    def __init__(self) -> None:
        self._memory_events: list[dict[str, Any]] = []
        self._storage_mode: str = "memory"

    def _detect_storage_mode(self) -> str:
        try:
            conn = get_db_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'recording_review_events'
                        """
                    )
                    if cur.fetchone():
                        self._storage_mode = "postgresql"
                    else:
                        self._storage_mode = "memory"
            finally:
                release_db_connection(conn)
        except (DatabaseUnavailableError, Exception):
            self._storage_mode = "memory"
        return self._storage_mode

    def get_review_health(self, conn: Any | None = None) -> RecordingReviewHealth:
        mode = self._detect_storage_mode()
        count = 0
        if conn is not None and mode == "postgresql":
            try:
                with conn.cursor() as cur:
                    cur.execute("SELECT COUNT(*) FROM recording_review_events")
                    row = cur.fetchone()
                    count = int(row[0]) if row else 0
            except Exception:
                count = len(self._memory_events)
        else:
            count = len(self._memory_events)
        return RecordingReviewHealth(
            storage_mode=mode,
            queue_count=count,
            persistence_available=mode == "postgresql",
        )

    def _draft_in_queue(self, draft: RecordingDraftRecord) -> bool:
        if draft.status in {"deleted", "archived"}:
            return False
        needs_review = (
            draft.manager_review_required
            or draft.safeguarding_review_required
            or draft.safeguarding_sensitive
            or draft.review_status in QUEUE_REVIEW_STATUSES
        )
        if not needs_review:
            return False
        if draft.status == "ready_for_review":
            return True
        if draft.review_status in QUEUE_REVIEW_STATUSES - {"reviewed"}:
            return True
        if draft.manager_review_required or draft.safeguarding_review_required:
            return draft.status in {"draft", "ready_for_review", "submitted"}
        return False

    def build_review_priority(self, draft: RecordingDraftRecord) -> RecordingReviewPriority:
        meta_priority = _text((draft.metadata or {}).get("review_priority"))
        if meta_priority in {"low", "medium", "high", "urgent"}:
            return meta_priority  # type: ignore[return-value]
        if draft.safeguarding_review_required and (
            draft.safeguarding_sensitive
            or draft.recording_type in HIGH_RISK_TYPES
            or "safeguarding" in draft.recording_type
        ):
            return "urgent"
        if draft.manager_review_required or draft.safeguarding_sensitive:
            return "high"
        if draft.quality_flags or draft.privacy_flags or draft.language_flags:
            return "medium"
        return "low"

    def build_queue_item(self, draft: RecordingDraftRecord) -> RecordingReviewQueueItem:
        target = recording_submission_target_registry.get_target(
            draft.recording_type, form_id=draft.form_id
        )
        formal_supported = target.target_status == "supported_now"
        return RecordingReviewQueueItem(
            draft_id=draft.id,
            title=draft.title,
            recording_type=draft.recording_type,
            form_id=draft.form_id,
            category=draft.category,
            child_id=draft.child_id,
            child_name=draft.child_name,
            home_id=draft.home_id,
            created_by_user_id=draft.created_by_user_id,
            created_by_name=draft.created_by_name,
            created_by_role=draft.created_by_role,
            status=draft.status,
            review_status=draft.review_status,
            review_priority=self.build_review_priority(draft),
            manager_review_required=draft.manager_review_required,
            safeguarding_review_required=draft.safeguarding_review_required,
            safeguarding_sensitive=draft.safeguarding_sensitive,
            privacy_sensitive=draft.privacy_sensitive,
            quality_flags=list(draft.quality_flags or []),
            language_flags=list(draft.language_flags or []),
            privacy_flags=list(draft.privacy_flags or []),
            checklist_status=dict(draft.checklist_status or {}),
            created_at=draft.created_at,
            updated_at=draft.updated_at,
            route_hint=recording_submission_target_registry.route_hint(draft.recording_type, draft),
            formal_submit_supported=formal_supported,
            metadata=dict(draft.metadata or {}),
        )

    def enforce_review_access(
        self,
        draft: RecordingDraftRecord,
        current_user: dict[str, Any],
        *,
        require_review_permission: bool = False,
    ) -> tuple[bool, bool]:
        """Return (can_view, can_review)."""
        if recording_draft_service.enforce_access(draft, current_user):
            if require_review_permission:
                if _is_manager_role(current_user):
                    return True, True
                uid = _user_id(current_user)
                creator = _text(draft.created_by_user_id)
                high_risk = draft.manager_review_required or draft.safeguarding_review_required
                if creator == uid and not high_risk:
                    return True, True
                return True, False
            return True, True
        return False, False

    def list_review_queue(
        self,
        current_user: dict[str, Any],
        filters: RecordingReviewQueueFilters | None = None,
        conn: Any | None = None,
    ) -> RecordingReviewQueueResponse:
        filters = filters or RecordingReviewQueueFilters()
        list_filters = RecordingDraftListRequest(
            limit=200,
            offset=0,
            include_archived=False,
            child_id=filters.child_id,
            home_id=filters.home_id,
            recording_type=filters.recording_type,
        )
        if _is_manager_role(current_user):
            drafts_response = recording_draft_service.list_drafts(current_user, list_filters, conn=conn)
        else:
            drafts_response = recording_draft_service.list_drafts(current_user, list_filters, conn=conn)

        items: list[RecordingReviewQueueItem] = []
        for draft in drafts_response.items:
            if not self._draft_in_queue(draft):
                continue
            item = self.build_queue_item(draft)
            if filters.mine_only and _text(item.created_by_user_id) != _user_id(current_user):
                continue
            if filters.safeguarding_only and not (
                item.safeguarding_review_required or item.safeguarding_sensitive
            ):
                continue
            if filters.manager_review_only and not item.manager_review_required:
                continue
            if filters.changes_requested_only and item.review_status != "changes_requested":
                continue
            if filters.approved_only and item.review_status != "approved":
                continue
            if filters.urgent_only and item.review_priority != "urgent":
                continue
            if filters.review_status and item.review_status != filters.review_status:
                continue
            items.append(item)

        items.sort(
            key=lambda i: (
                {"urgent": 0, "high": 1, "medium": 2, "low": 3}.get(i.review_priority, 2),
                i.updated_at,
            ),
            reverse=False,
        )
        total = len(items)
        page = items[filters.offset : filters.offset + filters.limit]
        mode = recording_draft_service._detect_storage_mode()
        return RecordingReviewQueueResponse(
            items=page,
            total=total,
            storage_mode=mode,
            persistence_available=mode == "postgresql",
        )

    def get_review_summary(
        self,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingReviewSummary:
        queue = self.list_review_queue(
            current_user, RecordingReviewQueueFilters(limit=200), conn=conn
        )
        summary = RecordingReviewSummary(total_in_queue=queue.total)
        for item in queue.items:
            if item.review_status in {"awaiting_review", "manager_review_required", "safeguarding_review_required"}:
                summary.awaiting_review += 1
            if item.safeguarding_review_required or item.safeguarding_sensitive:
                summary.safeguarding_review += 1
            if item.review_status == "changes_requested":
                summary.changes_requested += 1
            if item.review_status == "approved":
                summary.approved += 1
            if item.review_priority == "urgent":
                summary.urgent += 1
        return summary

    def build_review_prompts(self, draft: RecordingDraftRecord) -> list[str]:
        return [
            "Help me consider whether this is ready for sign-off.",
            "What plan impacts might need review after approval?",
            "What should be checked before archiving this?",
            "Is this suitable for LifeEcho, or should it remain statutory only?",
            "Help me review this for child-centred language.",
            "Does this suggest safeguarding escalation?",
        ]

    def get_review_detail(
        self,
        draft_id: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingReviewDetail | None:
        draft = recording_draft_service.get_draft(draft_id, current_user, conn=conn)
        if not draft:
            return None
        can_view, _ = self.enforce_review_access(draft, current_user)
        if not can_view:
            return None

        target = recording_submission_target_registry.get_target(
            draft.recording_type, form_id=draft.form_id
        )
        history = self._list_events_for_draft(draft_id, conn=conn)
        warnings: list[str] = [MANAGER_JUDGEMENT_NOTICE]
        if draft.review_status not in {"approved", "reviewed", "submitted"} and (
            draft.manager_review_required or draft.safeguarding_review_required
        ):
            warnings.append("Manager or safeguarding review is required before formal submission.")

        signoff_meta = (draft.metadata or {}).get("review_signoff") or {}
        formal_supported = target.target_status == "supported_now"
        return RecordingReviewDetail(
            draft=draft,
            review_history=history,
            submission_target={
                "target": target.model_dump(),
                "route_hint": recording_submission_target_registry.route_hint(draft.recording_type, draft),
                "frontend_route": recording_submission_target_registry.frontend_route_for(
                    draft.recording_type, draft
                ),
                "formal_submit_supported": formal_supported,
            },
            quality_summary={
                "quality_flags": list(draft.quality_flags or []),
                "language_flags": list(draft.language_flags or []),
                "overall": (draft.metadata or {}).get("quality_overall"),
            },
            privacy_summary={
                "privacy_flags": list(draft.privacy_flags or []),
                "privacy_sensitive": draft.privacy_sensitive,
                "privacy_guard": dict(draft.privacy_guard or {}),
            },
            suggested_review_prompts=self.build_review_prompts(draft),
            warnings=warnings,
            next_steps=self.build_next_steps(draft, None),
            formal_submit_supported=formal_supported,
            can_create_formal_record=formal_supported,
            formal_route_status=target.target_status,
            last_signoff=dict(signoff_meta),
        )

    def build_next_steps(
        self,
        draft: RecordingDraftRecord,
        decision: str | None,
        submission_response: Any | None = None,
    ) -> list[str]:
        steps: list[str] = []
        if decision == "approve":
            steps.append("Draft approved for submission where a formal route is supported.")
            steps.append("Use Submit after approval if the formal workflow is wired.")
        elif decision == "request_changes":
            steps.append("Creator should update the draft and send back to review.")
        elif decision == "mark_safeguarding_escalation":
            steps.append("Escalate through safeguarding procedures — do not treat as formally complete.")
        elif draft.review_status == "approved":
            steps.append("Approved — submit after approval if formal route is supported.")
        elif draft.review_status in {"awaiting_review", "manager_review_required", "safeguarding_review_required"}:
            steps.append("Awaiting manager review.")
        if submission_response and getattr(submission_response, "formal_record_created", False):
            steps.append(f"Formal record created (ID {getattr(submission_response, 'linked_record_id', '')}).")
        elif submission_response and not getattr(submission_response, "formal_record_created", False):
            steps.append("No formal record created — route may not be wired or review still required.")
        return steps

    def apply_review_action(
        self,
        draft_id: str,
        action: RecordingReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingReviewActionResponse | None:
        draft = recording_draft_service.get_draft(draft_id, current_user, conn=conn)
        if not draft:
            return None
        can_view, can_review = self.enforce_review_access(draft, current_user, require_review_permission=True)
        if not can_view:
            return None
        if not can_review and action.decision not in {"archive"}:
            return RecordingReviewActionResponse(
                success=False,
                draft_id=draft_id,
                decision=action.decision,
                review_status=draft.review_status,
                warnings=["You do not have permission to perform this review action."],
                next_steps=["Contact a manager or safeguarding lead for review."],
            )

        if action.decision == "approve":
            from services.recording_review_signoff_service import recording_review_signoff_service

            signoff = recording_review_signoff_service.approve_and_sign_off_review(
                draft_id, current_user, action=action, conn=conn
            )
            if signoff:
                return signoff
            return self.approve_draft(draft, action, current_user, conn=conn)
        if action.decision == "request_changes":
            return self.request_changes(draft, action, current_user, conn=conn)
        if action.decision == "mark_safeguarding_escalation":
            return self.mark_safeguarding_escalation(draft, action, current_user, conn=conn)
        if action.decision == "mark_reviewed":
            return self.mark_reviewed(draft, action, current_user, conn=conn)
        if action.decision == "submit_after_approval":
            return self.submit_after_approval(draft, action, current_user, conn=conn)
        if action.decision == "archive":
            archived = recording_draft_service.archive_draft(draft_id, current_user, conn=conn)
            if not archived:
                return None
            return RecordingReviewActionResponse(
                success=True,
                draft_id=draft_id,
                decision=action.decision,
                review_status="archived",
                comments=action.comments,
                warnings=[MANAGER_JUDGEMENT_NOTICE],
                next_steps=["Draft archived."],
                audit_reference=self.record_review_event(
                    archived, "archive", action, current_user, conn=conn
                ),
            )
        return None

    def approve_draft(
        self,
        draft: RecordingDraftRecord,
        action: RecordingReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingReviewActionResponse:
        now = _now_iso()
        updated = recording_draft_service.update_draft(
            draft.id,
            RecordingDraftUpdate(
                review_status="approved",
                metadata={
                    **(draft.metadata or {}),
                    "review_priority": self.build_review_priority(draft),
                    "last_review_decision": "approve",
                },
            ),
            current_user,
            conn=conn,
        )
        if updated:
            self._patch_review_fields(
                draft.id,
                {
                    "review_comments": action.comments,
                    "reviewed_by_user_id": _user_id(current_user),
                    "reviewed_by_name": action.reviewer_name or _user_display_name(current_user),
                    "reviewed_by_role": action.reviewer_role or _user_role(current_user),
                    "reviewed_at": now,
                    "approved_at": now,
                    "review_priority": self.build_review_priority(draft),
                },
                conn=conn,
            )
            refreshed = recording_draft_service.get_draft(draft.id, current_user, conn=conn)
            if refreshed:
                updated = refreshed

        audit_ref = self.record_review_event(updated or draft, "approve", action, current_user, conn=conn)
        return RecordingReviewActionResponse(
            success=True,
            draft_id=draft.id,
            decision="approve",
            review_status="approved",
            comments=action.comments,
            warnings=[MANAGER_JUDGEMENT_NOTICE],
            next_steps=self.build_next_steps(updated or draft, "approve"),
            audit_reference=audit_ref,
            sign_off_completed=True,
            sign_off_status="approved",
        )

    def request_changes(
        self,
        draft: RecordingDraftRecord,
        action: RecordingReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingReviewActionResponse:
        now = _now_iso()
        updated = recording_draft_service.update_draft(
            draft.id,
            RecordingDraftUpdate(
                status="draft",
                review_status="changes_requested",
                metadata={**(draft.metadata or {}), "last_review_decision": "request_changes"},
            ),
            current_user,
            conn=conn,
        )
        self._patch_review_fields(
            draft.id,
            {
                "review_comments": action.comments,
                "reviewed_by_user_id": _user_id(current_user),
                "reviewed_by_name": action.reviewer_name or _user_display_name(current_user),
                "reviewed_by_role": action.reviewer_role or _user_role(current_user),
                "changes_requested_at": now,
                "review_priority": self.build_review_priority(draft),
            },
            conn=conn,
        )
        audit_ref = self.record_review_event(updated or draft, "request_changes", action, current_user, conn=conn)
        return RecordingReviewActionResponse(
            success=True,
            draft_id=draft.id,
            decision="request_changes",
            review_status="changes_requested",
            comments=action.comments,
            warnings=[MANAGER_JUDGEMENT_NOTICE],
            next_steps=self.build_next_steps(updated or draft, "request_changes"),
            audit_reference=audit_ref,
        )

    def mark_safeguarding_escalation(
        self,
        draft: RecordingDraftRecord,
        action: RecordingReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingReviewActionResponse:
        now = _now_iso()
        updated = recording_draft_service.update_draft(
            draft.id,
            RecordingDraftUpdate(
                review_status="safeguarding_escalation_required",
                metadata={**(draft.metadata or {}), "last_review_decision": "mark_safeguarding_escalation"},
            ),
            current_user,
            conn=conn,
        )
        self._patch_review_fields(
            draft.id,
            {
                "review_comments": action.comments,
                "reviewed_by_user_id": _user_id(current_user),
                "reviewed_by_name": action.reviewer_name or _user_display_name(current_user),
                "reviewed_by_role": action.reviewer_role or _user_role(current_user),
                "safeguarding_escalation_at": now,
                "review_priority": "urgent",
            },
            conn=conn,
        )
        audit_ref = self.record_review_event(
            updated or draft,
            "mark_safeguarding_escalation",
            action,
            current_user,
            conn=conn,
            safeguarding_escalation=True,
        )
        return RecordingReviewActionResponse(
            success=True,
            draft_id=draft.id,
            decision="mark_safeguarding_escalation",
            review_status="safeguarding_escalation_required",
            comments=action.comments,
            warnings=[
                MANAGER_JUDGEMENT_NOTICE,
                "Safeguarding escalation flagged — follow local safeguarding procedures.",
            ],
            next_steps=self.build_next_steps(updated or draft, "mark_safeguarding_escalation"),
            audit_reference=audit_ref,
        )

    def mark_reviewed(
        self,
        draft: RecordingDraftRecord,
        action: RecordingReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingReviewActionResponse:
        if not action.confirm_reviewed:
            return RecordingReviewActionResponse(
                success=False,
                draft_id=draft.id,
                decision="mark_reviewed",
                review_status=draft.review_status,
                warnings=["confirm_reviewed must be true to mark as reviewed."],
            )
        now = _now_iso()
        updated = recording_draft_service.update_draft(
            draft.id,
            RecordingDraftUpdate(
                review_status="reviewed",
                metadata={**(draft.metadata or {}), "last_review_decision": "mark_reviewed"},
            ),
            current_user,
            conn=conn,
        )
        self._patch_review_fields(
            draft.id,
            {
                "review_comments": action.comments,
                "reviewed_by_user_id": _user_id(current_user),
                "reviewed_by_name": action.reviewer_name or _user_display_name(current_user),
                "reviewed_by_role": action.reviewer_role or _user_role(current_user),
                "reviewed_at": now,
            },
            conn=conn,
        )
        audit_ref = self.record_review_event(updated or draft, "mark_reviewed", action, current_user, conn=conn)
        return RecordingReviewActionResponse(
            success=True,
            draft_id=draft.id,
            decision="mark_reviewed",
            review_status="reviewed",
            comments=action.comments,
            warnings=[MANAGER_JUDGEMENT_NOTICE],
            next_steps=self.build_next_steps(updated or draft, "mark_reviewed"),
            audit_reference=audit_ref,
        )

    def submit_after_approval(
        self,
        draft: RecordingDraftRecord,
        action: RecordingReviewActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> RecordingReviewActionResponse:
        if draft.review_status not in {"approved", "reviewed", "signed_off"} and not action.confirm_reviewed:
            return RecordingReviewActionResponse(
                success=False,
                draft_id=draft.id,
                decision="submit_after_approval",
                review_status=draft.review_status,
                warnings=["Draft must be approved before submit after approval."],
                next_steps=["Approve the draft first, then submit after approval."],
            )

        from services.recording_review_signoff_service import recording_review_signoff_service

        signoff = recording_review_signoff_service.approve_and_sign_off_review(
            draft.id,
            current_user,
            action=RecordingReviewActionRequest(
                decision="approve",
                comments=action.comments,
                confirm_reviewed=True,
                metadata={**(action.metadata or {}), "submit_after_manager_review": True},
            ),
            conn=conn,
            skip_approve_step=True,
        )
        if signoff:
            signoff.decision = "submit_after_approval"
            audit_ref = self.record_review_event(
                draft,
                "submit_after_approval",
                action,
                current_user,
                conn=conn,
            )
            if not signoff.audit_reference:
                signoff.audit_reference = audit_ref
            return signoff

        from services.recording_submission_router_service import recording_submission_router_service

        submission = recording_submission_router_service.submit_draft(
            draft.id,
            RecordingSubmissionRequest(
                draft_id=draft.id,
                confirm_reviewed=True,
                metadata={**(action.metadata or {}), "submit_after_manager_review": True},
            ),
            current_user,
            conn=conn,
        )
        if not submission:
            return RecordingReviewActionResponse(
                success=False,
                draft_id=draft.id,
                decision="submit_after_approval",
                review_status=draft.review_status,
                warnings=["Submission failed."],
            )

        new_status = "submitted" if submission.formal_record_created else draft.review_status
        audit_ref = self.record_review_event(
            draft,
            "submit_after_approval",
            action,
            current_user,
            conn=conn,
            submission_response=submission,
        )
        return RecordingReviewActionResponse(
            success=submission.success,
            draft_id=draft.id,
            decision="submit_after_approval",
            review_status=new_status if isinstance(new_status, str) else "submitted",
            comments=action.comments,
            submitted=submission.submitted,
            formal_record_created=submission.formal_record_created,
            formal_record_type=submission.formal_record_type,
            linked_record_id=submission.linked_record_id,
            linked_archive_record_id=submission.linked_archive_record_id,
            linked_chronology_id=submission.linked_chronology_id,
            linked_plan_impact_ids=list(submission.linked_plan_impact_ids or []),
            lifeecho_suggestion_ids=list(submission.lifeecho_suggestion_ids or []),
            sign_off_completed=submission.formal_record_created,
            sign_off_status="signed_off" if submission.formal_record_created else "approved",
            warnings=[MANAGER_JUDGEMENT_NOTICE, *list(submission.warnings or [])[:15]],
            lifecycle_warnings=list(submission.warnings or [])[:15],
            next_steps=self.build_next_steps(draft, "submit_after_approval", submission),
            lifecycle_next_steps=list(submission.next_steps or [])[:15],
            audit_reference=audit_ref,
        )

    def _patch_review_fields(
        self,
        draft_id: str,
        fields: dict[str, Any],
        conn: Any | None = None,
    ) -> None:
        if recording_draft_service._detect_storage_mode() == "postgresql" and conn is not None:
            recording_draft_service._patch_db(conn, draft_id, fields)
        elif draft_id in recording_draft_service._memory:
            recording_draft_service._memory[draft_id].update(fields)

    def record_review_event(
        self,
        draft: RecordingDraftRecord,
        decision: str,
        action: RecordingReviewActionRequest,
        current_user: dict[str, Any],
        *,
        submission_response: Any | None = None,
        conn: Any | None = None,
        safeguarding_escalation: bool = False,
    ) -> str:
        event_id = str(uuid4())
        previous = draft.review_status
        new_status_map = {
            "approve": "approved",
            "request_changes": "changes_requested",
            "mark_safeguarding_escalation": "safeguarding_escalation_required",
            "mark_reviewed": "reviewed",
            "submit_after_approval": "submitted"
            if submission_response and getattr(submission_response, "formal_record_created", False)
            else draft.review_status,
            "archive": "archived",
        }
        new_status = new_status_map.get(decision, draft.review_status)
        row = {
            "id": event_id,
            "draft_id": draft.id,
            "decision": decision,
            "previous_review_status": previous,
            "new_review_status": new_status,
            "comments": action.comments,
            "reviewer_user_id": _user_id(current_user),
            "reviewer_name": action.reviewer_name or _user_display_name(current_user),
            "reviewer_role": action.reviewer_role or _user_role(current_user),
            "home_id": draft.home_id,
            "child_id": draft.child_id,
            "recording_type": draft.recording_type,
            "form_id": draft.form_id,
            "manager_review_required": draft.manager_review_required,
            "safeguarding_review_required": draft.safeguarding_review_required,
            "safeguarding_escalation_required": safeguarding_escalation
            or decision == "mark_safeguarding_escalation",
            "submitted": bool(submission_response and getattr(submission_response, "submitted", False)),
            "formal_record_created": bool(
                submission_response and getattr(submission_response, "formal_record_created", False)
            ),
            "linked_record_id": getattr(submission_response, "linked_record_id", None)
            if submission_response
            else None,
            "metadata": {**(action.metadata or {}), "decision": decision},
            "created_at": _now_iso(),
        }
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO recording_review_events (
                            id, draft_id, decision, previous_review_status, new_review_status,
                            comments, reviewer_user_id, reviewer_name, reviewer_role,
                            home_id, child_id, recording_type, form_id,
                            manager_review_required, safeguarding_review_required,
                            safeguarding_escalation_required, submitted, formal_record_created,
                            linked_record_id, metadata
                        ) VALUES (
                            %(id)s, %(draft_id)s, %(decision)s, %(previous_review_status)s,
                            %(new_review_status)s, %(comments)s, %(reviewer_user_id)s,
                            %(reviewer_name)s, %(reviewer_role)s, %(home_id)s, %(child_id)s,
                            %(recording_type)s, %(form_id)s, %(manager_review_required)s,
                            %(safeguarding_review_required)s, %(safeguarding_escalation_required)s,
                            %(submitted)s, %(formal_record_created)s, %(linked_record_id)s, %(metadata)s
                        )
                        """,
                        {**row, "metadata": Json(row["metadata"])},
                    )
            except Exception:
                logger.debug("Review event DB insert failed; using memory", exc_info=True)
                self._memory_events.append(row)
        else:
            self._memory_events.append(row)

        record_audit_event(
            event_type="recording_review",
            action=decision,
            actor=current_user,
            resource_type="recording_draft",
            resource_id=draft.id,
            metadata={
                "review_event_id": event_id,
                "previous_review_status": previous,
                "new_review_status": new_status,
                "comments": action.comments,
                "formal_record_created": row["formal_record_created"],
            },
        )
        recording_draft_service.record_audit(
            f"review_{decision}",
            draft,
            current_user,
            metadata={"review_event_id": event_id, "new_review_status": new_status},
        )
        return event_id

    def _list_events_for_draft(
        self, draft_id: str, conn: Any | None = None
    ) -> list[RecordingReviewEventRecord]:
        rows: list[dict[str, Any]] = []
        if self._detect_storage_mode() == "postgresql" and conn is not None:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT * FROM recording_review_events
                        WHERE draft_id = %s ORDER BY created_at DESC LIMIT 50
                        """,
                        (draft_id,),
                    )
                    rows = [dict(r) for r in cur.fetchall()]
            except Exception:
                rows = [r for r in self._memory_events if r.get("draft_id") == draft_id]
        else:
            rows = [r for r in self._memory_events if r.get("draft_id") == draft_id]

        return [
            RecordingReviewEventRecord(
                id=_text(r.get("id")),
                draft_id=_text(r.get("draft_id")),
                decision=_text(r.get("decision")),
                previous_review_status=r.get("previous_review_status"),
                new_review_status=r.get("new_review_status"),
                comments=r.get("comments"),
                reviewer_user_id=r.get("reviewer_user_id"),
                reviewer_name=r.get("reviewer_name"),
                reviewer_role=r.get("reviewer_role"),
                home_id=r.get("home_id"),
                child_id=r.get("child_id"),
                recording_type=r.get("recording_type"),
                form_id=r.get("form_id"),
                manager_review_required=bool(r.get("manager_review_required")),
                safeguarding_review_required=bool(r.get("safeguarding_review_required")),
                safeguarding_escalation_required=bool(r.get("safeguarding_escalation_required")),
                submitted=bool(r.get("submitted")),
                formal_record_created=bool(r.get("formal_record_created")),
                linked_record_id=r.get("linked_record_id"),
                metadata=_parse_json(r.get("metadata"), {}),
                created_at=_iso_dt(r.get("created_at")) or _now_iso(),
            )
            for r in rows
        ]


recording_review_service = RecordingReviewService()
