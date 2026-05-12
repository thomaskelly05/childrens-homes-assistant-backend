from __future__ import annotations

from fastapi import FastAPI
from fastapi.testclient import TestClient

from core.frontend_routes import COMMAND_SHELL_FILE, COMMAND_SHELL_VERSION, register_frontend_routes


BLOCKED_OS_COMMAND_FRAGMENTS = [
    "<script",
    "<link",
    "operating-system-resilience",
    "existing-journey-runtime",
    "os-modern-workspace-orchestrator",
    "os-chronology-first-layout-runtime",
    "os-runtime-verification-runtime",
    "os-enterprise-data-hydration-runtime",
    "os-operational-notification-runtime",
    "os-realtime-operations-runtime",
    "os-operational-audit-runtime",
    "runtime debugging",
    "context wall",
    "overflow:hidden",
]


def _frontend_client() -> TestClient:
    app = FastAPI()
    register_frontend_routes(app)
    return TestClient(app)


def test_os_command_serves_single_static_shell_without_legacy_runtime():
    with _frontend_client() as client:
        response = client.get("/os-command")

    assert response.status_code == 200
    assert response.headers["x-indicare-shell"] == COMMAND_SHELL_VERSION
    assert "no-store" in response.headers["cache-control"]

    html = response.text
    lowered = html.lower()
    assert COMMAND_SHELL_FILE == "os-command-runtime.html"
    assert html.count('data-shell="indicare-os-single-shell"') == 1
    assert lowered.count("<aside") == 2
    assert lowered.count("<main") == 1
    assert "jamie's journey" in lowered
    assert "care operating stream" in lowered
    assert "operational co-pilot" in lowered

    for fragment in BLOCKED_OS_COMMAND_FRAGMENTS:
        assert fragment not in lowered


def test_frontend_health_declares_os_command_shell_owner():
    with _frontend_client() as client:
        response = client.get("/health/frontend")

    assert response.status_code == 200
    payload = response.json()
    assert payload["os_command_shell"] == COMMAND_SHELL_FILE
    assert payload["os_command_shell_version"] == COMMAND_SHELL_VERSION
    assert payload["os_command_single_shell"] is True
    assert payload["frontend_next_deployed_for_os_command"] is False
