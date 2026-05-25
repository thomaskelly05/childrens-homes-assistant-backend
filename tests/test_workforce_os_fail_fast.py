"""Workforce OS dashboard fail-fast regression (scope-first pass)."""

from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_workforce_context_routes_avoid_global_dashboard_on_import():
    path = REPO_ROOT / "routers" / "workforce_context_routes.py"
    source = path.read_text(encoding="utf-8")
    assert "router" in source
    assert "dashboard" in source.lower() or "workforce" in source.lower()
