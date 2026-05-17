from __future__ import annotations

from typing import Any

from fastapi import HTTPException
from psycopg2.extras import Json, RealDictCursor

from core.policy_engine import context_from_user, policy_engine
from repositories.missing_episode_repository import missing_episode_repository
from repositories.os_repository_utils import current_user_id, table_exists
from schemas.missing_episode_contracts import MissingEpisodeTransitionRequest
from schemas.return_home_interview_contracts import ReturnHomeInterviewCreateRequest, ReturnHomeInterviewRecord
from services.operational_memory_repository import operational_memory_repository


class ReturnHomeInterviewService:
    """Return-home interview workflow linked to missing episodes, chronology and replay."""

    def __init__(self, repository=missing_episode_repository):
        self.repository = repository

    def create(
        self,
        conn: Any,
        *,
        payload: ReturnHomeInterviewCreateRequest,
        current_user: dict[str, Any],
    ) -> ReturnHomeInterviewRecord:
        self._require_policy(current_user, "records:write", home_id=payload.home_id, provider_id=payload.provider_id)
        missing = self.repository.get_missing(conn, missing_episode_id=payload.missing_episode_id, current_user=current_user)
        if missing is None:
            raise HTTPException(status_code=404, detail="Missing episode not found.")
        if missing.home_id != payload.home_id or missing.young_person_id != payload.young_person_id:
            raise HTTPException(status_code=400, detail="Return-home interview scope must match the missing episode.")
        record = self.repository.create_rhi(conn, payload=payload.model_dump(mode="json"), current_user=current_user)
        chronology_event_id = self._write_chronology(conn, current_user=current_user, record=record)
        memory_ids = self._write_memory(conn, current_user=current_user, record=record, chronology_event_id=chronology_event_id)
        self.repository.attach_rhi_chronology_and_replay(
            conn,
            return_home_interview_id=record.id,
            chronology_event_id=chronology_event_id,
            replay_event_ids=[value for value in memory_ids.values() if value],
        )
        self.repository.update_missing_state(
            conn,
            missing_episode_id=payload.missing_episode_id,
            lifecycle_state="RHI_completed",
            payload=MissingEpisodeTransitionRequest(
                lifecycle_state="RHI_completed",
                return_home_interview_completed_at=payload.interview_at,
                evidence_ids=payload.evidence_ids,
                safeguarding_link_ids=payload.safeguarding_link_ids,
                notes="Return-home interview completed.",
            ).model_dump(mode="json", exclude_unset=True),
            current_user=current_user,
        )
        return record

    def _write_chronology(self, conn: Any, *, current_user: dict[str, Any], record: ReturnHomeInterviewRecord) -> str | None:
        if not table_exists(conn, "os_chronology_events"):
            return None
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO public.os_chronology_events (
                  provider_id, home_id, young_person_id, event_type, event_title, event_summary,
                  event_at, source_table, source_id, sccif_area, regulation_refs, evidence_refs,
                  visibility, is_sensitive, created_by, metadata
                )
                VALUES (%s, %s, %s, %s, %s, %s, %s::timestamptz, %s, NULL, %s, %s, %s::jsonb, %s, %s, %s, %s::jsonb)
                RETURNING id
                """,
                (
                    record.provider_id,
                    record.home_id,
                    record.young_person_id,
                    "return_home_interview_completed",
                    "Return-home interview completed",
                    record.child_voice,
                    record.interview_at,
                    "return_home_interviews",
                    "helped_and_protected",
                    ["Missing from care", "Return-home interview"],
                    Json(record.evidence_ids),
                    "manager",
                    True,
                    current_user_id(current_user),
                    Json({"return_home_interview_id": record.id, "missing_episode_id": record.missing_episode_id}),
                ),
            )
            row = cur.fetchone()
        return str(row["id"]) if row else None

    def _write_memory(
        self,
        conn: Any,
        *,
        current_user: dict[str, Any],
        record: ReturnHomeInterviewRecord,
        chronology_event_id: str | None,
    ) -> dict[str, str | None]:
        if not table_exists(conn, "operational_lifecycle_history"):
            return {}
        lifecycle_context = {
            "title": "Return-home interview completed",
            "status": record.lifecycle_state,
            "calm_summary": record.child_voice,
            "chronology_ids": [chronology_event_id] if chronology_event_id else [],
            "evidence_edges": [{"target_id": evidence_id, "relationship": "return_home_interview_evidence"} for evidence_id in record.evidence_ids],
            "requires_chronology": True,
            "missing_episode_id": record.missing_episode_id,
            "safeguarding_link_ids": record.safeguarding_link_ids,
        }
        return operational_memory_repository.append_lifecycle_transition(
            conn,
            current_user=current_user,
            entity_type="return_home_interview",
            entity_id=record.id,
            previous_state=None,
            next_state=record.model_dump(mode="json"),
            transition_type="return_home_interview_completed",
            lifecycle_context=lifecycle_context,
        )

    def _require_policy(self, current_user: dict[str, Any], permission: str, *, home_id: int | None = None, provider_id: int | None = None) -> None:
        context = context_from_user(
            current_user,
            requested_home_id=home_id,
            requested_provider_id=provider_id if home_id is None else None,
        )
        decision = policy_engine.evaluate(
            {**current_user, "permissions": sorted(context.permissions)},
            permission,
            home_id=home_id,
            provider_id=provider_id if home_id is None else None,
        )
        if not decision.allowed:
            raise HTTPException(status_code=403, detail="You do not have permission for this return-home interview workflow.")


return_home_interview_service = ReturnHomeInterviewService()
