from services.connect_service import ConnectService


class FakeConn:
    def __init__(self):
        self.committed = False

    def commit(self):
        self.committed = True

    def rollback(self):
        return None


class FakeNotificationRepository:
    def list_notifications(self, conn, context, *, user_id, unread_only=False, limit=None):
        items = [
            {"id": 1, "user_id": user_id, "title": "Message", "read_at": None},
            {"id": 2, "user_id": user_id, "title": "Read", "read_at": "2026-05-17T10:00:00Z"},
        ]
        return [item for item in items if not unread_only or not item["read_at"]]

    def mark_notification_read(self, conn, context, *, notification_id, user_id):
        return {"id": notification_id, "user_id": user_id, "read_at": "2026-05-17T10:00:00Z"}


def user():
    return {"id": 5, "role": "manager", "provider_id": 1, "home_id": 2, "allowed_home_ids": [2]}


def test_notifications_are_user_specific_and_count_unread():
    result = ConnectService(FakeNotificationRepository()).notifications(FakeConn(), user(), unread_only=False)

    assert result["unread"] == 1
    assert {item["user_id"] for item in result["items"]} == {5}


def test_mark_notification_read_commits():
    conn = FakeConn()
    result = ConnectService(FakeNotificationRepository()).mark_notification_read(conn, user(), notification_id=9)

    assert result["notification"]["read_at"]
    assert conn.committed is True
