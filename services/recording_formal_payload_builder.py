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
    meta = {
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
    if draft.structured_template_id:
        meta["structured_template_id"] = draft.structured_template_id
        meta["structured_template_version"] = draft.structured_template_version
        meta["structured_data"] = draft.structured_data or {}
        meta["structured_summary"] = draft.structured_summary or {}
        meta["structured_review_triggers"] = list(draft.structured_review_triggers or [])
        meta["structured_completion"] = draft.structured_completion or {}
    return meta


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
            "health_appointment": RecordingFormalPayloadBuilder.build_health_payload,
            "handover": RecordingFormalPayloadBuilder.build_handover_payload,
            "medication": RecordingFormalPayloadBuilder.build_medication_payload,
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
        body = _text(draft.body)
        return {
            "young_person_id": draft.child_id,
            "home_id": draft.home_id,
            "title": _text(draft.title) or "Safeguarding concern from recording workspace",
            "concern_summary": body or _text(draft.title) or "Concern recorded in recording workspace",
            "concern_category": "safeguarding",
            "lifecycle_state": "draft",
            "severity": "high",
            "child_voice": body,
            "metadata": _base_metadata(draft),
        }

    @staticmethod
    def build_missing_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        body = _text(draft.body) or _text(draft.title) or "Missing episode reported from recording workspace"
        meta = draft.metadata or {}
        return {
            "young_person_id": draft.child_id,
            "home_id": draft.home_id or meta.get("home_id"),
            "missing_from": _text(meta.get("missing_from")) or "Home",
            "last_seen_location": meta.get("last_seen_location"),
            "circumstances": body,
            "risk_level": meta.get("risk_level") or "high",
            "metadata": _base_metadata(draft),
        }

    @staticmethod
    def build_keywork_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        body = _text(draft.body)
        title = _text(draft.title)
        return {
            "young_person_id": draft.child_id,
            "session_date": _now_iso()[:10],
            "topic": title or "Keywork session",
            "purpose": title or None,
            "summary": body,
            "child_voice": body if draft.recording_type == "child-voice" else None,
            "status": "draft",
            "metadata": _base_metadata(draft),
        }

    @staticmethod
    def build_family_time_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        body = _text(draft.body)
        meta = draft.metadata or {}
        return {
            "young_person_id": draft.child_id,
            "contact_datetime": meta.get("contact_datetime") or _now_iso(),
            "contact_type": meta.get("contact_type") or "family_time",
            "contact_person": meta.get("contact_person") or _text(draft.title) or "Family contact",
            "supervision_level": meta.get("supervision_level"),
            "location": meta.get("location"),
            "pre_contact_presentation": meta.get("pre_contact_presentation"),
            "post_contact_presentation": body,
            "child_voice": meta.get("child_voice"),
            "concerns": meta.get("concerns"),
            "follow_up_required": meta.get("follow_up_required", False),
            "metadata": _base_metadata(draft),
        }

    @staticmethod
    def build_education_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        body = _text(draft.body)
        title = _text(draft.title)
        return {
            "young_person_id": draft.child_id,
            "record_date": _now_iso()[:10],
            "attendance_status": "present",
            "provision_name": title or None,
            "behaviour_summary": body,
            "learning_engagement": body,
            "issue_raised": body if draft.manager_review_required else None,
            "achievement_note": title or None,
            "metadata": _base_metadata(draft),
        }

    @staticmethod
    def build_health_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        body = _text(draft.body)
        title = _text(draft.title) or "Health appointment"
        now = _now_iso()
        meta = draft.metadata or {}
        if draft.recording_type.replace("_", "-") == "health-appointment":
            return {
                "young_person_id": draft.child_id,
                "title": title,
                "description": body,
                "appointment_type": meta.get("appointment_type") or "health",
                "start_datetime": meta.get("start_datetime") or now,
                "end_datetime": meta.get("end_datetime"),
                "location": meta.get("location"),
                "status": meta.get("status") or "scheduled",
                "notes": body,
                "metadata": _base_metadata(draft),
            }
        return {
            "young_person_id": draft.child_id,
            "record_type": meta.get("record_type") or "general",
            "event_datetime": meta.get("event_datetime") or now,
            "title": title,
            "summary": body,
            "outcome": meta.get("outcome"),
            "follow_up_required": meta.get("follow_up_required", False),
            "metadata": _base_metadata(draft),
        }

    @staticmethod
    def build_handover_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        return {
            "home_id": draft.home_id,
            "young_person_id": draft.child_id,
            "title": _text(draft.title) or "Handover from recording workspace",
            "details": _text(draft.body),
            "item_type": "recording_workspace",
            "requires_follow_up": draft.manager_review_required,
            "metadata": _base_metadata(draft),
        }

    @staticmethod
    def build_medication_payload(draft: RecordingDraftRecord) -> dict[str, Any]:
        body = _text(draft.body)
        return {
            "young_person_id": draft.child_id,
            "record_type": "medication_error",
            "event_datetime": _now_iso(),
            "title": _text(draft.title) or "Medication note from recording workspace",
            "summary": body,
            "outcome": body,
            "follow_up_required": True,
            "metadata": _base_metadata(draft),
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
