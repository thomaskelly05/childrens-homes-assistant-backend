from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status

from core.policy_engine import context_from_user, policy_engine
from repositories.connect_repository import ConnectRepository, ConnectSchemaUnavailable
from schemas.connect_contracts import ConnectMessageCreate, ConnectMessageUpdate, ConnectThreadCreate


def _user_id(current_user: dict[str, Any]) -> int:
    value = current_user.get("user_id") or current_user.get("id") or current_user.get("sub")
    if value is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication required.")
    return int(value)


def _display_name(current_user: dict[str, Any]) -> str:
    parts = [current_user.get("first_name"), current_user.get("last_name")]
    name = " ".join(str(part).strip() for part in parts if str(part or "").strip())
    return name or str(current_user.get("display_name") or current_user.get("email") or "there")


def _home_name(current_user: dict[str, Any]) -> str | None:
    return current_user.get("home_name") or current_user.get("homeName")


class ConnectService:
    def __init__(self, repository: ConnectRepository | None = None) -> None:
        self.repository = repository or ConnectRepository()

    def list_threads(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None, q: str | None = None, limit: int = 50) -> dict[str, Any]:
        context = self._context(current_user, permission="records:read", home_id=home_id)
        try:
            threads = self.repository.list_threads(conn, context, user_id=_user_id(current_user), home_id=home_id, q=q, limit=limit)
            return {"ok": True, "available": True, "items": threads}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return self._unavailable(exc.table_name, "threads")

    def create_thread(self, conn: Any, current_user: dict[str, Any], payload: ConnectThreadCreate) -> dict[str, Any]:
        context = self._context(current_user, permission="records:write", home_id=payload.home_id)
        home_id = payload.home_id
        if payload.thread_type == "home_channel" and home_id is None:
            home_id = context.primary_home_id
        if home_id is not None and not context.can_access_home(home_id):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Home scope is not permitted.")
        data = payload.model_dump()
        data["home_id"] = home_id
        try:
            thread = self.repository.create_thread(conn, context, created_by=_user_id(current_user), payload=data)
            conn.commit()
            return {"ok": True, "thread": thread}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return self._unavailable(exc.table_name, "thread")

    def get_thread(self, conn: Any, current_user: dict[str, Any], *, thread_id: int, limit: int = 80) -> dict[str, Any]:
        context = self._context(current_user, permission="records:read")
        user_id = _user_id(current_user)
        try:
            thread = self.repository.get_thread(conn, context, thread_id=thread_id, user_id=user_id)
            if not thread:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")
            messages = self.repository.list_messages(conn, thread_id=thread_id, user_id=user_id, limit=limit)
            return {"ok": True, "available": True, "thread": thread, "messages": messages}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return self._unavailable(exc.table_name, "thread")

    def create_message(self, conn: Any, current_user: dict[str, Any], *, thread_id: int, payload: ConnectMessageCreate) -> dict[str, Any]:
        context = self._context(current_user, permission="records:write")
        user_id = _user_id(current_user)
        try:
            thread = self.repository.get_thread(conn, context, thread_id=thread_id, user_id=user_id)
            if not thread:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Thread not found.")
            message = self.repository.create_message(conn, thread, author_id=user_id, payload=payload.model_dump())
            notifications = self.repository.create_notifications_for_message(conn, thread, message, exclude_user_id=user_id)
            conn.commit()
            return {"ok": True, "message": message, "notifications_created": len(notifications)}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return self._unavailable(exc.table_name, "message")

    def update_message(self, conn: Any, current_user: dict[str, Any], *, message_id: int, payload: ConnectMessageUpdate) -> dict[str, Any]:
        self._context(current_user, permission="records:write")
        try:
            message = self.repository.update_message(conn, message_id=message_id, user_id=_user_id(current_user), payload=payload.model_dump(exclude_unset=True))
            if not message:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")
            if message.get("forbidden"):
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the author can edit this message.")
            conn.commit()
            return {"ok": True, "message": message}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return self._unavailable(exc.table_name, "message")

    def mark_message_read(self, conn: Any, current_user: dict[str, Any], *, message_id: int) -> dict[str, Any]:
        self._context(current_user, permission="records:read")
        try:
            read = self.repository.mark_message_read(conn, message_id=message_id, user_id=_user_id(current_user))
            if not read:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Message not found.")
            conn.commit()
            return {"ok": True, "read": read}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return self._unavailable(exc.table_name, "read")

    def unread(self, conn: Any, current_user: dict[str, Any]) -> dict[str, Any]:
        context = self._context(current_user, permission="records:read")
        try:
            summary = self.repository.unread_summary(conn, context, user_id=_user_id(current_user))
            return {"ok": True, "available": True, **summary}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return {"ok": True, "available": False, "count": 0, "threads": [], "missing_table": exc.table_name}

    def notifications(self, conn: Any, current_user: dict[str, Any], *, unread_only: bool = False, limit: int = 50) -> dict[str, Any]:
        context = self._context(current_user, permission="records:read")
        try:
            items = self.repository.list_notifications(conn, context, user_id=_user_id(current_user), unread_only=unread_only, limit=limit)
            return {"ok": True, "available": True, "items": items, "unread": len([item for item in items if not item.get("read_at")])}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return {"ok": True, "available": False, "items": [], "unread": 0, "missing_table": exc.table_name}

    def mark_notification_read(self, conn: Any, current_user: dict[str, Any], *, notification_id: int) -> dict[str, Any]:
        context = self._context(current_user, permission="records:read")
        try:
            notification = self.repository.mark_notification_read(conn, context, notification_id=notification_id, user_id=_user_id(current_user))
            if not notification:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")
            conn.commit()
            return {"ok": True, "notification": notification}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return self._unavailable(exc.table_name, "notification")

    def handover_today(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None) -> dict[str, Any]:
        context = self._context(current_user, permission="records:read", home_id=home_id)
        try:
            return {"ok": True, "available": True, **self.repository.handover_today(conn, context, home_id=home_id)}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return {"ok": True, "available": False, "date": datetime.now(timezone.utc).date().isoformat(), "items": [], "summary": {"total": 0, "urgent": 0, "children_needing_attention": 0, "unacknowledged": 0}, "missing_table": exc.table_name}

    def dashboard_preferences(self, conn: Any, current_user: dict[str, Any]) -> dict[str, Any]:
        user_id = _user_id(current_user)
        try:
            preferences = self.repository.dashboard_preferences(conn, user_id=user_id)
            return {"ok": True, "available": True, "preferences": preferences}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return {"ok": True, "available": False, "preferences": self.repository.default_dashboard_preferences(user_id), "missing_table": exc.table_name}

    def save_dashboard_preferences(self, conn: Any, current_user: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
        self._context(current_user, permission="records:write")
        user_id = _user_id(current_user)
        self._validate_dashboard_preferences(payload)
        try:
            preferences = self.repository.save_dashboard_preferences(conn, user_id=user_id, preferences=payload)
            conn.commit()
            return {"ok": True, "preferences": preferences}
        except ConnectSchemaUnavailable as exc:
            conn.rollback()
            return {"ok": True, "available": False, "preferences": self.repository.default_dashboard_preferences(user_id), "missing_table": exc.table_name}

    def me_today(self, conn: Any, current_user: dict[str, Any]) -> dict[str, Any]:
        context = self._context(current_user, permission="records:read")
        handover = self.handover_today(conn, current_user, home_id=context.primary_home_id)
        connect = self.unread(conn, current_user)
        notifications = self.notifications(conn, current_user, unread_only=True, limit=8)
        preferences = self.dashboard_preferences(conn, current_user)
        adult = {
            "id": _user_id(current_user),
            "name": _display_name(current_user),
            "preferred_name": current_user.get("preferred_name") or current_user.get("first_name") or _display_name(current_user),
            "role": current_user.get("role"),
            "email": current_user.get("email"),
            "home_id": context.primary_home_id,
            "provider_id": context.provider_id,
            "profile_photo": current_user.get("profile_image_data") or current_user.get("avatar_url"),
        }
        return {
            "ok": True,
            "adult": adult,
            "home": {"id": context.primary_home_id, "name": _home_name(current_user)} if context.primary_home_id else None,
            "provider": {"id": context.provider_id},
            "handover": handover,
            "connect": connect,
            "notifications": notifications,
            "tasks_due_today": [],
            "key_children": [],
            "recent_activity": [],
            "dashboard_preferences": preferences.get("preferences", {}),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def home_today(self, conn: Any, current_user: dict[str, Any], *, home_id: int | None = None) -> dict[str, Any]:
        context = self._context(current_user, permission="records:read", home_id=home_id)
        scoped_home_id = home_id or context.primary_home_id
        return {
            "ok": True,
            "home": {"id": scoped_home_id},
            "handover": self.handover_today(conn, current_user, home_id=scoped_home_id),
            "notifications": self.notifications(conn, current_user, unread_only=True, limit=8),
            "connect": self.unread(conn, current_user),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    def _context(self, current_user: dict[str, Any], *, permission: str, home_id: int | None = None):
        context = context_from_user(current_user)
        decision = policy_engine.evaluate(current_user, permission, home_id=home_id)
        if not decision.allowed:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission for this workspace.")
        return context

    def _validate_dashboard_preferences(self, payload: dict[str, Any]) -> None:
        locked = {"urgent_safeguarding", "active_missing", "urgent_notifications"}
        layout = payload.get("layout") or []
        if not isinstance(layout, list):
            raise HTTPException(status_code=400, detail="layout must be a list.")
        visible = {str(item.get("id")) for item in layout if isinstance(item, dict) and item.get("pinned") is not False}
        missing = locked - visible
        if missing:
            raise HTTPException(status_code=400, detail=f"Critical safety widgets cannot be hidden: {', '.join(sorted(missing))}.")

    def _unavailable(self, table_name: str, feature: str) -> dict[str, Any]:
        return {
            "ok": True,
            "available": False,
            "items": [],
            "missing_table": table_name,
            "message": f"{feature} will appear when the {table_name} migration has run.",
        }
