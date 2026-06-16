"""Recording governance dashboard — metadata-only manager oversight."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.recording_drafts import RecordingDraftListRequest, RecordingDraftRecord
from schemas.recording_governance import (
    RecordingGovernanceAlert,
    RecordingGovernanceBacklogMetric,
    RecordingGovernanceDashboard,
    RecordingGovernanceFilters,
    RecordingGovernanceFormUsage,
    RecordingGovernanceHealth,
    RecordingGovernanceItem,
    RecordingGovernanceMetricCard,
    RecordingGovernanceQualityMetric,
    RecordingGovernanceReviewOutcome,
    RecordingGovernanceRiskLevel,
)
from schemas.recording_review import RecordingReviewEventRecord, RecordingReviewQueueFilters
from services.recording_draft_service import recording_draft_service
from services.recording_review_service import HIGH_RISK_TYPES, recording_review_service

logger = logging.getLogger("indicare.recording_governance")

GOVERNANCE_VIEW_ROLES = MANAGER_ROLES | {
    "senior",
    "senior_practitioner",
    "senior_worker",
    "deputy",
    "registered_manager_deputy",
}

STUCK_DRAFT_DAYS = 7
OVERDUE_REVIEW_DAYS = 5

LIMITATIONS = [
    "Dashboard counts use draft metadata and review events — not formal chronology records.",
    "Formal record submission may still be draft-workspace only for some form types.",
    "This is decision-support for managers; it does not grade Inspection evidence preparation or legal completeness.",
    "High-risk structured field values are not shown in summary cards.",
]

PRIVACY_NOTICE = (
    "This view uses recording metadata, flags and summaries. "
    "It does not display full raw record bodies."
)


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


def _is_high_risk(draft: RecordingDraftRecord) -> bool:
    if draft.safeguarding_sensitive or draft.safeguarding_review_required:
        return True
    if draft.recording_type in HIGH_RISK_TYPES:
        return True
    if "safeguarding" in draft.recording_type:
        return True
    return bool(draft.structured_template_id)


def _structured_incomplete(draft: RecordingDraftRecord) -> bool:
    completion = draft.structured_completion or {}
    if completion.get("valid") is False:
        return True
    missing = completion.get("required_missing") or []
    if isinstance(missing, list) and missing:
        return True
    summary = draft.structured_summary or {}
    summary_missing = summary.get("required_missing") or []
    if isinstance(summary_missing, list) and summary_missing:
        return True
    meta = (draft.metadata or {}).get("structured_template") or {}
    meta_missing = meta.get("required_missing") or []
    return bool(meta_missing)


def _missing_child_voice(draft: RecordingDraftRecord) -> bool:
    flags = [str(f).lower() for f in draft.quality_flags or []]
    if any("child_voice" in f or "child voice" in f for f in flags):
        return True
    checklist = draft.checklist_status or {}
    for key, value in checklist.items():
        key_l = str(key).lower()
        if "child_voice" in key_l or "child-voice" in key_l:
            if str(value).lower() in {"missing", "incomplete", "false", "no", "pending"}:
                return True
    completion = draft.structured_completion or {}
    missing = completion.get("required_missing") or []
    return any("child_voice" in str(m).lower() for m in missing)


def _missing_follow_up(draft: RecordingDraftRecord) -> bool:
    flags = [str(f).lower() for f in draft.quality_flags or []]
    if any("follow" in f for f in flags):
        return True
    checklist = draft.checklist_status or {}
    for key, value in checklist.items():
        if "follow" in str(key).lower():
            if str(value).lower() in {"missing", "incomplete", "false", "no", "pending"}:
                return True
    completion = draft.structured_completion or {}
    missing = completion.get("required_missing") or []
    return any("follow" in str(m).lower() for m in missing)


def _judgemental_flags(draft: RecordingDraftRecord) -> bool:
    language = [str(f).lower() for f in draft.language_flags or []]
    quality = [str(f).lower() for f in draft.quality_flags or []]
    combined = language + quality
    return any("judgement" in f or "judgment" in f or "blame" in f for f in combined)


def _draft_priority(draft: RecordingDraftRecord) -> str:
    meta_priority = _text((draft.metadata or {}).get("review_priority"))
    if meta_priority in {"low", "medium", "high", "urgent"}:
        return meta_priority
    return recording_review_service.build_review_priority(draft)


def _apply_filters(
    drafts: list[RecordingDraftRecord],
    filters: RecordingGovernanceFilters | None,
) -> list[RecordingDraftRecord]:
    filters = filters or RecordingGovernanceFilters()
    visible = list(drafts)
    if filters.status:
        visible = [d for d in visible if d.status == filters.status]
    if filters.review_status:
        visible = [d for d in visible if d.review_status == filters.review_status]
    if filters.recording_type:
        visible = [d for d in visible if d.recording_type == filters.recording_type]
    if filters.category:
        visible = [d for d in visible if d.category == filters.category]
    if filters.child_id is not None:
        visible = [d for d in visible if d.child_id == filters.child_id]
    if filters.home_id is not None:
        visible = [d for d in visible if d.home_id == filters.home_id]
    if filters.high_risk_only:
        visible = [d for d in visible if _is_high_risk(d)]
    if filters.safeguarding_only:
        visible = [
            d
            for d in visible
            if d.safeguarding_sensitive
            or d.safeguarding_review_required
            or "safeguarding" in d.recording_type
        ]
    if filters.date_from:
        start = _parse_dt(filters.date_from)
        if start:
            visible = [d for d in visible if (_parse_dt(d.updated_at) or start) >= start]
    if filters.date_to:
        end = _parse_dt(filters.date_to)
        if end:
            visible = [d for d in visible if (_parse_dt(d.updated_at) or end) <= end]
    return visible


class RecordingGovernanceService:
    def enforce_governance_access(self, current_user: dict[str, Any]) -> bool:
        role = _user_role(current_user)
        if role in {r.lower() for r in GOVERNANCE_VIEW_ROLES}:
            return True
        if any(token in role for token in ("manager", "deputy", "responsible", "registered")):
            return True
        return False

    def safe_scope_for_user(self, current_user: dict[str, Any]) -> str:
        if self.enforce_governance_access(current_user):
            return "home"
        return "own_drafts"

    def get_health(self, conn: Any | None = None) -> RecordingGovernanceHealth:
        draft_health = recording_draft_service.health()
        review_health = recording_review_service.get_review_health(conn=conn)
        warnings: list[str] = []
        degraded = False
        if draft_health.storage_mode == "memory" or review_health.storage_mode == "memory":
            warnings.append("Using in-memory recording store — metrics reflect session data only.")
            degraded = True
        return RecordingGovernanceHealth(
            status="degraded" if degraded else "ready",
            storage_mode=draft_health.storage_mode,
            draft_count=draft_health.draft_count,
            review_event_count=review_health.queue_count,
            persistence_available=draft_health.persistence_available and review_health.persistence_available,
            degraded=degraded,
            warnings=warnings,
        )

    def _load_drafts(
        self,
        current_user: dict[str, Any],
        filters: RecordingGovernanceFilters | None,
        conn: Any | None,
    ) -> list[RecordingDraftRecord]:
        list_filters = RecordingDraftListRequest(
            child_id=filters.child_id if filters else None,
            home_id=filters.home_id if filters else None,
            recording_type=filters.recording_type if filters else None,
            status=filters.status if filters else None,
            review_status=filters.review_status if filters else None,
            limit=200,
            offset=0,
        )
        response = recording_draft_service.list_drafts(current_user, list_filters, conn=conn)
        drafts = response.items
        if not self.enforce_governance_access(current_user):
            uid = _user_id(current_user)
            drafts = [d for d in drafts if _text(d.created_by_user_id) == uid]
        return _apply_filters(drafts, filters)

    def _load_review_events(
        self,
        current_user: dict[str, Any],
        conn: Any | None,
    ) -> list[RecordingReviewEventRecord]:
        events: list[RecordingReviewEventRecord] = []
        if not self.enforce_governance_access(current_user):
            return events
        queue = recording_review_service.list_review_queue(
            current_user,
            RecordingReviewQueueFilters(limit=200),
            conn=conn,
        )
        seen: set[str] = set()
        for item in queue.items:
            if item.draft_id in seen:
                continue
            seen.add(item.draft_id)
            events.extend(recording_review_service._list_events_for_draft(item.draft_id, conn=conn))
        if hasattr(recording_review_service, "_memory_events"):
            for row in recording_review_service._memory_events:
                event = RecordingReviewEventRecord(
                    id=_text(row.get("id")),
                    draft_id=_text(row.get("draft_id")),
                    decision=_text(row.get("decision")),
                    previous_review_status=row.get("previous_review_status"),
                    new_review_status=row.get("new_review_status"),
                    comments=row.get("comments"),
                    reviewer_user_id=row.get("reviewer_user_id"),
                    reviewer_name=row.get("reviewer_name"),
                    reviewer_role=row.get("reviewer_role"),
                    home_id=row.get("home_id"),
                    child_id=row.get("child_id"),
                    recording_type=row.get("recording_type"),
                    form_id=row.get("form_id"),
                    manager_review_required=bool(row.get("manager_review_required")),
                    safeguarding_review_required=bool(row.get("safeguarding_review_required")),
                    safeguarding_escalation_required=bool(row.get("safeguarding_escalation_required")),
                    submitted=bool(row.get("submitted")),
                    formal_record_created=bool(row.get("formal_record_created")),
                    linked_record_id=row.get("linked_record_id"),
                    metadata=row.get("metadata") if isinstance(row.get("metadata"), dict) else {},
                    created_at=_text(row.get("created_at")) or _now_iso(),
                )
                if event.id and event.id not in {e.id for e in events}:
                    events.append(event)
        return events

    def build_dashboard(
        self,
        current_user: dict[str, Any],
        filters: RecordingGovernanceFilters | None = None,
        conn: Any | None = None,
    ) -> RecordingGovernanceDashboard:
        try:
            drafts = self._load_drafts(current_user, filters, conn)
            events = self._load_review_events(current_user, conn)
            scope = self.safe_scope_for_user(current_user)
            dashboard = RecordingGovernanceDashboard(
                generated_at=_now_iso(),
                scope=scope,
                summary_cards=self.build_summary_cards(drafts, events),
                backlog=self.build_backlog_metrics(drafts),
                quality=self.build_quality_metrics(drafts),
                form_usage=self.build_form_usage(drafts),
                review_outcomes=self.build_review_outcomes(events),
                alerts=self.build_alerts(drafts, events),
                recommendations=[],
                privacy_notice=PRIVACY_NOTICE,
                limitations=list(LIMITATIONS),
                metadata={
                    "draft_count": len(drafts),
                    "filtered": bool(filters and any(
                        getattr(filters, k) for k in (
                            "child_id", "home_id", "recording_type", "high_risk_only", "safeguarding_only"
                        )
                    )),
                },
            )
            dashboard.recommendations = self.build_recommendations(dashboard)
            return dashboard
        except Exception as exc:
            logger.warning("Recording governance dashboard degraded: %s", exc)
            health = self.get_health(conn=conn)
            return RecordingGovernanceDashboard(
                generated_at=_now_iso(),
                scope=self.safe_scope_for_user(current_user),
                limitations=list(LIMITATIONS) + [f"Metrics temporarily unavailable: {str(exc)[:120]}"],
                metadata={"degraded": True, "error": str(exc)[:200]},
                alerts=[
                    RecordingGovernanceAlert(
                        id="degraded",
                        title="Governance metrics unavailable",
                        description="Try again shortly. Draft and review services may be starting up.",
                        risk_level="medium",
                        route="/record/reviews",
                        action_label="Open review queue",
                    )
                ],
            )

    def list_governance_items(
        self,
        current_user: dict[str, Any],
        filters: RecordingGovernanceFilters | None = None,
        conn: Any | None = None,
    ) -> list[RecordingGovernanceItem]:
        filters = filters or RecordingGovernanceFilters()
        drafts = self._load_drafts(current_user, filters, conn)
        drafts.sort(key=lambda d: d.updated_at, reverse=True)
        page = drafts[filters.offset : filters.offset + filters.limit]
        return [self._draft_to_item(d) for d in page]

    def _draft_to_item(self, draft: RecordingDraftRecord) -> RecordingGovernanceItem:
        child_route = (
            f"/young-people/{draft.child_id}/journey" if draft.child_id is not None else None
        )
        review_route = (
            f"/record/reviews?child_id={draft.child_id}"
            if draft.child_id is not None
            else "/record/reviews"
        )
        needs_review = draft.review_status in {
            "awaiting_review",
            "manager_review_required",
            "safeguarding_review_required",
            "changes_requested",
            "approved",
            "safeguarding_escalation_required",
        } or draft.status == "ready_for_review"
        return RecordingGovernanceItem(
            draft_id=draft.id,
            title=_text(draft.title) or draft.recording_type.replace("-", " ").title(),
            recording_type=draft.recording_type,
            form_id=draft.form_id,
            category=draft.category,
            status=draft.status,
            review_status=draft.review_status,
            review_priority=_draft_priority(draft),
            child_id=draft.child_id,
            child_name=draft.child_name,
            home_id=draft.home_id,
            created_by_name=draft.created_by_name,
            safeguarding_sensitive=draft.safeguarding_sensitive,
            privacy_sensitive=draft.privacy_sensitive,
            quality_flag_count=len(draft.quality_flags or []),
            privacy_flag_count=len(draft.privacy_flags or []),
            structured_incomplete=_structured_incomplete(draft),
            updated_at=draft.updated_at,
            draft_route=f"/record?draft_id={draft.id}",
            review_route=review_route if needs_review else None,
            child_journey_route=child_route,
            metadata={
                "manager_review_required": draft.manager_review_required,
                "safeguarding_review_required": draft.safeguarding_review_required,
                "linked_record_id": draft.linked_record_id,
                "formal_submitted": draft.status == "submitted",
            },
        )

    def build_summary_cards(
        self,
        drafts: list[RecordingDraftRecord],
        review_events: list[RecordingReviewEventRecord],
    ) -> list[RecordingGovernanceMetricCard]:
        total = len(drafts)
        awaiting = sum(
            1
            for d in drafts
            if d.review_status
            in {"awaiting_review", "manager_review_required", "safeguarding_review_required"}
            or d.status == "ready_for_review"
        )
        urgent = sum(1 for d in drafts if _draft_priority(d) == "urgent")
        safeguarding = sum(
            1
            for d in drafts
            if d.safeguarding_sensitive or d.safeguarding_review_required
        )
        formal = sum(1 for d in drafts if d.linked_record_id or any(
            e.formal_record_created and e.draft_id == d.id for e in review_events
        ))
        draft_only_submitted = sum(
            1
            for d in drafts
            if d.status == "submitted" and not d.linked_record_id
        )
        privacy = sum(1 for d in drafts if d.privacy_flags or d.privacy_sensitive)
        incomplete_structured = sum(1 for d in drafts if _structured_incomplete(d))

        return [
            RecordingGovernanceMetricCard(
                id="total_drafts",
                title="Total drafts",
                value=total,
                label="in scope",
                tone="neutral",
                route="/record",
                description="Active recording drafts visible in this scope.",
            ),
            RecordingGovernanceMetricCard(
                id="awaiting_review",
                title="Awaiting review",
                value=awaiting,
                label="queue",
                tone="purple" if awaiting else "neutral",
                route="/record/reviews",
                description="Drafts needing manager or safeguarding review.",
            ),
            RecordingGovernanceMetricCard(
                id="urgent_reviews",
                title="Urgent reviews",
                value=urgent,
                label="priority",
                tone="rose" if urgent else "neutral",
                route="/record/reviews?urgent_only=1",
                description="Urgent priority items in the review queue.",
            ),
            RecordingGovernanceMetricCard(
                id="safeguarding_sensitive",
                title="Safeguarding-sensitive",
                value=safeguarding,
                label="flags",
                tone="amber" if safeguarding else "neutral",
                route="/record/reviews?safeguarding_only=1",
            ),
            RecordingGovernanceMetricCard(
                id="formal_records",
                title="Formal records created",
                value=formal,
                label="linked",
                tone="emerald" if formal else "neutral",
                route="/chronology",
            ),
            RecordingGovernanceMetricCard(
                id="draft_only_submitted",
                title="Draft-only submissions",
                value=draft_only_submitted,
                label="workspace",
                tone="blue" if draft_only_submitted else "neutral",
                route="/record",
                description="Submitted in workspace without linked formal record yet.",
            ),
            RecordingGovernanceMetricCard(
                id="privacy_flags",
                title="Privacy flags",
                value=privacy,
                label="drafts",
                tone="amber" if privacy else "neutral",
                route="/record/governance#quality",
            ),
            RecordingGovernanceMetricCard(
                id="incomplete_structured",
                title="Incomplete structured forms",
                value=incomplete_structured,
                label="gaps",
                tone="rose" if incomplete_structured else "neutral",
                route="/record/governance#structured",
            ),
        ]

    def build_backlog_metrics(self, drafts: list[RecordingDraftRecord]) -> RecordingGovernanceBacklogMetric:
        by_priority = {"urgent": 0, "high": 0, "medium": 0, "low": 0}
        overdue = 0
        cutoff = datetime.now(timezone.utc) - timedelta(days=OVERDUE_REVIEW_DAYS)
        awaiting = 0
        safeguarding = 0
        changes = 0
        approved = 0
        submitted = 0

        for draft in drafts:
            priority = _draft_priority(draft)
            if priority in by_priority:
                by_priority[priority] += 1
            if draft.review_status in {
                "awaiting_review",
                "manager_review_required",
                "safeguarding_review_required",
            } or draft.status == "ready_for_review":
                awaiting += 1
                updated = _parse_dt(draft.updated_at)
                if updated and updated < cutoff:
                    overdue += 1
            if draft.safeguarding_review_required or draft.safeguarding_sensitive:
                safeguarding += 1
            if draft.review_status == "changes_requested":
                changes += 1
            if draft.review_status == "approved":
                approved += 1
            if draft.status == "submitted" or draft.review_status == "submitted":
                submitted += 1

        return RecordingGovernanceBacklogMetric(
            awaiting_review=awaiting,
            urgent=by_priority["urgent"],
            safeguarding_review=safeguarding,
            changes_requested=changes,
            approved=approved,
            submitted=submitted,
            overdue=overdue,
            by_priority=by_priority,
        )

    def build_quality_metrics(self, drafts: list[RecordingDraftRecord]) -> RecordingGovernanceQualityMetric:
        return RecordingGovernanceQualityMetric(
            total_drafts=len(drafts),
            incomplete_structured_forms=sum(1 for d in drafts if _structured_incomplete(d)),
            missing_child_voice=sum(1 for d in drafts if _missing_child_voice(d)),
            missing_follow_up=sum(1 for d in drafts if _missing_follow_up(d)),
            judgemental_language_flags=sum(1 for d in drafts if _judgemental_flags(d)),
            privacy_flags=sum(1 for d in drafts if d.privacy_flags or d.privacy_sensitive),
            manager_review_flags=sum(1 for d in drafts if d.manager_review_required),
            safeguarding_review_flags=sum(1 for d in drafts if d.safeguarding_review_required),
        )

    def build_form_usage(self, drafts: list[RecordingDraftRecord]) -> list[RecordingGovernanceFormUsage]:
        buckets: dict[str, RecordingGovernanceFormUsage] = {}
        for draft in drafts:
            key = draft.form_id or draft.recording_type
            if key not in buckets:
                buckets[key] = RecordingGovernanceFormUsage(
                    form_id=draft.form_id,
                    recording_type=draft.recording_type,
                    title=_text(draft.title) or draft.recording_type.replace("-", " ").title(),
                    category=draft.category,
                )
            usage = buckets[key]
            usage.count += 1
            if _is_high_risk(draft):
                usage.high_risk_count += 1
            if draft.status == "submitted":
                usage.submitted_count += 1
            if draft.manager_review_required or draft.safeguarding_review_required:
                usage.review_required_count += 1
        ranked = sorted(buckets.values(), key=lambda u: u.count, reverse=True)
        return ranked[:20]

    def build_review_outcomes(
        self, review_events: list[RecordingReviewEventRecord]
    ) -> RecordingGovernanceReviewOutcome:
        outcomes = RecordingGovernanceReviewOutcome()
        for event in review_events:
            decision = _text(event.decision).lower()
            status = _text(event.new_review_status).lower()
            if decision == "approve" or status == "approved":
                outcomes.approved += 1
            if decision == "request_changes" or status == "changes_requested":
                outcomes.changes_requested += 1
            if decision == "mark_safeguarding_escalation" or status == "safeguarding_escalation_required":
                outcomes.safeguarding_escalation += 1
            if event.submitted or decision == "submit_after_approval":
                outcomes.submitted_after_approval += 1
            if decision == "archive" or status == "archived":
                outcomes.archived += 1
        return outcomes

    def build_alerts(
        self,
        drafts: list[RecordingDraftRecord],
        review_events: list[RecordingReviewEventRecord],
    ) -> list[RecordingGovernanceAlert]:
        alerts: list[RecordingGovernanceAlert] = []
        stuck_cutoff = datetime.now(timezone.utc) - timedelta(days=STUCK_DRAFT_DAYS)

        for draft in drafts:
            if not (
                draft.safeguarding_review_required
                or draft.safeguarding_sensitive
                or draft.review_status == "safeguarding_review_required"
            ):
                continue
            if draft.review_status not in {"awaiting_review", "safeguarding_review_required", "manager_review_required"}:
                continue
            alerts.append(
                RecordingGovernanceAlert(
                    id=f"safeguarding-{draft.id}",
                    title="Safeguarding review draft",
                    description=f"{_text(draft.title) or draft.recording_type} needs safeguarding-aware review.",
                    risk_level="urgent",
                    route=f"/record/reviews",
                    action_label="Open review queue",
                    metadata={"draft_id": draft.id, "child_id": draft.child_id},
                )
            )

        for draft in drafts:
            if not _is_high_risk(draft):
                continue
            updated = _parse_dt(draft.updated_at)
            if updated and updated < stuck_cutoff and draft.status in {"draft", "ready_for_review"}:
                alerts.append(
                    RecordingGovernanceAlert(
                        id=f"stuck-{draft.id}",
                        title="High-risk draft ageing",
                        description=(
                            f"{_text(draft.title) or draft.recording_type} has been open for more than "
                            f"{STUCK_DRAFT_DAYS} days."
                        ),
                        risk_level="high",
                        route=f"/record?draft_id={draft.id}",
                        action_label="Open draft",
                        metadata={"draft_id": draft.id},
                    )
                )

        for draft in drafts:
            if _structured_incomplete(draft):
                alerts.append(
                    RecordingGovernanceAlert(
                        id=f"structured-{draft.id}",
                        title="Structured completion gap",
                        description="Required structured fields are incomplete.",
                        risk_level="medium",
                        route=f"/record?draft_id={draft.id}",
                        action_label="Complete structured form",
                        metadata={"draft_id": draft.id},
                    )
                )

        for draft in drafts:
            if len(draft.privacy_flags or []) >= 2:
                alerts.append(
                    RecordingGovernanceAlert(
                        id=f"privacy-{draft.id}",
                        title="Repeated privacy flags",
                        description="Check identifiers and minimisation before submission.",
                        risk_level="medium",
                        route=f"/record?draft_id={draft.id}",
                        action_label="Review draft",
                        metadata={"draft_id": draft.id, "flag_count": len(draft.privacy_flags)},
                    )
                )

        for draft in drafts:
            if draft.review_status == "changes_requested":
                alerts.append(
                    RecordingGovernanceAlert(
                        id=f"changes-{draft.id}",
                        title="Changes requested not updated",
                        description="Author should update the draft after manager feedback.",
                        risk_level="medium",
                        route=f"/record?draft_id={draft.id}",
                        action_label="Open draft",
                        metadata={"draft_id": draft.id},
                    )
                )

        backlog = self.build_backlog_metrics(drafts)
        if backlog.awaiting_review >= 5:
            alerts.append(
                RecordingGovernanceAlert(
                    id="backlog-queue",
                    title="Review queue backlog",
                    description=f"{backlog.awaiting_review} drafts are awaiting review in this scope.",
                    risk_level="high" if backlog.urgent else "medium",
                    route="/record/reviews",
                    action_label="Open review queue",
                )
            )

        if not alerts and drafts:
            alerts.append(
                RecordingGovernanceAlert(
                    id="all-clear",
                    title="No urgent governance alerts",
                    description="Continue routine review and recording quality checks.",
                    risk_level="low",
                    route="/record/reviews",
                )
            )

        _ = review_events
        deduped: dict[str, RecordingGovernanceAlert] = {}
        for alert in alerts:
            deduped[alert.id] = alert
        ranked = sorted(
            deduped.values(),
            key=lambda a: {"urgent": 0, "high": 1, "medium": 2, "low": 3}.get(a.risk_level, 4),
        )
        return ranked[:25]

    def build_recommendations(self, dashboard: RecordingGovernanceDashboard) -> list[str]:
        recs: list[str] = []
        if dashboard.backlog.awaiting_review:
            recs.append(
                f"Prioritise {dashboard.backlog.awaiting_review} draft(s) in the review queue — "
                "start with urgent and safeguarding items."
            )
        if dashboard.quality.incomplete_structured_forms:
            recs.append(
                "Complete required structured fields on high-risk forms before approval or submission."
            )
        if dashboard.quality.privacy_flags:
            recs.append("Review privacy-flagged drafts for unnecessary identifiers.")
        if dashboard.quality.missing_child_voice:
            recs.append("Add child voice or presentation where the form requires it.")
        if not recs:
            recs.append("Maintain routine recording quality checks and manager review habits.")
        return recs


recording_governance_service = RecordingGovernanceService()
