from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SELECTOR = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-type-selector.tsx"
RECORD_HUB = REPO / "frontend-next" / "components" / "indicare" / "record" / "record-hub.tsx"
WORKSPACE = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-workspace.tsx"
SUBMISSION = REPO / "frontend-next" / "components" / "indicare" / "record" / "recording-submission-result.tsx"
RECORD_PAGE = REPO / "frontend-next" / "app" / "record" / "page.tsx"


def test_recording_type_selector_markers():
    text = SELECTOR.read_text(encoding="utf-8")
    assert "recording-type-selector" in text
    assert "recording-selector-category" in text
    assert "recording-selector-start" in text
    assert "router.push(startHref)" in text or "Start this record" in text


def test_record_hub_shows_selector_before_type_selected():
    hub = RECORD_HUB.read_text(encoding="utf-8")
    assert "RecordingTypeSelector" in hub
    assert "hasTypeSelected" in hub
    assert "RecordingWorkspace" in hub


def test_record_hub_hides_duplicate_orb_when_editor_open():
    hub = RECORD_HUB.read_text(encoding="utf-8")
    assert "!hasTypeSelected" in hub
    assert "record-hub-operational-orb-link" in hub


def test_record_hub_child_workspace_back_link():
    hub = RECORD_HUB.read_text(encoding="utf-8")
    assert "record-hub-child-workspace-link" in hub
    assert "childOverviewHref" in hub


def test_recording_workspace_uses_live_coach_only():
    ws = WORKSPACE.read_text(encoding="utf-8")
    assert "OrbLiveRecordingCoach" in ws


def test_submission_result_lifecycle_links_and_draft_id():
    text = SUBMISSION.read_text(encoding="utf-8")
    assert "recording-open-child-workspace" in text
    assert "draft_id=" in text
    assert re.search(r'href=\{`[^`]*\?draft=', text) is None


def test_record_page_wrapper_testid():
    assert 'data-testid="record-page"' in RECORD_PAGE.read_text(encoding="utf-8")
