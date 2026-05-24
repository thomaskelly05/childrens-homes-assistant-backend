from __future__ import annotations

import pytest

from services.recording_structured_template_registry import (
    STANDARD_SAFETY_NOTICES,
    recording_structured_template_registry,
)

P0_FORM_IDS = [
    "safeguarding-concern",
    "disclosure",
    "allegation",
    "physical-intervention",
    "injury-body-map",
    "medication-error",
    "return-conversation",
    "room-search",
    "complaint-concern",
    "police-involvement",
    "hospital-emergency",
]


@pytest.mark.parametrize("form_id", P0_FORM_IDS)
def test_p0_template_exists(form_id: str):
    template = recording_structured_template_registry.get_template(form_id=form_id)
    assert template is not None
    assert template.form_id == form_id


def test_all_templates_have_safety_notices():
    for template in recording_structured_template_registry.list_templates():
        assert template.safety_notices
        for notice in STANDARD_SAFETY_NOTICES:
            assert notice in template.safety_notices


def test_all_templates_require_manager_review():
    for template in recording_structured_template_registry.list_templates():
        assert template.requires_manager_review is True
        assert template.high_risk is True


def test_validation_missing_required_fields():
    template = recording_structured_template_registry.get_template(form_id="disclosure")
    assert template
    result = recording_structured_template_registry.validate_template_data(template, {})
    assert result.valid is False
    assert result.required_missing


def test_review_triggers_generated_for_boolean_flags():
    template = recording_structured_template_registry.get_template(form_id="safeguarding-concern")
    assert template
    values = {
        "what_was_noticed_or_said": "Child appeared withdrawn",
        "date_time": "2026-05-24T10:00",
        "immediate_actions_taken": "Stayed with child",
        "child_current_safety": "Safe in lounge",
        "who_was_informed": "Shift manager",
        "manager_informed": True,
    }
    triggers = recording_structured_template_registry.build_review_triggers(template, values)
    assert any("Manager" in t for t in triggers)


def test_completion_summary_generated():
    template = recording_structured_template_registry.get_template(form_id="allegation")
    assert template
    values = {
        "allegation_summary": "Concern reported by child",
        "immediate_protective_action": "Staff removed from direct care",
        "manager_informed": True,
        "follow_up": "Await safeguarding lead",
    }
    summary = recording_structured_template_registry.build_completion_summary(template, values)
    assert summary
    assert any("Allegation" in line or "allegation" in line.lower() for line in summary)
