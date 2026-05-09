from __future__ import annotations

import json
from typing import Any

from db.connection import get_db_connection, release_db_connection


class IndiCareAIMemoryService:
    """Standalone IndiCare AI continuity memory.

    This stores lightweight assistant continuity summaries for IndiCare AI only.
    It is not an OS memory layer. It helps the standalone assistant remember
    recurring themes, unresolved conversations and recent operational context.
    """

    def ensure_schema(self) -> None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    CREATE TABLE IF NOT EXISTS indicare_ai_memory_items (
                        id SERIAL PRIMARY KEY,
                        user_id INTEGER NOT NULL,
                        home_id INTEGER NULL,
                        young_person_id INTEGER NULL,
                        project_id TEXT NULL,
                        conversation_id TEXT NULL,
                        mode TEXT NOT NULL DEFAULT 'general',
                        memory_type TEXT NOT NULL DEFAULT 'conversation_theme',
                        title TEXT NOT NULL,
                        summary TEXT NOT NULL,
                        themes JSONB NOT NULL DEFAULT '[]'::jsonb,
                        source TEXT NOT NULL DEFAULT 'assistant',
                        confidence NUMERIC(4,3) NOT NULL DEFAULT 0.700,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        archived_at TIMESTAMPTZ NULL
                    )
                    """
                )
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_indicare_ai_memory_user_recent
                    ON indicare_ai_memory_items(user_id, updated_at DESC)
                    WHERE archived_at IS NULL
                    """
                )
                cur.execute(
                    """
                    CREATE INDEX IF NOT EXISTS idx_indicare_ai_memory_project_recent
                    ON indicare_ai_memory_items(project_id, updated_at DESC)
                    WHERE archived_at IS NULL
                    """
                )
                conn.commit()
        finally:
            if conn is not None:
                release_db_connection(conn)

    def add_memory(
        self,
        *,
        current_user: dict[str, Any],
        title: str,
        summary: str,
        themes: list[str] | None = None,
        project_id: str | None = None,
        conversation_id: str | None = None,
        mode: str = "general",
        memory_type: str = "conversation_theme",
        home_id: int | None = None,
        young_person_id: int | None = None,
        source: str = "assistant",
        confidence: float = 0.7,
    ) -> dict[str, Any]:
        self.ensure_schema()
        user_id = self._user_id(current_user)
        if user_id is None:
            return {"ok": False, "error": "missing_user"}

        clean_title = (title or "Assistant memory").strip()[:180]
        clean_summary = (summary or "").strip()[:3000]
        if not clean_summary:
            return {"ok": False, "error": "summary_required"}

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO indicare_ai_memory_items (
                        user_id, home_id, young_person_id, project_id, conversation_id,
                        mode, memory_type, title, summary, themes, source, confidence
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s::jsonb,%s,%s)
                    RETURNING *
                    """,
                    (
                        user_id,
                        home_id or self._home_id(current_user),
                        young_person_id,
                        project_id,
                        conversation_id,
                        mode or "general",
                        memory_type or "conversation_theme",
                        clean_title,
                        clean_summary,
                        json.dumps(themes or []),
                        source or "assistant",
                        max(0.0, min(float(confidence or 0.7), 1.0)),
                    ),
                )
                row = cur.fetchone()
                conn.commit()
                return {"ok": True, "memory": dict(row)}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def recent_memories(
        self,
        *,
        current_user: dict[str, Any],
        project_id: str | None = None,
        home_id: int | None = None,
        young_person_id: int | None = None,
        limit: int = 10,
    ) -> dict[str, Any]:
        self.ensure_schema()
        user_id = self._user_id(current_user)
        if user_id is None:
            return {"ok": False, "memories": [], "error": "missing_user"}

        clauses = ["user_id = %s", "archived_at IS NULL"]
        params: list[Any] = [user_id]
        if project_id:
            clauses.append("(project_id = %s OR project_id IS NULL)")
            params.append(project_id)
        if home_id or self._home_id(current_user):
            clauses.append("(home_id = %s OR home_id IS NULL)")
            params.append(home_id or self._home_id(current_user))
        if young_person_id:
            clauses.append("(young_person_id = %s OR young_person_id IS NULL)")
            params.append(young_person_id)
        params.append(max(1, min(int(limit or 10), 30)))

        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT *
                    FROM indicare_ai_memory_items
                    WHERE {' AND '.join(clauses)}
                    ORDER BY updated_at DESC
                    LIMIT %s
                    """,
                    tuple(params),
                )
                return {"ok": True, "memories": [dict(row) for row in cur.fetchall()]}
        finally:
            if conn is not None:
                release_db_connection(conn)

    def prompt_context(
        self,
        *,
        current_user: dict[str, Any],
        project_id: str | None = None,
        home_id: int | None = None,
        young_person_id: int | None = None,
        limit: int = 8,
    ) -> str:
        result = self.recent_memories(
            current_user=current_user,
            project_id=project_id,
            home_id=home_id,
            young_person_id=young_person_id,
            limit=limit,
        )
        memories = result.get("memories") or []
        if not memories:
            return ""
        lines = [
            "INDICARE LONG-TERM CONTINUITY MEMORY:",
            "Use this gently as standalone IndiCare AI continuity. Do not overclaim memory and do not expose raw database details.",
        ]
        for item in memories:
            themes = item.get("themes") or []
            if isinstance(themes, str):
                try:
                    themes = json.loads(themes)
                except Exception:
                    themes = []
            lines.append(
                f"- {item.get('title')}: {item.get('summary')}"
                + (f" Themes: {', '.join(map(str, themes[:6]))}." if themes else "")
            )
        return "\n".join(lines)

    def _user_id(self, current_user: dict[str, Any]) -> int | None:
        try:
            value = current_user.get("user_id") or current_user.get("id")
            return int(value) if value else None
        except Exception:
            return None

    def _home_id(self, current_user: dict[str, Any]) -> int | None:
        try:
            value = current_user.get("home_id") or current_user.get("selected_home_id") or current_user.get("default_home_id")
            return int(value) if value else None
        except Exception:
            return None
