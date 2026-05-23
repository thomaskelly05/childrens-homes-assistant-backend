"""Conservative mapping from recording workspace types to formal record workflows."""

from __future__ import annotations

from schemas.recording_submission import RecordingSubmissionTarget, RecordingSubmissionTargetStatus
from schemas.recording_drafts import RecordingDraftRecord

# High-risk types requiring manager/safeguarding review before formal completion.
REVIEW_REQUIRED_TYPES = frozenset(
    {
        "safeguarding-concern",
        "physical-intervention",
        "injury-body-map",
        "medication-note-error",
        "missing",
        "allegation",
        "disclosure",
        "police-involvement",
        "hospital",
        "body-map",
        "incident",
    }
)

# Workspace types with clear backend create services (conservative).
SUPPORTED_CREATE_TYPES = frozenset(
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

# Types with frontend formal routes but unclear or environment-dependent draft→service wiring.
ROUTE_TO_WORKFLOW_TYPES = frozenset(
    {
        "handover",
        "child-voice",
        "health-medication",
        "return-conversation",
    }
)

_TARGET_DEFINITIONS: list[dict] = [
    {
        "recording_type": "daily-note",
        "form_id": "daily-note",
        "target_status": "supported_now",
        "target_record_type": "daily_note",
        "backend_route": "/young-people/{young_person_id}/daily-notes",
        "frontend_route": "/daily-logs",
        "service_name": "YoungPersonDailyNotesService.create_daily_note",
        "requires_child": True,
        "chronology_link_supported": True,
        "notes": "Creates daily_notes row when child_id present and DB available.",
    },
    {
        "recording_type": "incident",
        "form_id": "incident",
        "target_status": "supported_now",
        "target_record_type": "incident",
        "backend_route": "/young-people/{young_person_id}/incidents",
        "frontend_route": "/incidents",
        "service_name": "YoungPersonIncidentsService.create_incident",
        "requires_child": True,
        "requires_manager_review": True,
        "safeguarding_sensitive": True,
        "privacy_sensitive": True,
        "chronology_link_supported": True,
        "notes": "Creates incidents row; manager review expected on formal record.",
    },
    {
        "recording_type": "safeguarding-concern",
        "form_id": "safeguarding",
        "target_status": "review_required_before_submit",
        "target_record_type": "safeguarding",
        "backend_route": "/young-people/{young_person_id}/safeguarding",
        "frontend_route": "/safeguarding",
        "service_name": None,
        "requires_child": True,
        "requires_manager_review": True,
        "safeguarding_sensitive": True,
        "privacy_sensitive": True,
        "chronology_link_supported": False,
        "notes": "Use safeguarding workflow; draft submit only until service wiring confirmed.",
    },
    {
        "recording_type": "missing",
        "form_id": "missing",
        "target_status": "supported_now",
        "target_record_type": "missing_episode",
        "backend_route": "/young-people/{young_person_id}/missing-episodes",
        "frontend_route": "/young-people",
        "service_name": "MissingEpisodeService.create",
        "requires_child": True,
        "requires_manager_review": True,
        "safeguarding_sensitive": True,
        "chronology_link_supported": True,
        "notes": "Creates missing episode when child_id, home_id, and review confirmed.",
    },
    {
        "recording_type": "physical-intervention",
        "form_id": "physical-intervention",
        "target_status": "review_required_before_submit",
        "target_record_type": "incident",
        "frontend_route": "/incidents",
        "requires_child": True,
        "requires_manager_review": True,
        "safeguarding_sensitive": True,
        "notes": "Route via incident/PI workflow; manager review required.",
    },
    {
        "recording_type": "injury-body-map",
        "form_id": "body-map",
        "target_status": "review_required_before_submit",
        "target_record_type": "incident",
        "frontend_route": "/incidents",
        "requires_child": True,
        "requires_manager_review": True,
        "safeguarding_sensitive": True,
        "notes": "Body map via incident workflow.",
    },
    {
        "recording_type": "medication-note-error",
        "form_id": "medication-record",
        "target_status": "review_required_before_submit",
        "target_record_type": "medication",
        "frontend_route": "/medication",
        "requires_child": True,
        "requires_manager_review": True,
        "notes": "Medication error via health/medication routes.",
    },
    {
        "recording_type": "keywork",
        "form_id": "keywork",
        "target_status": "supported_now",
        "target_record_type": "keywork",
        "backend_route": "/young-people/{young_person_id}/keywork",
        "frontend_route": "/keywork",
        "service_name": "YoungPersonKeyworkService.create_keywork",
        "requires_child": True,
        "chronology_link_supported": True,
        "notes": "Creates keywork_sessions row when child_id present.",
    },
    {
        "recording_type": "family-time",
        "form_id": "family-contact",
        "target_status": "supported_now",
        "target_record_type": "family_contact",
        "backend_route": "/young-people/{young_person_id}/family-contact-records",
        "frontend_route": "/young-people",
        "service_name": "YoungPersonFamilyService.create_family_contact_record",
        "requires_child": True,
        "chronology_link_supported": True,
        "notes": "Creates family_contact_records row when child_id present.",
    },
    {
        "recording_type": "education-note",
        "form_id": "education-update",
        "target_status": "supported_now",
        "target_record_type": "education",
        "backend_route": "/young-people/{young_person_id}/education-records",
        "frontend_route": "/education",
        "service_name": "YoungPersonEducationService.create_education_record",
        "requires_child": True,
        "chronology_link_supported": True,
        "notes": "Creates education_records row when child_id present.",
    },
    {
        "recording_type": "health-appointment",
        "form_id": "health",
        "target_status": "supported_now",
        "target_record_type": "health_appointment",
        "backend_route": "/young-people/{young_person_id}/appointments",
        "frontend_route": "/appointments",
        "service_name": "YoungPersonAppointmentsService.create_appointment",
        "requires_child": True,
        "chronology_link_supported": True,
        "notes": "Creates appointments row when child_id present.",
    },
    {
        "recording_type": "handover",
        "form_id": "shift-handover",
        "target_status": "route_to_existing_workflow",
        "target_record_type": "handover",
        "frontend_route": "/handover/current",
        "service_name": "handover_service",
        "requires_child": False,
        "chronology_link_supported": False,
        "notes": "Complete shift handover in formal handover module.",
    },
    {
        "recording_type": "child-voice",
        "form_id": "child-voice",
        "target_status": "route_to_existing_workflow",
        "target_record_type": "child_voice",
        "frontend_route": "/young-people",
        "requires_child": True,
        "privacy_sensitive": True,
        "notes": "Child voice child journey segment.",
    },
    {
        "recording_type": "manager-review",
        "form_id": "manager-review",
        "target_status": "review_required_before_submit",
        "target_record_type": "manager_review",
        "frontend_route": "/intelligence-actions",
        "requires_manager_review": True,
        "notes": "Manager review queue; draft submit only.",
    },
    {
        "recording_type": "room-search",
        "form_id": "room-search",
        "target_status": "submit_as_draft_only",
        "target_record_type": None,
        "notes": "No formal backend route wired for workspace draft conversion.",
    },
    {
        "recording_type": "complaint-concern",
        "form_id": "complaint-concern",
        "target_status": "submit_as_draft_only",
        "notes": "Complaints module not wired from recording workspace.",
    },
    {
        "recording_type": "behaviour-support",
        "form_id": "behaviour-support",
        "target_status": "submit_as_draft_only",
        "notes": "Use incident or daily note formal routes.",
    },
    {
        "recording_type": "evidence-document",
        "form_id": "documents",
        "target_status": "route_to_existing_workflow",
        "target_record_type": "document",
        "frontend_route": "/documents",
        "notes": "Upload via documents module.",
    },
    {
        "recording_type": "reg44-evidence",
        "form_id": "reg44-action",
        "target_status": "route_to_existing_workflow",
        "frontend_route": "/young-people",
        "requires_manager_review": True,
        "notes": "Reg 44 evidence via child journey.",
    },
    {
        "recording_type": "reg45-evidence",
        "form_id": "reg45-evidence",
        "target_status": "route_to_existing_workflow",
        "frontend_route": "/young-people",
        "requires_manager_review": True,
        "notes": "Reg 45 evidence via child journey.",
    },
]


def _normalise_type(value: str | None) -> str:
    return (value or "").strip().lower().replace("_", "-")


class RecordingSubmissionTargetRegistry:
    def __init__(self) -> None:
        self._targets: dict[str, RecordingSubmissionTarget] = {}
        for entry in _TARGET_DEFINITIONS:
            key = _normalise_type(entry["recording_type"])
            self._targets[key] = RecordingSubmissionTarget(**entry)

    def list_targets(self) -> list[RecordingSubmissionTarget]:
        return sorted(self._targets.values(), key=lambda t: t.recording_type)

    def get_target(
        self,
        recording_type: str,
        form_id: str | None = None,
    ) -> RecordingSubmissionTarget:
        key = _normalise_type(recording_type)
        target = self._targets.get(key)
        if target:
            return target
        if form_id:
            for candidate in self._targets.values():
                if candidate.form_id == form_id:
                    return candidate
        status: RecordingSubmissionTargetStatus = "unsupported"
        if key in REVIEW_REQUIRED_TYPES:
            status = "review_required_before_submit"
        return RecordingSubmissionTarget(
            recording_type=recording_type,
            form_id=form_id,
            target_status=status,
            target_record_type=None,
            notes="No mapping for this recording type; draft-only submit.",
        )

    def is_supported(self, recording_type: str) -> bool:
        target = self.get_target(recording_type)
        return target.target_status == "supported_now"

    def requires_review(self, recording_type: str) -> bool:
        key = _normalise_type(recording_type)
        target = self.get_target(recording_type)
        return (
            key in REVIEW_REQUIRED_TYPES
            or target.requires_manager_review
            or target.target_status == "review_required_before_submit"
        )

    def route_hint(
        self,
        recording_type: str,
        draft: RecordingDraftRecord | None = None,
    ) -> str:
        target = self.get_target(recording_type, form_id=draft.form_id if draft else None)
        if target.target_status == "supported_now":
            label = (target.target_record_type or "formal").replace("_", " ")
            return f"This draft can be submitted into the formal {label} workflow."
        if target.target_status == "review_required_before_submit":
            return (
                "Manager or safeguarding review is required before this can be treated "
                "as a completed formal record."
            )
        if target.target_status == "route_to_existing_workflow":
            return (
                "This draft can be used with an existing workflow, but automatic creation is not wired yet."
            )
        if target.target_status == "submit_as_draft_only":
            return (
                "This will save the draft as submitted, but no formal record will be created yet."
            )
        return "Formal route not wired yet for this recording type."

    def frontend_route_for(
        self,
        recording_type: str,
        draft: RecordingDraftRecord | None = None,
    ) -> str | None:
        target = self.get_target(recording_type, form_id=draft.form_id if draft else None)
        route = target.frontend_route
        if not route:
            return None
        if draft and draft.child_id and "{young_person_id}" not in route:
            if route.startswith("/young-people") and not route.endswith(str(draft.child_id)):
                return f"/young-people/{draft.child_id}"
        return route

    def backend_route_for(self, recording_type: str) -> str | None:
        return self.get_target(recording_type).backend_route

    def target_summary(self) -> dict[str, int]:
        counts: dict[str, int] = {}
        for target in self._targets.values():
            counts[target.target_status] = counts.get(target.target_status, 0) + 1
        return counts


recording_submission_target_registry = RecordingSubmissionTargetRegistry()
