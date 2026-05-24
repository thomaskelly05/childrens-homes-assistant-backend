"""Structured high-risk recording templates for /record — definitions and validation."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from schemas.recording_structured_forms import (
    RecordingStructuredCompletionResult,
    RecordingStructuredFieldDefinition,
    RecordingStructuredFieldType,
    RecordingStructuredFormData,
    RecordingStructuredSection,
    RecordingStructuredTemplate,
)

STANDARD_SAFETY_NOTICES = [
    "Record factually. Avoid speculation.",
    "Follow your home's safeguarding, medication and manager notification procedures.",
    "Manager judgement remains required.",
    "Do not include unnecessary third-party identifiers.",
]

HIGH_RISK_ORB_PROMPTS = [
    "Help me check whether this record is factual and complete.",
    "What follow-up should a manager review?",
    "Have I separated fact from interpretation?",
    "What should I avoid including unnecessarily?",
    "Help me prepare questions for manager review.",
]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _field(
    field_id: str,
    label: str,
    field_type: RecordingStructuredFieldType = "textarea",
    *,
    required: bool = False,
    privacy_sensitive: bool = False,
    safeguarding_sensitive: bool = False,
    guidance: str | None = None,
    review_trigger: bool = False,
    maps_to_summary: bool = True,
    placeholder: str | None = None,
    options: list[str] | None = None,
) -> RecordingStructuredFieldDefinition:
    return RecordingStructuredFieldDefinition(
        id=field_id,
        label=label,
        field_type=field_type,
        required=required,
        privacy_sensitive=privacy_sensitive,
        safeguarding_sensitive=safeguarding_sensitive,
        guidance=guidance,
        review_trigger=review_trigger,
        maps_to_summary=maps_to_summary,
        placeholder=placeholder,
        options=options or [],
    )


def _section(section_id: str, title: str, fields: list[RecordingStructuredFieldDefinition], description: str | None = None) -> RecordingStructuredSection:
    return RecordingStructuredSection(id=section_id, title=title, description=description, fields=fields)


def _base_template(
    form_id: str,
    title: str,
    description: str,
    sections: list[RecordingStructuredSection],
    *,
    recording_type: str | None = None,
    quality_prompts: list[str] | None = None,
) -> RecordingStructuredTemplate:
    return RecordingStructuredTemplate(
        form_id=form_id,
        recording_type=recording_type,
        title=title,
        description=description,
        high_risk=True,
        requires_manager_review=True,
        safeguarding_sensitive=True,
        privacy_sensitive=True,
        sections=sections,
        quality_prompts=quality_prompts
        or [
            "Separate fact from interpretation.",
            "Include child voice where appropriate.",
            "Record who was informed and immediate safety actions.",
            "Note follow-up and manager review needs.",
        ],
        orb_prompts=list(HIGH_RISK_ORB_PROMPTS),
        safety_notices=list(STANDARD_SAFETY_NOTICES),
        version="1.0",
    )


def _safeguarding_concern_template() -> RecordingStructuredTemplate:
    return _base_template(
        "safeguarding-concern",
        "Safeguarding concern",
        "Structured capture for safeguarding concerns — manager review required.",
        recording_type="safeguarding-concern",
        sections=[
            _section(
                "concern",
                "Concern",
                [
                    _field("what_was_noticed_or_said", "What was noticed or said", required=True, safeguarding_sensitive=True),
                    _field("date_time", "Date and time", "datetime", required=True),
                    _field("location_context", "Location and context"),
                    _field("child_voice_or_presentation", "Child voice or presentation", privacy_sensitive=True, safeguarding_sensitive=True),
                ],
            ),
            _section(
                "immediate_safety",
                "Immediate safety",
                [
                    _field("immediate_actions_taken", "Immediate actions taken", required=True),
                    _field("child_current_safety", "Child current safety", required=True),
                    _field("who_was_informed", "Who was informed", required=True),
                    _field("manager_informed", "Manager informed", "boolean", review_trigger=True),
                    _field("safeguarding_lead_informed", "Safeguarding lead informed", "boolean", review_trigger=True),
                ],
            ),
            _section(
                "follow_up",
                "Follow-up",
                [
                    _field("follow_up_needed", "Follow-up needed"),
                    _field("actions_created", "Actions created", "action_list"),
                    _field("external_referral_considered", "External referral considered", "boolean", review_trigger=True),
                    _field("review_required", "Review required", "boolean", review_trigger=True),
                ],
            ),
        ],
    )


def _disclosure_template() -> RecordingStructuredTemplate:
    return _base_template(
        "disclosure",
        "Disclosure",
        "Structured capture for child disclosures — do not investigate in this record.",
        sections=[
            _section("disclosure", "Disclosure", [
                _field("what_was_disclosed", "What was disclosed (necessary detail only)", required=True, privacy_sensitive=True, safeguarding_sensitive=True),
                _field("how_child_presented", "How the child presented", privacy_sensitive=True),
                _field("adult_response", "Adult response", required=True),
                _field("words_used_by_child_if_appropriate", "Child's words (if appropriate)", privacy_sensitive=True, safeguarding_sensitive=True),
            ]),
            _section("safety", "Immediate safety", [
                _field("immediate_safety_action", "Immediate safety action", required=True),
                _field("who_was_informed", "Who was informed", required=True),
                _field("do_not_investigate_prompt", "Investigation reminder", "text", guidance="Do not investigate — follow local safeguarding procedure."),
            ]),
            _section("follow_up", "Follow-up", [
                _field("follow_up", "Follow-up and next steps", required=True),
            ]),
        ],
    )


def _allegation_template() -> RecordingStructuredTemplate:
    return _base_template(
        "allegation",
        "Allegation",
        "Structured capture for allegations — factual only, no conclusions.",
        sections=[
            _section("allegation", "Allegation", [
                _field("allegation_summary", "Allegation summary (factual)", required=True, safeguarding_sensitive=True),
                _field("person_about_whom_concern_raised", "Person about whom concern was raised", privacy_sensitive=True),
            ]),
            _section("immediate", "Immediate protective action", [
                _field("immediate_protective_action", "Immediate protective action", required=True),
                _field("manager_informed", "Manager informed", "boolean", required=True, review_trigger=True),
                _field("safeguarding_lead_informed", "Safeguarding lead informed", "boolean", review_trigger=True),
                _field("external_agency_considered", "External agency considered", "boolean", review_trigger=True),
            ]),
            _section("follow_up", "Follow-up", [
                _field("evidence_preservation", "Evidence preservation steps"),
                _field("follow_up", "Follow-up", required=True),
            ]),
        ],
    )


def _physical_intervention_template() -> RecordingStructuredTemplate:
    return _base_template(
        "physical-intervention",
        "Physical intervention / restraint",
        "Structured capture for restraint and physical intervention records.",
        recording_type="physical-intervention",
        sections=[
            _section("antecedents", "Antecedents and risk", [
                _field("antecedents", "Antecedents", required=True),
                _field("de_escalation_attempted", "De-escalation attempted", required=True),
                _field("risk_presented", "Risk presented", required=True, safeguarding_sensitive=True),
            ]),
            _section("intervention", "Intervention", [
                _field("intervention_used", "Intervention used", required=True),
                _field("duration", "Duration"),
                _field("staff_involved", "Staff involved", "person_list", privacy_sensitive=True),
            ]),
            _section("welfare", "Welfare checks", [
                _field("child_injury_check", "Child injury check", required=True),
                _field("staff_injury_check", "Staff injury check"),
                _field("child_debrief_or_repair", "Child debrief or repair"),
                _field("staff_debrief", "Staff debrief"),
            ]),
            _section("notification", "Notification and follow-up", [
                _field("manager_notified", "Manager notified", "boolean", required=True, review_trigger=True),
                _field("follow_up_actions", "Follow-up actions", "action_list"),
            ]),
        ],
    )


def _injury_body_map_template() -> RecordingStructuredTemplate:
    return _base_template(
        "injury-body-map",
        "Injury / body map",
        "Structured capture for injuries and body map completion.",
        recording_type="injury-body-map",
        sections=[
            _section("injury", "Injury", [
                _field("injury_observed", "Injury observed", required=True, privacy_sensitive=True, safeguarding_sensitive=True),
                _field("child_explanation", "Child explanation", privacy_sensitive=True),
                _field("body_area_general", "Body area (general)", required=True),
            ]),
            _section("response", "Response", [
                _field("first_aid_or_medical_advice", "First aid or medical advice", required=True),
                _field("manager_informed", "Manager informed", "boolean", required=True, review_trigger=True),
                _field("body_map_completed", "Body map completed", "boolean", required=True),
                _field("parent_social_worker_informed_if_applicable", "Parent / social worker informed (if applicable)", privacy_sensitive=True),
            ]),
            _section("follow_up", "Follow-up", [
                _field("follow_up_monitoring", "Follow-up monitoring", required=True),
            ]),
        ],
    )


def _medication_error_template() -> RecordingStructuredTemplate:
    return _base_template(
        "medication-error",
        "Medication error",
        "Structured capture for medication errors — follow medication procedures.",
        recording_type="medication-note-error",
        sections=[
            _section("medication", "Medication", [
                _field("medication_involved", "Medication involved", required=True, privacy_sensitive=True),
                _field("what_happened", "What happened", required=True, safeguarding_sensitive=True),
                _field("dose_time_context", "Dose / time context", required=True),
            ]),
            _section("response", "Response", [
                _field("immediate_action", "Immediate action", required=True),
                _field("medical_advice_sought", "Medical advice sought", "boolean", review_trigger=True),
                _field("manager_informed", "Manager informed", "boolean", required=True, review_trigger=True),
                _field("parent_social_worker_informed_if_applicable", "Parent / social worker informed (if applicable)", privacy_sensitive=True),
            ]),
            _section("follow_up", "Follow-up", [
                _field("monitoring_required", "Monitoring required"),
                _field("follow_up_prevention", "Follow-up prevention", required=True),
            ]),
        ],
    )


def _return_conversation_template() -> RecordingStructuredTemplate:
    return _base_template(
        "return-conversation",
        "Return conversation / RHI",
        "Structured capture for return home interviews and return conversations.",
        recording_type="return-conversation",
        sections=[
            _section("return", "Return", [
                _field("missing_episode_reference", "Missing episode reference"),
                _field("return_time", "Return time", "datetime", required=True),
                _field("child_presentation_on_return", "Child presentation on return", required=True, privacy_sensitive=True),
            ]),
            _section("conversation", "Conversation", [
                _field("what_child_said", "What the child said", privacy_sensitive=True, safeguarding_sensitive=True),
                _field("push_pull_factors", "Push / pull factors"),
                _field("harm_or_risk_disclosed", "Harm or risk disclosed", privacy_sensitive=True, review_trigger=True),
            ]),
            _section("support", "Support and planning", [
                _field("immediate_support", "Immediate support", required=True),
                _field("rhi_offered_or_completed", "RHI offered or completed", "boolean"),
                _field("safety_plan_update", "Safety plan update"),
            ]),
        ],
    )


def _room_search_template() -> RecordingStructuredTemplate:
    return _base_template(
        "room-search",
        "Room search / prohibited item",
        "Structured capture for room searches with dignity and privacy considerations.",
        recording_type="room-search",
        sections=[
            _section("search", "Search", [
                _field("reason_for_search", "Reason for search", required=True),
                _field("who_authorised", "Who authorised", required=True),
                _field("who_was_present", "Who was present", "person_list"),
                _field("dignity_privacy_measures", "Dignity and privacy measures", required=True),
            ]),
            _section("outcome", "Outcome", [
                _field("what_was_found", "What was found"),
                _field("child_response", "Child response", privacy_sensitive=True),
                _field("follow_up_action", "Follow-up action", required=True),
                _field("manager_review", "Manager review noted", "boolean", required=True, review_trigger=True),
            ]),
        ],
    )


def _complaint_concern_template() -> RecordingStructuredTemplate:
    return _base_template(
        "complaint-concern",
        "Complaint / concern",
        "Structured capture for complaints and concerns raised about care.",
        recording_type="complaint-concern",
        sections=[
            _section("concern", "Concern", [
                _field("who_raised_concern", "Who raised the concern", required=True),
                _field("what_was_raised", "What was raised", required=True),
                _field("child_view", "Child view", privacy_sensitive=True),
            ]),
            _section("response", "Response", [
                _field("immediate_response", "Immediate response", required=True),
                _field("who_was_informed", "Who was informed", required=True),
                _field("outcome_or_follow_up", "Outcome or follow-up", required=True),
                _field("timescale_owner", "Timescale and owner"),
            ]),
        ],
    )


def _police_hospital_template(form_id: str, title: str, recording_type: str | None = None) -> RecordingStructuredTemplate:
    return _base_template(
        form_id,
        title,
        "Structured capture for police or emergency/hospital involvement.",
        recording_type=recording_type,
        sections=[
            _section("involvement", "Involvement", [
                _field("reason_for_involvement", "Reason for involvement", required=True, safeguarding_sensitive=True),
                _field("agency_contacted", "Agency contacted", required=True),
                _field("incident_context", "Incident context (factual)", required=True),
            ]),
            _section("child", "Child welfare", [
                _field("child_presentation", "Child presentation", privacy_sensitive=True),
                _field("adult_support", "Adult support provided", required=True),
            ]),
            _section("follow_up", "Follow-up", [
                _field("outcome", "Outcome (if known)"),
                _field("follow_up", "Follow-up", required=True),
                _field("notifications", "Notifications completed", required=True),
            ]),
        ],
    )


def _child_on_child_template() -> RecordingStructuredTemplate:
    return _base_template(
        "child-on-child-concern",
        "Child-on-child concern",
        "Structured capture for peer harm and child-on-child safeguarding concerns.",
        sections=[
            _section("incident", "What happened", [
                _field("what_happened", "What happened (facts)", required=True, safeguarding_sensitive=True),
                _field("who_was_involved", "Who was involved (roles only where needed)", privacy_sensitive=True),
                _field("safety_of_all_children", "Safety of all children", required=True),
            ]),
            _section("response", "Response", [
                _field("support_provided", "Support provided", required=True),
                _field("manager_informed", "Manager informed", "boolean", required=True, review_trigger=True),
                _field("follow_up_plan", "Follow-up plan", required=True),
            ]),
        ],
    )


def _exploitation_template() -> RecordingStructuredTemplate:
    return _base_template(
        "exploitation-concern",
        "Exploitation concern",
        "Structured capture for CCE/CSE or exploitation indicators.",
        sections=[
            _section("indicators", "Indicators", [
                _field("indicators_noticed", "Indicators noticed (factual)", required=True, safeguarding_sensitive=True),
                _field("child_voice", "Child voice", privacy_sensitive=True, safeguarding_sensitive=True),
            ]),
            _section("response", "Response", [
                _field("who_was_informed", "Who was informed", required=True),
                _field("immediate_safety_planning", "Immediate safety planning", required=True),
                _field("manager_safeguarding_lead_informed", "Manager / safeguarding lead informed", "boolean", review_trigger=True),
            ]),
        ],
    )


def _damage_repair_template() -> RecordingStructuredTemplate:
    return _base_template(
        "damage-repair",
        "Damage / repair",
        "Structured capture for property damage and restorative repair.",
        recording_type="damage-repair",
        sections=[
            _section("damage", "Damage", [
                _field("what_was_damaged", "What was damaged", required=True),
                _field("context_factual", "Context (factual)", required=True),
            ]),
            _section("repair", "Repair and reflection", [
                _field("child_involvement_in_repair", "Child involvement in repair"),
                _field("restorative_conversation", "Restorative conversation"),
                _field("manager_informed", "Manager informed", "boolean", review_trigger=True),
            ]),
        ],
    )


def _staff_debrief_template() -> RecordingStructuredTemplate:
    return _base_template(
        "staff-debrief-after-incident",
        "Staff debrief after incident",
        "Structured staff debrief following a significant incident.",
        recording_type="staff-debrief",
        sections=[
            _section("debrief", "Debrief", [
                _field("incident_reference", "Incident reference", required=True),
                _field("staff_involved", "Staff involved", "person_list", privacy_sensitive=True),
                _field("what_went_well", "What went well"),
                _field("what_could_improve", "What could improve", required=True),
                _field("support_needed", "Support needed"),
            ]),
            _section("actions", "Actions", [
                _field("actions_agreed", "Actions agreed", "action_list", required=True),
                _field("manager_notified", "Manager notified", "boolean", review_trigger=True),
            ]),
        ],
    )


def _build_all_templates() -> dict[str, RecordingStructuredTemplate]:
    templates: dict[str, RecordingStructuredTemplate] = {}
    entries = [
        _safeguarding_concern_template(),
        _disclosure_template(),
        _allegation_template(),
        _physical_intervention_template(),
        _injury_body_map_template(),
        _medication_error_template(),
        _return_conversation_template(),
        _room_search_template(),
        _complaint_concern_template(),
        _police_hospital_template("police-involvement", "Police involvement"),
        _police_hospital_template("hospital-emergency", "Hospital / emergency services"),
        _child_on_child_template(),
        _exploitation_template(),
        _damage_repair_template(),
        _staff_debrief_template(),
    ]
    for template in entries:
        templates[template.form_id] = template
    return templates


_TEMPLATES: dict[str, RecordingStructuredTemplate] = _build_all_templates()

_RECORDING_TYPE_ALIASES: dict[str, str] = {
    "safeguarding": "safeguarding-concern",
    "medication-note-error": "medication-error",
    "restraint": "physical-intervention",
}


class RecordingStructuredTemplateRegistry:
    def list_templates(self) -> list[RecordingStructuredTemplate]:
        return list(_TEMPLATES.values())

    def get_template(
        self,
        *,
        form_id: str | None = None,
        recording_type: str | None = None,
    ) -> RecordingStructuredTemplate | None:
        if form_id and form_id in _TEMPLATES:
            return _TEMPLATES[form_id]
        if recording_type:
            rt = recording_type.replace("_", "-")
            if rt in _TEMPLATES:
                return _TEMPLATES[rt]
            alias = _RECORDING_TYPE_ALIASES.get(rt)
            if alias and alias in _TEMPLATES:
                return _TEMPLATES[alias]
        return None

    def has_template(
        self,
        *,
        form_id: str | None = None,
        recording_type: str | None = None,
    ) -> bool:
        return self.get_template(form_id=form_id, recording_type=recording_type) is not None

    def _iter_fields(self, template: RecordingStructuredTemplate):
        for section in template.sections:
            for field in section.fields:
                yield field

    def _field_value_present(self, field: RecordingStructuredFieldDefinition, values: dict[str, Any]) -> bool:
        raw = values.get(field.id)
        if field.field_type == "boolean":
            return raw is True
        if isinstance(raw, list):
            return len(raw) > 0
        return bool(str(raw or "").strip())

    def validate_template_data(
        self,
        template: RecordingStructuredTemplate,
        values: dict[str, Any],
    ) -> RecordingStructuredCompletionResult:
        required_missing: list[str] = []
        for field in self._iter_fields(template):
            if field.required and not self._field_value_present(field, values):
                required_missing.append(field.id)

        summary = self.build_completion_summary(template, values)
        triggers = self.build_review_triggers(template, values)
        safety_flags = list(template.safety_notices)
        if required_missing:
            safety_flags.append("Required structured fields are incomplete.")
        privacy_ids = [f.id for f in self._iter_fields(template) if f.privacy_sensitive and self._field_value_present(f, values)]

        return RecordingStructuredCompletionResult(
            valid=len(required_missing) == 0,
            required_missing=required_missing,
            completion_summary=summary,
            review_triggers=triggers,
            safety_flags=safety_flags,
            privacy_field_ids=privacy_ids,
        )

    def build_completion_summary(
        self,
        template: RecordingStructuredTemplate,
        values: dict[str, Any],
    ) -> list[str]:
        lines: list[str] = []
        for field in self._iter_fields(template):
            if not field.maps_to_summary:
                continue
            if not self._field_value_present(field, values):
                continue
            raw = values.get(field.id)
            if field.field_type == "boolean":
                display = "Yes" if raw is True else "No"
            elif isinstance(raw, list):
                display = "; ".join(str(item) for item in raw[:5])
            else:
                display = str(raw).strip()
            if len(display) > 240:
                display = display[:237] + "..."
            lines.append(f"{field.label}: {display}")
        return lines

    def build_review_triggers(
        self,
        template: RecordingStructuredTemplate,
        values: dict[str, Any],
    ) -> list[str]:
        triggers: list[str] = []
        for field in self._iter_fields(template):
            if not field.review_trigger:
                continue
            if self._field_value_present(field, values):
                triggers.append(f"{field.label} flagged for manager review.")
        for static in template.review_triggers:
            if static not in triggers:
                triggers.append(static)
        if template.requires_manager_review:
            triggers.append("Manager review required for this record type.")
        if template.safeguarding_sensitive:
            triggers.append("Safeguarding-sensitive structured record.")
        return triggers

    def build_quality_prompts(self, template: RecordingStructuredTemplate) -> list[str]:
        return list(template.quality_prompts)

    def build_template_context_for_draft(
        self,
        template: RecordingStructuredTemplate,
        values: dict[str, Any],
    ) -> dict[str, Any]:
        completion = self.validate_template_data(template, values)
        return {
            "template_id": template.form_id,
            "template_version": template.version,
            "values": values,
            "completion_summary": completion.completion_summary,
            "required_missing": completion.required_missing,
            "review_triggers": completion.review_triggers,
            "safety_flags": completion.safety_flags,
            "updated_at": _now_iso(),
        }

    def build_form_data(
        self,
        template: RecordingStructuredTemplate,
        values: dict[str, Any],
    ) -> RecordingStructuredFormData:
        completion = self.validate_template_data(template, values)
        return RecordingStructuredFormData(
            template_id=template.form_id,
            template_version=template.version,
            values=values,
            completion_summary=completion.completion_summary,
            required_missing=completion.required_missing,
            review_triggers=completion.review_triggers,
            safety_flags=completion.safety_flags,
            updated_at=_now_iso(),
        )


recording_structured_template_registry = RecordingStructuredTemplateRegistry()
