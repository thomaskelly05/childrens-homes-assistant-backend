from __future__ import annotations

import hashlib
import logging
import os
import time
from typing import Any

from openai import OpenAI
from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.retrieval")

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

EMBEDDING_MODEL = os.environ.get("EMBEDDING_MODEL", "text-embedding-3-small")
EMBEDDING_CACHE_TTL_SECONDS = int(os.environ.get("EMBEDDING_CACHE_TTL_SECONDS", "900"))
MAX_EMBED_TEXT_CHARS = 1200
MAX_RESULT_ROWS = 5
MAX_EXCERPT_CHARS = 650

_embedding_cache: dict[str, tuple[float, list[float]]] = {}


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


def _cache_key(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _cleanup_embedding_cache() -> None:
    now = time.time()
    expired_keys = [
        key
        for key, (expires_at, _embedding) in _embedding_cache.items()
        if expires_at <= now
    ]
    for key in expired_keys:
        _embedding_cache.pop(key, None)


def _get_cached_embedding(text: str) -> list[float] | None:
    _cleanup_embedding_cache()
    key = _cache_key(text)
    entry = _embedding_cache.get(key)
    if not entry:
        return None

    expires_at, embedding = entry
    if expires_at <= time.time():
        _embedding_cache.pop(key, None)
        return None

    return embedding


def _set_cached_embedding(text: str, embedding: list[float]) -> None:
    key = _cache_key(text)
    _embedding_cache[key] = (time.time() + EMBEDDING_CACHE_TTL_SECONDS, embedding)


def _should_skip_retrieval(message: str) -> bool:
    text = _safe_string(message)
    if not text:
        return True
    if len(text) < 12:
        return True
    return False


def _build_query_text(
    message: str,
    mode: str = "general_practice",
    safeguarding_level: str = "normal",
    role: str = "",
    document_name: str | None = None,
) -> str:
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
        parts.append(f"Mode hints: {', '.join(mode_hints[:3])}")

    safeguarding_hints = SAFEGUARDING_HINTS.get(safeguarding_level, [])
    if safeguarding_hints:
        parts.append(f"Safeguarding hints: {', '.join(safeguarding_hints[:2])}")

    if clean_document_name:
        parts.append(f"Document: {clean_document_name}")

    return _trim_text("\n".join(parts).strip(), MAX_EMBED_TEXT_CHARS)


def embed_query(text: str) -> list[float]:
    cached = _get_cached_embedding(text)
    if cached is not None:
        return cached

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )
    embedding = response.data[0].embedding
    _set_cached_embedding(text, embedding)
    return embedding


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
                (embedding, limit),
            )
            rows = cur.fetchall()

        return rows or []

    finally:
        release_db_connection(conn)


def _format_rows(rows: list[dict[str, Any]]) -> str:
    if not rows:
        return ""

    excerpt_blocks: list[str] = []
    source_blocks: list[str] = []

    for i, row in enumerate(rows, start=1):
        content = _trim_text(row.get("content") or "", MAX_EXCERPT_CHARS)
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

Use the following internal knowledge only where it genuinely improves the answer.

Knowledge excerpts:
{excerpts}

Knowledge sources:
{sources}
""".strip()


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
        if _should_skip_retrieval(message):
            return ""

        safe_limit = max(1, min(int(limit), MAX_RESULT_ROWS))

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

    except Exception:
        logger.exception("Knowledge retrieval failed")
        return ""


def retrieve_knowledge(query: str, limit: int = 3) -> str:
    return retrieve_context(
        message=query,
        mode="general_practice",
        safeguarding_level="normal",
        limit=limit,
    )
