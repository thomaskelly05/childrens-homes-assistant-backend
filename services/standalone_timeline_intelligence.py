from __future__ import annotations

import re
from collections import Counter
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from psycopg2.extras import Json, RealDictCursor

from db.connection import get_db_connection, release_db_connection


def _id() -> str:
    return str(uuid4())


def _rows(rows: Any) -> list[dict[str, Any]]:
    return [dict(row) for row in rows or []]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _text_sources(cur: Any, project_id: str) -> list[dict[str, Any]]:
    cur.execute(
        """
        SELECT 'upload' AS source_type, id, filename AS title, COALESCE(extracted_text, ai_summary, '') AS content, created_at
        FROM project_uploads
        WHERE project_id = %s
        UNION ALL
        SELECT 'pin' AS source_type, id, title, content, created_at
        FROM pinned_outputs
        WHERE project_id = %s
        UNION ALL
        SELECT 'message' AS source_type, m.id, m.role AS title, m.content, m.created_at
        FROM conversation_messages m
        JOIN project_conversations c ON c.id = m.conversation_id
        WHERE c.project_id = %s
        ORDER BY created_at DESC
        LIMIT 300
        """,
        (project_id, project_id, project_id),
    )
    return _rows(cur.fetchall())


def rebuild_timeline(project_id: str) -> dict[str, Any]:
    conn = get_db_connection()
    created = 0
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("DELETE FROM chronology_entries WHERE project_id = %s AND event_type = 'suite_extracted'", (project_id,))
            for source in _text_sources(cur, project_id):
                for event in extract_events(source.get("content") or ""):
                    cur.execute(
                        """
                        INSERT INTO chronology_entries (
                            id, project_id, upload_id, event_date, event_type, event_summary,
                            action_taken, outcome, safeguarding_flag, metadata, created_at
                        ) VALUES (%s, %s, NULL, NULL, 'suite_extracted', %s, NULL, NULL, %s, %s, NOW())
                        """,
                        (
                            _id(),
                            project_id,
                            event["summary"],
                            event["safeguardingFlag"],
                            Json({
                                "raw_date": event.get("date"),
                                "raw_time": event.get("time"),
                                "source_type": source.get("source_type"),
                                "source_id": str(source.get("id")),
                                "source_title": source.get("title"),
                                "severity": event.get("severity"),
                            }),
                        ),
                    )
                    created += 1
        conn.commit()
        return {"project_id": project_id, "created": created}
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)


def timeline(project_id: str) -> dict[str, Any]:
    conn = get_db_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, event_summary, safeguarding_flag, metadata, created_at
                FROM chronology_entries
                WHERE project_id = %s
                ORDER BY created_at DESC
                LIMIT 80
                """,
                (project_id,),
            )
            entries = _rows(cur.fetchall())
            analysis = analyse_timeline(entries)
            return {"events": entries, "analysis": analysis}
    finally:
        release_db_connection(conn)


def search_timeline(project_id: str, query: str) -> list[dict[str, Any]]:
    conn = get_db_connection()
    try:
        like = f"%{query.strip()}%"
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT id, event_summary, safeguarding_flag, metadata, created_at
                FROM chronology_entries
                WHERE project_id = %s
                AND (event_summary ILIKE %s OR CAST(metadata AS TEXT) ILIKE %s)
                ORDER BY created_at DESC
                LIMIT 50
                """,
                (project_id, like, like),
            )
            return _rows(cur.fetchall())
    finally:
        release_db_connection(conn)


def timeline_summary(project_id: str) -> dict[str, Any]:
    data = timeline(project_id)
    events = data["events"]
    analysis = data["analysis"]
    return {
        "summary": build_summary(events, analysis),
        "analysis": analysis,
        "eventCount": len(events),
    }


def build_summary(events: list[dict[str, Any]], analysis: dict[str, Any]) -> str:
    if not events:
        return "No chronology events have been captured yet."
    parts = [f"{len(events)} chronology event(s) captured."]
    if analysis["safeguardingFlags"]:
        parts.append(f"{analysis['safeguardingFlags']} safeguarding-linked event(s) identified.")
    if analysis["recurringConcerns"]:
        parts.append("Recurring concerns: " + ", ".join(analysis["recurringConcerns"][:5]) + ".")
    if analysis["alerts"]:
        parts.append("Key alert: " + analysis["alerts"][0] + ".")
    return " ".join(parts)


def analyse_timeline(events: list[dict[str, Any]]) -> dict[str, Any]:
    corpus = " ".join(str(event.get("event_summary") or "") for event in events).lower()
    words = Counter(re.findall(r"[a-z][a-z\-]{3,}", corpus))
    recurring = [word for word, count in words.most_common(30) if count >= 2 and word in OPERATIONAL_TERMS]
    safeguarding_flags = sum(1 for event in events if event.get("safeguarding_flag"))
    alerts = []
    if safeguarding_flags >= 3:
        alerts.append("Repeated safeguarding-linked events identified")
    if "missing" in recurring or "police" in recurring:
        alerts.append("Missing-from-care or police involvement theme present")
    if any(term in corpus for term in ["unclear", "unknown", "not recorded", "missing information"]):
        alerts.append("Possible chronology or evidence gaps identified")
    if any(term in corpus for term in ["manager", "oversight", "review"]):
        alerts.append("Leadership oversight is referenced in the timeline")
    return {
        "recurringConcerns": recurring[:10],
        "safeguardingFlags": safeguarding_flags,
        "alerts": alerts[:6],
        "chronologyHealth": "needs review" if alerts else "developing",
    }


def extract_events(text: str) -> list[dict[str, Any]]:
    clean = re.sub(r"\s+", " ", text or "").strip()
    if not clean:
        return []
    segments = re.split(r"(?<=[.!?])\s+|\n+", clean)
    events: list[dict[str, Any]] = []
    for segment in segments:
        if len(segment) < 12:
            continue
        date_match = re.search(r"\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b", segment)
        time_match = re.search(r"\b\d{1,2}:\d{2}\b", segment)
        operational = any(term in segment.lower() for term in EVENT_TERMS)
        if not operational and not date_match and not time_match:
            continue
        events.append({
            "date": date_match.group(0) if date_match else None,
            "time": time_match.group(0) if time_match else None,
            "summary": segment[:420],
            "safeguardingFlag": _safeguarding(segment),
            "severity": _severity(segment),
        })
        if len(events) >= 40:
            break
    return events


def _safeguarding(text: str) -> bool:
    lower = text.lower()
    return any(term in lower for term in ["risk", "harm", "missing", "police", "injury", "safeguarding", "exploitation", "self-harm"])


def _severity(text: str) -> str:
    lower = text.lower()
    if any(term in lower for term in ["police", "self-harm", "harm", "exploitation", "injury"]):
        return "high"
    if any(term in lower for term in ["missing", "risk", "safeguarding", "incident"]):
        return "medium"
    return "low"


EVENT_TERMS = {
    "incident", "missing", "police", "returned", "left", "risk", "harm", "review", "manager",
    "safeguarding", "oversight", "action", "outcome", "escalation", "injury", "absence",
}

OPERATIONAL_TERMS = {
    "missing", "police", "risk", "harm", "incident", "safeguarding", "manager", "oversight",
    "review", "chronology", "injury", "returned", "absence", "escalation", "voice", "action",
}
