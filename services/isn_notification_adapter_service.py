"""Adapter: ISN safeguarding network items into the existing OS notification bell pattern."""

from __future__ import annotations

import logging
from typing import Any

from repositories.os_repository_utils import MANAGER_ROLES
from schemas.isn_notifications import IsnNotificationItem
from schemas.os_notifications import OsNotificationItem
from services.isn_digest_service import isn_digest_service

logger = logging.getLogger("indicare.isn_notifications")

CATEGORY = "Safeguarding network"

ISN_TYPE_TO_OS: dict[str, str] = {
    "isn_safeguarding_alert": "isn_safeguarding_alert",
    "isn_review_required": "isn_review_required",
    "isn_escalation_required": "isn_escalation_required",
    "isn_network_update": "isn_network_update",
    "isn_follow_up_due": "isn_follow_up_due",
    "isn_professional_update": "isn_professional_update",
    "isn_recording_linked_alert": "isn_recording_linked_alert",
    "isn_manager_action_required": "isn_manager_action_required",
}


def _is_manager_view(current_user: dict[str, Any]) -> bool:
    role = str(current_user.get("role") or "staff").lower()
    return role in {r.lower() for r in MANAGER_ROLES} or any(
        token in role for token in ("manager", "deputy", "senior", "registered", "admin")
    )


class ISNNotificationAdapterService:
    def isn_item_to_os(self, item: IsnNotificationItem) -> OsNotificationItem:
        unread = bool(item.metadata.get("unread", item.status in ("new", "reviewing", "open", "assigned")))
        return OsNotificationItem(
            id=item.id,
            type=ISN_TYPE_TO_OS.get(str(item.type), str(item.type)),
            title=item.title,
            safe_summary=item.safe_summary,
            severity=item.severity,
            status=item.status,
            unread=unread,
            route=item.route,
            action_label=item.action_label,
            source="isn",
            created_at=item.created_at,
            category=CATEGORY,
            metadata={
                **item.metadata,
                "category": "safeguarding_network",
                "metadata_only": True,
                "no_raw_body": True,
            },
        )

    def build_os_items(
        self,
        current_user: dict[str, Any],
        *,
        limit: int = 20,
        conn: Any | None = None,
    ) -> list[OsNotificationItem]:
        if not _is_manager_view(current_user):
            return []
        try:
            isn_items = isn_digest_service.list_notification_items(
                current_user, limit=limit, conn=conn
            )
            return [self.isn_item_to_os(item) for item in isn_items]
        except Exception as exc:
            logger.warning("isn_notification_adapter_failed: %s", exc)
            return []


isn_notification_adapter_service = ISNNotificationAdapterService()
