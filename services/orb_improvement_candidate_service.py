from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from db import orb_improvement_candidates_db
from schemas.orb_feedback import ORB_FEEDBACK_SCENARIO_LOOP_REASONS
from services.orb_feedback_improvement_service import REASON_TO_CANDIDATE_TYPE, orb_feedback_improvement_service

logger = logging.getLogger("indicare.orb_improvement_candidates")


class OrbImprovementCandidateService:
    """Persist and manage review-led improvement candidates."""

    def sync_from_feedback(self, feedback_row: dict[str, Any]) -> dict[str, Any] | None:
        if feedback_row.get("rating") != "down":
            return None
        reason = str(feedback_row.get("reason") or "")
        if reason not in ORB_FEEDBACK_SCENARIO_LOOP_REASONS:
            return None

        family = str(feedback_row.get("detected_family") or "").strip() or None
        candidate_type = REASON_TO_CANDIDATE_TYPE.get(reason, "scenario_variant")
        proposed = orb_feedback_improvement_service._proposed_change_for_reason(reason, feedback_row, family)
        anchors = feedback_row.get("source_anchors") or []
        affected_source = str(anchors[0]) if anchors else None

        payload = {
            "candidate_type": candidate_type,
            "source_feedback_ids": [feedback_row["id"]] if feedback_row.get("id") is not None else [],
            "proposed_change": proposed,
            "affected_family": family,
            "affected_action": feedback_row.get("action_id"),
            "affected_source": affected_source,
            "affected_role": feedback_row.get("profile_role"),
            "reason_count": 1,
            "confidence": min(0.95, 0.4 + 0.1),
            "metadata": {"reason": reason, "review_required": True, "auto_apply": False},
        }

        try:
            conn = get_db_connection()
        except DatabaseUnavailableError:
            return orb_improvement_candidates_db._memory_upsert(payload)

        try:
            existing = orb_improvement_candidates_db.safe_find_pending_candidate(
                conn,
                candidate_type=candidate_type,
                affected_family=family,
                reason=reason,
            )
            if existing:
                payload["candidate_id"] = existing["candidate_id"]
                payload["reason_count"] = 1
            else:
                payload["candidate_id"] = str(uuid4())
            row = orb_improvement_candidates_db.safe_upsert_improvement_candidate(conn, payload=payload)
            if row:
                conn.commit()
            return row
        except Exception:
            logger.debug("Failed to sync improvement candidate", exc_info=True)
            try:
                conn.rollback()
            except Exception:
                pass
            return orb_improvement_candidates_db._memory_upsert(payload)
        finally:
            release_db_connection(conn)

    def list_candidates(
        self,
        *,
        status: str | None = None,
        candidate_type: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[dict[str, Any]]:
        try:
            conn = get_db_connection()
        except DatabaseUnavailableError:
            return orb_improvement_candidates_db._memory_list(
                status=status, candidate_type=candidate_type, limit=limit, offset=offset
            )
        try:
            rows = orb_improvement_candidates_db.safe_list_improvement_candidates(
                conn,
                status=status,
                candidate_type=candidate_type,
                limit=limit,
                offset=offset,
            )
            return rows or []
        finally:
            release_db_connection(conn)

    def approve(self, *, candidate_id: str, reviewed_by: int | None, reviewer_note: str | None = None) -> dict[str, Any] | None:
        return self._update_status(candidate_id, "approved", reviewed_by, reviewer_note)

    def reject(self, *, candidate_id: str, reviewed_by: int | None, reviewer_note: str | None = None) -> dict[str, Any] | None:
        return self._update_status(candidate_id, "rejected", reviewed_by, reviewer_note)

    def _update_status(
        self,
        candidate_id: str,
        status: str,
        reviewed_by: int | None,
        reviewer_note: str | None,
    ) -> dict[str, Any] | None:
        try:
            conn = get_db_connection()
        except DatabaseUnavailableError:
            return orb_improvement_candidates_db._memory_update_status(
                candidate_id=candidate_id,
                status=status,
                reviewed_by=reviewed_by,
                reviewer_note=reviewer_note,
            )
        try:
            row = orb_improvement_candidates_db.safe_update_candidate_status(
                conn,
                candidate_id=candidate_id,
                status=status,
                reviewed_by=reviewed_by,
                reviewer_note=reviewer_note,
            )
            if row:
                conn.commit()
            return row
        except Exception:
            logger.debug("Failed to update candidate status", exc_info=True)
            try:
                conn.rollback()
            except Exception:
                pass
            return None
        finally:
            release_db_connection(conn)

    def reset_memory(self) -> None:
        orb_improvement_candidates_db.reset_memory_candidates()


orb_improvement_candidate_service = OrbImprovementCandidateService()
