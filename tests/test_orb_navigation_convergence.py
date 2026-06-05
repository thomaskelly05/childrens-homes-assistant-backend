"""ORB navigation convergence — backend route compatibility unchanged."""

from __future__ import annotations

import re
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def _read(relative: str) -> str:
    return (REPO / relative).read_text(encoding="utf-8")


def test_standalone_action_engine_registry_still_exposes_shift_and_safeguarding_actions():
    service = _read("services/orb_action_engine_service.py")
    for action_id in (
        "shift_handover_summary",
        "build_shift_plan",
        "add_safeguarding_lens",
        "add_ofsted_lens",
        "what_am_i_missing",
    ):
        assert action_id in service


def test_orb_standalone_routes_still_register_action_run_endpoint():
    routes = _read("routers/orb_standalone_routes.py")
    assert re.search(r"actions/run|actions\.run", routes)


def test_deep_link_redirect_pages_preserved():
    assert "station=shift_builder" in _read("frontend-next/app/orb-residential/shift-builder/page.tsx")
    assert "station=review" in _read("frontend-next/app/orb/review/page.tsx")
    assert "station=knowledge" in _read("frontend-next/app/orb/learn/page.tsx")
