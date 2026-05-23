"""Build formal service payloads from secure recording drafts."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from schemas.recording_drafts import RecordingDraftRecord
from schemas.recording_submission import RecordingSubmissionTarget


def _text(value: Any, fallback: str = "") -> str:
    return str(value or "").strip() or fallback


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _base_metadata(draft: RecordingDraftRecord) -> dict[str, Any]:
    return {
        "source": "record_workspace",
        "draft_id": draft.id,
        "recording_type": draft.recording_type,
        "quality_flags": list(draft.quality_flags or []),
        "language_flags": list(draft.language_flags or []),
        "privacy_flags": list(draft.privacy_flags or []),
        "manager_review_required": draft.manager_review_required,
        "safeguarding_review_required": draft.safeguarding_review_required,
        "privacy_sensitive": draft.privacy_sensitive,
        "safeguarding_sensitive": draft.safeguarding_sensitive,
        **(draft.metadata or {}),
    }


class RecordingFormalPayloadBuilder:
    @staticmethod
    def build_payload(draft: RecordingDraftRecord, target: RecordingSubmissionTarget) -> dict[str, Any]:
        record_type = target.target_record_type or draft.recording_type
        builders = {
            "daily_note": RecordingFormalPayloadBuilder.build_daily_note_payload,
            "incident": RecordingFormalPayloadBuilder.build_incident_payload,
            "safeguarding": RecordingFormalPayloadBuilder.build_safeguarding_payload,
            "missing_episode": RecordingFormalPayloadBuilder.build_missing_payload,
            "keywork": RecordingFormalPayloadBuilder.build_keywork_payload,
            "family_contact": RecordingFormalPayloadBuilder.build_family_time_payload,
            "education": RecordingFormalPayloadBuilder.build_education_payload,
            "health": RecordingFormalPayloadBuilder.build_health_payload,
            "handover": RecordingFormalPayloadBuilder.build_handover_payload,
        }
        builder = builders.get(record_type or "", RecordingFormalPayloadBuilder.build_generic_payload)
        return builder(draft)

    @staticmethod
    def build_daily_note_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        body = _text(draft.body)
        return {
            "young_person_id": draft.child_id,
            "child_id": draft.child_id,
            "home_id": draft.home_id,
            "title": _text(draft.title) or "Recording workspace daily note",
            "note_date": _now_iso()[:10],
            "shift_type": "day",
            "presentation": body,
            "young_person_voice": body if draft.recording_type == "child-voice" else None,
            "narrative": body,
            "significance": "medium",
            "workflow_status": "draft",
            "link_to_chronology": True,
            "metadata": _base_metadata(draft),
        }

    @staticmethod
    def build_incident_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        body = _text(draft.body)
        incident_type = "other"
        rt = _text(draft.recording_type).replace("_", "-")
        if rt == "physical-intervention":
            incident_type = "physical_intervention"
        elif rt == "injury-body-map":
            incident_type = "health_incident"
        elif rt == "medication-note-error":
            incident_type = "medication_error"
        elif rt == "safeguarding-concern":
            incident_type = "safeguarding_concern"
        return {
            "young_person_id": draft.child_id,
            "child_id": draft.child_id,
            "home_id": draft.home_id,
            "title": _text(draft.title),
            "incident_datetime": _now_iso(),
            "occurred_at": _now_iso(),
            "description": body,
            "narrative": body,
            "incident_type": incident_type,
            "severity": "medium",
            "manager_review_status": "draft",
            "workflow_status": "draft",
            "staff_id": draft.staff_id,
            "metadata": _base_metadata(draft),
        }

    @staticmethod
    def build_safeguarding_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        return RecordingFormalPayloadBuilder.build_generic_payload(draft) | {
            "record_type": "safeguarding",
        }

    @staticmethod
    def build_missing_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        return RecordingFormalPayloadBuilder.build_generic_payload(draft) | {
            "record_type": "missing_episode",
        }

    @staticmethod
    def build_keywork_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        return RecordingFormalPayloadBuilder.build_generic_payload(draft) | {
            "record_type": "keywork",
            "session_notes": _text(draft.body),
        }

    @staticmethod
    def build_family_time_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        return RecordingFormalPayloadBuilder.build_generic_payload(draft) | {
            "record_type": "family_contact",
            "contact_notes": _text(draft.body),
        }

    @staticmethod
    def build_education_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        return RecordingFormalPayloadBuilder.build_generic_payload(draft) | {
            "record_type": "education",
            "notes": _text(draft.body),
        }

    @staticmethod
    def build_health_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        return RecordingFormalPayloadBuilder.build_generic_payload(draft) | {
            "record_type": "health",
            "notes": _text(draft.body),
        }

    @staticmethod
    def build_handover_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        return RecordingFormalPayloadBuilder.build_generic_payload(draft) | {
            "record_type": "handover",
            "handover_notes": _text(draft.body),
        }

    @staticmethod
    def build_generic_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        return {
            "young_person_id": draft.child_id,
            "child_id": draft.child_id,
            "home_id": draft.home_id,
            "title": _text(draft.title),
            "body": _text(draft.body),
            "notes": _text(draft.body),
            "narrative": _text(draft.body),
            "recorded_at": _now_iso(),
            "metadata": _base_metadata(draft),
        }


recording_formal_payload_builder = RecordingFormalPayloadBuilder()
