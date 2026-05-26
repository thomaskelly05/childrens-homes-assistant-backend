from __future__ import annotations

from tests.full_system_qa_helpers import FRONTEND, read

NOT_FOUND = FRONTEND / "app" / "not-found.tsx"
CHILD_DEGRADED = FRONTEND / "app" / "young-people" / "[id]" / "workspace" / "page.tsx"
AUTOSAVE = FRONTEND / "components" / "indicare" / "record" / "recording-autosave-indicator.tsx"
HANDOVER_WS = FRONTEND / "components" / "handover" / "handover-workspace.tsx"
ARCHIVE_LIB = FRONTEND / "components" / "young-people" / "archive" / "child-archive-library.tsx"


def test_not_found_recovery_links():
    text = read(NOT_FOUND)
    assert "select-scope" in text
    assert "/chronology" not in text


def test_child_workspace_degraded_panel():
    text = read(CHILD_DEGRADED)
    assert "child-workspace-degraded" in text


def test_autosave_retry_marker():
    text = read(AUTOSAVE)
    assert "recording-autosave-retry" in text
    assert "Unable to autosave" in text


def test_handover_degraded_marker():
    text = read(HANDOVER_WS)
    assert "handover-workspace-degraded" in text


def test_archive_library_exists():
    assert ARCHIVE_LIB.is_file()
    text = read(ARCHIVE_LIB)
    assert "child-archive" in text or "archive" in text.lower()
