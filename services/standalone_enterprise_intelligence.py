from __future__ import annotations

import hashlib
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from psycopg2.extras import Json, RealDictCursor

from db.connection import get_db_connection, release_db_connection

VECTOR_DIM = 384


def _id() -> str:
    return str(uuid4())


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _rows(rows: Any) -> list[dict[str, Any]]:
    return [dict(row) for row in rows or []]


def _tokens(text: str) -> list[str]:
    return [token for token in re.findall(r"[a-zA-Z][a-zA-Z\-']{2,}", (text or "").lower()) if token not in STOP_WORDS]


def _chunk(text: str, size: int = 900, overlap: int = 120) -> list[str]:
    clean = re.sub(r"\s+", " ", text or "").strip()
    if not clean:
        return []
    chunks = []
    start = 0
    while start < len(clean):
        chunks.append(clean[start:start + size])
        start += max(1, size - overlap)
    return chunks[:80]


def _hash_embedding(text: str) -> list[float]:
    vector = [0.0] * VECTOR_DIM
    for token in _tokens(text):
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        index = int.from_bytes(digest[:4], "big") % VECTOR_DIM
        sign = 1.0 if digest[4] % 2 == 0 else -1.0
        vector[index] += sign
    norm = math.sqrt(sum(value * value for value in vector)) or 1.0
    return [round(value / norm, 6) for value in vector]


def _cosine(a: list[float], b: list[float]) -> float:
    return sum(x * y for x, y in zip(a, b))


def index_project(project_id: str) -> dict[str, Any]:
    conn = get_db_connection()
    indexed = 0
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM ai_embeddings WHERE project_id = %s", (project_id,))
            for source_type, table, content_col, title_col in [
                ("upload", "project_uploads", "extracted_text", "filename"),
                ("pin", "pinned_outputs", "content", "title"),
            ]:
                cur.execute(f"SELECT id, {content_col} AS content, {title_col} AS title FROM {table} WHERE project_id = %s", (project_id,))
                for row in cur.fetchall():
                    for number, chunk in enumerate(_chunk(row.get("content") or "")):
                        cur.execute(
                            """
                            INSERT INTO ai_embeddings (id, project_id, source_type, source_id, content_chunk, embedding_vector, metadata, created_at)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                            """,
                            (_id(), project_id, source_type, row["id"], chunk, Json(_hash_embedding(chunk)), Json({"title": row.get("title"), "chunk": number})),
                        )
                        indexed += 1
            cur.execute(
                """
                SELECT m.id, m.content, m.role, c.project_id
                FROM conversation_messages m
                JOIN project_conversations c ON c.id = m.conversation_id
                WHERE c.project_id = %s
                """,
                (project_id,),
            )
            for row in cur.fetchall():
                for number, chunk in enumerate(_chunk(row.get("content") or "")):
                    cur.execute(
                        """
                        INSERT INTO ai_embeddings (id, project_id, source_type, source_id, content_chunk, embedding_vector, metadata, created_at)
                        VALUES (%s, %s, 'message', %s, %s, %s, %s, NOW())
                        """,
                        (_id(), project_id, row["id"], chunk, Json(_hash_embedding(chunk)), Json({"role": row.get("role"), "chunk": number})),
                    )
                    indexed += 1
        conn.commit()
        return {"indexed_chunks": indexed, "project_id": project_id}
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


def semantic_search(project_id: str, query: str, limit: int = 8) -> list[dict[str, Any]]:
    query_vector = _hash_embedding(query)
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, source_type, source_id, content_chunk, embedding_vector, metadata, created_at
                FROM ai_embeddings
                WHERE project_id = %s
                ORDER BY created_at DESC
                LIMIT 2000
                """,
                (project_id,),
            )
            scored = []
            for row in cur.fetchall():
                vector = row.get("embedding_vector") or []
                if isinstance(vector, str):
                    import json
                    vector = json.loads(vector)
                score = _cosine(query_vector, vector)
                if score > 0:
                    scored.append({
                        "id": str(row["id"]),
                        "sourceType": row.get("source_type"),
                        "sourceId": str(row.get("source_id")),
                        "score": round(score, 4),
                        "excerpt": row.get("content_chunk"),
                        "metadata": row.get("metadata") or {},
                    })
            return sorted(scored, key=lambda item: item["score"], reverse=True)[:limit]
    finally:
        release_db_connection(conn)


def extract_chronology(project_id: str) -> dict[str, Any]:
    conn = get_db_connection()
    inserted = 0
    date_pattern = re.compile(r"(?P<date>\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b)?\s*(?P<time>\b\d{1,2}:\d{2}\b)?(?P<text>.{0,240})", re.I)
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT id, filename, extracted_text FROM project_uploads WHERE project_id = %s", (project_id,))
            uploads = cur.fetchall()
            for upload in uploads:
                text = upload.get("extracted_text") or ""
                for match in date_pattern.finditer(text):
                    event_text = re.sub(r"\s+", " ", match.group("text") or "").strip()
                    if not event_text or not (match.group("date") or match.group("time")):
                        continue
                    cur.execute(
                        """
                        INSERT INTO chronology_entries (
                            id, project_id, upload_id, event_date, event_type, event_summary,
                            action_taken, outcome, safeguarding_flag, metadata, created_at
                        )
                        VALUES (%s, %s, %s, NULL, %s, %s, NULL, NULL, %s, %s, NOW())
                        """,
                        (
                            _id(),
                            project_id,
                            upload["id"],
                            "extracted_event",
                            f"{match.group('date') or ''} {match.group('time') or ''} {event_text}".strip(),
                            _has_safeguarding_language(event_text),
                            Json({"source_filename": upload.get("filename"), "raw_date": match.group("date"), "raw_time": match.group("time")}),
                        ),
                    )
                    inserted += 1
                    if inserted >= 100:
                        break
        conn.commit()
        return {"project_id": project_id, "chronology_entries_created": inserted}
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


def generate_dashboard(project_id: str) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT extracted_text FROM project_uploads WHERE project_id = %s
                UNION ALL
                SELECT content FROM pinned_outputs WHERE project_id = %s
                """,
                (project_id, project_id),
            )
            corpus = "\n".join(row.get("extracted_text") or "" for row in cur.fetchall())
            dashboard = analyse_corpus(corpus)
            cur.execute(
                """
                INSERT INTO leadership_dashboards (
                    id, project_id, safeguarding_themes, chronology_patterns, evidence_gaps,
                    recording_quality_themes, leadership_actions, recurring_incidents, generated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING *
                """,
                (
                    _id(), project_id,
                    Json(dashboard["safeguardingThemes"]),
                    Json(dashboard["chronologyPatterns"]),
                    Json(dashboard["evidenceGaps"]),
                    Json(dashboard["recordingQualityThemes"]),
                    Json(dashboard["leadershipActions"]),
                    Json(dashboard["recurringIncidents"]),
                ),
            )
            row = dict(cur.fetchone())
        conn.commit()
        return {"dashboard": row, "summary": dashboard}
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


def multi_document_reasoning(project_id: str) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT filename, extracted_text, ai_summary FROM project_uploads WHERE project_id = %s", (project_id,))
            uploads = _rows(cur.fetchall())
            corpus = "\n".join((item.get("extracted_text") or item.get("ai_summary") or "") for item in uploads)
        analysis = analyse_corpus(corpus)
        return {
            "documentCount": len(uploads),
            "recurringConcerns": analysis["recurringIncidents"],
            "safeguardingThemes": analysis["safeguardingThemes"],
            "leadershipThemes": analysis["leadershipActions"],
            "evidenceGaps": analysis["evidenceGaps"],
            "recommendedNextActions": ["Generate evidence pack", "Create action plan", "Review chronology gaps"],
        }
    finally:
        release_db_connection(conn)


def analyse_corpus(corpus: str) -> dict[str, list[str]]:
    lower = (corpus or "").lower()
    tokens = Counter(_tokens(lower))
    recurring = [word for word, count in tokens.most_common(40) if count >= 2 and word in KEY_OPERATIONAL_TERMS]
    return {
        "safeguardingThemes": _present_terms(lower, ["safeguarding", "risk", "harm", "exploitation", "missing", "police", "injury", "self-harm"]),
        "chronologyPatterns": _present_terms(lower, ["chronology", "timeline", "returned", "left", "reported", "contacted", "reviewed"]),
        "evidenceGaps": _present_terms(lower, ["unknown", "unclear", "not recorded", "missing information", "not provided", "no evidence"]),
        "recordingQualityThemes": _present_terms(lower, ["child voice", "voice", "wishes", "feelings", "unclear", "judgemental", "factual"]),
        "leadershipActions": _present_terms(lower, ["manager", "oversight", "review", "audit", "supervision", "training", "action plan"]),
        "recurringIncidents": recurring[:10] or _present_terms(lower, ["missing", "incident", "risk", "police", "behaviour", "escalation"]),
    }


def create_relationship(project_id: str, source_type: str, source_id: str, target_type: str, target_id: str, relationship_type: str) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO intelligence_relationships (
                    id, project_id, source_type, source_id, target_type, target_id, relationship_type, metadata, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                RETURNING *
                """,
                (_id(), project_id, source_type, source_id, target_type, target_id, relationship_type, Json({})),
            )
            row = dict(cur.fetchone())
        conn.commit()
        return row
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


def _present_terms(lower: str, terms: list[str]) -> list[str]:
    return [term for term in terms if term in lower][:12]


def _has_safeguarding_language(text: str) -> bool:
    lower = (text or "").lower()
    return any(term in lower for term in ["risk", "harm", "missing", "police", "injury", "safeguarding", "exploitation"])


STOP_WORDS = {
    "the", "and", "for", "with", "that", "this", "from", "were", "was", "are", "have", "has",
    "not", "but", "his", "her", "they", "their", "there", "then", "than", "into", "about",
    "staff", "young", "person", "home", "record", "review", "would", "could", "should",
}

KEY_OPERATIONAL_TERMS = {
    "missing", "police", "risk", "harm", "incident", "safeguarding", "manager", "oversight",
    "chronology", "behaviour", "escalation", "recording", "voice", "injury", "return", "returned",
}
