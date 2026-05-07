from __future__ import annotations

import json
import re
from typing import Any
from uuid import uuid4

from psycopg2.extras import Json, RealDictCursor

from db.connection import get_db_connection, release_db_connection


def _id() -> str:
    return str(uuid4())


def _row(row: Any) -> dict[str, Any] | None:
    return dict(row) if row else None


def _rows(rows: Any) -> list[dict[str, Any]]:
    return [dict(row) for row in rows or []]


def _default_actions(mode: str | None) -> list[str]:
    mode = (mode or "ofsted").lower()
    if mode == "safeguarding":
        return ["Create chronology", "Review safeguarding threshold", "Extract missing information", "Generate manager review"]
    if mode == "records":
        return ["Improve wording", "Check child voice", "Review chronology", "Create manager summary"]
    if mode == "practice":
        return ["Generate reflective prompts", "Review relational practice", "Summarise emotional themes", "Create learning actions"]
    return ["Prepare evidence summary", "Generate inspection questions", "Identify evidence gaps", "Create leadership actions"]


def _themes(lower: str) -> list[str]:
    mapping = {
        "Safeguarding": ["safeguarding", "risk", "harm", "exploitation"],
        "Missing from care": ["missing", "absent", "police"],
        "Recording quality": ["record", "chronology", "daily log"],
        "Leadership": ["manager", "oversight", "review", "audit"],
        "Ofsted": ["ofsted", "quality standard", "inspection"],
        "Reflective practice": ["reflection", "trauma", "relational", "co-regulation"],
    }
    themes = [label for label, terms in mapping.items() if any(term in lower for term in terms)]
    return themes or ["Residential care practice"]


def _find_terms(lower: str, terms: list[str]) -> list[str]:
    return [term for term in terms if term in lower][:8]


def _plain_summary(text: str, filename: str) -> str:
    clean = re.sub(r"\s+", " ", text or "").strip()
    if not clean:
        return f"{filename} was uploaded but no readable text was extracted."
    return clean[:420] + ("..." if len(clean) > 420 else "")


def evidence_summary(text: str, filename: str = "document") -> dict[str, Any]:
    clean = str(text or "")
    lower = clean.lower()
    return {
        "mainThemes": _themes(lower),
        "risksIdentified": _find_terms(lower, ["missing", "risk", "harm", "incident", "police", "exploitation", "injury", "self-harm"]),
        "leadershipImplications": _find_terms(lower, ["manager", "oversight", "review", "audit", "supervision", "training"]),
        "inspectionRelevance": _find_terms(lower, ["ofsted", "quality standard", "regulation", "sccif", "evidence", "impact"]),
        "missingEvidence": _find_terms(lower, ["unknown", "not recorded", "missing information", "not provided", "unclear"]),
        "suggestedActions": ["Review evidence gaps", "Consider manager oversight", "Check chronology completeness"],
        "plainSummary": _plain_summary(clean, filename),
    }


def _memory_summary(project: dict[str, Any], *, uploads: int = 0, pins: int = 0, messages: int = 0) -> str:
    parts = [project.get("description") or "Standalone children’s residential care AI project."]
    if uploads:
        parts.append(f"Files uploaded: {uploads}.")
    if pins:
        parts.append(f"Pinned outputs: {pins}.")
    if messages:
        parts.append(f"Conversation messages: {messages}.")
    topics = project.get("recent_topics") or []
    if topics:
        parts.append("Recent themes: " + ", ".join(topics[:6]) + ".")
    return " ".join(parts)


def _project_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row.get("id")),
        "userId": row.get("user_id"),
        "name": row.get("name"),
        "description": row.get("description"),
        "mode": row.get("mode") or "ofsted",
        "memorySummary": row.get("memory_summary") or "",
        "recentTopics": row.get("recent_topics") or [],
        "suggestedActions": row.get("suggested_actions") or _default_actions(row.get("mode")),
        "metadata": row.get("metadata") or {},
        "createdAt": row.get("created_at").isoformat() if row.get("created_at") else None,
        "updatedAt": row.get("updated_at").isoformat() if row.get("updated_at") else None,
        "uploads": [],
        "pinnedOutputs": [],
        "messages": [],
    }


def _upload_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row.get("id")),
        "name": row.get("filename"),
        "filename": row.get("filename"),
        "fileType": row.get("file_type"),
        "text": row.get("extracted_text"),
        "summary": _json_or_text(row.get("ai_summary")),
        "tags": row.get("tags") or [],
        "uploadedAt": row.get("created_at").isoformat() if row.get("created_at") else None,
    }


def _pin_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row.get("id")),
        "title": row.get("title"),
        "content": row.get("content"),
        "type": row.get("output_type"),
        "createdAt": row.get("created_at").isoformat() if row.get("created_at") else None,
    }


def _message_from_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(row.get("id")),
        "conversationId": str(row.get("conversation_id")) if row.get("conversation_id") else None,
        "role": row.get("role"),
        "content": row.get("content"),
        "operationalType": row.get("operational_type"),
        "metadata": row.get("metadata") or {},
        "createdAt": row.get("created_at").isoformat() if row.get("created_at") else None,
    }


def _json_or_text(value: Any) -> Any:
    if isinstance(value, (dict, list)):
        return value
    if not isinstance(value, str):
        return value
    try:
        return json.loads(value)
    except Exception:
        return value


def _refresh_project_memory(conn: Any, project_id: str) -> None:
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute("SELECT * FROM intelligence_projects WHERE id = %s", (project_id,))
        project = _row(cur.fetchone())
        if not project:
            return
        cur.execute("SELECT COUNT(*) AS count FROM project_uploads WHERE project_id = %s", (project_id,))
        uploads = int(cur.fetchone()["count"])
        cur.execute("SELECT COUNT(*) AS count FROM pinned_outputs WHERE project_id = %s", (project_id,))
        pins = int(cur.fetchone()["count"])
        cur.execute(
            """
            SELECT COUNT(*) AS count
            FROM conversation_messages m
            JOIN project_conversations c ON c.id = m.conversation_id
            WHERE c.project_id = %s
            """,
            (project_id,),
        )
        messages = int(cur.fetchone()["count"])
        summary = _memory_summary(project, uploads=uploads, pins=pins, messages=messages)
        cur.execute(
            "UPDATE intelligence_projects SET memory_summary = %s, updated_at = NOW() WHERE id = %s",
            (summary, project_id),
        )


def _get_or_create_conversation(cur: Any, project_id: str, title: str | None = None, conversation_id: str | None = None) -> str:
    if conversation_id:
        cur.execute("SELECT id FROM project_conversations WHERE id = %s AND project_id = %s", (conversation_id, project_id))
        row = cur.fetchone()
        if row:
            return str(row["id"])
    new_id = _id()
    cur.execute(
        """
        INSERT INTO project_conversations (id, project_id, title, created_at, updated_at)
        VALUES (%s, %s, %s, NOW(), NOW())
        RETURNING id
        """,
        (new_id, project_id, title or "New chat"),
    )
    return str(cur.fetchone()["id"])


def list_projects(user_id: Any) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM intelligence_projects WHERE user_id = %s ORDER BY updated_at DESC",
                (user_id,),
            )
            return [_project_from_row(row) for row in cur.fetchall()]
    finally:
        release_db_connection(conn)


def create_project(user_id: Any, payload: dict[str, Any]) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        project_id = _id()
        mode = payload.get("mode") or "ofsted"
        suggested = payload.get("suggestedActions") or _default_actions(mode)
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO intelligence_projects (
                    id, user_id, name, description, mode, memory_summary,
                    recent_topics, suggested_actions, metadata, created_at, updated_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                RETURNING *
                """,
                (
                    project_id,
                    user_id,
                    payload.get("name") or "New Project",
                    payload.get("description") or "Standalone IndiCare Intelligence project.",
                    mode,
                    payload.get("memorySummary") or payload.get("description") or "Standalone IndiCare Intelligence project.",
                    Json(payload.get("recentTopics") or []),
                    Json(suggested),
                    Json(payload.get("metadata") or {}),
                ),
            )
            row = _row(cur.fetchone())
        conn.commit()
        return _project_from_row(row)
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


def get_project(user_id: Any, project_id: str) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM intelligence_projects WHERE id = %s AND user_id = %s LIMIT 1",
                (project_id, user_id),
            )
            project = _row(cur.fetchone())
            if not project:
                return None
            result = _project_from_row(project)
            cur.execute("SELECT * FROM project_uploads WHERE project_id = %s ORDER BY created_at DESC", (project_id,))
            result["uploads"] = [_upload_from_row(row) for row in cur.fetchall()]
            cur.execute("SELECT * FROM pinned_outputs WHERE project_id = %s ORDER BY created_at DESC", (project_id,))
            result["pinnedOutputs"] = [_pin_from_row(row) for row in cur.fetchall()]
            cur.execute(
                """
                SELECT m.* FROM conversation_messages m
                JOIN project_conversations c ON c.id = m.conversation_id
                WHERE c.project_id = %s
                ORDER BY m.created_at ASC
                """,
                (project_id,),
            )
            result["messages"] = [_message_from_row(row) for row in cur.fetchall()]
            return result
    finally:
        release_db_connection(conn)


def update_project(user_id: Any, project_id: str, patch: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        allowed = {
            "name": "name",
            "description": "description",
            "mode": "mode",
            "memorySummary": "memory_summary",
            "suggestedActions": "suggested_actions",
        }
        fields = []
        values: list[Any] = []
        for key, column in allowed.items():
            if key in patch and patch[key] is not None:
                fields.append(f"{column} = %s")
                values.append(Json(patch[key]) if key == "suggestedActions" else patch[key])
        if not fields:
            return get_project(user_id, project_id)
        values.extend([project_id, user_id])
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                f"""
                UPDATE intelligence_projects
                SET {', '.join(fields)}, updated_at = NOW()
                WHERE id = %s AND user_id = %s
                RETURNING *
                """,
                values,
            )
            row = _row(cur.fetchone())
        conn.commit()
        return _project_from_row(row) if row else None
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


def add_message(user_id: Any, project_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM intelligence_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            if not cur.fetchone():
                return None
            conversation_id = _get_or_create_conversation(
                cur,
                project_id,
                title=(payload.get("content") or "New chat")[:80],
                conversation_id=payload.get("conversationId"),
            )
            cur.execute(
                """
                INSERT INTO conversation_messages (
                    id, conversation_id, role, content, operational_type, metadata, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                RETURNING *
                """,
                (
                    _id(),
                    conversation_id,
                    payload.get("role") or "user",
                    str(payload.get("content") or "")[:120000],
                    payload.get("operationalType"),
                    Json(payload.get("metadata") or {}),
                ),
            )
            row = _message_from_row(cur.fetchone())
            cur.execute("UPDATE project_conversations SET updated_at = NOW() WHERE id = %s", (conversation_id,))
            _refresh_project_memory(conn, project_id)
        conn.commit()
        return row
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


def list_messages(user_id: Any, project_id: str) -> list[dict[str, Any]] | None:
    project = get_project(user_id, project_id)
    if not project:
        return None
    return project.get("messages") or []


def add_upload(user_id: Any, project_id: str, filename: str, text: str) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        summary = evidence_summary(text, filename)
        tags = summary["mainThemes"]
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM intelligence_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            if not cur.fetchone():
                return None
            upload_id = _id()
            cur.execute(
                """
                INSERT INTO project_uploads (
                    id, project_id, uploaded_by, filename, file_type, extracted_text,
                    ai_summary, tags, upload_status, embedding_status, metadata, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 'processed', 'pending', %s, NOW())
                RETURNING *
                """,
                (
                    upload_id,
                    project_id,
                    user_id,
                    filename,
                    filename.rsplit(".", 1)[-1].lower() if "." in filename else None,
                    text[:200000],
                    json.dumps(summary, ensure_ascii=False),
                    Json(tags),
                    Json({"summary": summary}),
                ),
            )
            upload = _upload_from_row(cur.fetchone())
            cur.execute(
                """
                INSERT INTO evidence_summaries (
                    id, project_id, upload_id, title, main_themes, risks_identified,
                    leadership_implications, inspection_relevance, missing_evidence,
                    suggested_actions, summary, created_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                """,
                (
                    _id(),
                    project_id,
                    upload_id,
                    f"Evidence summary: {filename}",
                    Json(summary["mainThemes"]),
                    Json(summary["risksIdentified"]),
                    Json(summary["leadershipImplications"]),
                    Json(summary["inspectionRelevance"]),
                    Json(summary["missingEvidence"]),
                    Json(summary["suggestedActions"]),
                    summary["plainSummary"],
                ),
            )
            _refresh_project_memory(conn, project_id)
        conn.commit()
        return upload
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


def add_pin(user_id: Any, project_id: str, payload: dict[str, Any]) -> dict[str, Any] | None:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM intelligence_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            if not cur.fetchone():
                return None
            cur.execute(
                """
                INSERT INTO pinned_outputs (id, project_id, title, output_type, content, metadata, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                RETURNING *
                """,
                (
                    _id(),
                    project_id,
                    payload.get("title") or "Pinned output",
                    payload.get("type") or "output",
                    str(payload.get("content") or "")[:120000],
                    Json(payload.get("metadata") or {}),
                ),
            )
            row = _pin_from_row(cur.fetchone())
            _refresh_project_memory(conn, project_id)
        conn.commit()
        return row
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


def search_project(user_id: Any, project_id: str, query: str) -> list[dict[str, Any]] | None:
    conn = get_db_connection()
    try:
        q = (query or "").strip()
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id FROM intelligence_projects WHERE id = %s AND user_id = %s", (project_id, user_id))
            if not cur.fetchone():
                return None
            like = f"%{q}%"
            cur.execute(
                """
                SELECT 'message' AS source_type, m.id, m.role AS title, LEFT(m.content, 320) AS excerpt, m.created_at
                FROM conversation_messages m
                JOIN project_conversations c ON c.id = m.conversation_id
                WHERE c.project_id = %s AND m.content ILIKE %s
                UNION ALL
                SELECT 'upload' AS source_type, u.id, u.filename AS title, LEFT(COALESCE(u.extracted_text, u.ai_summary, ''), 320) AS excerpt, u.created_at
                FROM project_uploads u
                WHERE u.project_id = %s AND (u.filename ILIKE %s OR u.extracted_text ILIKE %s OR u.ai_summary ILIKE %s)
                UNION ALL
                SELECT 'pin' AS source_type, p.id, p.title, LEFT(p.content, 320) AS excerpt, p.created_at
                FROM pinned_outputs p
                WHERE p.project_id = %s AND (p.title ILIKE %s OR p.content ILIKE %s)
                ORDER BY created_at DESC
                LIMIT 25
                """,
                (project_id, like, project_id, like, like, like, project_id, like, like),
            )
            return _rows(cur.fetchall())
    finally:
        release_db_connection(conn)


def export_project(user_id: Any, project_id: str) -> str | None:
    project = get_project(user_id, project_id)
    if not project:
        return None
    html = [
        "<!doctype html><html><head><meta charset='utf-8'><title>IndiCare Intelligence Export</title>",
        "<style>body{font-family:Arial,sans-serif;line-height:1.55;color:#142033;padding:32px}h1{color:#0969ff}.card{border:1px solid #dbe4f0;border-radius:16px;padding:16px;margin:14px 0;white-space:pre-wrap}</style>",
        "</head><body>",
        f"<h1>{_html(project.get('name'))}</h1>",
        f"<p>{_html(project.get('memorySummary'))}</p>",
        "<h2>Uploads</h2>",
    ]
    for upload in project.get("uploads", []):
        html.append(f"<div class='card'><strong>{_html(upload.get('filename') or upload.get('name'))}</strong><p>{_html(upload.get('summary'))}</p></div>")
    html.append("<h2>Pinned Outputs</h2>")
    for pin in project.get("pinnedOutputs", []):
        html.append(f"<div class='card'><strong>{_html(pin.get('title'))}</strong><p>{_html(pin.get('content'))}</p></div>")
    html.append("</body></html>")
    return "".join(html)


def _html(value: Any) -> str:
    return str(value or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
