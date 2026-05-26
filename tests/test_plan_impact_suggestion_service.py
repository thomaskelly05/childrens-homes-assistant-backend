from __future__ import annotations

import pytest

from schemas.child_archive import ChildArchiveRecord
from services.plan_impact_suggestion_service import plan_impact_suggestion_service


@pytest.fixture(autouse=True)
def memory(monkeypatch):
    plan_impact_suggestion_service._memory = {}
    monkeypatch.setattr(plan_impact_suggestion_service, "_detect_storage_mode", lambda: "memory")


@pytest.mark.parametrize(
    "source_type,expected_plan",
    [
        ("health-appointment", "health_plan"),
        ("family-time", "family_time_plan"),
        ("education-note", "education_plan"),
        ("missing-episode", "missing_from_care_plan"),
        ("reg44-report", "other"),
    ],
)
def test_plan_impact_mapping(fake_state, source_type, expected_plan):
    user = fake_state["user"]
    archive = ChildArchiveRecord(
        id="arch_1",
        child_id=1,
        title="Record",
        safe_summary="Safe summary",
        source_type=source_type,
        source_id="1",
    )
    impacts = plan_impact_suggestion_service.analyse_archive_record(archive, user, conn=None)
    assert impacts
    assert impacts[0].suggested_plan_type == expected_plan
    assert impacts[0].status == "suggested"
    assert impacts[0].metadata.get("auto_update_allowed") is False
