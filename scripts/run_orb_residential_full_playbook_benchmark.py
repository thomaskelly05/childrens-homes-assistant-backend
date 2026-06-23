#!/usr/bin/env python3
"""Run ORB Residential full playbook benchmark and write audit report."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import os

os.environ.setdefault("SESSION_SECRET", "orb-residential-full-playbook-benchmark-local")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql://indicare:indicare123@localhost:5432/childrens_homes",
)

from assistant.evals.orb_residential_full_playbook_benchmark import (
    render_markdown_report,
    run_residential_full_playbook_benchmark,
)


def main() -> int:
    parser = argparse.ArgumentParser(description="ORB Residential full playbook benchmark")
    parser.add_argument(
        "--report-md",
        default=str(ROOT / "docs" / "audits" / "orb-residential-full-playbook-benchmark-report.md"),
        help="Markdown report output path",
    )
    parser.add_argument(
        "--report-json",
        default=str(ROOT / "reports" / "orb_residential_full_playbook_benchmark_report.json"),
        help="JSON report output path",
    )
    args = parser.parse_args()

    report = run_residential_full_playbook_benchmark()
    md = render_markdown_report(report)

    json_path = Path(args.report_json)
    json_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(json.dumps(report, indent=2), encoding="utf-8")

    md_path = Path(args.report_md)
    md_path.parent.mkdir(parents=True, exist_ok=True)
    md_path.write_text(md, encoding="utf-8")

    print(
        json.dumps(
            {
                "categories": report["categories_total"],
                "prompts": report["prompts_total"],
                "pass": report["pass"],
                "concern": report["concern"],
                "fail": report["fail"],
                "report_md": str(md_path),
                "report_json": str(json_path),
            },
            indent=2,
        )
    )

    return 0 if report.get("fail", 0) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
