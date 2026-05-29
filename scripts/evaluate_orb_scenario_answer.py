#!/usr/bin/env python3
"""CLI: evaluate stored answer text against a gold ORB expert scenario."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.orb_expert_scenario_evaluator_service import orb_expert_scenario_evaluator_service  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--scenario-id", required=True)
    parser.add_argument("--answer-file", type=Path, required=True)
    parser.add_argument("--role", default=None)
    parser.add_argument("--output-mode", default=None)
    args = parser.parse_args()

    answer = args.answer_file.read_text(encoding="utf-8")
    result = orb_expert_scenario_evaluator_service.evaluate_by_id(
        args.scenario_id,
        answer,
        role=args.role,
        output_mode=args.output_mode,
    )
    if not result:
        print(f"Unknown scenario: {args.scenario_id}", file=sys.stderr)
        return 1
    print(json.dumps(result.model_dump(), indent=2))
    return 0 if result.passed else 2


if __name__ == "__main__":
    raise SystemExit(main())
