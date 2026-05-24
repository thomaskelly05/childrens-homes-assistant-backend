from __future__ import annotations

from services.recording_structured_template_registry import recording_structured_template_registry


def test_list_templates_route_handler_data():
    items = recording_structured_template_registry.list_templates()
    assert len(items) >= 10
    assert any(t.form_id == "safeguarding-concern" for t in items)


def test_get_template_by_form_id():
    template = recording_structured_template_registry.get_template(form_id="disclosure")
    assert template
    assert template.title == "Disclosure"


def test_validate_and_summary_services():
    template = recording_structured_template_registry.get_template(form_id="complaint-concern")
    assert template
    values = {
        "who_raised_concern": "Child",
        "what_was_raised": "Food quality",
        "immediate_response": "Spoke with child",
        "who_was_informed": "Manager",
        "outcome_or_follow_up": "Kitchen follow-up",
    }
    validation = recording_structured_template_registry.validate_template_data(template, values)
    assert validation.valid is True
    form_data = recording_structured_template_registry.build_form_data(template, values)
    assert form_data.completion_summary


def test_routes_module_registered():
    from core.router_loader import ROUTER_GROUPS

    reports = next(g for g in ROUTER_GROUPS if g.name == "reports")
    assert "routers.recording_structured_template_routes" in reports.routers


def test_routes_operational_only_markers():
    from pathlib import Path

    text = Path("routers/recording_structured_template_routes.py").read_text(encoding="utf-8")
    assert "operational_only" in text
    assert "standalone_access" in text
    assert "/recording-templates" in text
