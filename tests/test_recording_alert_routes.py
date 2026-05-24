from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

import routers.recording_alert_routes as alert_routes
from schemas.recording_alerts import RecordingAlertActionRequest
from schemas.recording_drafts import RecordingDraftCreate
from services.recording_alert_service import recording_alert_service
from services.recording_draft_service import recording_draft_service


@pytest.fixture(autouse=True)
def memory_services(monkeypatch):
    recording_alert_service._memory = {}
    recording_draft_service._memory = {}
    monkeypatch.setattr(recording_alert_service, "_detect_storage_mode", lambda: "memory")
    monkeypatch.setattr(recording_draft_service, "_detect_storage_mode", lambda: "memory")


def test_health_route(fake_state):
    result = asyncio.run(
        alert_routes.recording_alerts_health(current_user=fake_state["user"], conn=None)
    )
    assert result["success"] is True
    assert result["operational_only"] is True
    assert result["standalone_access"] is False
    assert result["metadata_only"] is True


def test_list_summary_generate_detail_action(fake_state):
    user = fake_state["user"]
    recording_draft_service.create_draft(
        RecordingDraftCreate(
            title="Alert route",
            body="hidden body",
            recording_type="safeguarding-concern",
            safeguarding_review_required=True,
        ),
        user,
    )
    gen = asyncio.run(alert_routes.generate_recording_alerts(current_user=user, conn=None))
    assert gen["success"] is True
    alerts = gen["data"]["alerts"]
    assert alerts
    assert "hidden body" not in str(gen["data"])

    listed = asyncio.run(
        alert_routes.list_recording_alerts(
            limit=100,
            offset=0,
            current_user=user,
            conn=None,
        )
    )
    assert listed["success"] is True

    summary = asyncio.run(alert_routes.recording_alerts_summary(current_user=user, conn=None))
    assert summary["success"] is True
    assert "open_count" in summary["data"]

    alert_id = alerts[0]["id"]
    detail = asyncio.run(
        alert_routes.get_recording_alert(alert_id=alert_id, current_user=user, conn=None)
    )
    assert detail["success"] is True

    action = asyncio.run(
        alert_routes.apply_recording_alert_action(
            alert_id=alert_id,
            body=RecordingAlertActionRequest(action="acknowledge", note="seen"),
            current_user=user,
            conn=None,
        )
    )
    assert action["success"] is True
    assert action["data"]["alert"]["status"] == "acknowledged"


def test_staff_forbidden(fake_state):
    staff = {**fake_state["user"], "role": "support_worker"}
    with pytest.raises(HTTPException) as exc:
        asyncio.run(
            alert_routes.list_recording_alerts(
                limit=100,
                offset=0,
                current_user=staff,
                conn=None,
            )
        )
    assert exc.value.status_code == 403
