"""Notification response analytics and governance summary — metadata only."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from repositories.os_repository_utils import MANAGER_ROLES, table_exists
from schemas.os_notification_analytics import (
    NotificationAnalyticsFilters,
    NotificationAutomationHealth,
    NotificationGovernanceSummary,
    NotificationResponseMetric,
)
from schemas.os_notification_preferences import NotificationEscalationCheckRequest
from schemas.os_notifications import OsNotificationItem
from services.os_notification_adapter_service import os_notification_adapter_service
from services.os_notification_escalation_service import os_notification_escalation_service
from services.os_notification_preference_service import (
    PUSH_EMAIL_NOT_CONFIGURED,
    os_notification_preference_service,
)

logger = logging.getLogger("indicare.os_notification_analytics")


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _parse_dt(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _minutes_between(start: str | None, end: str | None) -> float | None:
    s = _parse_dt(start)
    e = _parse_dt(end)
    if not s or not e:
        return None
    if s.tzinfo is None:
        s = s.replace(tzinfo=timezone.utc)
    if e.tzinfo is None:
        e = e.replace(tzinfo=timezone.utc)
    return max(0.0, (e - s).total_seconds() / 60.0)


class OsNotificationAnalyticsService:
    def safe_scope_for_user(self, current_user: dict[str, Any]) -> bool:
        role = _text(current_user.get("role"), "staff").lower()
        return role in {r.lower() for r in MANAGER_ROLES} or any(
            token in role for token in ("manager", "deputy", "senior", "registered", "admin", "safeguarding")
        )

    def get_health(self, conn: Any | None = None) -> dict[str, Any]:
        esc = os_notification_escalation_service.get_health(conn=conn)
        pref = os_notification_preference_service.get_health(conn=conn)
        feed = os_notification_adapter_service.get_health(conn=conn)
        runs_mode = "memory"
        if conn is not None:
            try:
                if table_exists(conn, "os_notification_escalation_check_runs"):
                    runs_mode = "postgresql"
            except Exception:
                pass
        return {
            "status": "ok",
            "service": "os_notification_analytics_service",
            "feed": feed.model_dump(),
            "preferences": pref.model_dump(),
            "escalations": esc.model_dump(),
            "run_history_mode": runs_mode,
            "metadata_only": True,
        }

    def _filter_items(
        self,
        items: list[OsNotificationItem],
        filters: NotificationAnalyticsFilters | None,
    ) -> list[OsNotificationItem]:
        if not filters:
            return items
        out = items
        if filters.home_id is not None:
            out = [i for i in out if i.home_id is None or i.home_id == filters.home_id]
        if filters.source:
            out = [i for i in out if _text(i.source) == filters.source]
        if filters.category:
            out = [i for i in out if _text(i.category) == filters.category]
        if filters.severity:
            out = [i for i in out if _text(i.severity).lower() == _text(filters.severity).lower()]
        return out

    def build_response_metrics(
        self,
        current_user: dict[str, Any],
        filters: NotificationAnalyticsFilters | None = None,
        conn: Any | None = None,
    ) -> NotificationResponseMetric:
        warnings: list[str] = []
        try:
            feed = os_notification_adapter_service.build_feed(
                current_user,
                limit=100,
                unread_only=False,
                conn=conn,
                skip_preference_filter=True,
            )
            items = self._filter_items(list(feed.items), filters)
        except Exception as exc:
            logger.warning("response_metrics_feed_failed: %s", exc)
            warnings.append("Operational feed unavailable; metrics may be incomplete.")
            return NotificationResponseMetric(
                metadata={"degraded": True, "warnings": warnings, "no_raw_body": True},
            )

        unread = ack = resolved = archived = 0
        urgent_unack = safeguarding_unack = 0
        read_mins: list[float] = []
        ack_mins: list[float] = []
        resolve_mins: list[float] = []
        oldest_unack: float | None = None
        now = datetime.now(timezone.utc)

        for item in items:
            status = _text(item.status, "unread").lower()
            if item.unread or status == "unread":
                unread += 1
            if status == "acknowledged":
                ack += 1
            if status == "resolved":
                resolved += 1
            if status == "archived":
                archived += 1

            is_urgent = _text(item.severity).lower() == "urgent"
            is_safeguarding = (
                _text(item.category) == "safeguarding_network"
                or os_notification_preference_service.is_urgent_safeguarding_item(item)
            )
            unacked = status not in ("acknowledged", "resolved", "archived")

            if is_urgent and unacked:
                urgent_unack += 1
            if is_safeguarding and unacked:
                safeguarding_unack += 1

            created = _parse_dt(item.created_at)
            if unacked and created:
                if created.tzinfo is None:
                    created = created.replace(tzinfo=timezone.utc)
                age = (now - created).total_seconds() / 60.0
                if oldest_unack is None or age > oldest_unack:
                    oldest_unack = age

            if item.read_at:
                m = _minutes_between(item.created_at, item.read_at)
                if m is not None:
                    read_mins.append(m)
            if item.acknowledged_at:
                m = _minutes_between(item.created_at, item.acknowledged_at)
                if m is not None:
                    ack_mins.append(m)
            if item.resolved_at:
                m = _minutes_between(item.created_at, item.resolved_at)
                if m is not None:
                    resolve_mins.append(m)

        def _avg(vals: list[float]) -> float | None:
            return round(sum(vals) / len(vals), 1) if vals else None

        return NotificationResponseMetric(
            total_notifications=len(items),
            unread=unread,
            acknowledged=ack,
            resolved=resolved,
            archived=archived,
            urgent_unacknowledged=urgent_unack,
            safeguarding_unacknowledged=safeguarding_unack,
            average_minutes_to_read=_avg(read_mins),
            average_minutes_to_acknowledge=_avg(ack_mins),
            average_minutes_to_resolve=_avg(resolve_mins),
            oldest_unacknowledged_minutes=round(oldest_unack, 1) if oldest_unack is not None else None,
            metadata={
                "no_raw_body": True,
                "metadata_only": True,
                "warnings": warnings,
            },
        )

    def unresolved_escalation_candidates(
        self,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> list:
        try:
            result = os_notification_escalation_service.run_escalation_check(
                current_user,
                request=NotificationEscalationCheckRequest(dry_run=True),
                conn=conn,
            )
            return list(result.candidates)
        except Exception as exc:
            logger.warning("unresolved_candidates_failed: %s", exc)
            return []

    def build_automation_health(
        self,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> NotificationAutomationHealth:
        _ = current_user
        last = os_notification_escalation_service.get_last_check_run(current_user, conn=conn)
        warnings: list[str] = []
        if not last:
            warnings.append("No escalation check has been recorded yet. Run a manual check from notification settings.")
        warnings.append(PUSH_EMAIL_NOT_CONFIGURED)
        warnings.append("Background scheduler is not configured yet. Manual escalation checks are available.")
        return NotificationAutomationHealth(
            status="ok",
            manual_checks_available=True,
            scheduler_configured=False,
            push_configured=False,
            email_configured=False,
            last_check_at=last.started_at if last else None,
            warnings=warnings,
            metadata={"no_raw_body": True, "metadata_only": True},
        )

    def build_recommendations(
        self,
        metrics: NotificationResponseMetric,
        automation: NotificationAutomationHealth,
        candidates_count: int,
    ) -> list[str]:
        recs: list[str] = []
        if metrics.urgent_unacknowledged:
            recs.append(
                f"{metrics.urgent_unacknowledged} urgent notification(s) not yet acknowledged — review in the notification centre."
            )
        if metrics.safeguarding_unacknowledged:
            recs.append(
                f"{metrics.safeguarding_unacknowledged} safeguarding-related notification(s) await acknowledgement."
            )
        if candidates_count:
            recs.append(
                f"{candidates_count} escalation candidate(s) from the last check may need manager oversight."
            )
        if not automation.last_check_at:
            recs.append("Run an escalation check from notification settings to establish a baseline.")
        elif automation.last_check_at:
            started = _parse_dt(automation.last_check_at)
            if started:
                if started.tzinfo is None:
                    started = started.replace(tzinfo=timezone.utc)
                hours = (datetime.now(timezone.utc) - started).total_seconds() / 3600
                if hours > 24:
                    recs.append("Escalation check is over 24 hours old — consider running a fresh manual check.")
        recs.append("Escalations support oversight; they do not make safeguarding decisions.")
        return recs[:10]

    def build_governance_summary(
        self,
        current_user: dict[str, Any],
        filters: NotificationAnalyticsFilters | None = None,
        conn: Any | None = None,
    ) -> NotificationGovernanceSummary:
        limitations: list[str] = []
        if not self.safe_scope_for_user(current_user):
            limitations.append("Governance summary is limited for non-manager roles.")

        feed_health = "ok"
        try:
            os_notification_adapter_service.get_health(conn=conn)
        except Exception:
            feed_health = "degraded"
            limitations.append("Operational feed health check failed.")

        pref_health = "ok"
        try:
            os_notification_preference_service.get_health(conn=conn)
        except Exception:
            pref_health = "degraded"

        esc_health = "ok"
        try:
            os_notification_escalation_service.get_health(conn=conn)
        except Exception:
            esc_health = "degraded"

        metrics = self.build_response_metrics(current_user, filters=filters, conn=conn)
        automation = self.build_automation_health(current_user, conn=conn)
        last_run = os_notification_escalation_service.get_last_check_run(current_user, conn=conn)
        candidates = self.unresolved_escalation_candidates(current_user, conn=conn)

        limitations.append(PUSH_EMAIL_NOT_CONFIGURED)
        limitations.append("Background scheduler not configured — manual checks only.")

        return NotificationGovernanceSummary(
            generated_at=_now_iso(),
            feed_health=feed_health,
            preference_health=pref_health,
            escalation_health=esc_health,
            urgent_override_active=True,
            push_configured=False,
            email_configured=False,
            last_escalation_check=last_run,
            response_metrics=metrics,
            unresolved_escalation_candidates=candidates[:20],
            recommendations=self.build_recommendations(metrics, automation, len(candidates)),
            limitations=limitations,
            metadata={
                "no_raw_body": True,
                "metadata_only": True,
                "user_id": _user_id(current_user),
            },
        )


os_notification_analytics_service = OsNotificationAnalyticsService()
