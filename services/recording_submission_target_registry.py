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

# Extended catalogue forms — explicit targets so no recording type is unrecognised.
_CATALOGUE_FORM_TARGETS: list[dict] = [
    {"recording_type": "general-draft", "form_id": "general-draft", "target_status": "submit_as_draft_only", "notes": "Catalogue draft workspace."},
    {"recording_type": "return-conversation", "form_id": "return-conversation", "target_status": "review_required_before_submit", "requires_manager_review": True, "safeguarding_sensitive": True},
    {"recording_type": "staff-debrief", "form_id": "staff-debrief", "target_status": "submit_as_draft_only"},
    {"recording_type": "damage-repair", "form_id": "damage-repair", "target_status": "submit_as_draft_only"},
    {"recording_type": "professional-visit", "form_id": "professional-visit", "target_status": "submit_as_draft_only"},
    {"recording_type": "health-medication", "form_id": "health-medication", "target_status": "route_to_existing_workflow", "frontend_route": "/medication"},
    {"recording_type": "staff-reflection", "form_id": "staff-reflection", "target_status": "submit_as_draft_only"},
    {"recording_type": "disclosure", "form_id": "disclosure", "target_status": "review_required_before_submit", "requires_manager_review": True, "safeguarding_sensitive": True},
    {"recording_type": "allegation", "form_id": "allegation", "target_status": "review_required_before_submit", "requires_manager_review": True, "safeguarding_sensitive": True},
    {"recording_type": "body-map", "form_id": "body-map", "target_status": "review_required_before_submit", "requires_manager_review": True, "safeguarding_sensitive": True},
    {"recording_type": "medication-error", "form_id": "medication-error", "target_status": "review_required_before_submit", "requires_manager_review": True},
    {"recording_type": "police-involvement", "form_id": "police-involvement", "target_status": "review_required_before_submit", "safeguarding_sensitive": True},
    {"recording_type": "hospital-emergency", "form_id": "hospital-emergency", "target_status": "review_required_before_submit", "safeguarding_sensitive": True},
]

_CATALOGUE_DRAFT_ONLY_FORM_IDS = (
    "night-check-sleep",
    "meals-food-routine",
    "activity-note",
    "independence-life-skills",
    "cultural-identity-religion",
    "wishes-and-feelings",
    "advocate-visit",
    "child-on-child-concern",
    "bullying-peer-conflict",
    "exploitation-concern",
    "compliment",
    "unauthorised-absence",
    "missing-follow-up-plan",
    "health-note",
    "sleep-wellbeing",
    "school-contact",
    "social-worker-visit",
    "iro-visit",
    "lac-review-meeting",
    "multi-agency-meeting",
    "care-plan-update",
    "placement-plan-update",
    "risk-assessment-update",
    "behaviour-support-plan-update",
    "pathway-independence-plan",
    "review-meeting-note",
    "management-oversight",
    "ofsted-evidence",
    "policy-acknowledgement",
    "staff-wellbeing-check-in",
    "team-meeting",
    "shift-leadership",
    "safer-recruitment-note",
    "medication-audit",
    "health-safety-check",
    "fire-drill-evacuation",
    "maintenance-environment",
)

_CATALOGUE_REVIEW_FORM_IDS = (
    "disclosure",
    "allegation",
    "child-on-child-concern",
    "exploitation-concern",
    "police-involvement",
    "hospital-emergency",
    "unauthorised-absence",
    "missing-follow-up-plan",
    "medication-error",
    "body-map",
    "risk-assessment-update",
    "management-oversight",
    "medication-audit",
)

for _form_id in _CATALOGUE_DRAFT_ONLY_FORM_IDS:
    _CATALOGUE_FORM_TARGETS.append(
        {
            "recording_type": _form_id,
            "form_id": _form_id,
            "target_status": "submit_as_draft_only",
            "notes": "Catalogue form — draft workspace until dedicated workflow wired.",
        }
    )

for _form_id in _CATALOGUE_REVIEW_FORM_IDS:
    if _form_id in _CATALOGUE_DRAFT_ONLY_FORM_IDS:
        continue
    _CATALOGUE_FORM_TARGETS.append(
        {
            "recording_type": _form_id,
            "form_id": _form_id,
            "target_status": "review_required_before_submit",
            "requires_manager_review": True,
            "safeguarding_sensitive": _form_id
            not in ("medication-error", "medication-audit", "risk-assessment-update", "management-oversight"),
            "notes": "High-risk catalogue form — manager/safeguarding review before formal completion.",
        }
    )

# Alias targets for workspace types
_CATALOGUE_FORM_TARGETS.extend(
    [
        {"recording_type": "injury-body-map", "form_id": "injury-body-map", "target_status": "review_required_before_submit", "requires_manager_review": True, "safeguarding_sensitive": True},
        {"recording_type": "staff-supervision", "form_id": "staff-supervision", "target_status": "route_to_existing_workflow", "frontend_route": "/staff/supervision"},
        {"recording_type": "action-plan-note", "form_id": "action-plan-note", "target_status": "route_to_existing_workflow", "frontend_route": "/actions"},
    ]
)

_TARGET_DEFINITIONS.extend(_CATALOGUE_FORM_TARGETS)


def _normalise_type(value: str | None) -> str:
    return (value or "").strip().lower().replace("_", "-")


class RecordingSubmissionTargetRegistry:
    def __init__(self) -> None:
        self._targets: dict[str, RecordingSubmissionTarget] = {}
        for entry in _TARGET_DEFINITIONS:
            key = _normalise_type(entry["recording_type"])
            if key in self._targets:
                continue
            self._targets[key] = RecordingSubmissionTarget(**entry)
            form_key = _normalise_type(entry.get("form_id") or "")
            if form_key and form_key not in self._targets:
                self._targets[form_key] = self._targets[key]

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
        status: RecordingSubmissionTargetStatus = "submit_as_draft_only"
        if key in REVIEW_REQUIRED_TYPES:
            status = "review_required_before_submit"
        lookup_id = form_id or recording_type
        if lookup_id and _normalise_type(lookup_id) in { _normalise_type(x) for x in _CATALOGUE_REVIEW_FORM_IDS }:
            status = "review_required_before_submit"
        return RecordingSubmissionTarget(
            recording_type=recording_type,
            form_id=form_id or recording_type,
            target_status=status,
            target_record_type=None,
            notes="Catalogue form — draft-only or review-gated; no automatic formal record creation.",
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
