#!/usr/bin/env python3
"""Run ORB internal-knowledge-first knowledge gap audit (founder/admin QA)."""

from __future__ import annotations

import json
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from services.orb_knowledge_gap_audit_service import orb_knowledge_gap_audit_service


def main() -> int:
    report = orb_knowledge_gap_audit_service.run_audit()
    paths = orb_knowledge_gap_audit_service.write_reports(report)
    print(json.dumps(report, indent=2))
    print(f"\nWrote {paths['json']}", file=sys.stderr)
    print(f"Wrote {paths['markdown']}", file=sys.stderr)
    failed = report.get("internal_knowledge_failed", 0)
    unexpected = report.get("unexpected_openai_calls", 0)
    return 0 if failed == 0 and unexpected == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
