from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"


def test_mobile_tap_debug_helper_exists():
    path = FRONTEND / "lib/interaction/mobile-tap-debug.ts"
    text = path.read_text(encoding="utf-8")
    assert "logTapTarget" in text
    assert "getTapDebugEnabled" in text
    assert "describeElement" in text
    assert 'tap_debug' in text
    assert 'NODE_ENV' in text


def test_interaction_health_marker_exists():
    path = FRONTEND / "components/indicare/debug/interaction-health-marker.tsx"
    text = path.read_text(encoding="utf-8")
    assert "interaction-health-marker" in text
    assert "data-last-click-testid" in text
