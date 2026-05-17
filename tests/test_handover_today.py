from services.connect_service import ConnectService


class FakeConn:
    def rollback(self):
        return None


class FakeHandoverRepository:
    def handover_today(self, conn, context, *, home_id=None):
        assert home_id == 10
        return {
            "date": "2026-05-17",
            "items": [
                {"id": 1, "priority": "urgent", "linked_child_id": 99, "body": "Review before shift."},
                {"id": 2, "priority": "normal", "linked_child_id": None, "body": "Manager note."},
            ],
            "summary": {"total": 2, "urgent": 1, "children_needing_attention": 1, "unacknowledged": 2},
        }


def test_handover_today_returns_schema_backed_summary_for_home_scope():
    user = {"id": 4, "role": "manager", "provider_id": 1, "home_id": 10, "allowed_home_ids": [10]}

    result = ConnectService(FakeHandoverRepository()).handover_today(FakeConn(), user, home_id=10)

    assert result["available"] is True
    assert result["summary"]["urgent"] == 1
    assert result["items"][0]["body"] == "Review before shift."
