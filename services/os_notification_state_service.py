"""Persist OS notification lifecycle (read/ack/resolve) without storing raw bodies."""

from __future__ import annotations

import json
import logging
from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from psycopg2.extras import Json, RealDictCursor

from repositories.os_repository_utils import table_exists
from schemas.manager_daily_brief import ManagerDailyBriefReviewRequest
from schemas.os_notifications import (
    OsNotificationActionRequest,
    OsNotificationActionResponse,
    OsNotificationHealth,
    OsNotificationItem,
    OsNotificationStatus,
)
from schemas.recording_alerts import RecordingAlertActionRequest
from services.audit_event_service import record_audit_event
from services.manager_daily_brief_service import manager_daily_brief_service
from services.os_cache_service import os_cache_service
from services.recording_alert_service import NO_AUTO_RESOLVE_TYPES, recording_alert_service

logger = logging.getLogger("indicare.os_notification_state")

ISN_NO_AUTO_RESOLVE = frozenset(
    {
        "isn_safeguarding_alert",
        "isn_review_required",
        "isn_escalation_required",
        "isn_recording_linked_alert",
        "isn_manager_action_required",
    }
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _user_id(current_user: dict[str, Any]) -> str:
    return str(current_user.get("id") or current_user.get("user_id") or "")


def _invalidate_notification_feed_cache(current_user: dict[str, Any]) -> None:
    user_id = _user_id(current_user) or "anon"
    os_cache_service.invalidate_prefix(f"notification:feed:user:{user_id}:")
    os_cache_service.invalidate_prefix(f"notification:summary:user:{user_id}:")


def _user_name(current_user: dict[str, Any]) -> str:
    first = _text(current_user.get("first_name"))
    last = _text(current_user.get("last_name"))
    return " ".join(part for part in (first, last) if part).strip() or _text(current_user.get("email"), "User")


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


def _iso_dt(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


class OsNotificationStateService:
    def __init__(self) -> None:
        self._memory: dict[str, dict[str, Any]] = {}

    def _detect_storage_mode(self, conn: Any | None = None) -> str:
        if conn is None:
            return "memory"
        try:
            if table_exists(conn, "os_notification_state"):
                return "postgresql"
        except Exception:
            pass
        return "memory"

    def get_health(self, conn: Any | None = None) -> OsNotificationHealth:
        mode = self._detect_storage_mode(conn)
        return OsNotificationHealth(
            status="ok",
            persistence_available=mode == "postgresql",
            storage_mode=mode,
        )

    def build_notification_key(self, item: OsNotificationItem) -> str:
        return _text(item.notification_key or item.id)

    def _parse_key(self, notification_key: str) -> tuple[str, str | None]:
        key = _text(notification_key)
        if ":" in key:
            prefix, related = key.split(":", 1)
            return prefix, related
        return key, None

    def _row_to_state(self, row: dict[str, Any]) -> dict[str, Any]:
        return {
            "notification_key": row.get("notification_key"),
            "source": row.get("source"),
            "category": row.get("category"),
            "related_id": row.get("related_id"),
            "related_type": row.get("related_type"),
            "status": row.get("status"),
            "unread": bool(row.get("unread")),
            "owner_user_id": row.get("owner_user_id"),
            "owner_name": row.get("owner_name"),
            "read_at": _iso_dt(row.get("read_at")),
            "acknowledged_at": _iso_dt(row.get("acknowledged_at")),
            "resolved_at": _iso_dt(row.get("resolved_at")),
            "archived_at": _iso_dt(row.get("archived_at")),
            "metadata": _parse_json(row.get("metadata"), {}),
        }

    def get_state(
        self,
        notification_key: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> dict[str, Any] | None:
        key = _text(notification_key)
        mode = self._detect_storage_mode(conn)
        if mode == "postgresql" and conn is not None:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        SELECT *
                        FROM os_notification_state
                        WHERE notification_key = %s
                        LIMIT 1
                        """,
                        (key,),
                    )
                    row = cur.fetchone()
                    if row:
                        return self._row_to_state(dict(row))
            except Exception as exc:
                logger.debug("os_notification_state_read_failed: %s", exc)
                try:
                    conn.rollback()
                except Exception:
                    pass
        return self._memory.get(key)

    def _persist_state(
        self,
        notification_key: str,
        *,
        source: str,
        category: str | None,
        related_id: str | None,
        related_type: str | None,
        status: str,
        unread: bool,
        current_user: dict[str, Any],
        conn: Any | None = None,
        owner_user_id: str | None = None,
        owner_name: str | None = None,
        note: str | None = None,
        extra_metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        now = _now_iso()
        uid = _user_id(current_user)
        existing = self.get_state(notification_key, current_user, conn=conn) or {}
        metadata = {**existing.get("metadata", {}), **(extra_metadata or {})}
        if note:
            metadata["last_note"] = note

        state = {
            "id": existing.get("id") or str(uuid4()),
            "notification_key": notification_key,
            "source": source,
            "category": category,
            "related_id": related_id,
            "related_type": related_type,
            "status": status,
            "unread": unread,
            "owner_user_id": owner_user_id or existing.get("owner_user_id"),
            "owner_name": owner_name or existing.get("owner_name"),
            "read_by": uid if status in ("read", "acknowledged", "assigned", "resolved", "archived") else existing.get("read_by"),
            "read_at": now if status in ("read", "acknowledged", "assigned", "resolved", "archived") else existing.get("read_at"),
            "acknowledged_by": uid if status == "acknowledged" else existing.get("acknowledged_by"),
            "acknowledged_at": now if status == "acknowledged" else existing.get("acknowledged_at"),
            "resolved_by": uid if status == "resolved" else existing.get("resolved_by"),
            "resolved_at": now if status == "resolved" else existing.get("resolved_at"),
            "resolution_note": note if status == "resolved" else existing.get("resolution_note"),
            "archived_at": now if status == "archived" else existing.get("archived_at"),
            "metadata": metadata,
            "created_at": existing.get("created_at") or now,
            "updated_at": now,
        }

        mode = self._detect_storage_mode(conn)
        if mode == "postgresql" and conn is not None:
            try:
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        """
                        INSERT INTO os_notification_state (
                            id, notification_key, source, category, related_id, related_type,
                            status, unread, owner_user_id, owner_name,
                            acknowledged_by, acknowledged_at,
                            resolved_by, resolved_at, resolution_note,
                            read_by, read_at, archived_at, metadata, created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, %s,
                            %s, %s, %s, %s,
                            %s, %s,
                            %s, %s, %s,
                            %s, %s, %s, %s, %s, %s
                        )
                        ON CONFLICT (notification_key) DO UPDATE SET
                            source = EXCLUDED.source,
                            category = EXCLUDED.category,
                            related_id = EXCLUDED.related_id,
                            related_type = EXCLUDED.related_type,
                            status = EXCLUDED.status,
                            unread = EXCLUDED.unread,
                            owner_user_id = COALESCE(EXCLUDED.owner_user_id, os_notification_state.owner_user_id),
                            owner_name = COALESCE(EXCLUDED.owner_name, os_notification_state.owner_name),
                            acknowledged_by = COALESCE(EXCLUDED.acknowledged_by, os_notification_state.acknowledged_by),
                            acknowledged_at = COALESCE(EXCLUDED.acknowledged_at, os_notification_state.acknowledged_at),
                            resolved_by = COALESCE(EXCLUDED.resolved_by, os_notification_state.resolved_by),
                            resolved_at = COALESCE(EXCLUDED.resolved_at, os_notification_state.resolved_at),
                            resolution_note = COALESCE(EXCLUDED.resolution_note, os_notification_state.resolution_note),
                            read_by = COALESCE(EXCLUDED.read_by, os_notification_state.read_by),
                            read_at = COALESCE(EXCLUDED.read_at, os_notification_state.read_at),
                            archived_at = COALESCE(EXCLUDED.archived_at, os_notification_state.archived_at),
                            metadata = EXCLUDED.metadata,
                            updated_at = EXCLUDED.updated_at
                        RETURNING *
                        """,
                        (
                            state["id"],
                            notification_key,
                            source,
                            category,
                            related_id,
                            related_type,
                            status,
                            unread,
                            state.get("owner_user_id"),
                            state.get("owner_name"),
                            state.get("acknowledged_by"),
                            state.get("acknowledged_at"),
                            state.get("resolved_by"),
                            state.get("resolved_at"),
                            state.get("resolution_note"),
                            state.get("read_by"),
                            state.get("read_at"),
                            state.get("archived_at"),
                            Json(metadata),
                            state["created_at"],
                            now,
                        ),
                    )
                    row = cur.fetchone()
                    conn.commit()
                    if row:
                        return self._row_to_state(dict(row))
            except Exception as exc:
                logger.warning("os_notification_state_persist_failed: %s", exc)
                try:
                    conn.rollback()
                except Exception:
                    pass

        self._memory[notification_key] = state
        return state

    def apply_state(
        self,
        items: list[OsNotificationItem],
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> list[OsNotificationItem]:
        output: list[OsNotificationItem] = []
        for item in items:
            key = self.build_notification_key(item)
            persisted = self.get_state(key, current_user, conn=conn)
            if not persisted:
                output.append(item.model_copy(update={"notification_key": key}))
                continue
            status = _text(persisted.get("status"), item.status)
            unread = bool(persisted.get("unread", item.unread))
            if status in ("resolved", "archived") and item.source == "manager_daily_brief":
                continue
            output.append(
                item.model_copy(
                    update={
                        "notification_key": key,
                        "status": status,
                        "unread": unread,
                        "read_at": persisted.get("read_at"),
                        "acknowledged_at": persisted.get("acknowledged_at"),
                        "resolved_at": persisted.get("resolved_at"),
                        "owner_user_id": persisted.get("owner_user_id") or item.owner_user_id,
                        "owner_name": persisted.get("owner_name") or item.owner_name,
                    }
                )
            )
        return output

    def record_audit(
        self,
        item: OsNotificationItem,
        action: str,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> None:
        _ = conn
        try:
            record_audit_event(
                event_type="os_notification_action",
                actor_id=_user_id(current_user),
                resource_type=_text(item.source, "notification"),
                resource_id=self.build_notification_key(item),
                metadata={
                    "action": action,
                    "category": item.category,
                    "notification_type": item.type,
                    "no_raw_body": True,
                },
            )
        except Exception as exc:
            logger.debug("os_notification_audit_skipped: %s", exc)

    def _sync_recording_alert(
        self,
        alert_id: str,
        action: OsNotificationActionRequest,
        current_user: dict[str, Any],
        conn: Any | None,
    ) -> tuple[bool, str | None]:
        mapping = {
            "acknowledge": "acknowledge",
            "assign": "assign",
            "resolve": "resolve",
            "archive": "archive",
            "reopen": "reopen",
        }
        alert_action = mapping.get(action.action)
        if not alert_action:
            return False, None
        try:
            alert = recording_alert_service.get_alert(alert_id, current_user, conn=conn)
            if alert and action.action == "resolve" and alert.alert_type in NO_AUTO_RESOLVE_TYPES:
                return False, (
                    "Safeguarding-sensitive alerts require explicit manager resolution in the alerts workspace."
                )
            req = RecordingAlertActionRequest(
                action=alert_action,  # type: ignore[arg-type]
                note=action.note,
                owner_user_id=action.owner_user_id,
                owner_name=action.owner_name,
            )
            result = recording_alert_service.apply_alert_action(alert_id, req, current_user, conn=conn)
            if result.success:
                return True, result.warning
            return False, result.message
        except Exception as exc:
            logger.warning("recording_alert_sync_failed: %s", exc)
            return False, "Recording alert source sync failed; OS notification state was saved."

    def _sync_daily_brief(
        self,
        action: OsNotificationActionRequest,
        current_user: dict[str, Any],
        conn: Any | None,
    ) -> tuple[bool, str | None]:
        if action.action not in ("mark_read", "resolve", "acknowledge", "archive"):
            return False, None
        try:
            manager_daily_brief_service.mark_reviewed(
                current_user,
                ManagerDailyBriefReviewRequest(note=action.note),
                conn=conn,
            )
            return True, None
        except Exception as exc:
            logger.warning("daily_brief_sync_failed: %s", exc)
            return False, "Daily brief review state saved in OS notifications; brief persistence may be partial."

    def _sync_isn(
        self,
        isn_id: str,
        action: OsNotificationActionRequest,
        current_user: dict[str, Any],
        conn: Any | None,
    ) -> tuple[bool, str | None]:
        from services.isn_notification_lifecycle_service import isn_notification_lifecycle_service

        try:
            result = isn_notification_lifecycle_service.apply_action(
                isn_id,
                action,
                current_user,
                conn=conn,
            )
            return result.success, result.warning
        except Exception as exc:
            logger.warning("isn_sync_failed: %s", exc)
            return False, "ISN source lifecycle may be partial; OS notification state was saved."

    def _status_for_action(self, action: str) -> tuple[OsNotificationStatus, bool]:
        mapping: dict[str, tuple[OsNotificationStatus, bool]] = {
            "mark_read": ("read", False),
            "mark_unread": ("unread", True),
            "acknowledge": ("acknowledged", False),
            "assign": ("assigned", False),
            "resolve": ("resolved", False),
            "archive": ("archived", False),
            "reopen": ("unread", True),
        }
        return mapping.get(action, ("read", False))

    def set_state(
        self,
        notification_key: str,
        action: OsNotificationActionRequest,
        current_user: dict[str, Any],
        *,
        source: str = "system",
        category: str | None = None,
        related_id: str | None = None,
        related_type: str | None = None,
        item_type: str | None = None,
        conn: Any | None = None,
    ) -> OsNotificationActionResponse:
        prefix, related = self._parse_key(notification_key)
        src = source or prefix
        rel_id = related_id or related
        status, unread = self._status_for_action(action.action)

        resolved_item_type = item_type or _text(action.metadata.get("item_type"))
        if action.action == "resolve" and resolved_item_type in ISN_NO_AUTO_RESOLVE:
            return OsNotificationActionResponse(
                success=False,
                notification_key=notification_key,
                action=action.action,
                status="acknowledged",
                unread=False,
                message="Safeguarding network items cannot be auto-resolved from the bell. Acknowledge and review in the safeguarding workspace.",
                synced_to_source=False,
            )

        state = self._persist_state(
            notification_key,
            source=src,
            category=category,
            related_id=rel_id,
            related_type=related_type or prefix,
            status=status,
            unread=unread,
            current_user=current_user,
            conn=conn,
            owner_user_id=action.owner_user_id,
            owner_name=action.owner_name,
            note=action.note,
            extra_metadata=action.metadata,
        )

        synced = False
        warning: str | None = None
        if prefix in ("recording_alert", "recording_alerts") and rel_id:
            synced, warn = self._sync_recording_alert(rel_id, action, current_user, conn)
            warning = warn
        elif prefix == "isn" and rel_id:
            synced, warn = self._sync_isn(rel_id, action, current_user, conn)
            warning = warn
        elif prefix == "manager_daily_brief":
            synced, warn = self._sync_daily_brief(action, current_user, conn)
            warning = warn

        dummy_item = OsNotificationItem(
            id=notification_key,
            notification_key=notification_key,
            type=item_type or "generic",
            title="Notification",
            safe_summary="Lifecycle update",
            route="/notifications",
            source=src,
            category=category,
            created_at=_now_iso(),
        )
        self.record_audit(dummy_item, action.action, current_user, conn=conn)
        _invalidate_notification_feed_cache(current_user)

        return OsNotificationActionResponse(
            success=True,
            notification_key=notification_key,
            action=action.action,
            status=_text(state.get("status"), status),
            unread=bool(state.get("unread", unread)),
            warning=warning,
            synced_to_source=synced,
            metadata={"no_raw_body": True},
        )

    def mark_read(self, notification_key: str, current_user: dict[str, Any], conn: Any | None = None) -> OsNotificationActionResponse:
        return self.set_state(
            notification_key,
            OsNotificationActionRequest(action="mark_read"),
            current_user,
            conn=conn,
        )

    def mark_unread(self, notification_key: str, current_user: dict[str, Any], conn: Any | None = None) -> OsNotificationActionResponse:
        return self.set_state(
            notification_key,
            OsNotificationActionRequest(action="mark_unread"),
            current_user,
            conn=conn,
        )

    def acknowledge(
        self,
        notification_key: str,
        action: OsNotificationActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OsNotificationActionResponse:
        payload = action.model_copy(update={"action": "acknowledge"})
        return self.set_state(notification_key, payload, current_user, conn=conn)

    def assign(
        self,
        notification_key: str,
        action: OsNotificationActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OsNotificationActionResponse:
        payload = action.model_copy(update={"action": "assign"})
        return self.set_state(notification_key, payload, current_user, conn=conn)

    def resolve(
        self,
        notification_key: str,
        action: OsNotificationActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OsNotificationActionResponse:
        payload = action.model_copy(update={"action": "resolve"})
        return self.set_state(notification_key, payload, current_user, conn=conn)

    def archive(
        self,
        notification_key: str,
        action: OsNotificationActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OsNotificationActionResponse:
        payload = action.model_copy(update={"action": "archive"})
        return self.set_state(notification_key, payload, current_user, conn=conn)

    def reopen(
        self,
        notification_key: str,
        action: OsNotificationActionRequest,
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> OsNotificationActionResponse:
        payload = action.model_copy(update={"action": "reopen"})
        return self.set_state(notification_key, payload, current_user, conn=conn)

    def mark_all_read(
        self,
        keys: list[str],
        current_user: dict[str, Any],
        conn: Any | None = None,
    ) -> dict[str, Any]:
        updated = 0
        warnings: list[str] = []
        for key in keys:
            result = self.mark_read(key, current_user, conn=conn)
            if result.success:
                updated += 1
            if result.warning:
                warnings.append(result.warning)
        _invalidate_notification_feed_cache(current_user)
        return {"ok": True, "updated": updated, "warnings": warnings[:5]}


os_notification_state_service = OsNotificationStateService()
