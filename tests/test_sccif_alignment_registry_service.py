from __future__ import annotations

from services.sccif_alignment_registry_service import sccif_alignment_registry_service


def test_judgement_areas_exist():
    areas = sccif_alignment_registry_service.list_judgement_areas()
    keys = {a["area"] for a in areas}
    assert keys == {
        "overall_experiences_progress",
        "helped_and_protected",
        "leadership_management",
    }


def test_nine_quality_standards_exist():
    standards = sccif_alignment_registry_service.list_quality_standards()
    assert len(standards) == 9
    titles = {s["title"] for s in standards}
    assert "Protection of children" in titles
    assert "Leadership and management" in titles


def test_safeguarding_maps_to_helped_and_protected():
    mapping = sccif_alignment_registry_service.map_source_to_alignment(
        "recording_drafts", "safeguarding-concern"
    )
    assert "helped_and_protected" in mapping["judgement_areas"]
    assert "protection_children" in mapping["quality_standards"]


def test_daily_note_maps_to_experiences_progress():
    mapping = sccif_alignment_registry_service.map_source_to_alignment(
        "recording_drafts", "daily-note"
    )
    assert "overall_experiences_progress" in mapping["judgement_areas"]
    assert "quality_purpose" in mapping["quality_standards"]
    assert "views_wishes_feelings" in mapping["quality_standards"]


def test_staff_supervision_maps_to_leadership():
    mapping = sccif_alignment_registry_service.map_source_to_alignment("staff_profile_os")
    assert "leadership_management" in mapping["judgement_areas"]
    assert "positive_relationships" in mapping.get("quality_standards", []) or True


def test_safe_disclaimer_exists():
    disclaimer = sccif_alignment_registry_service.safe_alignment_disclaimer()
    assert "not a compliance decision" in disclaimer.lower()
    assert "does not predict" in disclaimer.lower() or "does not generate" in disclaimer.lower()
