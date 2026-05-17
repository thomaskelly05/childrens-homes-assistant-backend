import pytest
from fastapi import HTTPException

from services.connect_service import ConnectService


class FakeConn:
    def __init__(self):
        self.committed = False

    def commit(self):
        self.committed = True

    def rollback(self):
        return None


class FakePreferencesRepository:
    def default_dashboard_preferences(self, user_id):
        return {
            "user_id": user_id,
            "layout": [
                {"id": "urgent_safeguarding", "pinned": True, "locked": True},
                {"id": "active_missing", "pinned": True, "locked": True},
                {"id": "urgent_notifications", "pinned": True, "locked": True},
            ],
            "pinned_widgets": [],
        }

    def dashboard_preferences(self, conn, *, user_id):
        return self.default_dashboard_preferences(user_id)

    def save_dashboard_preferences(self, conn, *, user_id, preferences):
        return {"user_id": user_id, **preferences}


def user():
    return {"id": 3, "role": "manager", "provider_id": 1, "home_id": 2, "allowed_home_ids": [2]}


def test_dashboard_preferences_include_locked_safety_widgets():
    result = ConnectService(FakePreferencesRepository()).dashboard_preferences(FakeConn(), user())

    locked = {item["id"] for item in result["preferences"]["layout"] if item["locked"]}
    assert {"urgent_safeguarding", "active_missing", "urgent_notifications"} <= locked


def test_dashboard_preferences_cannot_hide_critical_widgets():
    payload = {"layout": [{"id": "my_handover", "pinned": True}]}

    with pytest.raises(HTTPException):
        ConnectService(FakePreferencesRepository()).save_dashboard_preferences(FakeConn(), user(), payload)


def test_dashboard_preferences_save_valid_layout():
    conn = FakeConn()
    payload = {
        "layout": [
            {"id": "urgent_safeguarding", "pinned": True, "locked": True},
            {"id": "active_missing", "pinned": True, "locked": True},
            {"id": "urgent_notifications", "pinned": True, "locked": True},
            {"id": "my_handover", "pinned": True},
        ],
        "pinned_widgets": ["my_handover"],
    }

    result = ConnectService(FakePreferencesRepository()).save_dashboard_preferences(conn, user(), payload)

    assert result["preferences"]["pinned_widgets"] == ["my_handover"]
    assert conn.committed is True
