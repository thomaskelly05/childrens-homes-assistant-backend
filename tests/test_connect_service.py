from schemas.connect_contracts import ConnectMessageCreate, ConnectThreadCreate
from services.connect_service import ConnectService


class FakeConn:
    def __init__(self):
        self.committed = False
        self.rolled_back = False

    def commit(self):
        self.committed = True

    def rollback(self):
        self.rolled_back = True


class FakeConnectRepository:
    def __init__(self):
        self.thread = {
            "id": 1,
            "provider_id": 7,
            "home_id": 3,
            "thread_type": "home_channel",
            "title": "Rosewood House",
            "members": [11, 12],
        }
        self.messages = []
        self.notifications = []

    def list_threads(self, conn, context, *, user_id, home_id=None, q=None, limit=None):
        return [self.thread]

    def create_thread(self, conn, context, *, created_by, payload):
        self.thread = {**self.thread, **payload, "id": 2, "created_by": created_by, "provider_id": context.provider_id}
        return self.thread

    def get_thread(self, conn, context, *, thread_id, user_id):
        return self.thread if thread_id == self.thread["id"] else None

    def list_messages(self, conn, *, thread_id, user_id, limit=None):
        return self.messages

    def create_message(self, conn, thread, *, author_id, payload):
        message = {"id": 5, "thread_id": thread["id"], "author_id": author_id, **payload}
        self.messages.append(message)
        return message

    def create_notifications_for_message(self, conn, thread, message, *, exclude_user_id):
        self.notifications.append({"id": 9, "user_id": 12, "linked_message_id": message["id"]})
        return self.notifications


def current_user():
    return {
        "id": 11,
        "role": "manager",
        "provider_id": 7,
        "home_id": 3,
        "allowed_home_ids": [3],
    }


def test_connect_service_lists_threads_with_provider_context():
    service = ConnectService(FakeConnectRepository())

    result = service.list_threads(FakeConn(), current_user())

    assert result["ok"] is True
    assert result["items"][0]["provider_id"] == 7


def test_connect_service_creates_thread_and_commits():
    conn = FakeConn()
    service = ConnectService(FakeConnectRepository())

    result = service.create_thread(conn, current_user(), ConnectThreadCreate(title="Team chat", thread_type="group", member_ids=[12]))

    assert result["thread"]["created_by"] == 11
    assert result["thread"]["provider_id"] == 7
    assert conn.committed is True


def test_connect_service_creates_message_and_member_notifications():
    repo = FakeConnectRepository()
    conn = FakeConn()
    service = ConnectService(repo)

    result = service.create_message(conn, current_user(), thread_id=1, payload=ConnectMessageCreate(body="Real handover note", priority="urgent"))

    assert result["message"]["body"] == "Real handover note"
    assert result["notifications_created"] == 1
    assert conn.committed is True
