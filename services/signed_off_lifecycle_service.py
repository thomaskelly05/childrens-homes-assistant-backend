"""Orchestrates archive, chronology story, plan impacts, LifeEcho and actions on sign-off."""

from __future__ import annotations

from typing import Any

from schemas.recording_drafts import RecordingDraftRecord
from services.child_archive_service import child_archive_service
from services.child_chronology_story_service import child_chronology_story_service
from services.lifeecho_memory_service import lifeecho_memory_service
from services.plan_impact_suggestion_service import plan_impact_suggestion_service

FORMAL_ROUTE_MISSING = (
    "This draft was submitted but no formal record route is wired yet."
)
MANAGER_REVIEW_ARCHIVE_BLOCK = (
    "Manager review is required before this can become part of the formal archive."
)
DRAFT_NOT_ARCHIVED = "Drafts are not archived — only signed-off formal records enter the archive."


class SignedOffLifecycleService:
    def skip_if_draft(self, draft: RecordingDraftRecord) -> tuple[bool, str | None]:
        """Block archive only for draft-only saves with no formal submission path."""
        submitted_to = getattr(draft, "submitted_to", None) or (draft.metadata or {}).get("submitted_to")
        if draft.status == "draft" and submitted_to in {None, "", "draft_workspace"}:
            return True, DRAFT_NOT_ARCHIVED
        return False, None

    def skip_if_missing_formal_id(self, formal_record: dict[str, Any] | None) -> tuple[bool, str | None]:
        if not formal_record or formal_record.get("id") is None:
            return True, FORMAL_ROUTE_MISSING
        return False, None

    def skip_if_review_pending(self, draft: RecordingDraftRecord) -> tuple[bool, str | None]:
        if draft.review_status in {"approved", "reviewed", "submitted"}:
            return False, None
        if draft.review_status in {
            "manager_review_required",
            "safeguarding_review_required",
            "awaiting_review",
        }:
            return True, MANAGER_REVIEW_ARCHIVE_BLOCK
        if (draft.manager_review_required or draft.safeguarding_review_required) and draft.review_status not in {
            "approved",
            "reviewed",
            "submitted",
        }:
            return True, MANAGER_REVIEW_ARCHIVE_BLOCK
        return False, None

    def safe_warnings(self, *messages: str | None) -> list[str]:
        return [m for m in messages if m]

    def build_lifecycle_result(
        self,
        *,
        archive_record_id: str | None = None,
        chronology_event_id: str | None = None,
        plan_impact_ids: list[str] | None = None,
        lifeecho_suggestion_ids: list[str] | None = None,
        action_ids: list[str] | None = None,
        skipped: bool = False,
        warnings: list[str] | None = None,
        next_steps: list[str] | None = None,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        return {
            "archive_record_id": archive_record_id,
            "chronology_event_id": chronology_event_id,
            "plan_impact_ids": list(plan_impact_ids or []),
            "lifeecho_suggestion_ids": list(lifeecho_suggestion_ids or []),
            "action_ids": list(action_ids or []),
            "skipped": skipped,
            "warnings": list(warnings or []),
            "next_steps": list(next_steps or []),
            "metadata": dict(metadata or {}),
        }

    def prevent_duplicate_archive(
        self,
        source_type: str,
        source_id: str,
        *,
        conn: Any | None = None,
    ) -> str | None:
        existing = child_archive_service._find_by_source(source_type, source_id, conn)
        return existing.id if existing else None

    def run_lifecycle_for_signed_off_record(
        self,
        draft: RecordingDraftRecord,
        formal_record: dict[str, Any] | None,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        return self.process_formal_record(draft, formal_record, current_user, conn=conn)

    def run_lifecycle_for_document(
        self,
        document: dict[str, Any],
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        from services.document_plan_impact_service import document_plan_impact_service

        outcome = document_plan_impact_service.process_signed_off_document(
            document, current_user, conn=conn
        )
        return self.build_lifecycle_result(
            archive_record_id=outcome.get("archive_record_id"),
            chronology_event_id=outcome.get("chronology_event_id"),
            plan_impact_ids=list(outcome.get("plan_impact_ids") or []),
            warnings=list(outcome.get("warnings") or []),
            next_steps=["Review extracted targets and plan impact suggestions before updating any plan."],
            metadata={"source": "document"},
        )

    def run_lifecycle_for_review(
        self,
        draft: RecordingDraftRecord,
        formal_record: dict[str, Any] | None,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        """Run lifecycle after manager review approval when a formal record exists."""
        draft_copy = draft.model_copy(
            update={
                "manager_review_required": False,
                "safeguarding_review_required": False,
                "review_status": "approved",
            }
        )
        return self.run_lifecycle_for_signed_off_record(
            draft_copy, formal_record, current_user, conn=conn
        )

    def process_formal_record(
        self,
        draft: RecordingDraftRecord,
        formal_record: dict[str, Any] | None,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> dict[str, Any]:
        skipped, skip_msg = self.skip_if_missing_formal_id(formal_record)
        if skipped:
            return self.build_lifecycle_result(skipped=True, warnings=self.safe_warnings(skip_msg))

        skipped, skip_msg = self.skip_if_review_pending(draft)
        if skipped:
            return self.build_lifecycle_result(skipped=True, warnings=self.safe_warnings(skip_msg))

        source_type = str(draft.recording_type or "recording")
        source_id = str(formal_record["id"])  # type: ignore[index]
        existing_id = self.prevent_duplicate_archive(source_type, source_id, conn=conn)

        archive = child_archive_service.create_from_signed_off_record(
            draft, formal_record, current_user, conn=conn
        )
        if not archive:
            return self.build_lifecycle_result(
                skipped=True,
                warnings=self.safe_warnings(
                    "Archive not created — check review status, child scope and formal record."
                ),
            )

        next_steps: list[str] = []
        if existing_id and existing_id == archive.id:
            next_steps.append("Existing archive record linked for this formal source.")

        story_event = child_chronology_story_service.create_event_from_archive(
            archive, current_user, conn=conn
        )
        if not archive.chronology_event_id:
            archive = (
                child_archive_service.link_chronology(
                    archive.id,
                    story_event.id,
                    current_user,
                    conn=conn,
                )
                or archive
            )
        chronology_id = archive.chronology_event_id or story_event.id

        impacts = plan_impact_suggestion_service.analyse_archive_record(
            archive, current_user, conn=conn
        )
        impact_ids = [item.id for item in impacts]
        if impact_ids:
            child_archive_service.link_plan_impacts(archive.id, impact_ids, current_user, conn=conn)
            next_steps.append(f"Review {len(impact_ids)} plan impact suggestion(s).")

        lifeecho_ids: list[str] = []
        suggestion = lifeecho_memory_service.suggest_from_archive(
            archive, current_user, conn=conn
        )
        if suggestion:
            lifeecho_ids = [suggestion.id]
            child_archive_service.link_lifeecho(
                archive.id,
                suggestion.id,
                current_user,
                conn=conn,
            )
            next_steps.append("Review LifeEcho memory suggestion before publishing.")

        if archive.safeguarding_sensitive:
            next_steps.append("Safeguarding-sensitive record — use formal route for full detail.")

        next_steps.extend(
            [
                f"View archive for child {draft.child_id}.",
                f"View chronology story for child {draft.child_id}.",
            ]
        )

        return self.build_lifecycle_result(
            archive_record_id=archive.id,
            chronology_event_id=chronology_id,
            plan_impact_ids=impact_ids,
            lifeecho_suggestion_ids=lifeecho_ids,
            warnings=[],
            next_steps=next_steps,
            metadata={
                "child_id": draft.child_id,
                "home_id": draft.home_id,
                "source_type": source_type,
                "duplicate_reused": bool(existing_id),
            },
        )


signed_off_lifecycle_service = SignedOffLifecycleService()
