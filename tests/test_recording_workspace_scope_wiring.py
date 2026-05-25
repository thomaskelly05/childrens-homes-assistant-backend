from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
RECORD_PAGE = REPO_ROOT / "frontend-next" / "app" / "record" / "page.tsx"
RECORD_HUB = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "record-hub.tsx"
REGISTRY = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-registry.ts"
CATALOGUE = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-form-catalogue-entries.ts"
SCOPE_ROUTES = REPO_ROOT / "frontend-next" / "lib" / "navigation" / "scope-routes.ts"


def test_record_page_accepts_scope_query_params():
    text = RECORD_PAGE.read_text(encoding="utf-8")
    assert "child_id" in text
    assert "home_id" in text
    assert "type" in text


def test_scope_routes_record_links_include_child_id():
    text = SCOPE_ROUTES.read_text(encoding="utf-8")
    assert "child_id" in text
    assert "type=daily-note" in text or "type: 'daily-note'" in text


def test_recording_catalogue_has_many_forms():
    combined = REGISTRY.read_text(encoding="utf-8") + CATALOGUE.read_text(encoding="utf-8")
    ids = re.findall(r"id: '([^']+)'", combined)
    assert len(set(ids)) >= 82, f"Expected >=82 forms, got {len(set(ids))}"


def test_high_risk_template_ids_present():
    combined = REGISTRY.read_text(encoding="utf-8") + CATALOGUE.read_text(encoding="utf-8")
    for form_id in (
        "safeguarding-concern",
        "disclosure",
        "allegation",
        "physical-intervention",
        "body-map",
        "medication-error",
        "missing-episode",
        "room-search",
        "complaint",
    ):
        assert f"'{form_id}'" in combined, form_id


def test_record_hub_syncs_child_from_url():
    text = RECORD_HUB.read_text(encoding="utf-8")
    assert "child_id" in text or "young_person_id" in text
