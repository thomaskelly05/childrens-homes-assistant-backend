#!/usr/bin/env python3
"""Run ORB expert stress tests against gold scenarios and sample answers."""

from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service  # noqa: E402
from services.orb_expert_scenario_evaluator_service import orb_expert_scenario_evaluator_service  # noqa: E402

REPORT_MD = ROOT / "docs" / "reports" / "orb-expert-stress-test-report.md"
REPORT_JSON = ROOT / ".tmp" / "orb-expert-stress-test-report.json"


def _sample_answer(scenario: dict) -> str:
    markers = scenario.get("expected_markers") or []
    lines = [
        "Based only on what you have provided — I have not checked live IndiCare OS records.",
        "",
        f"## Response to: {scenario.get('title')}",
        "",
        "Key considerations:",
    ]
    for m in markers:
        lines.append(f"- {m.capitalize()}")
    lines.extend(
        [
            "",
            "Child voice: capture the young person's words where known; do not invent quotes.",
            "Manager oversight: notify and review within your local protocol.",
            "Recording: factual, dated, proportionate detail with chronology significance.",
        ]
    )
    if scenario.get("role", "").startswith("nvq"):
        lines.append("Authenticity: describe only what you personally did; do not overclaim leadership.")
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--gold-only", action="store_true", default=True)
    parser.add_argument("--family", default=None)
    parser.add_argument("--role", default=None)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--include-generated", action="store_true")
    parser.add_argument("--no-openai", action="store_true")
    parser.add_argument("--output", choices=("md", "json", "both"), default="both")
    args = parser.parse_args()

    scenarios = orb_expert_scenario_bank_service.list_gold_scenarios()
    if args.family:
        scenarios = [s for s in scenarios if s.get("family") == args.family]
    if args.role:
        scenarios = [s for s in scenarios if s.get("role") == args.role]
    if args.limit:
        scenarios = scenarios[: args.limit]

    route_skipped = not os.environ.get("OPENAI_API_KEY") or args.no_openai
    results: list[dict] = []
    passed = 0
    for scenario in scenarios:
        answer = _sample_answer(scenario)
        evaluation = orb_expert_scenario_evaluator_service.evaluate(
            scenario=scenario,
            answer=answer,
            role=scenario.get("role"),
        )
        if evaluation.passed:
            passed += 1
        results.append(
            {
                "scenario_id": scenario.get("scenario_id"),
                "title": scenario.get("title"),
                "family": scenario.get("family"),
                "passed": evaluation.passed,
                "score": evaluation.score,
                "missing_markers": evaluation.missing_required_markers,
                "unsafe": evaluation.unsafe_phrases_found,
            }
        )

    validation_errors = orb_expert_scenario_bank_service.validate_gold_scenarios()
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scenario_count": len(scenarios),
        "passed": passed,
        "failed": len(scenarios) - passed,
        "route_call_skipped": route_skipped,
        "validation_errors": validation_errors,
        "results": results,
    }

    if args.output in ("json", "both"):
        REPORT_JSON.parent.mkdir(parents=True, exist_ok=True)
        REPORT_JSON.write_text(json.dumps(report, indent=2), encoding="utf-8")
        print(f"JSON report: {REPORT_JSON}")

    if args.output in ("md", "both"):
        REPORT_MD.parent.mkdir(parents=True, exist_ok=True)
        lines = [
            "# ORB Expert Stress Test Report",
            "",
            f"- Generated: {report['generated_at']}",
            f"- Scenarios: {report['scenario_count']}",
            f"- Passed (sample answers): {report['passed']}",
            f"- Route calls skipped: {report['route_call_skipped']}",
            "",
        ]
        if validation_errors:
            lines.append("## Validation errors")
            for err in validation_errors:
                lines.append(f"- {err}")
            lines.append("")
        lines.append("## Results")
        lines.append("| Scenario | Pass | Score |")
        lines.append("|----------|------|-------|")
        for r in results:
            lines.append(
                f"| {r['scenario_id']} | {'yes' if r['passed'] else 'no'} | {r['score']} |"
            )
        REPORT_MD.write_text("\n".join(lines), encoding="utf-8")
        print(f"Markdown report: {REPORT_MD}")

    return 0 if not validation_errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
