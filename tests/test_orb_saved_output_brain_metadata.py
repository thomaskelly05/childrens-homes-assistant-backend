from __future__ import annotations

import pytest

from schemas.orb_saved_outputs import OrbSavedOutputCreate
from services.orb_brain_metadata_service import assert_standalone_brain_contract
from services.orb_saved_output_service import orb_saved_output_service


@pytest.fixture(autouse=True)
def memory_outputs(monkeypatch):
    svc = orb_saved_output_service
    svc._memory = {}
    svc._storage_mode = "memory"
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def test_create_merges_brain_metadata_and_standalone_flags():
    record = orb_saved_output_service.create_output(
        42,
        OrbSavedOutputCreate(
            title="Dictate note",
            type="recording_rewrite",
            content_markdown="# Note\n\nBody",
            created_from="dictate",
            metadata={
                "source_feature": "dictate",
                "source_text": "raw transcript",
                "brain_metadata": {
                    "surface": "orb_residential",
                    "product": "ORB Residential",
                    "powered_by": "IndiCare Intelligence",
                    "brain": "orb_residential_intelligence",
                    "os_records_accessed": False,
                    "live_record_access": False,
                    "standalone": True,
                    "feature": "dictate",
                },
            },
        ),
    )
    assert record.standalone_only is True
    assert record.os_linked is False
    assert record.care_record_access is False
    brain = record.metadata.get("brain_metadata") or {}
    assert_standalone_brain_contract(brain)
    assert record.metadata.get("source_feature") == "dictate"
    assert record.metadata.get("os_records_accessed") is False
    assert record.metadata.get("live_record_access") is False


def test_export_includes_source_and_brain_footer():
    record = orb_saved_output_service.create_output(
        43,
        OrbSavedOutputCreate(
            title="Shift plan",
            type="intelligence_note",
            summary="Handover summary",
            content_markdown="## Priorities",
            created_from="shift_builder",
            metadata={"source_feature": "shift_builder", "focus": "handover_only"},
        ),
    )
    exported = orb_saved_output_service.export_output(43, record.id, "markdown")
    assert exported is not None
    content = exported["content"]
    assert "Shift plan" in content
    assert "shift builder" in content.lower() or "Shift Builder" in content
    assert "ORB Residential" in content
    assert "standalone ORB artefacts" in content
    assert "does not access live care records" in content
