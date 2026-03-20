from __future__ import annotations

import logging
import os
from typing import Any

import psycopg2
from psycopg2.extras import RealDictCursor
from openai import OpenAI

logger = logging.getLogger("indicare.retrieval")

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


# ---------------------------------------------------------
# DATABASE
# ---------------------------------------------------------
def get_db_connection():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        database=os.environ.get("DB_NAME", "indicare"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "postgres"),
    )


# ---------------------------------------------------------
# EMBEDDINGS
# ---------------------------------------------------------
def embed_query(text: str) -> list[float]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text,
    )
    return response.data[0].embedding


# ---------------------------------------------------------
# RETRIEVAL HINTS
# ---------------------------------------------------------
MODE_HINTS = {
    "factual": [
        "children's homes regulations",
        "quality standards",
        "ofsted",
        "statutory guidance",
    ],
    "support_planning": [
        "support plan",
        "care planning",
        "staff actions",
        "review points",
    ],
    "manager_review": [
        "manager oversight",
        "audit lens",
        "quality assurance",
    ],
    "reflective": [
        "reflective practice",
        "supervision",
        "learning",
    ],
    "supervision": [
        "supervision",
        "reflection",
        "learning",
    ],
    "general_practice": [
        "residential childcare practice",
    ],
    "practical": [
        "residential childcare practice",
    ],
    "recording": [
        "factual recording",
        "neutral language",
        "clear record",
    ],
    "incident_summary": [
        "incident summary",
        "factual sequence",
        "clear documentation",
    ],
    "chronology": [
        "chronology",
        "timeline",
        "sequence of events",
    ],
    "handover": [
        "handover",
        "key information",
        "shift continuity",
    ],
    "rewrite": [
        "professional wording",
        "clear wording",
        "neutral wording",
    ],
}

SAFEGUARDING_HINTS = {
    "normal": [],
    "watchful": [
        "early safeguarding indicators",
        "record factually",
    ],
    "heightened": [
        "safeguarding concern",
        "clear factual recording",
        "escalation",
    ],
    "urgent": [
        "immediate safety",
        "urgent safeguarding response",
        "clear escalation",
    ],
}


# ---------------------------------------------------------
# HELPERS
# ---------------------------------------------------------
def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _trim_text(value: str, limit: int) -> str:
    value = _safe_string(value)
    if len(value) <= limit:
        return value
    return value[:limit].rsplit(" ", 1)[0].strip()


def _build_query_text(
    message: str,
    mode: str = "general_practice",
    safeguarding_level: str = "normal",
    role: str = "",
    document_name: str | None = None,
) -> str:
    """
    Build a compact shaped retrieval query.
    Keep it lean so embeddings reflect the actual need, not prompt noise.
    """
    parts: list[str] = []

    clean_message = _trim_text(message, 700)
    clean_role = _trim_text(role, 120)
    clean_document_name = _trim_text(document_name or "", 120)

    if clean_message:
        parts.append(f"User request: {clean_message}")

    if clean_role:
        parts.append(f"Role: {clean_role}")

    mode_hints = MODE_HINTS.get(mode, [])
    if mode_hints:
        parts.append(f"Mode hints: {', '.join(mode_hints[:4])}")

    safeguarding_hints = SAFEGUARDING_HINTS.get(safeguarding_level, [])
    if safeguarding_hints:
        parts.append(f"Safeguarding hints: {', '.join(safeguarding_hints[:3])}")

    if clean_document_name:
        parts.append(f"Document: {clean_document_name}")

    return "\n".join(parts).strip()


def _fetch_knowledge_rows(embedding: list[float], limit: int = 3) -> list[dict[str, Any]]:
    conn = None

    try:
        conn = get_db_connection()

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT
                    content,
                    document_title,
                    section,
                    page_number
                FROM indicare_knowledge
                ORDER BY embedding <-> %s
                LIMIT %s
                """,
                (embedding, limit)
            )
            rows = cur.fetchall()

        return rows or []

    finally:
        if conn:
            conn.close()


def _format_rows(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""

    excerpt_blocks: list[str] = []
    source_blocks: list[str] = []

    for i, row in enumerate(rows, start=1):
        content = _trim_text(row.get("content") or "", 900)
        doc = _safe_string(row.get("document_title")) or "Unknown document"
        section = _safe_string(row.get("section")) or "Unknown section"
        page = row.get("page_number")
        page_display = page if page is not None else "?"

        if not content:
            continue

        excerpt_blocks.append(f"[{i}] {content}")
        source_blocks.append(f"[{i}] {doc} — {section} (p.{page_display})")

    if not excerpt_blocks:
        return ""

    excerpts = "\n\n".join(excerpt_blocks)
    sources = "\n".join(source_blocks)

    return f"""
RETRIEVED INTERNAL KNOWLEDGE

Use the following internal knowledge selectively where it genuinely improves the answer.
Prefer the most relevant excerpts and do not force all of them into the response.

Knowledge excerpts:
{excerpts}

Knowledge sources:
{sources}
""".strip()


# ---------------------------------------------------------
# PUBLIC API
# ---------------------------------------------------------
def retrieve_context(
    message: str,
    mode: str = "general_practice",
    safeguarding_level: str = "normal",
    document_text: str | None = None,
    document_name: str | None = None,
    role: str = "",
    limit: int = 3,
) -> str:
    try:
        safe_limit = max(1, min(int(limit), 5))

        shaped_query = _build_query_text(
            message=message,
            mode=mode,
            safeguarding_level=safeguarding_level,
            role=role,
            document_name=document_name,
        )

        if not shaped_query:
            return ""

        embedding = embed_query(shaped_query)
        rows = _fetch_knowledge_rows(embedding, limit=safe_limit)
        context = _format_rows(rows)

        if context and document_text:
            context += """

Document note:
An uploaded document is also present in this request. Use retrieved knowledge alongside the uploaded document where relevant.
""".rstrip()

        return context

    except Exception as e:
        logger.exception("Knowledge retrieval failed: %s", e)
        return ""


def retrieve_knowledge(query: str, limit: int = 3) -> str:
    return retrieve_context(
        message=query,
        mode="general_practice",
        safeguarding_level="normal",
        limit=limit,
    )
