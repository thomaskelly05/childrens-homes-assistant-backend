from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_recording_coach_mobile_accordion():
    coach = (FRONTEND / "components/indicare/record/orb-live-recording-coach.tsx").read_text(encoding="utf-8")
    workspace = (FRONTEND / "components/indicare/record/recording-workspace.tsx").read_text(encoding="utf-8")
    assert 'data-testid="mobile-recording-coach-accordion"' in coach
    assert "<details" in coach
    assert "mobile-recording-workspace" in workspace
    assert "safe-area-inset-bottom" in workspace
