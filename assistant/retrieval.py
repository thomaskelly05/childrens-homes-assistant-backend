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

OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY")
client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

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


def _safe_int(value: Any) -> int | None:
    try:
        if value is None or value == "":
            return None
        return int(value)
    except (TypeError, ValueError):
        return None


def _trim_text(value: Any, limit: int) -> str:
    text = _safe_string(value)
    if len(text) <= limit:
        return text
    return text[:limit].rsplit(" ", 1)[0].strip()


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

    mode_hints = MODE_HINTS.get(_safe_string(mode), [])
    if mode_hints:
        parts.append(f"Mode hints: {', '.join(mode_hints[:3])}")

    safeguarding_hints = SAFEGUARDING_HINTS.get(_safe_string(safeguarding_level), [])
    if safeguarding_hints:
        parts.append(f"Safeguarding hints: {', '.join(safeguarding_hints[:2])}")

    if clean_document_name:
        parts.append(f"Document: {clean_document_name}")

    return _trim_text("\n".join(parts).strip(), MAX_EMBED_TEXT_CHARS)


def embed_query(text: str) -> list[float]:
    safe_text = _trim_text(text, MAX_EMBED_TEXT_CHARS)

    if client is None:
        raise RuntimeError(
            "OPENAI_API_KEY is missing; knowledge retrieval cannot create embeddings."
        )

    cached = _get_cached_embedding(safe_text)
    if cached is not None:
        return cached

    response = client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=safe_text,
    )

    embedding = response.data[0].embedding
    _set_cached_embedding(safe_text, embedding)

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

        return list(rows or [])

    finally:
        release_db_connection(conn)


def _infer_source_type(document_title: str, section: str) -> str:
    title = _safe_string(document_title).lower()
    section_text = _safe_string(section).lower()
    combined = f"{title} {section_text}"

    if any(
        term in combined
        for term in [
            "regulation",
            "regulations",
            "quality standard",
            "quality standards",
            "children's homes regulations",
            "children’s homes regulations",
        ]
    ):
        return "regulation"

    if any(term in combined for term in ["ofsted", "sccif", "inspection"]):
        return "ofsted"

    if any(term in combined for term in ["guide", "guidance", "statutory"]):
        return "guidance"

    return "internal_knowledge"


def _build_source_label(document_title: str, section: str, page_number: Any) -> str:
    doc = _safe_string(document_title) or "Unknown document"
    sec = _safe_string(section)
    page = page_number if page_number is not None else "?"

    if sec:
        return f"{doc} — {sec} (p.{page})"

    return f"{doc} (p.{page})"


def _build_source_reference(source_type: str, document_title: str, page_number: Any) -> str:
    """
    Stable citation-style reference for internal knowledge.

    This is not the same as a young-person record citation.
    Young-person record citations should still use [record_type:record_id].
    """
    safe_type = _safe_string(source_type) or "internal_knowledge"
    safe_doc = _safe_string(document_title) or "unknown_document"
    safe_page = _safe_string(page_number) or "unknown_page"

    slug = (
        safe_doc.lower()
        .replace(" ", "_")
        .replace("/", "_")
        .replace("\\", "_")
        .replace("—", "_")
        .replace("-", "_")
    )

    slug = "".join(char for char in slug if char.isalnum() or char == "_")
    slug = slug[:80] or "unknown_document"

    return f"[{safe_type}:{slug}:p{safe_page}]"


def _normalise_rows_to_sources(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    sources: list[dict[str, Any]] = []
    seen: set[str] = set()

    for index, row in enumerate(rows, start=1):
        doc = _safe_string(row.get("document_title")) or "Unknown document"
        section = _safe_string(row.get("section")) or ""
        page_number = row.get("page_number")
        content = _trim_text(row.get("content") or "", MAX_EXCERPT_CHARS)

        label = _build_source_label(doc, section, page_number)
        source_type = _infer_source_type(doc, section)
        source_ref = _build_source_reference(source_type, doc, page_number)

        dedupe_key = f"{doc}|{section}|{page_number}|{content[:80]}"

        if dedupe_key in seen:
            continue

        seen.add(dedupe_key)

        sources.append(
            {
                "index": index,
                "type": source_type,
                "source_type": source_type,
                "label": label,
                "reference": source_ref,
                "document_title": doc,
                "section": section,
                "page_number": page_number,
                "excerpt": content,
                "url": None,
                "is_record_source": False,
                "citation_format": source_ref,
            }
        )

    return sources


def _format_context_from_sources(sources: list[dict[str, Any]]) -> str:
    if not sources:
        return ""

    excerpt_blocks: list[str] = []
    source_blocks: list[str] = []

    for source in sources:
        index = _safe_int(source.get("index")) or len(excerpt_blocks) + 1
        excerpt = _trim_text(source.get("excerpt") or "", MAX_EXCERPT_CHARS)
        label = _safe_string(source.get("label"))
        source_type = _safe_string(source.get("source_type") or source.get("type"))
        reference = _safe_string(source.get("reference"))

        if not excerpt:
            continue

        excerpt_blocks.append(
            f"[K{index}] {excerpt}\n"
            f"Source type: {source_type or 'internal_knowledge'}\n"
            f"Source label: {label}\n"
            f"Source reference: {reference}"
        )

        source_blocks.append(
            f"[K{index}] {label} | type={source_type or 'internal_knowledge'} | reference={reference}"
        )

    if not excerpt_blocks:
        return ""

    excerpts = "\n\n".join(excerpt_blocks)
    source_lines = "\n".join(source_blocks)

    return f"""
RETRIEVED INTERNAL KNOWLEDGE

Use this knowledge only where it genuinely improves the answer.

Important:
- These are knowledge/framework sources, not young-person record sources.
- Do not use these as evidence that something happened to a child.
- For child/home record evidence, use the scoped record context and cite [record_type:record_id].
- Do not invent citations, page numbers, document titles, or record IDs.

Knowledge excerpts:
{excerpts}

Knowledge sources:
{source_lines}
""".strip()


def _build_uploaded_document_context(
    document_text: str | None,
    document_name: str | None,
) -> str:
    safe_text = _trim_text(document_text or "", 1800)
    safe_name = _safe_string(document_name) or "Uploaded document"

    if not safe_text:
        return ""

    return f"""
UPLOADED DOCUMENT CONTEXT

Document name: {safe_name}

Use the uploaded document only where relevant.
Do not invent content from the document.
If the document does not contain the information needed, say this is not visible in the uploaded document.

Document excerpt:
{safe_text}
""".strip()


def retrieve_context_bundle(
    message: str,
    mode: str = "general_practice",
    safeguarding_level: str = "normal",
    document_text: str | None = None,
    document_name: str | None = None,
    role: str = "",
    limit: int = 3,
) -> dict[str, Any]:
    try:
        document_context = _build_uploaded_document_context(
            document_text=document_text,
            document_name=document_name,
        )

        if _should_skip_retrieval(message):
            return {
                "context_text": document_context,
                "sources": [],
                "knowledge_sources": [],
                "record_sources": [],
                "query_text": "",
                "has_uploaded_document": bool(document_context),
                "citation_guidance": (
                    "Use [record_type:record_id] only for visible record evidence. "
                    "Do not invent record IDs."
                ),
            }

        safe_limit = max(1, min(int(limit), MAX_RESULT_ROWS))

        shaped_query = _build_query_text(
            message=message,
            mode=mode,
            safeguarding_level=safeguarding_level,
            role=role,
            document_name=document_name,
        )

        if not shaped_query:
            return {
                "context_text": document_context,
                "sources": [],
                "knowledge_sources": [],
                "record_sources": [],
                "query_text": "",
                "has_uploaded_document": bool(document_context),
                "citation_guidance": (
                    "Use [record_type:record_id] only for visible record evidence. "
                    "Do not invent record IDs."
                ),
            }

        embedding = embed_query(shaped_query)
        rows = _fetch_knowledge_rows(embedding, limit=safe_limit)

        knowledge_sources = _normalise_rows_to_sources(rows)
        knowledge_context = _format_context_from_sources(knowledge_sources)

        context_parts = [
            part
            for part in [
                knowledge_context,
                document_context,
            ]
            if part
        ]

        context_text = "\n\n".join(context_parts).strip()

        return {
            "context_text": context_text,
            "sources": knowledge_sources,
            "knowledge_sources": knowledge_sources,
            "record_sources": [],
            "query_text": shaped_query,
            "has_uploaded_document": bool(document_context),
            "citation_guidance": (
                "Knowledge/framework sources may support practice reasoning, but child/home record "
                "evidence must come from scoped record context and be cited as [record_type:record_id]. "
                "Never invent record IDs."
            ),
        }

    except Exception:
        logger.exception("Knowledge retrieval failed")
        return {
            "context_text": "",
            "sources": [],
            "knowledge_sources": [],
            "record_sources": [],
            "query_text": "",
            "has_uploaded_document": False,
            "citation_guidance": (
                "Retrieval failed. Do not invent sources, citations, or record IDs."
            ),
        }


def retrieve_context(
    message: str,
    mode: str = "general_practice",
    safeguarding_level: str = "normal",
    document_text: str | None = None,
    document_name: str | None = None,
    role: str = "",
    limit: int = 3,
) -> str:
    bundle = retrieve_context_bundle(
        message=message,
        mode=mode,
        safeguarding_level=safeguarding_level,
        document_text=document_text,
        document_name=document_name,
        role=role,
        limit=limit,
    )

    return _safe_string(bundle.get("context_text"))


def retrieve_knowledge(query: str, limit: int = 3) -> str:
    return retrieve_context(
        message=query,
        mode="general_practice",
        safeguarding_level="normal",
        limit=limit,
    )


def retrieve_knowledge_bundle(query: str, limit: int = 3) -> dict[str, Any]:
    return retrieve_context_bundle(
        message=query,
        mode="general_practice",
        safeguarding_level="normal",
        limit=limit,
    )
