"""Founder OS bootstrap — batched founder page data with pool-safe DB usage."""

from __future__ import annotations

import logging
from typing import Any

from db.connection import get_db_connection, release_db_connection
from db.founder_persistence_db import (
    BOOTSTRAP_ENTITY_TYPES,
    ensure_founder_persistence_tables,
    list_bootstrap_persistence,
    sanitise_payload,
)
from db.founder_telemetry_db import build_telemetry_summary, ensure_founder_telemetry_tables

logger = logging.getLogger(__name__)

EMPTY_TELEMETRY_SUMMARY: dict[str, Any] = {
    "totalEvents": 0,
    "eventsToday": 0,
    "orbConversations": 0,
    "topOrbModes": [],
    "featureUsage": [],
    "aiRequests": 0,
    "estimatedAiCost": 0,
    "errors": 0,
    "feedbackCount": 0,
    "lastUpdated": None,
}

PERSISTENCE_RESPONSE_KEYS = {
    "action": "actions",
    "approval": "approvals",
    "content": "content",
    "build_brief": "buildBriefs",
    "quality_run": "qualityRuns",
    "quality_proposal": "qualityProposals",
    "expert_review": "expertReviews",
    "founder_memory": "memories",
    "evidence_pack": "evidencePacks",
    "operating_loop_run": "operatingLoopRuns",
}


def _empty_persistence_payload() -> dict[str, list[Any]]:
    return {key: [] for key in PERSISTENCE_RESPONSE_KEYS.values()}


def build_founder_bootstrap(*, user_id: int, telemetry_days: int = 30) -> dict[str, Any]:
    """Load founder bootstrap payload using at most one DB connection."""
    persistence = _empty_persistence_payload()
    telemetry_summary = dict(EMPTY_TELEMETRY_SUMMARY)
    section_errors: dict[str, str] = {}

    conn = None
    try:
        conn = get_db_connection()
        ensure_founder_persistence_tables(conn=conn)
        ensure_founder_telemetry_tables(conn=conn)

        grouped = list_bootstrap_persistence(
            user_id=user_id,
            entity_types=BOOTSTRAP_ENTITY_TYPES,
            conn=conn,
        )
        for entity_type, records in grouped.items():
            response_key = PERSISTENCE_RESPONSE_KEYS.get(entity_type)
            if response_key:
                persistence[response_key] = records

        telemetry_summary = build_telemetry_summary(days=telemetry_days, conn=conn)
    except Exception as exc:
        logger.warning("founder_bootstrap_db_failed: %s", exc)
        section_errors["persistence"] = "busy"
        section_errors["telemetrySummary"] = "busy"
        if conn is not None:
            try:
                conn.rollback()
            except Exception:
                pass
    finally:
        if conn is not None:
            release_db_connection(conn)

    operating_loop_runs = persistence.get("operatingLoopRuns", [])

    return sanitise_payload(
        {
            "persistence": persistence,
            "telemetrySummary": telemetry_summary,
            "operatingLoopRuns": operating_loop_runs,
            "sectionErrors": section_errors,
        }
    )
