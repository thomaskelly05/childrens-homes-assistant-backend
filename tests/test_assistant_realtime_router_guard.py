"""NR-1 Phase 2C PR 6: guard unmounted /assistant/realtime/* router modules.

These modules exist in the repo but are intentionally excluded from the router
registry. Mounting them without governed egress would bypass NR-1 controls.
"""

from __future__ import annotations

import importlib
from pathlib import Path

import pytest
from fastapi import FastAPI

from core.router_loader import (
    REQUIRED_ROUTERS,
    RETIRED_COMPATIBILITY_ROUTERS,
    ROUTERS,
    UNMOUNTED_DANGEROUS_ASSISTANT_REALTIME_ROUTERS,
    include_routers,
)

REPO_ROOT = Path(__file__).resolve().parents[1]

PROXY_ROUTES_PATH = REPO_ROOT / "routers" / "assistant_realtime_proxy_routes.py"
VOICE_ROUTES_PATH = REPO_ROOT / "routers" / "assistant_realtime_voice_routes.py"
INDICARE_ROUTES_PATH = REPO_ROOT / "routers" / "indicare_ai_realtime_routes.py"

RETIRED_ASSISTANT_REALTIME_REGISTRY_ENTRIES = frozenset(
    (
        "routers.assistant_realtime_routes",
        "routers.assistant_realtime_compat_routes",
    )
)


@pytest.fixture
def loaded_app(monkeypatch: pytest.MonkeyPatch):
    monkeypatch.setenv("SESSION_SECRET", "test-secret")
    app = FastAPI()
    include_routers(app)
    return app


def test_startup_does_not_mount_assistant_realtime_paths(loaded_app):
    mounted_paths = {getattr(route, "path", "") for route in loaded_app.routes}
    assistant_realtime_paths = sorted(path for path in mounted_paths if path.startswith("/assistant/realtime"))
    assert assistant_realtime_paths == []
    assert UNMOUNTED_DANGEROUS_ASSISTANT_REALTIME_ROUTERS == frozenset(
        (
            "routers.assistant_realtime_proxy_routes",
            "routers.assistant_realtime_voice_routes",
            "routers.indicare_ai_realtime_routes",
        )
    )
    assert not UNMOUNTED_DANGEROUS_ASSISTANT_REALTIME_ROUTERS & set(ROUTERS)
    assert not UNMOUNTED_DANGEROUS_ASSISTANT_REALTIME_ROUTERS & REQUIRED_ROUTERS


def test_retired_assistant_realtime_registry_entries_remain_skipped():
    assert RETIRED_ASSISTANT_REALTIME_REGISTRY_ENTRIES <= RETIRED_COMPATIBILITY_ROUTERS
    assert RETIRED_ASSISTANT_REALTIME_REGISTRY_ENTRIES <= set(ROUTERS)
    for router_path in RETIRED_ASSISTANT_REALTIME_REGISTRY_ENTRIES:
        with pytest.raises(ModuleNotFoundError) as exc_info:
            importlib.import_module(router_path)
        assert exc_info.value.name == router_path


def test_unmounted_dangerous_assistant_realtime_routers_not_in_registry():
    source = PROXY_ROUTES_PATH.read_text(encoding="utf-8")
    assert "@router.websocket(\"/ws\")" in source
    assert "websockets.connect" in source
    assert "OPENAI_API_KEY" in source
    assert "issue_realtime_session" not in source
    assert "ai_governed_egress" not in source


def test_assistant_realtime_voice_bypasses_governed_egress_if_mounted():
    source = VOICE_ROUTES_PATH.read_text(encoding="utf-8")
    assert "@router.post(\"/session\")" in source
    assert "orb_realtime_provider_service.create_ephemeral_session" in source
    assert "issue_realtime_session" not in source
    assert "ai_governed_egress" not in source


def test_indicare_ai_realtime_is_in_memory_scaffold_only():
    source = INDICARE_ROUTES_PATH.read_text(encoding="utf-8")
    assert "IndiCareAIRealtimeService" in source
    assert "websockets.connect" not in source
    assert "OPENAI_API_KEY" not in source
    assert "client_secret" not in source
    assert "issue_realtime_session" not in source
