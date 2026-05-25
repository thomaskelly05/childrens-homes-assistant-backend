"""Adapter layer: recording alerts and daily brief into the existing OS notification bell pattern."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.os_notifications import (
    OsNotificationFeed,
    OsNotificationFeedHealth,
    OsNotificationItem,
)
from schemas.recording_alerts import RecordingAlertListFilters, RecordingAlertRecord
from services.isn_notification_adapter_service import isn_notification_adapter_service
from services.manager_daily_brief_service import manager_daily_brief_service
from services.recording_alert_service import recording_alert_service
from services.isn_digest_service import isn_digest_service

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

CATEGORY_FOR_TYPE: dict[str, str] = {
    "recording_alert_urgent": "Recording",
    "recording_alert_safeguarding": "Safeguarding",
    "recording_alert_review_due": "Review",
    "recording_alert_privacy": "Governance",
    "recording_alert_changes_requested": "Recording",
    "recording_alert_missing_follow_up": "Recording",
    "recording_alert_medication_review": "Recording",
    "recording_alert_structured_missing": "Governance",
    "manager_daily_brief_reminder": "Briefing",
    "isn_safeguarding_alert": "Safeguarding network",
    "isn_review_required": "Safeguarding network",
    "isn_escalation_required": "Safeguarding network",
    "isn_network_update": "Safeguarding network",
    "isn_follow_up_due": "Safeguarding network",
    "isn_professional_update": "Safeguarding network",
    "isn_recording_linked_alert": "Safeguarding network",
    "isn_manager_action_required": "Safeguarding network",
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
    """Bell routes avoid draft/alert/child IDs in query strings."""
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


class OsNotificationAdapterService:
    def get_health(self, conn: Any | None = None) -> OsNotificationFeedHealth:
        alert_health = recording_alert_service.get_health(conn=conn)
        brief_health = manager_daily_brief_service.get_health(conn=conn)
        isn_health = isn_digest_service.get_health(conn=conn)
        return OsNotificationFeedHealth(
            status="ok",
            persistence_available=alert_health.persistence_available,
            recording_alerts_available=True,
            manager_daily_brief_available=brief_health.status == "ok",
            isn_available=isn_health.status == "ok",
        )

    def _alert_to_item(self, alert: RecordingAlertRecord) -> OsNotificationItem:
        os_type = ALERT_TYPE_TO_OS_TYPE.get(alert.alert_type, "recording_alert_review_due")
        unread = alert.status in ("open", "assigned")
        return OsNotificationItem(
            id=f"recording_alert:{alert.id}",
            type=os_type,
            title=_title_for_alert(alert),
            safe_summary=alert.safe_summary or alert.description or "Recording metadata alert.",
            severity=alert.severity,
            status=alert.status,
            unread=unread,
            route=_safe_route_for_alert(alert),
            action_label=_action_label_for_alert(alert),
            source="recording_alerts",
            created_at=alert.created_at,
            category=CATEGORY_FOR_TYPE.get(os_type, "Recording"),
            metadata={
                "alert_type": alert.alert_type,
                "no_raw_body": True,
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
            type="manager_daily_brief_reminder",
            title="Manager daily brief ready",
            safe_summary=(
                "Review today's recording alerts, review queue and handover points "
                "before your shift ends."
            ),
            severity="medium",
            status="open",
            unread=True,
            route="/command-centre/briefing",
            action_label="Open daily brief",
            source="manager_daily_brief",
            created_at=_now_iso(),
            category="Briefing",
            metadata={"no_raw_body": True},
        )

    def build_feed(
        self,
        current_user: dict[str, Any],
        *,
        limit: int = 30,
        unread_only: bool = False,
        conn: Any | None = None,
    ) -> OsNotificationFeed:
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
                    if unread_only and not isn_item.unread:
                        continue
                    items.append(isn_item)
            except Exception as exc:
                logger.warning("isn_feed_unavailable: %s", exc)
                limitations.append("Safeguarding network notifications could not be loaded.")
        else:
            limitations.append("Recording alert notifications require manager or senior oversight role.")

        urgent = sum(1 for i in items if i.severity in ("urgent", "high") and i.unread)
        recording_count = sum(1 for i in items if str(i.source) == "recording_alerts" and i.unread)
        isn_count = sum(1 for i in items if str(i.source) == "isn" and i.unread)
        daily_brief_unread = any(i.type == "manager_daily_brief_reminder" and i.unread for i in items)
        unread = sum(1 for i in items if i.unread)

        categories: dict[str, int] = {}
        for item in items:
            if not item.unread:
                continue
            cat = item.category or "Other"
            categories[cat] = categories.get(cat, 0) + 1

        items.sort(
            key=lambda i: (
                {"urgent": 0, "high": 1, "medium": 2, "low": 3}.get(i.severity, 2),
                0 if i.type == "manager_daily_brief_reminder" else 1,
                i.created_at,
            )
        )

        return OsNotificationFeed(
            items=items[:limit],
            unread=unread,
            urgent=urgent,
            recording_alert_count=recording_count,
            isn_count=isn_count,
            daily_brief_unread=daily_brief_unread,
            categories=categories,
            limitations=limitations,
            available=True,
        )


os_notification_adapter_service = OsNotificationAdapterService()
