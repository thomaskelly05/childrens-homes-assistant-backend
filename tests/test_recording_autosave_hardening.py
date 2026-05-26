from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
EDITOR = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-editor.tsx"
DRAFT_STORE = REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-draft-store.ts"
AUTOSAVE = REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-autosave-indicator.tsx"


def test_autosave_hardening_markers():
    editor = EDITOR.read_text(encoding="utf-8")
    store = DRAFT_STORE.read_text(encoding="utf-8")
    indicator = AUTOSAVE.read_text(encoding="utf-8")
    combined = editor + store + indicator
    for marker in (
        "event_date",
        "structured_data",
        "structuredJson",
        "beforeunload",
        "saveError",
        "recording-autosave-retry",
        "Unable to autosave",
        "Saved securely",
        "Saved in this browser",
        "hasUnsavedLocal",
    ):
        assert marker in combined, f"Missing autosave marker: {marker}"


def test_local_fallback_persists_event_date_and_structured():
    store = DRAFT_STORE.read_text(encoding="utf-8")
    assert "event_date" in store
    assert "structured_data" in store
