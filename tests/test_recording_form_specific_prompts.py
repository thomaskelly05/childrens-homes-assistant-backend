from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_safeguarding_placeholder_in_registry():
    registry = _read(FRONTEND / "lib" / "record" / "recording-form-registry.ts")
    assert "What was noticed, said, seen or disclosed?" in registry
    assert "Manager/safeguarding lead informed" in registry


def test_restraint_placeholder_and_checklist():
    registry = _read(FRONTEND / "lib" / "record" / "recording-form-registry.ts")
    assert "What de-escalation was attempted?" in registry
    assert "Manager review required" in registry


def test_missing_episode_placeholder():
    registry = _read(FRONTEND / "lib" / "record" / "recording-form-registry.ts")
    assert "Return conversation/RHI considered" in registry


def test_child_voice_and_manager_review_placeholders():
    registry = _read(FRONTEND / "lib" / "record" / "recording-form-registry.ts")
    assert "What did the child say, show or communicate?" in registry
    assert "What record or event was reviewed?" in registry


def test_reg44_reg45_placeholders():
    registry = _read(FRONTEND / "lib" / "record" / "recording-form-registry.ts")
    assert "Which theme/standard does it support?" in registry


def test_therapeutic_prompts_component_uses_types():
    prompts = _read(FRONTEND / "components" / "indicare" / "record" / "recording-therapeutic-prompts.tsx")
    assert "safeguarding-concern" in prompts
    assert "physical-intervention" in prompts


def test_orb_rail_form_specific_prompts():
    rail = _read(FRONTEND / "components" / "indicare" / "record" / "recording-orb-rail.tsx")
    assert "recordingType" in rail
    assert "orbSuggestedPrompts" in rail or "recordingFormByWorkspaceType" in rail or "resolveActiveRecordingForm" in rail


def test_registry_forms_have_orb_and_checklist():
    registry = _read(FRONTEND / "lib" / "record" / "recording-form-registry.ts")
    entries = _read(FRONTEND / "lib" / "record" / "recording-form-catalogue-entries.ts")
    combined = registry + entries
    assert combined.count("buildCatalogueForm(") + combined.count("orbSuggestedPrompts:") >= 55
    assert combined.count("qualityChecklist:") + combined.count("qualityChecklist: [") >= 55
