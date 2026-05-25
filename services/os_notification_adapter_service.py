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
from services.os_notification_state_service import os_notification_state_service
from services.recording_alert_service import recording_alert_service
from services.recording_governance_service import recording_governance_service
from services.recording_review_service import recording_review_service

logger = logging.getLogger("indicare.os_notifications")

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

    def build_feed(
        self,
        current_user: dict[str, Any],
        *,
        limit: int = 30,
        unread_only: bool = False,
        conn: Any | None = None,
    ) -> OsNotificationFeedResponse:
        limitations: list[str] = []
        items: list[OsNotificationItem] = []

        if _is_manager_view(current_user):
            try:
                filters = RecordingAlertListFilters(limit=min(limit, 50))
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
            except Exception as exc:
                logger.warning("recording_alerts_feed_unavailable: %s", exc)
                limitations.append("Recording alerts could not be loaded for the notification feed.")

            brief_item = self._daily_brief_item(current_user, conn)
            if brief_item and (not unread_only or brief_item.unread):
                items.insert(0, brief_item)

            try:
                isn_items = isn_notification_adapter_service.build_os_items(
                    current_user, limit=min(limit, 20), conn=conn
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

            for extra in (
                self._review_queue_items(current_user, conn, limit=3),
                self._intelligence_action_items(current_user, conn, limit=2),
                self._governance_items(current_user, conn, limit=2),
            ):
                for item in extra:
                    if unread_only and not item.unread:
                        continue
                    items.append(item)
        else:
            limitations.append("Recording alert notifications require manager or senior oversight role.")

        items = os_notification_state_service.apply_state(items, current_user, conn=conn)

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
            metadata={"metadata_only": True, "no_raw_body": True},
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
