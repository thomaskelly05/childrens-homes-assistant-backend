"""Chronology link foundation for recording draft submissions — no fake IDs."""

from __future__ import annotations

from typing import Any

from schemas.recording_drafts import RecordingDraftRecord
from services.recording_submission_target_registry import recording_submission_target_registry

CHRONOLOGY_SUPPORTED_TYPES = frozenset(
    {
        "daily-note",
        "incident",
        "keywork",
        "family-time",
        "education-note",
        "health-appointment",
        "missing",
    }
)


class RecordingChronologyLinkService:
    @staticmethod
    def chronology_supported_for_type(recording_type: str) -> bool:
        target = recording_submission_target_registry.get_target(recording_type)
        if target.chronology_link_supported:
            return True
        normalised = (recording_type or "").strip().lower().replace("_", "-")
        return normalised in CHRONOLOGY_SUPPORTED_TYPES

    @staticmethod
    def build_chronology_metadata(
        draft: RecordingDraftRecord,
        formal_record: dict[str, Any] | None,
    ) -> dict[str, Any]:
        record_id = None
        record_type = None
        if formal_record:
            record_id = formal_record.get("id") or formal_record.get("linked_record_id")
            record_type = formal_record.get("record_type") or formal_record.get("formal_record_type")
        return {
            "draft_id": draft.id,
            "recording_type": draft.recording_type,
            "child_id": draft.child_id,
            "formal_record_id": record_id,
            "formal_record_type": record_type,
            "source": "record_workspace_submission",
            "status": "linked" if record_id else "pending",
        }

    @staticmethod
    def create_or_prepare_link(
        draft: RecordingDraftRecord,
        formal_record: dict[str, Any] | None,
        current_user: dict[str, Any],
        *,
        conn: Any | None = None,
    ) -> tuple[str | None, list[str]]:
        _ = current_user
        _ = conn
        warnings: list[str] = []
        if not RecordingChronologyLinkService.chronology_supported_for_type(draft.recording_type):
            warnings.append(
                "Review chronology linking when the formal record route is wired for this type."
            )
            return None, warnings

        if not formal_record:
            warnings.append(
                "Chronology link will be prepared when a formal record is created."
            )
            return None, warnings

        workflow = formal_record.get("workflow")
        if isinstance(workflow, dict):
            chronology_id = workflow.get("chronology_event_id")
            if chronology_id is not None:
                return str(chronology_id), warnings

        nested = formal_record.get("workflow_result")
        if isinstance(nested, dict) and nested.get("chronology_event_id") is not None:
            return str(nested["chronology_event_id"]), warnings

        warnings.append(
            "Review chronology linking from the formal record."
        )
        return None, warnings


recording_chronology_link_service = RecordingChronologyLinkService()
