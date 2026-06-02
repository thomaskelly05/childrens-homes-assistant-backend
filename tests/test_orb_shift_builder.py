from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

import routers.orb_shift_builder_routes as shift_routes
from schemas.orb_shift_builder import OrbShiftBuilderGenerateRequest, OrbShiftBuilderRequest
from services.orb_shift_builder_service import orb_shift_builder_service


@pytest.mark.asyncio
async def test_shift_builder_generate_standalone_sections(monkeypatch):
    async def stub_run_action(**_kwargs):
        return {
            "action": "build_shift_plan",
            "title": "Build shift plan",
            "answer": (
                "## Shift priorities\n- Check medication log.\n\n"
                "## Known risks\n- Missing outcome after contact.\n\n"
                "## Handover summary\n- Calm evening.\n\n"
                "## What am I missing?\n- Child voice not recorded."
            ),
            "sections": [],
            "checklist": ["Confirm medication log"],
            "suggested_next_actions": [{"action": "what_am_i_missing", "label": "What am I missing?"}],
            "standalone": True,
            "os_records_accessed": False,
            "brain_metadata": {},
        }

    monkeypatch.setattr(
        "services.orb_action_engine_service.orb_action_engine_service.run_action",
        stub_run_action,
    )

    result = await orb_shift_builder_service.generate(
        OrbShiftBuilderGenerateRequest(
            shift_notes="Evening shift calm. YP asked to call family.",
            focus="full_shift_plan",
            context_tags=["evening_shift"],
        )
    )
    assert result.live_record_access is False
    assert result.os_records_accessed is False
    assert result.standalone is True
    assert result.focus == "full_shift_plan"
    section_ids = {s.id for s in result.sections}
    assert "immediate_priorities" in section_ids or "handover_summary" in section_ids
    brain = result.brain_metadata
    assert brain.get("product") == "ORB Residential"
    assert brain.get("powered_by") == "IndiCare Intelligence"
    assert brain.get("brain") == "orb_residential_intelligence"
    assert brain.get("feature") == "shift_builder"
    assert brain.get("focus") == "full_shift_plan"
    assert brain.get("standalone") is True
    assert brain.get("os_records_accessed") is False
    assert brain.get("live_record_access") is False


def test_shift_builder_rejects_os_child_id():
    with pytest.raises(ValueError, match="child_id"):
        asyncio.run(
            orb_shift_builder_service.generate(
                OrbShiftBuilderGenerateRequest(
                    shift_notes="Notes",
                    context={"child_id": 12},
                )
            )
        )


def test_shift_builder_route_rejects_os_ids(fake_state):
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            shift_routes.shift_builder_generate(
                OrbShiftBuilderGenerateRequest(
                    shift_notes="Notes",
                    context={"home_id": 3},
                ),
                current_user=fake_state["user"],
            )
        )
    assert exc.value.status_code == 400


def test_shift_builder_focus_modes_registered():
    modes = {m["id"] for m in orb_shift_builder_service.list_focus_modes()}
    for focus in (
        "full_shift_plan",
        "handover_only",
        "manager_review",
        "safeguarding_review",
        "recording_quality",
        "end_of_shift_reflection",
        "what_am_i_missing",
    ):
        assert focus in modes


def test_shift_builder_legacy_prompt_pack():
    response = orb_shift_builder_service.build(
        OrbShiftBuilderRequest(
            notes="Evening shift calm.",
            mode="full_shift_pack",
        )
    )
    assert response.live_record_access is False
    assert len(response.sections) >= 4


def test_shift_builder_guardrails():
    from services.orb_shift_builder_service import SHIFT_BUILDER_BOUNDARY_GUARDRAILS

    assert len(SHIFT_BUILDER_BOUNDARY_GUARDRAILS) >= 3
    assert any("shift notes you provide" in g.lower() for g in SHIFT_BUILDER_BOUNDARY_GUARDRAILS)
    assert any("live care records" in g.lower() for g in SHIFT_BUILDER_BOUNDARY_GUARDRAILS)
