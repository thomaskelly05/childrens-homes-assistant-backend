from __future__ import annotations

from datetime import date
from typing import Any

from psycopg2.extras import RealDictCursor

from core.provider_context import ProviderContext


class ConnectSchemaUnavailable(RuntimeError):
    def __init__(self, table_name: str) -> None:
        super().__init__(f"IndiCare Connect requires table {table_name}")
        self.table_name = table_name


def _rows(rows: Any) -> list[dict[str, Any]]:
    return [dict(row) for row in rows or []]


def _row(row: Any) -> dict[str, Any] | None:
    return dict(row) if row else None


def _limit(value: int | None, default: int = 50, maximum: int = 100) -> int:
    return max(1, min(int(value or default), maximum))


class ConnectRepository:
    def table_exists(self, conn: Any, table_name: str) -> bool:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public' AND table_name = %s
                ) AS exists
                """,
                (table_name,),
            )
            row = cur.fetchone()
        return bool(row and row.get("exists"))

    def require_schema(self, conn: Any) -> None:
        for table_name in (
            "connect_threads",
            "connect_thread_members",
            "connect_messages",
            "connect_message_reads",
            "connect_notifications",
        ):
            if not self.table_exists(conn, table_name):
                raise ConnectSchemaUnavailable(table_name)

    def list_threads(
        self,
        conn: Any,
        context: ProviderContext,
        *,
        user_id: int,
        home_id: int | None = None,
        q: str | None = None,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        self.require_schema(conn)
        clauses = ["t.archived_at IS NULL", "(m.user_id = %s OR %s = TRUE)"]
        params: list[Any] = [user_id, context.provider_oversight_access or context.tenancy_scope == "platform"]
        if context.provider_id is not None and context.tenancy_scope != "platform":
            clauses.append("t.provider_id = %s")
            params.append(context.provider_id)
        if home_id is not None:
            clauses.append("t.home_id = %s")
            params.append(home_id)
        elif context.tenancy_scope == "home":
            clauses.append("(t.home_id = ANY(%s) OR t.home_id IS NULL)")
            params.append(list(context.home_ids))
        if q:
            clauses.append("(t.title ILIKE %s OR EXISTS (SELECT 1 FROM connect_messages sm WHERE sm.thread_id = t.id AND sm.body ILIKE %s AND sm.deleted_at IS NULL))")
            params.extend([f"%{q}%", f"%{q}%"])
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT
                    t.*,
                    COALESCE(array_remove(array_agg(DISTINCT all_members.user_id), NULL), '{{}}') AS members,
                    MAX(msg.created_at) AS latest_message_at,
                    COUNT(msg.id) FILTER (
                        WHERE msg.author_id IS DISTINCT FROM %s
                          AND msg.deleted_at IS NULL
                          AND reads.read_at IS NULL
                    )::int AS unread_count
                FROM connect_threads t
                LEFT JOIN connect_thread_members m ON m.thread_id = t.id AND m.user_id = %s
                LEFT JOIN connect_thread_members all_members ON all_members.thread_id = t.id
                LEFT JOIN connect_messages msg ON msg.thread_id = t.id
                LEFT JOIN connect_message_reads reads ON reads.message_id = msg.id AND reads.user_id = %s
                WHERE {" AND ".join(clauses)}
                GROUP BY t.id
                ORDER BY COALESCE(MAX(msg.created_at), t.created_at) DESC
                LIMIT %s
                """,
                (user_id, user_id, user_id, *params, _limit(limit)),
            )
            return _rows(cur.fetchall())

    def create_thread(
        self,
        conn: Any,
        context: ProviderContext,
        *,
        created_by: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        self.require_schema(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO connect_threads (provider_id, home_id, thread_type, title, created_by)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    context.provider_id,
                    payload.get("home_id"),
                    payload.get("thread_type"),
                    payload.get("title"),
                    created_by,
                ),
            )
            thread = dict(cur.fetchone())
            members = sorted({created_by, *[int(item) for item in payload.get("member_ids", [])]})
            for member_id in members:
                cur.execute(
                    """
                    INSERT INTO connect_thread_members (thread_id, user_id, role)
                    VALUES (%s, %s, %s)
                    ON CONFLICT (thread_id, user_id) DO UPDATE SET role = EXCLUDED.role
                    """,
                    (thread["id"], member_id, "owner" if member_id == created_by else "member"),
                )
        thread["members"] = members
        thread["unread_count"] = 0
        return thread

    def get_thread(
        self,
        conn: Any,
        context: ProviderContext,
        *,
        thread_id: int,
        user_id: int,
    ) -> dict[str, Any] | None:
        self.require_schema(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    t.*,
                    COALESCE(array_remove(array_agg(DISTINCT tm.user_id), NULL), '{}') AS members,
                    BOOL_OR(tm.user_id = %s) AS is_member
                FROM connect_threads t
                LEFT JOIN connect_thread_members tm ON tm.thread_id = t.id
                WHERE t.id = %s AND t.archived_at IS NULL
                GROUP BY t.id
                """,
                (user_id, thread_id),
            )
            thread = _row(cur.fetchone())
        if not thread:
            return None
        if not self._context_can_see_thread(context, thread) or not (thread.get("is_member") or context.provider_oversight_access or context.tenancy_scope == "platform"):
            return None
        return thread

    def list_messages(
        self,
        conn: Any,
        *,
        thread_id: int,
        user_id: int,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        self.require_schema(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    msg.*,
                    NULLIF(TRIM(CONCAT(users.first_name, ' ', users.last_name)), '') AS author_name,
                    reads.read_at
                FROM connect_messages msg
                LEFT JOIN users ON users.id = msg.author_id
                LEFT JOIN connect_message_reads reads ON reads.message_id = msg.id AND reads.user_id = %s
                WHERE msg.thread_id = %s AND msg.deleted_at IS NULL
                ORDER BY msg.created_at DESC
                LIMIT %s
                """,
                (user_id, thread_id, _limit(limit, default=80, maximum=200)),
            )
            return list(reversed(_rows(cur.fetchall())))

    def create_message(
        self,
        conn: Any,
        thread: dict[str, Any],
        *,
        author_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any]:
        self.require_schema(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO connect_messages (
                    thread_id, provider_id, home_id, author_id, body,
                    linked_child_id, linked_record_type, linked_record_id, priority
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    thread["id"],
                    thread.get("provider_id"),
                    thread.get("home_id"),
                    author_id,
                    payload.get("body"),
                    payload.get("linked_child_id"),
                    payload.get("linked_record_type"),
                    payload.get("linked_record_id"),
                    payload.get("priority") or "normal",
                ),
            )
            message = dict(cur.fetchone())
            cur.execute(
                """
                INSERT INTO connect_message_reads (message_id, user_id, read_at)
                VALUES (%s, %s, now())
                ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = EXCLUDED.read_at
                """,
                (message["id"], author_id),
            )
        return message

    def update_message(
        self,
        conn: Any,
        *,
        message_id: int,
        user_id: int,
        payload: dict[str, Any],
    ) -> dict[str, Any] | None:
        self.require_schema(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM connect_messages WHERE id = %s AND deleted_at IS NULL", (message_id,))
            existing = _row(cur.fetchone())
            if not existing:
                return None
            if int(existing.get("author_id") or 0) != user_id:
                return {"forbidden": True}
            if payload.get("deleted"):
                cur.execute(
                    "UPDATE connect_messages SET deleted_at = now(), edited_at = now() WHERE id = %s RETURNING *",
                    (message_id,),
                )
            else:
                cur.execute(
                    """
                    UPDATE connect_messages
                    SET body = COALESCE(%s, body),
                        priority = COALESCE(%s, priority),
                        edited_at = now()
                    WHERE id = %s
                    RETURNING *
                    """,
                    (payload.get("body"), payload.get("priority"), message_id),
                )
            return _row(cur.fetchone())

    def mark_message_read(self, conn: Any, *, message_id: int, user_id: int) -> dict[str, Any] | None:
        self.require_schema(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM connect_messages WHERE id = %s AND deleted_at IS NULL", (message_id,))
            if not cur.fetchone():
                return None
            cur.execute(
                """
                INSERT INTO connect_message_reads (message_id, user_id, read_at)
                VALUES (%s, %s, now())
                ON CONFLICT (message_id, user_id) DO UPDATE SET read_at = EXCLUDED.read_at
                RETURNING *
                """,
                (message_id, user_id),
            )
            return _row(cur.fetchone())

    def unread_summary(self, conn: Any, context: ProviderContext, *, user_id: int) -> dict[str, Any]:
        self.require_schema(conn)
        clauses = ["tm.user_id = %s", "msg.author_id IS DISTINCT FROM %s", "msg.deleted_at IS NULL", "reads.read_at IS NULL"]
        params: list[Any] = [user_id, user_id]
        if context.provider_id is not None and context.tenancy_scope != "platform":
            clauses.append("msg.provider_id = %s")
            params.append(context.provider_id)
        if context.tenancy_scope == "home":
            clauses.append("(msg.home_id = ANY(%s) OR msg.home_id IS NULL)")
            params.append(list(context.home_ids))
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT COUNT(msg.id)::int AS count
                FROM connect_messages msg
                JOIN connect_thread_members tm ON tm.thread_id = msg.thread_id
                LEFT JOIN connect_message_reads reads ON reads.message_id = msg.id AND reads.user_id = %s
                WHERE {" AND ".join(clauses)}
                """,
                (user_id, *params),
            )
            count = int((cur.fetchone() or {}).get("count") or 0)
            cur.execute(
                """
                SELECT t.id, t.title, t.thread_type, MAX(msg.created_at) AS latest_message_at
                FROM connect_threads t
                JOIN connect_thread_members tm ON tm.thread_id = t.id AND tm.user_id = %s
                JOIN connect_messages msg ON msg.thread_id = t.id
                LEFT JOIN connect_message_reads reads ON reads.message_id = msg.id AND reads.user_id = %s
                WHERE msg.author_id IS DISTINCT FROM %s AND msg.deleted_at IS NULL AND reads.read_at IS NULL
                GROUP BY t.id
                ORDER BY MAX(msg.created_at) DESC
                LIMIT 8
                """,
                (user_id, user_id, user_id),
            )
            threads = _rows(cur.fetchall())
        return {"count": count, "threads": threads}

    def create_notifications_for_message(
        self,
        conn: Any,
        thread: dict[str, Any],
        message: dict[str, Any],
        *,
        exclude_user_id: int,
    ) -> list[dict[str, Any]]:
        self.require_schema(conn)
        notifications: list[dict[str, Any]] = []
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT user_id FROM connect_thread_members WHERE thread_id = %s AND user_id <> %s", (thread["id"], exclude_user_id))
            members = [int(row["user_id"]) for row in cur.fetchall()]
            for member_id in members:
                cur.execute(
                    """
                    INSERT INTO connect_notifications (
                        provider_id, home_id, user_id, notification_type, title, body,
                        linked_thread_id, linked_message_id, linked_child_id
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (
                        thread.get("provider_id"),
                        thread.get("home_id"),
                        member_id,
                        "connect_message",
                        thread.get("title") or "New IndiCare Connect message",
                        message.get("body"),
                        thread.get("id"),
                        message.get("id"),
                        message.get("linked_child_id"),
                    ),
                )
                notifications.append(dict(cur.fetchone()))
        return notifications

    def list_notifications(self, conn: Any, context: ProviderContext, *, user_id: int, unread_only: bool = False, limit: int | None = None) -> list[dict[str, Any]]:
        self.require_schema(conn)
        clauses = ["user_id = %s"]
        params: list[Any] = [user_id]
        if unread_only:
            clauses.append("read_at IS NULL")
        if context.provider_id is not None and context.tenancy_scope != "platform":
            clauses.append("provider_id = %s")
            params.append(context.provider_id)
        if context.tenancy_scope == "home":
            clauses.append("(home_id = ANY(%s) OR home_id IS NULL)")
            params.append(list(context.home_ids))
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT *
                FROM connect_notifications
                WHERE {" AND ".join(clauses)}
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (*params, _limit(limit)),
            )
            return _rows(cur.fetchall())

    def mark_notification_read(self, conn: Any, context: ProviderContext, *, notification_id: int, user_id: int) -> dict[str, Any] | None:
        self.require_schema(conn)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE connect_notifications
                SET read_at = COALESCE(read_at, now())
                WHERE id = %s AND user_id = %s
                RETURNING *
                """,
                (notification_id, user_id),
            )
            row = _row(cur.fetchone())
        if not row or not self._context_can_see_thread(context, row):
            return None
        return row

    def handover_today(self, conn: Any, context: ProviderContext, *, home_id: int | None = None) -> dict[str, Any]:
        if not self.table_exists(conn, "handover_entries"):
            raise ConnectSchemaUnavailable("handover_entries")
        clauses = ["shift_date = CURRENT_DATE"]
        params: list[Any] = []
        if context.provider_id is not None and context.tenancy_scope != "platform":
            clauses.append("provider_id = %s")
            params.append(context.provider_id)
        if home_id is not None:
            clauses.append("home_id = %s")
            params.append(home_id)
        elif context.tenancy_scope == "home":
            clauses.append("home_id = ANY(%s)")
            params.append(list(context.home_ids))
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                SELECT *
                FROM handover_entries
                WHERE {" AND ".join(clauses)}
                ORDER BY
                  CASE priority WHEN 'urgent' THEN 0 WHEN 'important' THEN 1 ELSE 2 END,
                  created_at DESC
                LIMIT 80
                """,
                tuple(params),
            )
            entries = _rows(cur.fetchall())
        return {
            "date": date.today().isoformat(),
            "items": entries,
            "summary": {
                "total": len(entries),
                "urgent": len([item for item in entries if item.get("priority") == "urgent"]),
                "children_needing_attention": len({item.get("linked_child_id") for item in entries if item.get("linked_child_id")}),
                "unacknowledged": len([item for item in entries if not item.get("acknowledged_by")]),
            },
        }

    def dashboard_preferences(self, conn: Any, *, user_id: int) -> dict[str, Any]:
        if not self.table_exists(conn, "user_dashboard_preferences"):
            raise ConnectSchemaUnavailable("user_dashboard_preferences")
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM user_dashboard_preferences WHERE user_id = %s LIMIT 1", (user_id,))
            row = _row(cur.fetchone())
        return row or self.default_dashboard_preferences(user_id)

    def save_dashboard_preferences(self, conn: Any, *, user_id: int, preferences: dict[str, Any]) -> dict[str, Any]:
        if not self.table_exists(conn, "user_dashboard_preferences"):
            raise ConnectSchemaUnavailable("user_dashboard_preferences")
        layout = preferences.get("layout") or self.default_dashboard_preferences(user_id)["layout"]
        pinned = preferences.get("pinned_widgets") or []
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO user_dashboard_preferences (user_id, layout, pinned_widgets, updated_at)
                VALUES (%s, %s::jsonb, %s::jsonb, now())
                ON CONFLICT (user_id) DO UPDATE SET
                    layout = EXCLUDED.layout,
                    pinned_widgets = EXCLUDED.pinned_widgets,
                    updated_at = now()
                RETURNING *
                """,
                (user_id, layout, pinned),
            )
            return dict(cur.fetchone())

    def default_dashboard_preferences(self, user_id: int) -> dict[str, Any]:
        return {
            "user_id": user_id,
            "layout": [
                {"id": "urgent_safeguarding", "pinned": True, "locked": True},
                {"id": "active_missing", "pinned": True, "locked": True},
                {"id": "urgent_notifications", "pinned": True, "locked": True},
                {"id": "my_handover", "pinned": True, "locked": False},
                {"id": "my_connect_messages", "pinned": True, "locked": False},
                {"id": "my_key_children", "pinned": True, "locked": False},
                {"id": "my_actions", "pinned": True, "locked": False},
            ],
            "pinned_widgets": ["my_handover", "my_connect_messages", "my_key_children", "my_actions"],
        }

    def _context_can_see_thread(self, context: ProviderContext, row: dict[str, Any]) -> bool:
        provider_id = row.get("provider_id")
        home_id = row.get("home_id")
        if context.tenancy_scope == "platform":
            return True
        if provider_id is not None and context.provider_id is not None and int(provider_id) != int(context.provider_id):
            return False
        if home_id is not None and context.tenancy_scope == "home" and int(home_id) not in context.home_ids:
            return False
        return True
