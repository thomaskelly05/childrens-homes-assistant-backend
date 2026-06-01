from __future__ import annotations

import logging
import uuid
from typing import Any

from psycopg2.extras import RealDictCursor

logger = logging.getLogger(__name__)


def _has_table_error(exc: Exception) -> bool:
    text = str(exc).lower()
    return "orb_projects" in text or "orb_project_chats" in text or "does not exist" in text


def _project_payload(row: dict[str, Any], chat_ids: list[str]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "title": row["title"],
        "description": row.get("description"),
        "memory": row.get("memory"),
        "chat_ids": chat_ids,
        "created_at": row.get("created_at"),
        "updated_at": row.get("updated_at"),
    }


def _load_chat_ids(conn, project_id: str) -> list[str]:
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT chat_id FROM orb_project_chats
                WHERE project_id = %s
                ORDER BY created_at ASC
                """,
                (project_id,),
            )
            return [str(row[0]) for row in cur.fetchall()]
    except Exception as exc:
        if _has_table_error(exc):
            logger.debug("orb_project_chats unavailable", exc_info=True)
            return []
        raise


def list_orb_projects(conn, *, user_id: int) -> list[dict[str, Any]]:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, title, description, memory, created_at, updated_at
                FROM orb_projects
                WHERE user_id = %s
                ORDER BY updated_at DESC, created_at DESC
                """,
                (user_id,),
            )
            rows = [dict(row) for row in cur.fetchall()]
        return [_project_payload(row, _load_chat_ids(conn, row["id"])) for row in rows]
    except Exception as exc:
        if _has_table_error(exc):
            logger.debug("orb_projects unavailable", exc_info=True)
            return []
        logger.exception("list_orb_projects failed user_id=%s", user_id)
        return []


def get_orb_project(conn, *, user_id: int, project_id: str) -> dict[str, Any] | None:
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, user_id, title, description, memory, created_at, updated_at
                FROM orb_projects
                WHERE user_id = %s AND id = %s
                LIMIT 1
                """,
                (user_id, project_id),
            )
            row = cur.fetchone()
            if not row:
                return None
            return _project_payload(dict(row), _load_chat_ids(conn, project_id))
    except Exception as exc:
        if _has_table_error(exc):
            logger.debug("get_orb_project unavailable", exc_info=True)
            return None
        logger.exception("get_orb_project failed user_id=%s project_id=%s", user_id, project_id)
        return None


def get_orb_project_chat_link(conn, *, project_id: str, chat_id: str) -> bool:
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT 1 FROM orb_project_chats
                WHERE project_id = %s AND chat_id = %s
                LIMIT 1
                """,
                (project_id, chat_id.strip()),
            )
            return cur.fetchone() is not None
    except Exception as exc:
        if _has_table_error(exc):
            logger.debug("get_orb_project_chat_link unavailable", exc_info=True)
            return False
        logger.exception("get_orb_project_chat_link failed project_id=%s chat_id=%s", project_id, chat_id)
        return False


def create_orb_project(
    conn,
    *,
    user_id: int,
    title: str,
    description: str | None = None,
    memory: str | None = None,
    project_id: str | None = None,
) -> dict[str, Any]:
    pid = (project_id or str(uuid.uuid4())).strip()
    if not pid:
        raise ValueError("project_id required")
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            INSERT INTO orb_projects (id, user_id, title, description, memory)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id, user_id, title, description, memory, created_at, updated_at
            """,
            (pid, user_id, title.strip(), description, memory),
        )
        row = dict(cur.fetchone())
    return _project_payload(row, [])


def update_orb_project(
    conn,
    *,
    user_id: int,
    project_id: str,
    title: str | None = None,
    description: str | None = None,
    memory: str | None = None,
) -> dict[str, Any] | None:
    existing = get_orb_project(conn, user_id=user_id, project_id=project_id)
    if not existing:
        return None
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE orb_projects
                SET title = COALESCE(%s, title),
                    description = COALESCE(%s, description),
                    memory = COALESCE(%s, memory),
                    updated_at = NOW()
                WHERE user_id = %s AND id = %s
                RETURNING id, user_id, title, description, memory, created_at, updated_at
                """,
                (
                    title.strip() if title else None,
                    description,
                    memory,
                    user_id,
                    project_id,
                ),
            )
            row = dict(cur.fetchone())
        return _project_payload(row, _load_chat_ids(conn, project_id))
    except Exception:
        logger.exception("update_orb_project failed user_id=%s project_id=%s", user_id, project_id)
        return None


def delete_orb_project(conn, *, user_id: int, project_id: str) -> bool:
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM orb_projects WHERE user_id = %s AND id = %s",
                (user_id, project_id),
            )
            return cur.rowcount > 0
    except Exception as exc:
        if _has_table_error(exc):
            return False
        logger.exception("delete_orb_project failed user_id=%s project_id=%s", user_id, project_id)
        return False


def link_orb_project_chat(conn, *, user_id: int, project_id: str, chat_id: str) -> dict[str, Any] | None:
    project = get_orb_project(conn, user_id=user_id, project_id=project_id)
    if not project:
        return None
    chat_id = chat_id.strip()
    if not chat_id:
        return project
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO orb_project_chats (project_id, chat_id)
                VALUES (%s, %s)
                ON CONFLICT (project_id, chat_id) DO NOTHING
                """,
                (project_id, chat_id),
            )
            cur.execute(
                "UPDATE orb_projects SET updated_at = NOW() WHERE id = %s AND user_id = %s",
                (project_id, user_id),
            )
    except Exception:
        logger.exception(
            "link_orb_project_chat failed user_id=%s project_id=%s chat_id=%s",
            user_id,
            project_id,
            chat_id,
        )
        return project
    return get_orb_project(conn, user_id=user_id, project_id=project_id)


def unlink_orb_project_chat(conn, *, user_id: int, project_id: str, chat_id: str) -> dict[str, Any] | None:
    project = get_orb_project(conn, user_id=user_id, project_id=project_id)
    if not project:
        return None
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM orb_project_chats WHERE project_id = %s AND chat_id = %s",
                (project_id, chat_id.strip()),
            )
            cur.execute(
                "UPDATE orb_projects SET updated_at = NOW() WHERE id = %s AND user_id = %s",
                (project_id, user_id),
            )
    except Exception:
        logger.exception(
            "unlink_orb_project_chat failed user_id=%s project_id=%s chat_id=%s",
            user_id,
            project_id,
            chat_id,
        )
        return project
    return get_orb_project(conn, user_id=user_id, project_id=project_id)
