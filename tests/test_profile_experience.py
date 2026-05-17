from services.connect_service import ConnectService


class FakeConn:
    def rollback(self):
        return None


class FakeProfileRepository:
    def handover_today(self, conn, context, *, home_id=None):
        return {"date": "2026-05-17", "items": [], "summary": {"total": 0, "urgent": 0, "children_needing_attention": 0, "unacknowledged": 0}}

    def unread_summary(self, conn, context, *, user_id):
        return {"count": 0, "threads": []}

    def list_notifications(self, conn, context, *, user_id, unread_only=False, limit=None):
        return []

    def dashboard_preferences(self, conn, *, user_id):
        return self.default_dashboard_preferences(user_id)

    def default_dashboard_preferences(self, user_id):
        return {
            "user_id": user_id,
            "layout": [{"id": "urgent_safeguarding", "pinned": True, "locked": True}],
            "pinned_widgets": ["urgent_safeguarding"],
        }


def test_me_today_builds_personal_welcome_payload_without_demo_data():
    user = {
        "id": 8,
        "email": "theo@example.test",
        "first_name": "Theo",
        "last_name": "Morgan",
        "role": "manager",
        "provider_id": 1,
        "home_id": 2,
        "allowed_home_ids": [2],
    }

    result = ConnectService(FakeProfileRepository()).me_today(FakeConn(), user)

    assert result["adult"]["preferred_name"] == "Theo"
    assert result["home"]["id"] == 2
    assert result["connect"]["count"] == 0
    assert result["key_children"] == []
