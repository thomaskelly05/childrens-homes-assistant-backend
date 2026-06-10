#!/usr/bin/env python3
"""Run ORB universal answer contract golden prompt QA pack (routing + answer quality)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from services.orb_universal_answer_contract_map_service import run_golden_prompt_full_qa


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run ORB universal answer contract golden prompt QA pack.",
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--routing-only",
        action="store_true",
        help="Evaluate routing/contract selection only (no final-answer quality).",
    )
    mode.add_argument(
        "--full-answer-quality",
        action="store_true",
        help="Strict mode: missing canonical samples count as answer-quality failures.",
    )
    return parser.parse_args()


def main() -> int:
    args = _parse_args()
    if args.routing_only:
        qa_mode = "routing_only"
    elif args.full_answer_quality:
        qa_mode = "full_answer_quality"
    else:
        qa_mode = "default"

    report = run_golden_prompt_full_qa(qa_mode=qa_mode)
    print(json.dumps(report, indent=2))

    if qa_mode == "routing_only":
        return 0 if report.get("routing_failed", 0) == 0 else 1
    if qa_mode == "full_answer_quality":
        strict_failures = report.get("routing_failed", 0) + report.get("answer_quality_failed", 0)
        return 0 if strict_failures == 0 else 1
    # Default honest mode: routing and validated answer quality must pass; skips are OK.
    default_failures = report.get("routing_failed", 0) + report.get("answer_quality_failed", 0)
    return 0 if default_failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
