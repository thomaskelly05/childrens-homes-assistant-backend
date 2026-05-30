from __future__ import annotations

import pytest

from schemas.orb_intelligence_output import OrbIntelligenceOutput
from schemas.orb_saved_outputs import OrbSavedOutputCreate, OrbSavedOutputListRequest, OrbSavedOutputUpdate
from services.orb_saved_output_service import orb_saved_output_service


@pytest.fixture(autouse=True)
def memory_outputs(monkeypatch):
    svc = orb_saved_output_service
    svc._memory = {}
    monkeypatch.setattr(svc, "_detect_storage_mode", lambda: "memory")


def test_create_list_search_filter():
    created = orb_saved_output_service.create_output(
        OrbSavedOutputCreate(
            title="Manager briefing on child voice",
            type="manager_briefing",
            project_id="project-ofsted",
            project_name="Ofsted Prep",
            tags=["ofsted", "briefing"],
            summary="Summary text",
            content_markdown="# Briefing\n\nBody",
        )
    )
    assert created.standalone_only is True
    assert created.os_linked is False
    assert created.care_record_access is False

    listed = orb_saved_output_service.list_outputs(
        OrbSavedOutputListRequest(project_id="project-ofsted")
    )
    assert listed.total == 1
    assert listed.items[0].title == "Manager briefing on child voice"

    search = orb_saved_output_service.list_outputs(
        OrbSavedOutputListRequest(search="child voice")
    )
    assert search.total == 1

    by_tag = orb_saved_output_service.list_outputs(OrbSavedOutputListRequest(tag="briefing"))
    assert by_tag.total == 1

    by_type = orb_saved_output_service.list_outputs(
        OrbSavedOutputListRequest(output_type="manager_briefing")
    )
    assert by_type.total == 1


def test_archive_delete_export_reuse():
    record = orb_saved_output_service.create_output(
        OrbSavedOutputCreate(
            title="Action plan draft",
            type="action_plan",
            content_markdown="## Actions\n\n- Review policy",
            summary="Draft actions",
        )
    )
    exported = orb_saved_output_service.export_output(record.id, "markdown")
    assert exported is not None
    assert "Action plan draft" in exported["content"]
    assert "ORB Residential artefacts" in exported["content"]

    plain = orb_saved_output_service.export_output(record.id, "plain_text")
    assert plain is not None
    assert "Actions" in plain["content"]

    json_export = orb_saved_output_service.export_output(record.id, "json")
    assert json_export is not None
    assert record.id in json_export["content"]

    reuse = orb_saved_output_service.build_reuse_prompt(record.id, "turn this into a staff briefing")
    assert reuse is not None
    assert "staff briefing" in reuse.suggested_prompt
    assert reuse.source_count == 0

    archived = orb_saved_output_service.archive_output(record.id)
    assert archived is not None
    assert archived.status == "archived"

    assert orb_saved_output_service.delete_output(record.id) is True
    assert orb_saved_output_service.get_output(record.id) is None


def test_save_from_intelligence_output():
    intel = OrbIntelligenceOutput(
        title="Document review",
        summary="Plain summary",
        type="document_analysis",
        key_points=["Point one"],
        sources=[{"label": "User document", "type": "user_provided"}],
    )
    record = orb_saved_output_service.save_from_intelligence_output(
        intel,
        project_id="project-general",
        tags=["document"],
        created_from="document_analysis",
        analysis_mode="full_review",
    )
    assert record.type == "document_review"
    assert record.created_from == "document_analysis"
    assert len(record.sources) == 1


def test_maybe_save_intelligence_explicit():
    from schemas.orb_saved_outputs import OrbSavedOutputSaveOptions
    from services.orb_intelligence_output_service import orb_intelligence_output_service

    intel = OrbIntelligenceOutput(title="Brief", summary="Body", type="manager_briefing")
    hints, ctx = orb_saved_output_service.maybe_save_intelligence(
        intel,
        OrbSavedOutputSaveOptions(save_output=True, project_id="p1", tags=["save"]),
        created_from="agent",
    )
    assert hints.save_available is True
    assert ctx.saved is True
    assert ctx.output_id

    envelope = orb_intelligence_output_service.build_save_envelope(
        intel,
        save_output=True,
        project_id="p2",
    )
    assert envelope["save_hints"]["save_available"] is True
    assert envelope["saved_output"]["saved"] is True


def test_update_and_summary():
    record = orb_saved_output_service.create_output(
        OrbSavedOutputCreate(title="Old title", type="general_research")
    )
    updated = orb_saved_output_service.update_output(
        record.id,
        OrbSavedOutputUpdate(title="Renamed note", tags=["note"]),
    )
    assert updated is not None
    assert updated.title == "Renamed note"
    assert "note" in updated.tags

    summary = orb_saved_output_service.get_summary()
    assert summary["total"] >= 1
    assert summary["standalone_only"] is True
