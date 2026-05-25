"""ISN digest and badge summaries — metadata-only for Care Hub, bell and manager brief."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from repositories.os_repository_utils import MANAGER_ROLES, table_exists
from schemas.isn_contracts import ISNAlertRecord
from schemas.isn_notifications import (
    IsnBadgeSummary,
    IsnDigest,
    IsnDigestTopItem,
    IsnNotificationHealth,
    IsnNotificationItem,
    IsnNotificationRoutes,
)
from schemas.recording_alerts import RecordingAlertListFilters
from services.isn_service import isn_service
from services.recording_alert_service import recording_alert_service

logger = logging.getLogger("indicare.isn_digest")

PRIVACY_NOTICE = (
    "ISN summaries use metadata only. They support safeguarding oversight; "
    "they do not replace professional judgement or make referral decisions."
)

LIMITATION_NOTICE = (
    "ISN does not make MASH, LADO, police or social worker referral decisions. "
    "Human review is always required."
)

REVIEW_ALERT_TYPES = frozenset(
    {
        "recurring_alias_pattern",
        "young_person_pattern",
        "alias_pattern",
        "route_pattern",
        "postcode_hotspot",
    }
)

ESCALATION_ALERT_TYPES = frozenset(
    {
        "vehicle_pattern",
        "county_lines_indicator",
        "exploitation_concern",
    }
)

NETWORK_UPDATE_TYPES = frozenset(
    {
        "transport_route",
        "postcode_hotspot",
        "professional_intelligence",
    }
)

OPEN_STATUSES = frozenset({"new", "reviewing", "open", "assigned"})


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


def _risk_to_severity(risk_level: str) -> str:
    mapping = {
        "critical": "urgent",
        "high": "high",
        "medium": "medium",
        "low": "low",
    }
    return mapping.get(_text(risk_level, "medium").lower(), "medium")


def _safe_summary_for_alert(alert: ISNAlertRecord) -> str:
    """Never expose raw alert summary or pattern narrative in operational surfaces."""
    atype = _text(alert.alert_type, "pattern")
    if atype in REVIEW_ALERT_TYPES:
        return "Safeguarding network pattern may need manager review."
    if atype in ESCALATION_ALERT_TYPES:
        return "Safeguarding network escalation may need senior oversight."
    if "professional" in atype:
        return "Professional network update requires attention."
    if "recording" in atype:
        return "Safeguarding-sensitive recording may need network review."
    return "Safeguarding network item requires human review."


def _notification_type_for_alert(alert: ISNAlertRecord) -> str:
    atype = _text(alert.alert_type, "pattern")
    if atype in ESCALATION_ALERT_TYPES:
        return "isn_escalation_required"
    if atype in REVIEW_ALERT_TYPES:
        return "isn_review_required"
    if atype in NETWORK_UPDATE_TYPES:
        return "isn_network_update"
    if "follow" in atype:
        return "isn_follow_up_due"
    if "professional" in atype:
        return "isn_professional_update"
    if "recording" in atype:
        return "isn_recording_linked_alert"
    if alert.status in ("new", "reviewing"):
        return "isn_manager_action_required"
    return "isn_safeguarding_alert"


def _title_for_alert(alert: ISNAlertRecord) -> str:
    templates = {
        "isn_review_required": "Safeguarding network review needed",
        "isn_escalation_required": "ISN escalation requires manager review",
        "isn_network_update": "Professional network update requires attention",
        "isn_follow_up_due": "Outstanding safeguarding follow-up",
        "isn_professional_update": "Professional network update",
        "isn_recording_linked_alert": "Safeguarding-sensitive update",
        "isn_manager_action_required": "ISN follow-up requires manager review",
        "isn_safeguarding_alert": "Safeguarding network alert",
    }
    ntype = _notification_type_for_alert(alert)
    return templates.get(ntype, "Safeguarding network review needed")


def _route_for_alert() -> str:
    return "/safeguarding"


class ISNDigestService:
    def __init__(self) -> None:
        self._memory_alerts: dict[str, dict[str, Any]] = {}

    def _detect_storage_mode(self, conn: Any | None = None) -> str:
        if conn is None:
            return "memory"
        try:
            if table_exists(conn, "isn_safeguarding_alerts"):
                return "postgresql"
        except Exception:
            pass
        return "memory"

    def seed_memory_alert(
        self,
        *,
        alert_type: str = "recurring_alias_pattern",
        risk_level: str = "high",
        status: str = "new",
        title: str | None = None,
    ) -> ISNAlertRecord:
        """Test helper — stores alert with safe operational fields only in memory."""
        alert_id = str(uuid4())
        raw_narrative = "RAW ISN NARRATIVE MUST NOT LEAK"
        data = {
            "id": alert_id,
            "alert_type": alert_type,
            "title": title or "Test ISN pattern",
            "summary": raw_narrative,
            "risk_level": risk_level,
            "status": status,
            "linked_signal_ids": [],
            "hotspot_key": None,
            "pattern": {"raw": raw_narrative},
            "recommended_action": "Review professionally",
            "created_at": _now_iso(),
            "updated_at": _now_iso(),
        }
        self._memory_alerts[alert_id] = data
        return ISNAlertRecord(**data)

    def _list_alerts(self, current_user: dict[str, Any], conn: Any | None, *, limit: int = 100) -> list[ISNAlertRecord]:
        mode = self._detect_storage_mode(conn)
        if mode == "postgresql" and conn is not None:
            try:
                response = isn_service.alerts(conn, limit=limit)
                return list(response.alerts or [])
            except Exception as exc:
                logger.warning("isn_alerts_db_unavailable: %s", exc)
        return [
            ISNAlertRecord(**row)
            for row in self._memory_alerts.values()
            if _text(row.get("status"), "new") in OPEN_STATUSES
        ]

    def _open_alerts(self, current_user: dict[str, Any], conn: Any | None, *, limit: int = 100) -> list[ISNAlertRecord]:
        alerts = self._list_alerts(current_user, conn, limit=limit)
        return [a for a in alerts if _text(a.status, "new") in OPEN_STATUSES]

    def _linked_recording_count(self, current_user: dict[str, Any], conn: Any | None) -> int:
        if not _is_manager_view(current_user):
            return 0
        try:
            digest = recording_alert_service.build_digest(
                current_user, RecordingAlertListFilters(limit=50), conn=conn
            )
            return int(digest.safeguarding or 0)
        except Exception:
            return 0

    def alert_to_notification_item(self, alert: ISNAlertRecord) -> IsnNotificationItem:
        ntype = _notification_type_for_alert(alert)
        severity = _risk_to_severity(alert.risk_level)
        unread = _text(alert.status, "new") in OPEN_STATUSES
        return IsnNotificationItem(
            id=f"isn:{alert.id}",
            type=ntype,
            title=_title_for_alert(alert),
            safe_summary=_safe_summary_for_alert(alert),
            severity=severity,
            status=_text(alert.status, "new"),
            route=_route_for_alert(),
            action_label="Open safeguarding network",
            created_at=_text(alert.created_at, _now_iso()),
            metadata={
                "alert_type": alert.alert_type,
                "category": "safeguarding_network",
                "metadata_only": True,
                "no_raw_body": True,
                "source": "isn",
                "unread": unread,
            },
        )

    def top_items(self, items: list[IsnNotificationItem], *, limit: int = 5) -> list[IsnDigestTopItem]:
        order = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
        sorted_items = sorted(items, key=lambda i: (order.get(i.severity, 2), i.created_at))
        output: list[IsnDigestTopItem] = []
        for item in sorted_items[:limit]:
            output.append(
                IsnDigestTopItem(
                    id=item.id,
                    title=item.title,
                    safe_summary=item.safe_summary,
                    severity=item.severity,
                    type=str(item.type),
                    route=item.route,
                    action_label=item.action_label,
                    status=item.status,
                )
            )
        return output

    def build_recommendations(self, digest: IsnDigest) -> list[str]:
        recs: list[str] = []
        if digest.urgent:
            recs.append("Review urgent safeguarding network items before other tasks.")
        if digest.review_required:
            recs.append("Check ISN review queue for patterns needing manager oversight.")
        if digest.follow_up_due:
            recs.append("Follow up outstanding safeguarding network actions in handover.")
        if digest.linked_recording_alerts:
            recs.append("Cross-check safeguarding-sensitive recording alerts with ISN context.")
        if digest.escalation_pending:
            recs.append(
                f"{digest.escalation_pending} item(s) may be overdue for manager escalation — run escalation check."
            )
        if digest.escalation_rules_active:
            recs.append("Escalation rules active for urgent safeguarding network items.")
        else:
            recs.append("Escalation check available from notification settings.")
        recs.append(LIMITATION_NOTICE)
        return recs[:8]

    def build_digest(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> IsnDigest:
        _ = filters
        limitations: list[str] = []
        if not _is_manager_view(current_user):
            return IsnDigest(
                generated_at=_now_iso(),
                available=False,
                limitations=["ISN digest requires manager or senior oversight role."],
                privacy_notice=PRIVACY_NOTICE,
            )

        mode = self._detect_storage_mode(conn)
        items: list[IsnNotificationItem] = []
        try:
            for alert in self._open_alerts(current_user, conn):
                items.append(self.alert_to_notification_item(alert))
        except Exception as exc:
            logger.warning("isn_digest_build_failed: %s", exc)
            limitations.append("Safeguarding network alerts could not be loaded.")
            return IsnDigest(
                generated_at=_now_iso(),
                available=False,
                limitations=limitations,
                privacy_notice=PRIVACY_NOTICE,
            )

        if mode == "memory" and not items:
            limitations.append(
                "ISN persistence unavailable in this environment; safeguarding network summary may be empty."
            )

        urgent = sum(1 for i in items if i.severity == "urgent")
        high = sum(1 for i in items if i.severity == "high")
        review_required = sum(1 for i in items if i.type in ("isn_review_required", "isn_manager_action_required"))
        escalation_required = sum(1 for i in items if i.type == "isn_escalation_required")
        follow_up_due = sum(1 for i in items if i.type == "isn_follow_up_due")
        network_updates = sum(1 for i in items if i.type in ("isn_network_update", "isn_professional_update"))
        linked_recording = self._linked_recording_count(current_user, conn)
        escalation_pending = sum(
            1
            for i in items
            if i.severity in ("urgent", "high")
            and _text(i.status, "new") in OPEN_STATUSES
        )

        digest = IsnDigest(
            generated_at=_now_iso(),
            available=True,
            total_open=len(items),
            urgent=urgent,
            high=high,
            review_required=review_required,
            escalation_required=escalation_required,
            follow_up_due=follow_up_due,
            network_updates=network_updates,
            linked_recording_alerts=linked_recording,
            escalation_pending=escalation_pending,
            escalation_rules_active=True,
            top_items=self.top_items(items),
            routes=IsnNotificationRoutes(),
            limitations=limitations,
            privacy_notice=PRIVACY_NOTICE,
        )
        digest.recommendations = self.build_recommendations(digest)
        return digest

    def build_badge_summary(
        self,
        current_user: dict[str, Any],
        filters: dict[str, Any] | None = None,
        conn: Any | None = None,
    ) -> IsnBadgeSummary:
        digest = self.build_digest(current_user, filters=filters, conn=conn)
        return IsnBadgeSummary(
            unread=digest.total_open,
            urgent=digest.urgent,
            review_required=digest.review_required,
            available=digest.available,
        )

    def list_notification_items(
        self,
        current_user: dict[str, Any],
        *,
        limit: int = 30,
        conn: Any | None = None,
    ) -> list[IsnNotificationItem]:
        digest = self.build_digest(current_user, conn=conn)
        items = [
            IsnNotificationItem(
                id=t.id,
                type=t.type,
                title=t.title,
                safe_summary=t.safe_summary,
                severity=t.severity,
                status=t.status,
                route=t.route,
                action_label=t.action_label,
                created_at=_now_iso(),
                metadata={"metadata_only": True, "no_raw_body": True},
            )
            for t in digest.top_items
        ]
        if len(items) < limit:
            for alert in self._open_alerts(current_user, conn, limit=limit):
                item = self.alert_to_notification_item(alert)
                if not any(existing.id == item.id for existing in items):
                    items.append(item)
                if len(items) >= limit:
                    break
        return items[:limit]

    def get_health(self, conn: Any | None = None) -> IsnNotificationHealth:
        mode = self._detect_storage_mode(conn)
        return IsnNotificationHealth(
            status="ok",
            persistence_available=mode == "postgresql",
            storage_mode=mode,
        )


isn_digest_service = ISNDigestService()
