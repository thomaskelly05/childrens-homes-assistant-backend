from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_standalone_routes_use_standalone_conversation():
    text = (REPO_ROOT / "routers" / "orb_standalone_routes.py").read_text(encoding="utf-8")
    assert "/orb/standalone/conversation" in text or "standalone/conversation" in text


def test_operational_routes_separate_from_standalone():
    text = (REPO_ROOT / "routers" / "orb_operational_routes.py").read_text(encoding="utf-8")
    assert "operational" in text.lower()
    assert "/orb/standalone/conversation" not in text


def test_standalone_client_targets_standalone_endpoint():
    text = (REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts").read_text(encoding="utf-8")
    assert "/orb/standalone/conversation" in text
    assert "/api/assistant/orb/operational" not in text


def test_operational_client_targets_operational_endpoint():
    text = (REPO_ROOT / "frontend-next" / "lib" / "orb" / "operational-client.ts").read_text(encoding="utf-8")
    assert "/api/assistant/orb/operational" in text
    assert "/orb/standalone/conversation" not in text
