#!/usr/bin/env python3
"""ORB launch-readiness quality report — Phase 2 wrapper over Phase 1 scenario sets."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.orb_scenario_quality_gate_service import (  # noqa: E402
    PHASE_1_LAUNCH_SETS,
    orb_scenario_quality_gate_service,
)

_SET_CHOICES = list(PHASE_1_LAUNCH_SETS) + ["all-phase-1"]


def _resolve_sets(set_arg: str | None) -> list[str]:
    if not set_arg or set_arg == "all-phase-1":
        return list(PHASE_1_LAUNCH_SETS)
    return [set_arg]


def main() -> int:
    parser = argparse.ArgumentParser(
        description=(
            "ORB launch-readiness quality report — runs Phase 1 scenario sets and "
            "produces a combined JSON/markdown summary."
        )
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=ROOT / "reports" / "orb_quality",
        help="Directory for combined launch report artifacts (default: reports/orb_quality).",
    )
    parser.add_argument(
        "--set",
        dest="set_name",
        choices=_SET_CHOICES,
        default="all-phase-1",
        help="Scenario set to evaluate, or all-phase-1 for smoke + missing-from-care + critical-50.",
    )
    parser.add_argument(
        "--live-provider",
        action="store_true",
        help="Call the live ORB brain / OpenAI provider (default: mock/deterministic only).",
    )
    parser.add_argument(
        "--fail-on-critical",
        action="store_true",
        help="Exit non-zero when critical-risk scenarios fail or recommendation is fail.",
    )
    args = parser.parse_args()

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    set_names = _resolve_sets(args.set_name)
    report = orb_scenario_quality_gate_service.run_launch_report(
        set_names,
        use_live_provider=args.live_provider,
    )

    json_path = output_dir / "orb_launch_quality_report.json"
    md_path = output_dir / "orb_launch_quality_report.md"
    md_report = orb_scenario_quality_gate_service.build_launch_markdown_report(report)

    json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")
    md_path.write_text(md_report, encoding="utf-8")

    summary = report.get("summary") or {}
    print("ORB launch quality report")
    print(f"Sets: {', '.join(set_names)}")
    print(f"Provider: {report.get('provider_mode')}")
    print(
        f"Passed: {summary.get('total_passed')} / {summary.get('total_scenarios')} "
        f"({summary.get('pass_rate')}%)"
    )
    print(f"Launch recommendation: {report.get('launch_recommendation')}")
    print(f"JSON: {json_path}")
    print(f"Markdown: {md_path}")

    for item in report.get("set_summaries") or []:
        print(
            f"  - {item.get('set_name')}: {item.get('passed')}/{item.get('scenario_count')} passed"
        )

    critical = report.get("critical_failures") or []
    if critical:
        print(f"\nCritical failures: {len(critical)}")
        for item in critical[:5]:
            print(f"  - {item.get('scenario_id')}: {', '.join(item.get('issues') or [])}")
        if len(critical) > 5:
            print(f"  ... and {len(critical) - 5} more")

    recommendation = str(report.get("launch_recommendation") or "fail")
    if args.fail_on_critical and (critical or recommendation == "fail"):
        return 1
    if recommendation == "fail":
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
