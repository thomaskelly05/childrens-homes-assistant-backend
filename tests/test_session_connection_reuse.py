from __future__ import annotations

import services.session_security_service as sessions


class FakeCursor:
    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False

    def execute(self, *_args, **_kwargs):
        return None

    def fetchone(self):
        return {"revoked_at": None}


class FakeConn:
    closed = False

    def __init__(self):
        self.rollback_count = 0

    def cursor(self, *_args, **_kwargs):
        return FakeCursor()

    def rollback(self):
        self.rollback_count += 1


def test_session_revocation_check_reuses_passed_connection(monkeypatch):
    fake_conn = FakeConn()
    monkeypatch.setattr(sessions, "_TABLE_READY", True)
    monkeypatch.setattr(sessions, "get_db_connection", lambda: (_ for _ in ()).throw(AssertionError("nested pool acquire")))

    assert sessions.is_session_revoked("sid-reuse-test", conn=fake_conn) is False
    assert fake_conn.rollback_count == 0
