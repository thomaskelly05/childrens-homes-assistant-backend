from __future__ import annotations

import re
from pathlib import Path

from services.recording_submission_target_registry import recording_submission_target_registry

REPO_ROOT = Path(__file__).resolve().parents[1]
REGISTRY = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-registry.ts"


def _registry_form_ids() -> list[str]:
    text = REGISTRY.read_text(encoding="utf-8")
    return [m.group(1) for m in re.finditer(r"id: '([^']+)'", text)]


def test_every_registry_form_has_backend_target():
    for form_id in _registry_form_ids():
        target = recording_submission_target_registry.get_target(form_id, form_id=form_id)
        assert target.target_status != "unsupported", form_id
        assert target.form_id is not None or target.recording_type


def test_disclosure_review_required():
    target = recording_submission_target_registry.get_target("disclosure")
    assert target.target_status == "review_required_before_submit"


def test_fire_drill_draft_only():
    target = recording_submission_target_registry.get_target("fire-drill-evacuation")
    assert target.target_status in {"submit_as_draft_only", "route_to_existing_workflow"}
