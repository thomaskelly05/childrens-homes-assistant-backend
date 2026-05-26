from __future__ import annotations

from pathlib import Path

FRONTEND = Path(__file__).resolve().parents[1] / "frontend-next"


def test_app_shell_hydration_helpers_wired():
    shell = (FRONTEND / "components/indicare/app-shell.tsx").read_text(encoding="utf-8")
    assert "OperationalTopBarDate" in shell
    assert "useStableSearchParams" in shell
    assert "routeRequiresChildWorkspace(pathname, stableSearchParams)" in shell


def test_client_only_and_top_bar_date_components_exist():
    assert (FRONTEND / "components/indicare/client-only.tsx").is_file()
    top_bar = (FRONTEND / "components/indicare/operational-top-bar-date.tsx").read_text(encoding="utf-8")
    assert "ClientOnly" in top_bar
    assert "operational-top-bar-date" in top_bar
