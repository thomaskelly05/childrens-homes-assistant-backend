#!/usr/bin/env python3
"""Run ORB universal answer contract golden prompt QA pack (routing contracts)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from services.orb_universal_answer_contract_map_service import run_golden_prompt_routing_qa


def main() -> int:
    report = run_golden_prompt_routing_qa()
    print(json.dumps(report, indent=2))
    return 0 if report.get("failed", 0) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
