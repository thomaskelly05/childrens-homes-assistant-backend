from __future__ import annotations

import logging
from typing import Any

from db.connection import get_db_connection, release_db_connection

logger = logging.getLogger("indicare.ai_usage_audit")


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
                        audit.get("metadata") or {},
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


ai_usage_audit_service = AIUsageAuditService()
