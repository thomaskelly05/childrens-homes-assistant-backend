from __future__ import annotations

from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import HTTPException
from psycopg2.extras import Json, RealDictCursor

from core.policy_engine import context_from_user, policy_engine
from repositories.missing_episode_repository import missing_episode_repository
from repositories.os_repository_utils import current_user_id, table_exists
from schemas.missing_episode_contracts import (
    MissingEpisodeCreateRequest,
    MissingEpisodeListResponse,
    MissingEpisodeQueueItem,
    MissingEpisodeQueueResponse,
    MissingEpisodeRecord,
    MissingEpisodeTransitionRequest,
)
from services.isn_missing_episode_bridge import isn_missing_episode_bridge
from services.operational_memory_repository import operational_memory_repository

OPEN_STATES = {"reported_missing", "police_notified", "return_pending", "returned", "RHI_required"}
CHRONOLOGY_BY_TRANSITION = {
    "create": "missing_reported",
    "police": "police_notified",
    "return": "returned_home",
    "safeguarding": "safeguarding_escalation",
    "pattern": "repeated_pattern_detected",
    "close": "returned_home",
}


class MissingEpisodeService:
    """First-class missing episode workflow with chronology and replay writes."""

    def __init__(self, repository=missing_episode_repository):
        self.repository = repository

    def create(self, conn: Any, *, payload: MissingEpisodeCreateRequest, current_user: dict[str, Any]) -> MissingEpisodeRecord:
        self._require_policy(current_user, "records:write", home_id=payload.home_id, provider_id=payload.provider_id)
        record = self.repository.create_missing(conn, payload=payload.model_dump(mode="json"), current_user=current_user)
        self._project(conn, current_user=current_user, record=record, previous=None, transition="create")

        try:
            isn_missing_episode_bridge.project_missing_episode(
                conn,
                missing_episode=record,
                current_user=current_user,
            )
        except Exception:
            pass

        if record.police_notified_at:
            self._project(conn, current_user=current_user, record=record, previous=None, transition="police")
        return self.get(conn, missing_episode_id=record.id, current_user=current_user) or record

    def list(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        home_id: int | None = None,
        young_person_id: int | None = None,
        lifecycle_state: str | None = None,
        limit: int = 100,
    ) -> MissingEpisodeListResponse:
        self._require_policy(current_user, "records:read", home_id=home_id)
        records = self.repository.list_missing(
            conn,
            current_user=current_user,
            filters={"home_id": home_id, "young_person_id": young_person_id, "lifecycle_state": lifecycle_state},
            limit=limit,
        )
        return MissingEpisodeListResponse(items=records, total=len(records))

    def get(self, conn: Any, *, missing_episode_id: str, current_user: dict[str, Any]) -> MissingEpisodeRecord | None:
        self._require_policy(current_user, "records:read")
        return self.repository.get_missing(conn, missing_episode_id=missing_episode_id, current_user=current_user)

    def mark_police_notified(
        self,
        conn: Any,
        *,
        missing_episode_id: str,
        payload: MissingEpisodeTransitionRequest,
        current_user: dict[str, Any],
    ) -> MissingEpisodeRecord:
        update = payload.model_dump(mode="json", exclude_unset=True)
        update["police_notified_at"] = update.get("police_notified_at") or datetime.now(timezone.utc).isoformat()
        return self._transition(
            conn,
            missing_episode_id=missing_episode_id,
            payload=MissingEpisodeTransitionRequest(**update),
            current_user=current_user,
            transition="police",
            lifecycle_state="police_notified",
            permission="records:write",
        )

    def mark_returned(
        self,
        conn: Any,
        *,
        missing_episode_id: str,
        payload: MissingEpisodeTransitionRequest,
        current_user: dict[str, Any],
    ) -> MissingEpisodeRecord:
        update = payload.model_dump(mode="json", exclude_unset=True)
        returned_at = update.get("returned_at") or datetime.now(timezone.utc).isoformat()
        update["returned_at"] = returned_at
        update["return_home_interview_due_at"] = update.get("return_home_interview_due_at") or (
            datetime.fromisoformat(returned_at.replace("Z", "+00:00")) + timedelta(hours=72)
        ).isoformat()
        return self._transition(
            conn,
            missing_episode_id=missing_episode_id,
            payload=MissingEpisodeTransitionRequest(**update),
            current_user=current_user,
            transition="return",
            lifecycle_state="RHI_required",
            permission="records:write",
        )

    def escalate_to_safeguarding(
        self,
        conn: Any,
        *,
        missing_episode_id: str,
        payload: MissingEpisodeTransitionRequest,
        current_user: dict[str, Any],
    ) -> MissingEpisodeRecord:
        return self._transition(
            conn,
            missing_episode_id=missing_episode_id,
            payload=payload,
            current_user=current_user,
            transition="safeguarding",
            lifecycle_state=payload.lifecycle_state or "return_pending",
            permission="safeguarding:review",
        )

    def close(
        self,
        conn: Any,
        *,
        missing_episode_id: str,
        payload: MissingEpisodeTransitionRequest,
        current_user: dict[str, Any],
    ) -> MissingEpisodeRecord:
        return self._transition(
            conn,
            missing_episode_id=missing_episode_id,
            payload=payload,
            current_user=current_user,
            transition="close",
            lifecycle_state="closed",
            permission="safeguarding:review",
        )

missing_episode_service = MissingEpisodeService()
