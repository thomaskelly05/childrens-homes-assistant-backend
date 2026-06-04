from __future__ import annotations

import logging
from datetime import datetime
from typing import Any

from psycopg2.extras import RealDictCursor

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.ai_usage_audit")

_SENSITIVE_METADATA_KEYS = frozenset(
    {
        "prompt",
        "transcript",
        "raw_prompt",
        "raw_transcript",
        "model_output",
        "document_text",
        "brain",
        "route",
        "internal_route",
    }
)


def _safe_metadata(metadata: dict[str, Any] | None) -> dict[str, Any]:
    if not metadata:
        return {}
    safe: dict[str, Any] = {}
    for key, value in metadata.items():
        lowered = str(key).lower()
        if lowered in _SENSITIVE_METADATA_KEYS:
            continue
        if any(term in lowered for term in ("prompt", "transcript", "output", "brain", "route")):
            continue
        safe[key] = value
    return safe


class AIUsageAuditService:
    """Best-effort durable AI usage audit.

    This service must never break the user workflow. If the audit table has not
    been migrated yet, or the database is temporarily unavailable, the caller
    still receives the AI response and the failure is logged server-side.
    """

    def record(self, audit: dict[str, Any]) -> None:
        conn = None
        try:
            conn = get_db_connection()
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO ai_usage_audit (
                        provider_id,
                        home_id,
                        user_id,
                        feature,
                        model,
                        redaction_mode,
                        redaction_applied,
                        estimated_input_tokens,
                        estimated_output_tokens,
                        estimated_cost_gbp,
                        prompt_stored,
                        transcript_stored,
                        metadata
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s::jsonb
                    )
                    """,
                    (
                        audit.get("provider_id"),
                        audit.get("home_id"),
                        audit.get("user_id"),
                        audit.get("feature"),
                        audit.get("model"),
                        audit.get("redaction_mode"),
                        bool(audit.get("redaction_applied")),
                        int(audit.get("estimated_input_tokens") or 0),
                        int(audit.get("estimated_output_tokens") or 0),
                        float(audit.get("estimated_cost_gbp") or 0),
                        bool(audit.get("prompt_stored", False)),
                        bool(audit.get("transcript_stored", False)),
                        _safe_metadata(audit.get("metadata") or {}),
                    ),
                )
            conn.commit()
        except Exception:
            if conn is not None and not getattr(conn, "closed", False):
                conn.rollback()
            logger.warning("Failed to persist AI usage audit", exc_info=True)
        finally:
            if conn is not None:
                release_db_connection(conn)

    def list_safe(
        self,
        *,
        provider_id: int,
        home_id: int | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        feature: str | None = None,
        limit: int = 50,
        include_user_id: bool = False,
    ) -> list[dict[str, Any]]:
        """Return usage audit metadata only — no prompts, transcripts, or model outputs."""
        safe_limit = max(1, min(int(limit or 50), 200))
        conn = None
        try:
            conn = get_db_connection()
            clauses = ["provider_id = %s"]
            params: list[Any] = [provider_id]
            if home_id is not None:
                clauses.append("home_id = %s")
                params.append(home_id)
            if date_from is not None:
                clauses.append("created_at >= %s")
                params.append(date_from)
            if date_to is not None:
                clauses.append("created_at <= %s")
                params.append(date_to)
            if feature:
                clauses.append("feature = %s")
                params.append(feature.strip().lower())
            params.append(safe_limit)
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    f"""
                    SELECT
                        id,
                        provider_id,
                        home_id,
                        {"user_id," if include_user_id else ""}
                        feature,
                        model,
                        redaction_mode,
                        redaction_applied,
                        estimated_input_tokens,
                        estimated_output_tokens,
                        estimated_cost_gbp,
                        prompt_stored,
                        transcript_stored,
                        created_at
                    FROM ai_usage_audit
                    WHERE {" AND ".join(clauses)}
                    ORDER BY created_at DESC
                    LIMIT %s
                    """,
                    tuple(params),
                )
                rows = cur.fetchall()
            return [
                {
                    "id": row["id"],
                    "provider_id": row["provider_id"],
                    "home_id": row["home_id"],
                    **({"user_id": row["user_id"]} if include_user_id else {}),
                    "feature": row["feature"],
                    "model": row["model"],
                    "redaction_mode": row["redaction_mode"],
                    "redaction_applied": bool(row["redaction_applied"]),
                    "estimated_input_tokens": int(row["estimated_input_tokens"] or 0),
                    "estimated_output_tokens": int(row["estimated_output_tokens"] or 0),
                    "estimated_cost_gbp": float(row["estimated_cost_gbp"] or 0),
                    "prompt_stored": bool(row["prompt_stored"]),
                    "transcript_stored": bool(row["transcript_stored"]),
                    "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
                }
                for row in rows
            ]
        except Exception:
            logger.warning("ai_usage_audit_list_failed", exc_info=True)
            return []
        finally:
            if conn is not None:
                release_db_connection(conn)


ai_usage_audit_service = AIUsageAuditService()
