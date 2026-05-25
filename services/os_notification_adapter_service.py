"""Adapter layer: unified OS operational notification feed for the existing bell."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.os_notifications import (
    OsNotificationFeedResponse,
    OsNotificationFeedHealth,
    OsNotificationItem,
    OsNotificationSummary,
)
from schemas.recording_alerts import RecordingAlertListFilters, RecordingAlertRecord
from services.intelligence_action_service import intelligence_action_service
from services.isn_notification_adapter_service import isn_notification_adapter_service
from services.manager_daily_brief_service import manager_daily_brief_service
from services.os_notification_preference_service import os_notification_preference_service
from services.os_notification_state_service import os_notification_state_service
from services.recording_alert_service import recording_alert_service
from services.recording_governance_service import recording_governance_service
from services.recording_review_service import recording_review_service
from db.connection import DatabaseUnavailableError, is_pool_under_pressure
from services.os_cache_service import OsCacheLookup, os_cache_service
from services.os_time_budget_service import TimeBudgetReport, os_time_budget_service

logger = logging.getLogger("indicare.os_notifications")

NOTIFICATION_FEED_CACHE_TTL_SECONDS = 15
NOTIFICATION_FEED_STALE_SECONDS = 30

ALERT_TYPE_TO_OS_TYPE: dict[str, str] = {
    "high_risk_review_due": "recording_alert_urgent",
    "manager_review_required": "recording_alert_review_due",
    "review_backlog_high": "recording_alert_review_due",
    "safeguarding_review_due": "recording_alert_safeguarding",
    "safeguarding_escalation_required": "recording_alert_safeguarding",
    "privacy_flags_unresolved": "recording_alert_privacy",
    "changes_requested_pending": "recording_alert_changes_requested",
    "missing_episode_follow_up_due": "recording_alert_missing_follow_up",
    "rhi_follow_up_due": "recording_alert_missing_follow_up",
    "medication_error_review_due": "recording_alert_medication_review",
    "structured_fields_missing": "recording_alert_structured_missing",
    "draft_stale": "recording_alert_review_due",
    "recording_quality_concern": "recording_alert_review_due",
    "formal_submission_not_wired": "recording_alert_structured_missing",
    "formal_submission_failed": "recording_alert_structured_missing",
}

CATEGORY_LABELS: dict[str, str] = {
    "recording": "Recording",
    "safeguarding_network": "Safeguarding network",
    "daily_brief": "Daily brief",
    "review": "Review",
    "action": "Action",
    "governance": "Governance",
    "handover": "Handover",
    "system": "System",
}

TYPE_CATEGORY: dict[str, str] = {
    "recording_alert_urgent": "recording",
    "recording_alert_safeguarding": "safeguarding_network",
    "recording_alert_review_due": "review",
    "recording_alert_privacy": "governance",
    "recording_alert_changes_requested": "recording",
    "recording_alert_missing_follow_up": "recording",
    "recording_alert_medication_review": "recording",
    "recording_alert_structured_missing": "governance",
    "manager_daily_brief_reminder": "daily_brief",
    "isn_safeguarding_alert": "safeguarding_network",
    "isn_review_required": "safeguarding_network",
    "isn_escalation_required": "safeguarding_network",
    "isn_network_update": "safeguarding_network",
    "isn_follow_up_due": "safeguarding_network",
    "isn_professional_update": "safeguarding_network",
    "isn_recording_linked_alert": "safeguarding_network",
    "isn_manager_action_required": "safeguarding_network",
    "recording_review_due": "review",
    "intelligence_action_due": "action",
    "governance_notice": "governance",
    "reg45_review_manager_due": "governance",
    "reg45_review_ri_required": "governance",
    "reg45_improvement_actions_pending": "action",
}


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_role(current_user: dict[str, Any]) -> str:
    return _text(current_user.get("role"), "staff").lower()


def _is_manager_view(current_user: dict[str, Any]) -> bool:
    role = _user_role(current_user)
    return role in {r.lower() for r in MANAGER_ROLES} or any(
        token in role for token in ("manager", "deputy", "senior", "registered", "admin")
    )


def _safe_route_for_alert(alert: RecordingAlertRecord) -> str:
    atype = alert.alert_type
    if atype in (
        "high_risk_review_due",
        "manager_review_required",
        "review_backlog_high",
        "safeguarding_review_due",
        "safeguarding_escalation_required",
    ):
        return "/record/reviews"
    if atype == "privacy_flags_unresolved":
        return "/record/governance"
    return "/record/alerts"


def _action_label_for_alert(alert: RecordingAlertRecord) -> str:
    atype = alert.alert_type
    if atype in ("high_risk_review_due", "manager_review_required", "review_backlog_high"):
        return "Open review queue"
    if atype in ("safeguarding_review_due", "safeguarding_escalation_required"):
        return "Open safeguarding alerts"
    if atype == "changes_requested_pending":
        return "Open changes requested"
    if atype == "privacy_flags_unresolved":
        return "Open governance"
    if atype in ("missing_episode_follow_up_due", "rhi_follow_up_due"):
        return "Open follow-up alerts"
    if atype == "medication_error_review_due":
        return "Open medication review"
    if atype == "structured_fields_missing":
        return "Open structured alerts"
    return "Open recording alerts"


def _title_for_alert(alert: RecordingAlertRecord) -> str:
    templates = {
        "high_risk_review_due": "Urgent recording review needed",
        "safeguarding_review_due": "Safeguarding-sensitive recording alert",
        "safeguarding_escalation_required": "Safeguarding-sensitive recording alert",
        "changes_requested_pending": "Changes requested on recording draft",
        "privacy_flags_unresolved": "Privacy flags need review",
        "missing_episode_follow_up_due": "Missing/RHI follow-up may be due",
        "rhi_follow_up_due": "Missing/RHI follow-up may be due",
        "medication_error_review_due": "Medication review alert",
        "structured_fields_missing": "Structured recording fields missing",
        "manager_review_required": "Manager review required",
        "draft_stale": "Stale recording draft needs attention",
    }
    return templates.get(alert.alert_type, alert.title or "Recording alert")


def _map_alert_status(status: str) -> str:
    mapping = {
        "open": "unread",
        "acknowledged": "acknowledged",
        "assigned": "assigned",
        "resolved": "resolved",
        "archived": "archived",
    }
    return mapping.get(status, status)


class OsNotificationAdapterService:
    def get_health(self, conn: Any | None = None) -> OsNotificationFeedHealth:
        alert_health = recording_alert_service.get_health(conn=conn)
        brief_health = manager_daily_brief_service.get_health(conn=conn)
        state_health = os_notification_state_service.get_health(conn=conn)
        from services.isn_digest_service import isn_digest_service

        isn_health = isn_digest_service.get_health(conn=conn)
        return OsNotificationFeedHealth(
            status="ok",
            persistence_available=state_health.persistence_available or alert_health.persistence_available,
            recording_alerts_available=True,
            manager_daily_brief_available=brief_health.status == "ok",
            isn_available=isn_health.status == "ok",
            storage_mode=state_health.storage_mode,
        )

    def _alert_to_item(self, alert: RecordingAlertRecord) -> OsNotificationItem:
        os_type = ALERT_TYPE_TO_OS_TYPE.get(alert.alert_type, "recording_alert_review_due")
        category = TYPE_CATEGORY.get(os_type, "recording")
        unread = alert.status in ("open", "assigned")
        return OsNotificationItem(
            id=f"recording_alert:{alert.id}",
            notification_key=f"recording_alert:{alert.id}",
            type=os_type,
            title=_title_for_alert(alert),
            safe_summary=alert.safe_summary or alert.description or "Recording metadata alert.",
            severity=alert.severity,
            status=_map_alert_status(alert.status),
            unread=unread,
            route=_safe_route_for_alert(alert),
            action_label=_action_label_for_alert(alert),
            source="recording_alert",
            category=category,
            related_id=alert.id,
            related_type="recording_alert",
            child_id=alert.child_id,
            child_name=alert.child_name,
            home_id=alert.home_id,
            owner_user_id=alert.owner_user_id,
            owner_name=alert.owner_name,
            created_at=alert.created_at,
            metadata={
                "alert_type": alert.alert_type,
                "no_raw_body": True,
                "metadata_only": True,
                "recording_type": alert.recording_type,
            },
        )

    def _daily_brief_item(self, current_user: dict[str, Any], conn: Any | None) -> OsNotificationItem | None:
        if not _is_manager_view(current_user):
            return None
        if manager_daily_brief_service.is_reviewed_today(current_user, conn=conn):
            return None
        return OsNotificationItem(
            id="manager_daily_brief:today",
            notification_key="manager_daily_brief:today",
            type="manager_daily_brief_reminder",
            title="Manager daily brief ready",
            safe_summary=(
                "Review today's recording alerts, review queue and handover points "
                "before your shift ends."
            ),
            severity="medium",
            status="unread",
            unread=True,
            route="/command-centre/briefing",
            action_label="Open daily brief",
            source="manager_daily_brief",
            category="daily_brief",
            related_id="today",
            related_type="daily_brief",
            created_at=_now_iso(),
            metadata={"no_raw_body": True, "metadata_only": True},
        )

    def _review_queue_items(
        self, current_user: dict[str, Any], conn: Any | None, *, limit: int
    ) -> list[OsNotificationItem]:
        items: list[OsNotificationItem] = []
        try:
            summary = recording_review_service.get_review_summary(current_user, conn=conn)
            pending = int(summary.awaiting_review or summary.total_in_queue or 0)
            urgent = int(summary.urgent or 0)
            if pending <= 0:
                return items
            severity = "urgent" if urgent else "medium"
            items.append(
                OsNotificationItem(
                    id="recording_review:queue",
                    notification_key="recording_review:queue",
                    type="recording_review_due",
                    title="Recording review queue needs attention",
                    safe_summary=f"{pending} draft(s) may need manager review in the recording queue.",
                    severity=severity,
                    status="unread",
                    unread=True,
                    route="/record/reviews",
                    action_label="Open review queue",
                    source="recording_review",
                    category="review",
                    related_type="review_queue",
                    created_at=_now_iso(),
                    metadata={"pending_review": pending, "no_raw_body": True, "metadata_only": True},
                )
            )
        except Exception as exc:
            logger.debug("review_queue_notification_skipped: %s", exc)
        return items[:limit]

    def _intelligence_action_items(
        self, current_user: dict[str, Any], conn: Any | None, *, limit: int
    ) -> list[OsNotificationItem]:
        items: list[OsNotificationItem] = []
        try:
            home_id = current_user.get("home_id")
            summary = intelligence_action_service.build_action_summary(home_id=home_id, conn=conn)
            proposed = int(summary.proposed_count or 0)
            urgent = int(summary.urgent_count or 0)
            if proposed <= 0 and urgent <= 0:
                return items
            items.append(
                OsNotificationItem(
                    id="intelligence_action:due",
                    notification_key="intelligence_action:due",
                    type="intelligence_action_due",
                    title="Intelligence actions need review",
                    safe_summary=(
                        f"{proposed} proposed action(s) and {urgent} urgent item(s) may need manager follow-up."
                    ),
                    severity="urgent" if urgent else "medium",
                    status="unread",
                    unread=True,
                    route="/intelligence-actions",
                    action_label="Open intelligence actions",
                    source="intelligence_action",
                    category="action",
                    related_type="intelligence_action",
                    created_at=_now_iso(),
                    metadata={
                        "proposed_count": proposed,
                        "urgent_count": urgent,
                        "no_raw_body": True,
                        "metadata_only": True,
                    },
                )
            )
        except Exception as exc:
            logger.debug("intelligence_action_notification_skipped: %s", exc)
        return items[:limit]

    def _workforce_indicator_items(
        self, current_user: dict[str, Any], conn: Any | None, *, limit: int
    ) -> list[OsNotificationItem]:
        """Low-noise workforce indicators — counts only, no HR/supervision bodies."""
        items: list[OsNotificationItem] = []
        if not _is_manager_view(current_user):
            return items
        try:
            from services.workforce_context_service import workforce_context_service

            dashboard = workforce_context_service.build_dashboard(current_user, conn=conn)
            for wf in dashboard.supervision[:1]:
                if "overdue" in wf.id.lower() or wf.priority in ("high", "urgent"):
                    items.append(
                        OsNotificationItem(
                            id="workforce:supervision_overdue",
                            notification_key="workforce:supervision_overdue",
                            type="governance_notice",
                            title="Supervision overdue indicator",
                            safe_summary=wf.safe_summary,
                            severity=wf.priority if wf.priority in ("low", "medium", "high", "urgent") else "medium",
                            status="unread",
                            unread=True,
                            route=wf.route,
                            action_label=wf.action_label or "Open supervision",
                            source="workforce_context",
                            category="governance",
                            related_type="supervision_indicator",
                            created_at=_now_iso(),
                            metadata={"no_raw_body": True, "metadata_only": True},
                        )
                    )
            for wf in dashboard.training[:1]:
                if wf.priority in ("high", "urgent") or "compliance" in wf.title.lower():
                    items.append(
                        OsNotificationItem(
                            id="workforce:training_indicator",
                            notification_key="workforce:training_indicator",
                            type="governance_notice",
                            title="Training compliance indicator",
                            safe_summary=wf.safe_summary,
                            severity=wf.priority if wf.priority in ("low", "medium", "high", "urgent") else "medium",
                            status="unread",
                            unread=True,
                            route=wf.route,
                            action_label=wf.action_label or "Open training matrix",
                            source="workforce_context",
                            category="governance",
                            related_type="training_indicator",
                            created_at=_now_iso(),
                            metadata={"no_raw_body": True, "metadata_only": True},
                        )
                    )
            for gap in dashboard.shift.gaps[:1]:
                items.append(
                    OsNotificationItem(
                        id="workforce:staffing_gap",
                        notification_key="workforce:staffing_gap",
                        type="governance_notice",
                        title="Shift staffing gap",
                        safe_summary=gap,
                        severity="medium",
                        status="unread",
                        unread=True,
                        route=dashboard.routes.rota,
                        action_label="Check rota",
                        source="workforce_context",
                        category="governance",
                        related_type="staffing_gap",
                        created_at=_now_iso(),
                        metadata={"no_raw_body": True, "metadata_only": True},
                    )
                )
            for wf in dashboard.actions[:1]:
                if wf.priority in ("high", "urgent"):
                    items.append(
                        OsNotificationItem(
                            id="workforce:staff_action",
                            notification_key="workforce:staff_action",
                            type="intelligence_action_due",
                            title="Staff action follow-up",
                            safe_summary=wf.safe_summary,
                            severity=wf.priority,
                            status="unread",
                            unread=True,
                            route=wf.route,
                            action_label=wf.action_label or "Open actions",
                            source="workforce_context",
                            category="action",
                            related_type="staff_action",
                            created_at=_now_iso(),
                            metadata={"no_raw_body": True, "metadata_only": True},
                        )
                    )
        except Exception as exc:
            logger.debug("workforce_notification_skipped: %s", exc)
        return items[:limit]

    def _reg45_review_items(
        self, current_user: dict[str, Any], conn: Any | None, *, limit: int
    ) -> list[OsNotificationItem]:
        """Low-noise Reg 45 review status — no raw review bodies."""
        items: list[OsNotificationItem] = []
        if not _is_manager_view(current_user):
            return items
        try:
            from services.reg45_quality_review_service import reg45_quality_review_service

            reviews = reg45_quality_review_service.list_reviews(current_user, limit=10, conn=conn)
            ready = [r for r in reviews if r.get("status") == "ready_for_manager_review"]
            ri_required = [r for r in reviews if r.get("status") == "ri_review_required"]
            pending_actions = sum(int(r.get("improvement_action_count") or 0) for r in reviews[:3])
            if ready and not ri_required:
                items.append(
                    OsNotificationItem(
                        id="reg45:manager_review",
                        notification_key="reg45:manager_review",
                        type="reg45_review_manager_due",
                        title="Reg 45 review ready for manager review",
                        safe_summary=(
                            f"{len(ready)} draft quality of care review(s) may be ready for manager review. "
                            "Not a compliance decision."
                        ),
                        severity="medium",
                        status="unread",
                        unread=True,
                        route="/intelligence/reg45",
                        action_label="Open Reg 45 review",
                        source="reg45_quality_review",
                        category="governance",
                        related_type="reg45_review",
                        created_at=_now_iso(),
                        metadata={"count": len(ready), "no_raw_body": True},
                    )
                )
            elif ri_required:
                items.append(
                    OsNotificationItem(
                        id="reg45:ri_review",
                        notification_key="reg45:ri_review",
                        type="reg45_review_ri_required",
                        title="Reg 45 review requires RI review",
                        safe_summary=(
                            f"{len(ri_required)} draft review(s) flagged for Responsible Individual review."
                        ),
                        severity="high",
                        status="unread",
                        unread=True,
                        route="/intelligence/reg45",
                        action_label="Open RI review",
                        source="reg45_quality_review",
                        category="governance",
                        related_type="reg45_review",
                        created_at=_now_iso(),
                        metadata={"count": len(ri_required), "no_raw_body": True},
                    )
                )
            elif pending_actions > 0 and not ready and not ri_required:
                items.append(
                    OsNotificationItem(
                        id="reg45:improvement_actions",
                        notification_key="reg45:improvement_actions",
                        type="reg45_improvement_actions_pending",
                        title="Reg 45 improvement actions pending",
                        safe_summary=(
                            f"{pending_actions} improvement action draft(s) may need manager follow-up."
                        ),
                        severity="medium",
                        status="unread",
                        unread=True,
                        route="/actions",
                        action_label="Open actions",
                        source="reg45_quality_review",
                        category="action",
                        related_type="reg45_improvement",
                        created_at=_now_iso(),
                        metadata={"count": pending_actions, "no_raw_body": True},
                    )
                )
        except Exception as exc:
            logger.debug("reg45_notification_skipped: %s", exc)
        return items[:limit]

    def _handover_draft_items(
        self, current_user: dict[str, Any], conn: Any | None, *, limit: int
    ) -> list[OsNotificationItem]:
        """Low-noise handover reminders — ready-for-review drafts only."""
        items: list[OsNotificationItem] = []
        try:
            from services.handover_draft_service import handover_draft_service

            listed = handover_draft_service.list_drafts(
                current_user, review_status="awaiting_review", limit=limit, conn=conn
            )
            if not listed.items:
                listed = handover_draft_service.list_drafts(
                    current_user, status="ready_for_review", limit=limit, conn=conn
                )
            for draft in listed.items[:limit]:
                items.append(
                    OsNotificationItem(
                        id=f"handover_draft:{draft.id}",
                        notification_key=f"handover_draft:{draft.id}",
                        type="recording_review_due",
                        title="Handover awaiting manager review",
                        safe_summary=f"{draft.title} is in the handover review queue.",
                        severity="medium",
                        status="unread",
                        unread=True,
                        route=f"/handover/reviews?draft_id={draft.id}",
                        action_label="Review handover",
                        source="handover",
                        category="handover",
                        related_id=draft.id,
                        related_type="handover_draft",
                        child_id=draft.child_id,
                        child_name=draft.child_name,
                        home_id=draft.home_id,
                        created_at=draft.updated_at,
                        metadata={"no_raw_body": True, "metadata_only": True, "workspace_only": True},
                    )
                )
        except Exception as exc:
            logger.debug("handover_draft_notification_skipped: %s", exc)
        return items[:limit]

    def _governance_items(
        self, current_user: dict[str, Any], conn: Any | None, *, limit: int
    ) -> list[OsNotificationItem]:
        items: list[OsNotificationItem] = []
        try:
            dashboard = recording_governance_service.build_dashboard(current_user, conn=conn)
            flags = int(getattr(dashboard.quality, "privacy_flags", 0) or 0)
            if flags <= 0:
                return items
            items.append(
                OsNotificationItem(
                    id="governance:privacy_flags",
                    notification_key="governance:privacy_flags",
                    type="governance_notice",
                    title="Recording governance flags open",
                    safe_summary=f"{flags} privacy or governance flag(s) may need manager review.",
                    severity="medium",
                    status="unread",
                    unread=True,
                    route="/record/governance",
                    action_label="Open governance",
                    source="governance",
                    category="governance",
                    related_type="governance",
                    created_at=_now_iso(),
                    metadata={"privacy_flags_open": flags, "no_raw_body": True, "metadata_only": True},
                )
            )
        except Exception as exc:
            logger.debug("governance_notification_skipped: %s", exc)
        return items[:limit]

    def _count_by_category(self, items: list[OsNotificationItem], category: str) -> int:
        return sum(1 for i in items if i.unread and _text(i.category) == category)

    def _feed_cache_key(
        self,
        current_user: dict[str, Any],
        *,
        limit: int,
        unread_only: bool,
    ) -> str:
        user_id = current_user.get("id") or current_user.get("user_id") or "anon"
        role = _user_role(current_user)
        return f"notification:feed:user:{user_id}:role:{role}:unread:{int(unread_only)}:limit:{limit}"

    def build_feed_cached(
        self,
        current_user: dict[str, Any],
        *,
        limit: int = 30,
        unread_only: bool = False,
        conn: Any | None = None,
        skip_preference_filter: bool = False,
    ) -> tuple[OsNotificationFeedResponse, OsCacheLookup]:
        key = self._feed_cache_key(current_user, limit=limit, unread_only=unread_only)
        lookup = os_cache_service.get(key)
        if lookup.hit and isinstance(lookup.value, OsNotificationFeedResponse):
            return lookup.value, lookup

        if is_pool_under_pressure() and lookup.stale and isinstance(lookup.value, OsNotificationFeedResponse):
            feed = lookup.value.model_copy(
                update={
                    "limitations": list(lookup.value.limitations or [])
                    + ["Operational feed served from cache while database pool is busy."],
                    "metadata": {**(lookup.value.metadata or {}), "degraded": True, "cache_status": "stale"},
                }
            )
            return feed, lookup

        def _build() -> OsNotificationFeedResponse:
            return self.build_feed(
                current_user,
                limit=limit,
                unread_only=unread_only,
                conn=conn,
                skip_preference_filter=skip_preference_filter,
            )

        feed, cache_lookup = os_cache_service.get_or_build(
            key,
            _build,
            ttl_seconds=NOTIFICATION_FEED_CACHE_TTL_SECONDS,
            stale_ttl_seconds=NOTIFICATION_FEED_STALE_SECONDS,
        )
        return feed, cache_lookup

    def build_feed(
        self,
        current_user: dict[str, Any],
        *,
        limit: int = 30,
        unread_only: bool = False,
        conn: Any | None = None,
        skip_preference_filter: bool = False,
    ) -> OsNotificationFeedResponse:
        limitations: list[str] = []
        items: list[OsNotificationItem] = []
        budget = TimeBudgetReport()
        include_optional_sources = limit > 15 and not is_pool_under_pressure()

        if _is_manager_view(current_user):
            try:
                filters = RecordingAlertListFilters(limit=min(limit, 25))
                alerts = recording_alert_service.list_alerts(current_user, filters, conn=conn)
                open_alerts = [a for a in alerts.items if a.status in ("open", "assigned", "acknowledged")]
                open_alerts.sort(
                    key=lambda a: (
                        {"urgent": 0, "high": 1, "medium": 2, "low": 3}.get(a.severity, 2),
                        a.created_at,
                    )
                )
                for alert in open_alerts[:limit]:
                    item = self._alert_to_item(alert)
                    if unread_only and not item.unread:
                        continue
                    items.append(item)
            except DatabaseUnavailableError as exc:
                logger.warning("recording_alerts_feed_unavailable: %s", exc)
                limitations.append("Recording alerts could not be loaded for the notification feed.")
            except Exception as exc:
                logger.warning("recording_alerts_feed_unavailable: %s", exc)
                limitations.append("Recording alerts could not be loaded for the notification feed.")

            brief_result = os_time_budget_service.run_section(
                "daily_brief",
                400,
                lambda: self._daily_brief_item(current_user, conn),
                fallback=None,
                report=budget,
            )
            brief_item = brief_result.value
            if brief_item and (not unread_only or brief_item.unread):
                items.insert(0, brief_item)

            try:
                isn_items = isn_notification_adapter_service.build_os_items(
                    current_user, limit=min(limit, 12), conn=conn
                )
                for isn_item in isn_items:
                    isn_item = isn_item.model_copy(
                        update={
                            "notification_key": isn_item.notification_key or isn_item.id,
                            "source": "isn",
                            "category": "safeguarding_network",
                        }
                    )
                    if unread_only and not isn_item.unread:
                        continue
                    items.append(isn_item)
            except Exception as exc:
                logger.warning("isn_feed_unavailable: %s", exc)
                limitations.append("Safeguarding network notifications could not be loaded.")

            if include_optional_sources:
                optional_sections = [
                    ("review_queue", 350, lambda: self._review_queue_items(current_user, conn, limit=2)),
                    ("intelligence_actions", 350, lambda: self._intelligence_action_items(current_user, conn, limit=2)),
                    ("governance", 400, lambda: self._governance_items(current_user, conn, limit=1)),
                    ("workforce", 400, lambda: self._workforce_indicator_items(current_user, conn, limit=1)),
                    ("handover", 400, lambda: self._handover_draft_items(current_user, conn, limit=1)),
                    ("reg45", 400, lambda: self._reg45_review_items(current_user, conn, limit=1)),
                ]
                for name, timeout_ms, fn in optional_sections:
                    section = os_time_budget_service.run_section(
                        name,
                        timeout_ms,
                        fn,
                        fallback=[],
                        report=budget,
                    )
                    for item in section.value or []:
                        if unread_only and not item.unread:
                            continue
                        items.append(item)
            else:
                limitations.append("Optional notification sources skipped to protect database pool.")
        else:
            limitations.append("Recording alert notifications require manager or senior oversight role.")

        items = os_notification_state_service.apply_state(items, current_user, conn=conn)

        hidden_by_preferences = 0
        if not skip_preference_filter:
            items, hidden_by_preferences = os_notification_preference_service.apply_preferences(
                items, current_user, conn=conn
            )

        if unread_only:
            items = [i for i in items if i.unread]

        urgent_count = sum(1 for i in items if i.severity in ("urgent", "high") and i.unread)
        recording_count = self._count_by_category(items, "recording") + sum(
            1 for i in items if i.unread and _text(i.source) in ("recording_alert", "recording_alerts")
        )
        isn_count = self._count_by_category(items, "safeguarding_network")
        daily_brief_count = self._count_by_category(items, "daily_brief")
        review_count = self._count_by_category(items, "review")
        action_count = self._count_by_category(items, "action")
        governance_count = self._count_by_category(items, "governance")
        unread_count = sum(1 for i in items if i.unread)
        daily_brief_unread = daily_brief_count > 0

        categories: dict[str, int] = {}
        for item in items:
            if not item.unread:
                continue
            cat_key = _text(item.category, "other")
            label = CATEGORY_LABELS.get(cat_key, cat_key.replace("_", " ").title())
            categories[label] = categories.get(label, 0) + 1

        items.sort(
            key=lambda i: (
                {"urgent": 0, "high": 1, "medium": 2, "low": 3}.get(i.severity, 2),
                0 if i.type == "manager_daily_brief_reminder" else 1,
                i.created_at,
            )
        )

        generated_at = _now_iso()
        if budget.warnings:
            limitations.extend(budget.warnings[:5])
        return OsNotificationFeedResponse(
            items=items[:limit],
            unread_count=unread_count,
            urgent_count=urgent_count,
            recording_count=recording_count,
            isn_count=isn_count,
            daily_brief_count=daily_brief_count,
            review_count=review_count,
            action_count=action_count,
            governance_count=governance_count,
            generated_at=generated_at,
            categories=categories,
            limitations=limitations,
            available=True,
            metadata={
                "metadata_only": True,
                "no_raw_body": True,
                "hidden_by_preferences": hidden_by_preferences,
                "urgent_safeguarding_always_on": True,
                "degraded": bool(budget.timeout_count or is_pool_under_pressure()),
                "cache_status": "miss",
            },
            unread=unread_count,
            urgent=urgent_count,
            recording_alert_count=recording_count,
            daily_brief_unread=daily_brief_unread,
        )

    def build_summary(
        self,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OsNotificationSummary:
        feed = self.build_feed(current_user, limit=100, conn=conn)
        return OsNotificationSummary(
            unread_count=feed.unread_count,
            urgent_count=feed.urgent_count,
            recording_count=feed.recording_count,
            isn_count=feed.isn_count,
            daily_brief_count=feed.daily_brief_count,
            review_count=feed.review_count,
            action_count=feed.action_count,
            governance_count=feed.governance_count,
            generated_at=feed.generated_at,
            available=feed.available,
            metadata=feed.metadata,
        )


os_notification_adapter_service = OsNotificationAdapterService()
