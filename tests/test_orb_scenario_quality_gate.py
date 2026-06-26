"""Tests for ORB scenario quality gate — Phase 1."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.orb_scenario_quality_gate_service import (  # noqa: E402
    PHASE_1_LAUNCH_SETS,
    orb_scenario_quality_gate_service,
)

SETS_PATH = ROOT / "quality" / "orb_scenario_quality_gate_sets.json"
RUNNER_PATH = ROOT / "scripts" / "run_orb_scenario_quality_gate.py"
LAUNCH_RUNNER_PATH = ROOT / "scripts" / "run_orb_launch_quality_report.py"
ACTIVE_MISSING_PROMPT = "a young person has gone missing, what do I do"


def test_quality_gate_sets_file_exists_and_has_phase1_sets():
    assert SETS_PATH.is_file()
    data = json.loads(SETS_PATH.read_text(encoding="utf-8"))
    sets = data.get("sets") or {}
    assert "critical-50" in sets
    assert "missing-from-care" in sets
    assert "smoke" in sets
    assert len(sets["critical-50"].get("gold_scenario_ids") or []) == 50


def test_missing_from_care_set_includes_active_missing_prompt():
    scenarios = orb_scenario_quality_gate_service.resolve_set_scenarios("missing-from-care")
    prompts = [s.get("prompt") for s in scenarios]
    assert ACTIVE_MISSING_PROMPT in prompts


def test_active_missing_passes_quality_gate_mock_mode():
    report = orb_scenario_quality_gate_service.run_set(
        "missing-from-care",
        use_live_provider=False,
    )
    active = next(
        r for r in report["results"] if r["prompt"] == ACTIVE_MISSING_PROMPT
    )
    assert active["passed"] is True
    frame = active["checks"]["scenario_frame"]
    assert frame["passed"] is True
    assert report["passed"] == report["scenario_count"]


def test_active_missing_rejects_missing_return_main_frame():
    scenarios = orb_scenario_quality_gate_service.resolve_set_scenarios("missing-from-care")
    scenario = next(s for s in scenarios if s["prompt"] == ACTIVE_MISSING_PROMPT)
    wrong_answer = (
        "This looks like a missing-from-care concern.\n\n"
        "Missing return — immediate actions on shift:\n\n"
        "Immediate welfare check"
    )
    result = orb_scenario_quality_gate_service.evaluate_scenario(
        scenario,
        wrong_answer,
        answer_provider="test_fixture",
    )
    assert result.passed is False
    assert any("forbidden_main_frame" in issue for issue in result.issues)


def test_smoke_set_includes_active_missing_scenario():
    scenarios = orb_scenario_quality_gate_service.resolve_set_scenarios("smoke")
    ids = {s["scenario_id"] for s in scenarios}
    assert "QG-MFC-001-active-missing" in ids


def test_run_set_produces_expected_report_fields():
    report = orb_scenario_quality_gate_service.run_set(
        "smoke",
        use_live_provider=False,
    )
    assert report["set_name"] == "smoke"
    assert "generated_at" in report
    assert "pass_rate" in report
    assert report["provider_mode"] == "mock"
    for item in report["results"]:
        assert "checks" in item
        for check_name in (
            "scenario_classification",
            "required_inclusions",
            "forbidden_phrases",
            "local_policy_caveat",
            "adult_responsibility",
            "safeguarding_escalation",
            "fact_vs_interpretation",
            "scenario_frame",
            "answer_safety_gate",
        ):
            assert check_name in item["checks"]


def test_markdown_report_builder():
    report = orb_scenario_quality_gate_service.run_set(
        "missing-from-care",
        use_live_provider=False,
        limit=1,
    )
    md = orb_scenario_quality_gate_service.build_markdown_report(report)
    assert "# ORB Scenario Quality Gate Report" in md
    assert "missing-from-care" in md


def test_runner_script_help_lists_sets():
    proc = subprocess.run(
        [sys.executable, str(RUNNER_PATH), "--help"],
        capture_output=True,
        text=True,
        cwd=ROOT,
        check=False,
    )
    assert proc.returncode == 0
    assert "critical-50" in proc.stdout
    assert "missing-from-care" in proc.stdout
    assert "smoke" in proc.stdout


def test_runner_script_missing_from_care_mock(tmp_path: Path):
    out = tmp_path / "report.json"
    proc = subprocess.run(
        [
            sys.executable,
            str(RUNNER_PATH),
            "--set",
            "missing-from-care",
            "--no-live-provider",
            "--output",
            str(out),
        ],
        capture_output=True,
        text=True,
        cwd=ROOT,
        check=False,
    )
    assert proc.returncode == 0, proc.stdout + proc.stderr
    assert out.is_file()
    assert out.with_suffix(".md").is_file()
    report = json.loads(out.read_text(encoding="utf-8"))
    assert report["failed"] == 0


def test_runner_py_compile():
    proc = subprocess.run(
        [sys.executable, "-m", "py_compile", str(RUNNER_PATH)],
        capture_output=True,
        text=True,
        cwd=ROOT,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr


def test_return_cannabis_control_keeps_missing_return_heading():
    scenarios = orb_scenario_quality_gate_service.resolve_set_scenarios("missing-from-care")
    scenario = next(s for s in scenarios if s["scenario_id"] == "QG-MFC-003-return-cannabis")
    answer, _ = orb_scenario_quality_gate_service.generate_answer(
        scenario,
        use_live_provider=False,
    )
    heading = answer.split("\n", 1)[0]
    assert re.search(r"missing\s+return\s*[—\-]", heading, re.I)


def test_launch_report_combines_phase1_sets():
    report = orb_scenario_quality_gate_service.run_launch_report(
        list(PHASE_1_LAUNCH_SETS),
        use_live_provider=False,
    )
    assert report["report_type"] == "orb_launch_quality_report"
    assert report["provider_mode"] == "mock"
    assert set(report["sets_run"]) == set(PHASE_1_LAUNCH_SETS)
    assert len(report["set_summaries"]) == 3
    assert report["summary"]["total_scenarios"] == sum(
        item["scenario_count"] for item in report["set_summaries"]
    )
    for set_name in PHASE_1_LAUNCH_SETS:
        assert set_name in report["sets"]
        assert report["sets"][set_name]["set_name"] == set_name
    assert report["launch_recommendation"] in (
        "pass",
        "pass with caveats",
        "fail",
    )


def test_launch_markdown_includes_recommendation_and_sections():
    report = orb_scenario_quality_gate_service.run_launch_report(
        ["smoke"],
        use_live_provider=False,
    )
    md = orb_scenario_quality_gate_service.build_launch_markdown_report(report)
    assert "# ORB Launch Quality Report" in md
    assert "Launch recommendation" in md
    assert "## Critical failures" in md
    assert "## Repair needed" in md
    assert "## Human review needed" in md
    assert report["launch_recommendation"].upper() in md.upper()


def test_launch_report_mock_mode_does_not_call_live_provider(monkeypatch):
    called = {"live": False}

    def _boom(*_args, **_kwargs):
        called["live"] = True
        raise AssertionError("live provider should not be called in mock mode")

    monkeypatch.setattr(
        orb_scenario_quality_gate_service,
        "_generate_live_answer",
        _boom,
    )
    report = orb_scenario_quality_gate_service.run_launch_report(
        ["smoke"],
        use_live_provider=False,
    )
    assert called["live"] is False
    assert report["provider_mode"] == "mock"
    assert all(
        item.get("answer_provider") != "live_orb_brain"
        for set_report in report["sets"].values()
        for item in set_report.get("results") or []
    )


def test_launch_runner_script_smoke_mock(tmp_path: Path):
    out_dir = tmp_path / "orb_quality"
    proc = subprocess.run(
        [
            sys.executable,
            str(LAUNCH_RUNNER_PATH),
            "--set",
            "smoke",
            "--output-dir",
            str(out_dir),
        ],
        capture_output=True,
        text=True,
        cwd=ROOT,
        check=False,
    )
    assert proc.returncode in (0, 1), proc.stdout + proc.stderr
    json_path = out_dir / "orb_launch_quality_report.json"
    md_path = out_dir / "orb_launch_quality_report.md"
    assert json_path.is_file()
    assert md_path.is_file()
    report = json.loads(json_path.read_text(encoding="utf-8"))
    assert report["sets_run"] == ["smoke"]
    assert "launch_recommendation" in report
    assert "Critical failures" in md_path.read_text(encoding="utf-8")


def test_launch_runner_fail_on_critical_exits_on_critical_failure(monkeypatch, tmp_path: Path):
    import importlib.util

    spec = importlib.util.spec_from_file_location("orb_launch_runner", LAUNCH_RUNNER_PATH)
    launch_mod = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(launch_mod)

    def _failing_launch(*_args, **_kwargs):
        return {
            "generated_at": "2026-01-01T00:00:00+00:00",
            "report_type": "orb_launch_quality_report",
            "provider_mode": "mock",
            "sets_run": ["smoke"],
            "summary": {
                "total_scenarios": 1,
                "total_passed": 0,
                "total_failed": 1,
                "pass_rate": 0.0,
            },
            "set_summaries": [
                {
                    "set_name": "smoke",
                    "scenario_count": 1,
                    "passed": 0,
                    "failed": 1,
                    "pass_rate": 0.0,
                    "provider_mode": "mock",
                }
            ],
            "critical_failures": [
                {
                    "set_name": "smoke",
                    "scenario_id": "QG-TEST",
                    "title": "Test",
                    "issues": ["scenario_frame"],
                }
            ],
            "repair_needed": [],
            "human_review_needed": [],
            "launch_recommendation": "fail",
            "sets": {},
        }

    monkeypatch.setattr(
        launch_mod.orb_scenario_quality_gate_service,
        "run_launch_report",
        _failing_launch,
    )
    monkeypatch.setattr(
        sys,
        "argv",
        [
            str(LAUNCH_RUNNER_PATH),
            "--set",
            "smoke",
            "--fail-on-critical",
            "--output-dir",
            str(tmp_path),
        ],
    )
    assert launch_mod.main() == 1


def test_launch_runner_py_compile():
    proc = subprocess.run(
        [sys.executable, "-m", "py_compile", str(LAUNCH_RUNNER_PATH)],
        capture_output=True,
        text=True,
        cwd=ROOT,
        check=False,
    )
    assert proc.returncode == 0, proc.stderr
