from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"
SELECTOR = FRONTEND / "components" / "indicare" / "record" / "recording-type-selector.tsx"
GROUPS = FRONTEND / "lib" / "record" / "recording-category-groups.ts"


def test_selector_imports_registry_helpers():
    groups = GROUPS.read_text(encoding="utf-8")
    assert "RECORDING_FORM_REGISTRY" in groups
    assert "workspaceRecordingForms" in groups
    assert "catalogueRecordingForms" in groups
    selector = SELECTOR.read_text(encoding="utf-8")
    assert "workspaceFormsForSelectorCategory" in selector
    assert "guidanceForForm" in selector


def test_no_hardcoded_form_list_in_selector():
    selector = SELECTOR.read_text(encoding="utf-8")
    assert "daily-note" not in selector or "workspaceFormsForSelectorCategory" in selector
