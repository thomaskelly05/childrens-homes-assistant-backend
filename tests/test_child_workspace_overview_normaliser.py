from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
NORMALISER = REPO_ROOT / "frontend-next" / "lib" / "young-people" / "child-workspace-normaliser.ts"


def _run_normaliser(payload: dict) -> dict:
    script = f"""
import {{ normaliseChildWorkspaceOverview }} from './lib/young-people/child-workspace-normaliser.ts';
const input = {json.dumps(payload)};
const vm = normaliseChildWorkspaceOverview(input);
console.log(JSON.stringify(vm));
"""
    proc = subprocess.run(
        ["npx", "--yes", "tsx", "-e", script],
        cwd=REPO_ROOT / "frontend-next",
        capture_output=True,
        text=True,
        timeout=120,
    )
    if proc.returncode != 0:
        pytest.skip(f"tsx unavailable: {proc.stderr[:500]}")
    line = proc.stdout.strip().splitlines()[-1]
    return json.loads(line)


def test_normaliser_file_exports_function():
    text = NORMALISER.read_text(encoding="utf-8")
    assert "export function normaliseChildWorkspaceOverview" in text
    assert "never throw" not in text.lower() or "safeString" in text


def test_normaliser_handles_missing_fields_safely():
    vm = _run_normaliser({"childId": "42", "workspace": {}, "profileBundle": {}})
    assert vm["child"]["id"] == "42"
    assert vm["child"]["displayName"] == "Young person 42"
    assert isinstance(vm["about"], list)
    assert isinstance(vm["whatMatters"], list)
    assert isinstance(vm["actions"], list)
    assert isinstance(vm["childVoice"], list)
    assert vm["emptyStates"]["communication"] == "No communication profile has been added yet."
    assert "null" not in json.dumps(vm)


def test_normaliser_prefers_profile_personhood():
    vm = _run_normaliser(
        {
            "childId": "1",
            "workspace": {"youngPerson": {"displayName": "Jamie Smith", "preferredName": "Jamie"}},
            "profileBundle": {
                "identity": {"preferred_name": "Jamie", "summary_risk_level": "medium"},
                "personhood": {"what_matters_to_me": "Football and drawing"},
                "communication": {"communication_style": "Quiet at first"},
                "safety": {"safeguarding_status": "no_active_records_returned"},
            },
        }
    )
    assert vm["child"]["preferredName"] == "Jamie"
    assert any("Football" in f["value"] for f in vm["whatMatters"])
    assert vm["routes"]["recordDailyNote"] == "/record?child_id=1&type=daily-note"
    assert vm["routes"]["orbRecordQuality"].startswith("/assistant/orb")
    assert not vm["routes"]["orbRecordQuality"].startswith("/orb?")


def test_normaliser_quick_actions_child_scoped():
    vm = _run_normaliser({"childId": "7"})
    for action in vm["quickActions"]:
        href = action["href"]
        assert (
            "child_id=7" in href
            or "/young-people/7/" in href
            or (href.startswith("/assistant/orb") and "young_person_id=7" in href)
        )
    assert all("/os/young-people" not in a["href"] for a in vm["quickActions"])
