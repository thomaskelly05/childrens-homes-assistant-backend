#!/usr/bin/env python3
"""Run ORB Residential scenario quality gate — Phase 1 safeguarding-critical evaluation."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.orb_scenario_quality_gate_service import orb_scenario_quality_gate_service  # noqa: E402


def _default_output_path(set_name: str) -> Path:
    safe = set_name.replace("/", "-")
    return ROOT / "reports" / f"orb_scenario_quality_gate_{safe}.json"


def main() -> int:
    parser = argparse.ArgumentParser(
        description="ORB Residential scenario quality gate — Phase 1 runner."
    )
    parser.add_argument(
        "--set",
        dest="set_name",
        required=True,
        choices=orb_scenario_quality_gate_service.list_set_names(),
        help="Scenario set to evaluate.",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=None,
        help="Path for JSON report (markdown written alongside with .md extension).",
    )
    parser.add_argument(
        "--no-live-provider",
        action="store_true",
        help="Use mock/deterministic answers only (no live OpenAI / ORB brain).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=0,
        help="Optional limit on number of scenarios to run.",
    )
    args = parser.parse_args()

    output_path = args.output or _default_output_path(args.set_name)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    use_live = not args.no_live_provider
    limit = args.limit if args.limit and args.limit > 0 else None

    report = orb_scenario_quality_gate_service.run_set(
        args.set_name,
        use_live_provider=use_live,
        limit=limit,
    )

    md_report = orb_scenario_quality_gate_service.build_markdown_report(report)
    json_path = output_path
    md_path = output_path.with_suffix(".md")

    json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    md_path.write_text(md_report, encoding="utf-8")

    print(f"ORB scenario quality gate — set={args.set_name}")
    print(f"Provider: {report.get('provider_mode')}")
    print(f"Passed: {report.get('passed')} / {report.get('scenario_count')} ({report.get('pass_rate')}%)")
    print(f"JSON: {json_path}")
    print(f"Markdown: {md_path}")

    failed = [r for r in report.get("results") or [] if not r.get("passed")]
    if failed:
        print("\nFailures:")
        for item in failed[:10]:
            print(f"  - {item.get('scenario_id')}: {', '.join(item.get('issues') or [])}")
        if len(failed) > 10:
            print(f"  ... and {len(failed) - 10} more")

    return 0 if report.get("failed", 0) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
