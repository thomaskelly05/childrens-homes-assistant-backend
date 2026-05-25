"""ISN notification lifecycle — metadata-only source sync (no raw safeguarding narrative)."""

from __future__ import annotations

import logging
from typing import Any

from schemas.isn_notifications import IsnNotificationActionResponse
from schemas.os_notifications import OsNotificationActionRequest
from services.isn_digest_service import isn_digest_service

logger = logging.getLogger("indicare.isn_notification_lifecycle")

ISN_NO_AUTO_RESOLVE_TYPES = frozenset(
    {
        "isn_safeguarding_alert",
        "isn_review_required",
        "isn_escalation_required",
        "isn_recording_linked_alert",
        "isn_manager_action_required",
    }
)


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


class ISNNotificationLifecycleService:
    """Updates ISN source state where available; OS state is persisted separately."""

    def apply_action(
        self,
        isn_alert_id: str,
        action: OsNotificationActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> IsnNotificationActionResponse:
        _ = current_user
        _ = conn
        notification_key = f"isn:{isn_alert_id}"
        item_type = _text(action.metadata.get("item_type"))

        if action.action == "resolve" and item_type in ISN_NO_AUTO_RESOLVE_TYPES:
            return IsnNotificationActionResponse(
                success=False,
                item_id=notification_key,
                action=action.action,
                status="acknowledged",
                message=(
                    "Safeguarding network items cannot be auto-resolved. "
                    "Review in the safeguarding workspace and record formal decisions there."
                ),
                synced_to_os_state=False,
            )

        updated = self._update_memory_alert_status(isn_alert_id, action.action)
        warning = None
        if not updated:
            warning = "ISN source persistence unavailable; OS notification lifecycle state was saved."

        if action.action == "create_intelligence_action":
            warning = (
                warning or "Intelligence action creation from ISN bell is not fully wired. "
                "Open /intelligence-actions to manage follow-up."
            )

        return IsnNotificationActionResponse(
            success=True,
            item_id=notification_key,
            action=action.action,
            status=self._status_for_action(action.action),
            warning=warning,
            synced_to_os_state=updated,
            metadata={"no_raw_body": True, "metadata_only": True},
        )

    def _status_for_action(self, action: str) -> str:
        mapping = {
            "acknowledge": "acknowledged",
            "assign": "assigned",
            "resolve": "resolved",
            "archive": "archived",
            "reopen": "unread",
        }
        return mapping.get(action, "acknowledged")

    def _update_memory_alert_status(self, isn_alert_id: str, action: str) -> bool:
        row = isn_digest_service._memory_alerts.get(isn_alert_id)
        if not row:
            return False
        status_map = {
            "acknowledge": "reviewing",
            "assign": "assigned",
            "resolve": "resolved",
            "archive": "archived",
            "reopen": "new",
        }
        if action in status_map:
            row["status"] = status_map[action]
            return True
        return False


isn_notification_lifecycle_service = ISNNotificationLifecycleService()
