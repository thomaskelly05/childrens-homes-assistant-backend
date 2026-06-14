from __future__ import annotations

from contextlib import contextmanager
from unittest.mock import patch

from services import audit_event_service


def test_audit_skips_immediately_when_pool_busy():
    with (
        patch.object(audit_event_service, "is_pool_under_pressure", return_value=True),
        patch.object(audit_event_service, "is_db_available", return_value=True),
        patch.object(audit_event_service, "is_pool_init_in_cooldown", return_value=False),
        patch.object(audit_event_service, "get_db_connection") as get_conn,
        patch.object(audit_event_service, "ensure_audit_table") as ensure_table,
    ):
        ok = audit_event_service.record_audit_event(
            event_type="auth",
            action="login",
            outcome="success",
        )
    assert ok is False
    get_conn.assert_not_called()
    ensure_table.assert_not_called()


def test_auth_me_route_has_no_dashboard_build():
    import inspect

    from routers import auth_routes

    source = inspect.getsource(auth_routes.get_me)
    assert "build_command_centre" not in source
    assert "build_dashboard" not in source
    assert "governance_intelligence" not in source


def test_dashboard_optional_acquire_fails_fast_without_connection():
    from db.connection import acquire_optional_dashboard_connection

    @contextmanager
    def fake_acquire(*, timeout=None):
        yield None

    with patch("db.connection.is_pool_under_pressure", return_value=True):
        with acquire_optional_dashboard_connection(timeout=0.1) as conn:
            assert conn is None
