from __future__ import annotations

from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection
from services.standalone_timeline_intelligence import search_timeline


def search_project(project_id: str, query: str, limit: int = 40) -> dict[str, Any]:
    query = (query or "").strip()
    if not query:
        return {"query": query, "results": [], "groups": {}}

    results: list[dict[str, Any]] = []
    results.extend(_timeline_results(project_id, query))
    results.extend(_db_results(project_id, query, limit=limit))

    ranked = _rank(results, query)[:limit]
    return {
        "query": query,
        "results": ranked,
        "groups": _groups(ranked),
        "summary": _summary(ranked, query),
    }


def _timeline_results(project_id: str, query: str) -> list[dict[str, Any]]:
    try:
        return [
            {
                "type": "timeline",
                "title": "Timeline event",
                "snippet": item.get("event_summary") or "",
                "source_id": str(item.get("id")),
                "metadata": item.get("metadata") or {},
                "created_at": item.get("created_at"),
            }
            for item in search_timeline(project_id, query)
        ]
    except Exception:
        return []


def _db_results(project_id: str, query: str, limit: int) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        like = f"%{query}%"
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT 'upload' AS type, filename AS title, COALESCE(ai_summary, extracted_text, '') AS snippet, id::text AS source_id, created_at
                FROM project_uploads
                WHERE project_id = %s AND (filename ILIKE %s OR extracted_text ILIKE %s OR ai_summary ILIKE %s)
                UNION ALL
                SELECT 'pinned_output' AS type, title, content AS snippet, id::text AS source_id, created_at
                FROM pinned_outputs
                WHERE project_id = %s AND (title ILIKE %s OR content ILIKE %s)
                UNION ALL
                SELECT 'conversation' AS type, role AS title, content AS snippet, m.id::text AS source_id, m.created_at
                FROM conversation_messages m
                JOIN project_conversations c ON c.id = m.conversation_id
                WHERE c.project_id = %s AND m.content ILIKE %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (project_id, like, like, like, project_id, like, like, project_id, like, limit),
            )
            return [dict(row) for row in cur.fetchall() or []]
    finally:
        release_db_connection(conn)


def _rank(results: list[dict[str, Any]], query: str) -> list[dict[str, Any]]:
    terms = [term.lower() for term in query.split() if len(term) > 2]
    for item in results:
        text = f"{item.get('title', '')} {item.get('snippet', '')}".lower()
        score = sum(3 if term in str(item.get("title", "")).lower() else 1 for term in terms if term in text)
        if item.get("type") == "timeline":
            score += 2
        if any(term in text for term in ["safeguarding", "risk", "missing", "police", "manager", "ofsted"]):
            score += 1
        item["score"] = score
        item["snippet"] = str(item.get("snippet") or "")[:700]
    return sorted(results, key=lambda value: value.get("score", 0), reverse=True)


def _groups(results: list[dict[str, Any]]) -> dict[str, int]:
    groups: dict[str, int] = {}
    for item in results:
        key = str(item.get("type") or "other")
        groups[key] = groups.get(key, 0) + 1
    return groups


def _summary(results: list[dict[str, Any]], query: str) -> str:
    if not results:
        return f"No operational results found for '{query}'."
    groups = _groups(results)
    group_text = ", ".join(f"{count} {name.replace('_', ' ')}" for name, count in groups.items())
    return f"Found {len(results)} result(s) for '{query}' across {group_text}."
