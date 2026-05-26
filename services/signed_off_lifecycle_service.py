"""Orchestrates archive, chronology story, plan impacts and LifeEcho on sign-off."""

from __future__ import annotations

from typing import Any

from schemas.recording_drafts import RecordingDraftRecord
from services.child_archive_service import child_archive_service
from services.child_chronology_story_service import child_chronology_story_service
from services.lifeecho_memory_service import lifeecho_memory_service
from services.plan_impact_suggestion_service import plan_impact_suggestion_service


class SignedOffLifecycleService:
    def process_formal_record(
        self,
        draft: RecordingDraftRecord,
        formal_record: dict[str, Any] | None,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        result: dict[str, Any] = {
            "archive_record_id": None,
            "chronology_event_id": None,
            "plan_impact_ids": [],
            "lifeecho_suggestion_ids": [],
            "warnings": [],
        }
        if draft.status == "draft" and not formal_record:
            result["warnings"].append("Drafts are not archived.")
            return result

        archive = child_archive_service.create_from_signed_off_record(
            draft, formal_record, current_user, conn=conn
        )
        if not archive:
            if formal_record:
                result["warnings"].append("Archive not created — check review status and scope.")
            return result

        result["archive_record_id"] = archive.id

        story_event = child_chronology_story_service.create_event_from_archive(
            archive, current_user, conn=conn
        )
        if not archive.chronology_event_id:
            archive = child_archive_service.link_chronology(
                archive.id,
                story_event.id,
                current_user,
                conn=conn,
            ) or archive
        result["chronology_event_id"] = archive.chronology_event_id or story_event.id

        impacts = plan_impact_suggestion_service.analyse_archive_record(
            archive, current_user, conn=conn
        )
        impact_ids = [item.id for item in impacts]
        if impact_ids:
            child_archive_service.link_plan_impacts(archive.id, impact_ids, current_user, conn=conn)
        result["plan_impact_ids"] = impact_ids

        suggestion = lifeecho_memory_service.suggest_from_archive(
            archive, current_user, conn=conn
        )
        if suggestion:
            result["lifeecho_suggestion_ids"] = [suggestion.id]
            child_archive_service.link_lifeecho(
                archive.id,
                suggestion.id,
                current_user,
                conn=conn,
            )

        return result


signed_off_lifecycle_service = SignedOffLifecycleService()
