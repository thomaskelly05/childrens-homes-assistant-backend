# assistant/retrieval.py

from __future__ import annotations

import logging
import os
from typing import Any

import psycopg2
from openai import OpenAI

logger = logging.getLogger("indicare.retrieval")

client = OpenAI(api_key=os.environ.get("OPENAI_API_KEY"))


# ---------------------------------------------------------
# Database
# ---------------------------------------------------------

def get_db_connection():
    return psycopg2.connect(
        host=os.environ.get("DB_HOST", "localhost"),
        database=os.environ.get("DB_NAME", "indicare"),
        user=os.environ.get("DB_USER", "postgres"),
        password=os.environ.get("DB_PASSWORD", "postgres"),
    )


# ---------------------------------------------------------
# Embeddings
# ---------------------------------------------------------

def embed_query(text: str) -> list[float]:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=text
    )
    return response.data[0].embedding


# ---------------------------------------------------------
# Query shaping
# ---------------------------------------------------------

MODE_HINTS = {
    "factual": [
        "children's homes regulations",
        "quality standards",
        "ofsted",
        "statutory guidance",
        "policy expectations",
    ],
    "handover": [
        "handover structure",
        "shift information",
        "practical next steps",
        "what needs passing on",
    ],
    "recording": [
        "factual recording",
        "neutral wording",
        "injury recording",
        "body map wording",
        "defensible documentation",
        "safe recording",
    ],
    "incident_summary": [
        "incident structure",
        "neutral summary",
        "what happened",
        "actions taken",
        "follow-up required",
    ],
    "chronology": [
        "timeline",
        "sequence of events",
        "chronology structure",
        "dated record",
    ],
    "support_planning": [
        "support plan",
        "care planning",
        "staff actions",
        "review points",
        "child-specific support",
    ],
    "manager_review": [
        "manager oversight",
        "audit lens",
        "quality assurance",
        "practice review",
        "inspection readiness",
    ],
    "rewrite": [
        "professional wording",
        "care phrasing",
        "neutral tone",
        "clearer recording",
    ],
    "reflective": [
        "reflective practice",
        "supervision",
        "learning",
        "what to notice",
    ],
    "general_practice": [
        "residential childcare practice",
        "children's home staff guidance",
    ],
    "practical": [
        "residential childcare practice",
        "children's home staff guidance",
    ],
}


SAFEGUARDING_HINTS = {
    "normal": [],
    "watchful": [
        "early safeguarding indicators",
        "record factually",
        "monitor and review",
        "unexplained injury",
        "concern wording",
    ],
    "heightened": [
        "safeguarding concern",
        "escalation",
        "clear factual recording",
        "management oversight",
        "child protection",
    ],
    "urgent": [
        "immediate safety",
        "urgent safeguarding response",
        "emergency escalation",
        "clear factual chronology",
    ],
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _build_query_text(
    message: str,
    mode: str = "general_practice",
    safeguarding_level: str = "normal",
    role: str = "",
    document_name: str | None = None,
) -> str:
    parts: list[str] = []

    message = _safe_string(message)
    role = _safe_string(role)
    document_name = _safe_string(document_name)

    if message:
        parts.append(message)

    if role:
        parts.append(f"User role: {role}")

    for hint in MODE_HINTS.get(mode, []):
        parts.append(hint)

    for hint in SAFEGUARDING_HINTS.get(safeguarding_level, []):
        parts.append(hint)

    if document_name:
        parts.append(f"Uploaded document name: {document_name}")

    return "\n".join(parts).strip()


# ---------------------------------------------------------
# Retrieval
# ---------------------------------------------------------

def _fetch_knowledge_rows(embedding: list[float], limit: int = 6):
    conn = None
    cur = None

    try:
        conn = get_db_connection()
        cur = conn.cursor()

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

        return cur.fetchall()

    finally:
        if cur:
            cur.close()
        if conn:
            conn.close()


def _format_rows(rows: list[tuple]) -> str:
    if not rows:
        return ""

    context_blocks = []
    source_blocks = []

    for i, row in enumerate(rows, start=1):
        content, doc, section, page = row

        content = _safe_string(content)
        doc = _safe_string(doc) or "Unknown document"
        section = _safe_string(section) or "Unknown section"
        page = page if page is not None else "?"

        if not content:
            continue

        context_blocks.append(
            f"[{i}] {content}"
        )

        source_blocks.append(
            f"[{i}] {doc} — {section} (p.{page})"
        )

    if not context_blocks:
        return ""

    return f"""
RETRIEVED INTERNAL KNOWLEDGE

Use the following internal knowledge selectively where it genuinely helps improve the answer.
Prefer the most relevant excerpts.
Do not force irrelevant guidance into the response.

Knowledge excerpts:
{chr(10).join(chr(10) + block for block in context_blocks)}

Knowledge sources:
{chr(10).join(source_blocks)}
""".strip()


def retrieve_context(
    message: str,
    mode: str = "general_practice",
    safeguarding_level: str = "normal",
    document_text: str | None = None,
    document_name: str | None = None,
    role: str = "",
    limit: int = 6,
) -> str:
    """
    Retrieve relevant internal knowledge for the current request.

    This is retrieval for the assistant runtime, not just raw semantic search.
    It uses:
    - user message
    - detected mode
    - safeguarding level
    - user role
    - optional uploaded document name
    """

    try:
        shaped_query = _build_query_text(
            message=message,
            mode=mode,
            safeguarding_level=safeguarding_level,
            role=role,
            document_name=document_name,
        )

        embedding = embed_query(shaped_query)
        rows = _fetch_knowledge_rows(embedding, limit=limit)

        context = _format_rows(rows)

        # light extra steer if a document is present
        if context and document_text:
            context += """

Document note:
An uploaded document is also present in this request. Use retrieved knowledge alongside the uploaded document where relevant, but do not invent facts beyond the document and the user’s instructions.
""".rstrip()

        return context

    except Exception as e:
        logger.exception("Knowledge retrieval failed: %s", e)
        return ""


# ---------------------------------------------------------
# Backwards compatibility
# ---------------------------------------------------------

def retrieve_knowledge(query: str, limit: int = 5) -> str:
    """
    Backwards-compatible wrapper for older code.
    """
    return retrieve_context(
        message=query,
        mode="general_practice",
        safeguarding_level="normal",
        limit=limit,
    )
