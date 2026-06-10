#!/usr/bin/env python3
"""Run ORB universal answer contract golden prompt QA pack (routing + answer quality)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from services.orb_universal_answer_contract_map_service import run_golden_prompt_full_qa


def main() -> int:
    report = run_golden_prompt_full_qa(include_answer_quality=True)
    print(json.dumps(report, indent=2))
    failed = report.get("failed", 0)
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
