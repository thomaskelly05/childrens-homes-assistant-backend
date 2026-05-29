from __future__ import annotations

import logging
from typing import Any
from uuid import uuid4

from db.connection import DatabaseUnavailableError, get_db_connection, release_db_connection
from db import orb_feedback_db
from schemas.orb_feedback import (
    ORB_FEEDBACK_DOWN_REASONS,
    OrbFeedbackRecord,
    OrbFeedbackSubmitRequest,
    OrbFeedbackSubmitResponse,
)
from services.orb_standalone_boundary import FORBIDDEN_STANDALONE_OS_KEYS, reject_standalone_os_ids

from services.orb_improvement_candidate_service import orb_improvement_candidate_service

logger = logging.getLogger("indicare.orb_feedback")

MAX_SNAPSHOT_CHARS = 6000
MAX_COMMENT_CHARS = 2000
MAX_SOURCE_ANCHORS = 24
MAX_SECONDARY_FAMILIES = 12

_memory_store: list[dict[str, Any]] = []
_memory_id = 0


def _text(value: Any) -> str:
    return str(value or "").strip()


def _trim(value: str | None, limit: int) -> str | None:
    if value is None:
        return None
    cleaned = _text(value)
    if not cleaned:
        return None
    return cleaned[:limit]


def _normalise_reason(rating: str, reason: str | None) -> str | None:
    if rating == "up":
        return "helpful"
    if not reason:
        return "other"
    if reason not in ORB_FEEDBACK_DOWN_REASONS:
        return "other"
    return reason


def _reject_os_in_feedback(payload: dict[str, Any]) -> None:
    reject_standalone_os_ids(payload)
    metadata = payload.get("metadata") or {}
    if not isinstance(metadata, dict):
        return
    for key in FORBIDDEN_STANDALONE_OS_KEYS:
        if metadata.get(key) is not None:
            reject_standalone_os_ids({"metadata": metadata})


class OrbFeedbackService:
    def submit(
        self,
        *,
        user_id: int | None,
        request: OrbFeedbackSubmitRequest,
    ) -> OrbFeedbackSubmitResponse:
        payload = request.model_dump()
        _reject_os_in_feedback(payload)

        rating = payload["rating"]
        reason = _normalise_reason(rating, payload.get("reason"))
        if rating == "down" and not reason:
            reason = "other"

        record_payload = {
            "user_id": user_id,
            "message_id": _text(payload["message_id"])[:128],
            "conversation_id": _trim(payload.get("conversation_id"), 128),
            "rating": rating,
            "reason": reason,
            "comment": _trim(payload.get("comment"), MAX_COMMENT_CHARS),
            "answer_snapshot": _trim(payload.get("answer_snapshot"), MAX_SNAPSHOT_CHARS),
            "question_snapshot": _trim(payload.get("question_snapshot"), MAX_SNAPSHOT_CHARS),
            "mode": _trim(payload.get("mode"), 64),
            "profile_role": _trim(payload.get("profile_role"), 64),
            "prompt_tier": _trim(payload.get("prompt_tier"), 32),
            "detected_family": _trim(payload.get("detected_family"), 128),
            "secondary_families": [
                _text(f)[:128]
                for f in (payload.get("secondary_families") or [])[:MAX_SECONDARY_FAMILIES]
                if _text(f)
            ],
            "source_anchors": [
                _text(a)[:256]
                for a in (payload.get("source_anchors") or [])[:MAX_SOURCE_ANCHORS]
                if _text(a)
            ],
            "action_id": _trim(payload.get("action_id"), 128),
            "document_lens": _trim(payload.get("document_lens"), 64),
            "metadata": self._sanitise_metadata(payload.get("metadata") or {}),
        }

        stored = self._persist(record_payload)
        try:
            orb_improvement_candidate_service.sync_from_feedback(stored)
        except Exception:
            logger.debug("Improvement candidate sync skipped", exc_info=True)
        return OrbFeedbackSubmitResponse(
            ok=True,
            feedback_id=stored["id"],
            message="Thanks — feedback recorded for ORB improvement review.",
        )

    def _sanitise_metadata(self, metadata: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(metadata, dict):
            return {}
        cleaned: dict[str, Any] = {}
        for key, value in list(metadata.items())[:40]:
            key_text = _text(key)[:64]
            if not key_text:
                continue
            if key_text in FORBIDDEN_STANDALONE_OS_KEYS:
                continue
            if isinstance(value, (str, int, float, bool)) or value is None:
                if isinstance(value, str):
                    cleaned[key_text] = value[:500]
                else:
                    cleaned[key_text] = value
        return cleaned

    def _persist(self, payload: dict[str, Any]) -> dict[str, Any]:
        global _memory_id
        try:
            conn = get_db_connection()
        except DatabaseUnavailableError:
            conn = None
        if conn is not None:
            try:
                row = orb_feedback_db.safe_insert_orb_feedback(conn, payload=payload)
                if row:
                    conn.commit()
                    return row
            except Exception:
                logger.debug("ORB feedback DB insert failed; using memory fallback", exc_info=True)
                try:
                    conn.rollback()
                except Exception:
                    pass
            finally:
                release_db_connection(conn)

        _memory_id += 1
        row = {**payload, "id": _memory_id}
        _memory_store.append(row)
        return row

    def list_feedback(self, *, days: int = 7, rating: str | None = None) -> list[dict[str, Any]]:
        try:
            conn = get_db_connection()
        except DatabaseUnavailableError:
            return [r for r in _memory_store if self._memory_in_days(r, days)]
        try:
            rows = orb_feedback_db.safe_list_orb_feedback(conn, days=days, rating=rating)
            if rows is not None:
                return rows
        except Exception:
            logger.debug("ORB feedback list failed", exc_info=True)
        finally:
            release_db_connection(conn)
        return [r for r in _memory_store if self._memory_in_days(r, days)]

    def _memory_in_days(self, row: dict[str, Any], days: int) -> bool:
        return True

    def reset_memory_store(self) -> None:
        global _memory_id
        _memory_store.clear()
        _memory_id = 0

    def to_record(self, row: dict[str, Any]) -> OrbFeedbackRecord:
        return OrbFeedbackRecord(
            id=row["id"],
            user_id=row.get("user_id"),
            message_id=row["message_id"],
            conversation_id=row.get("conversation_id"),
            rating=row["rating"],
            reason=row.get("reason"),
            comment=row.get("comment"),
            answer_snapshot=row.get("answer_snapshot"),
            question_snapshot=row.get("question_snapshot"),
            mode=row.get("mode"),
            profile_role=row.get("profile_role"),
            prompt_tier=row.get("prompt_tier"),
            detected_family=row.get("detected_family"),
            secondary_families=row.get("secondary_families") or [],
            source_anchors=row.get("source_anchors") or [],
            action_id=row.get("action_id"),
            document_lens=row.get("document_lens"),
            metadata=row.get("metadata") or {},
            created_at=row.get("created_at"),
            reviewed=bool(row.get("reviewed")),
            reviewed_by=row.get("reviewed_by"),
            reviewed_at=row.get("reviewed_at"),
            reviewer_note=row.get("reviewer_note"),
        )


orb_feedback_service = OrbFeedbackService()
