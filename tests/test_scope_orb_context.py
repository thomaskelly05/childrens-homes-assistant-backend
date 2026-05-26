from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_recording_workspace_orb_uses_assistant_orb():
    workspace = _read(REPO_ROOT / "frontend-next" / "components" / "indicare" / "record" / "recording-workspace.tsx")
    coach = _read(REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-quality-coach.ts")
    assert "/assistant/orb" in workspace or "/assistant/orb" in coach


def test_operational_orb_href_constant():
    coach = _read(REPO_ROOT / "frontend-next" / "lib" / "record" / "recording-quality-coach.ts")
    assert "RECORDING_OS_ORB_HREF" in coach
    assert "/assistant/orb" in coach


def test_scope_routes_no_os_young_people():
    scope = REPO_ROOT / "frontend-next" / "lib" / "scope"
    if not scope.exists():
        return
    for path in scope.rglob("*.ts"):
        text = _read(path)
        assert "/os/young-people" not in text, path
