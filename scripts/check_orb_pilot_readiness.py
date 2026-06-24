#!/usr/bin/env python3
"""ORB closed-pilot readiness check — migrations, env vars, feature flags."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

os.environ.setdefault("SESSION_SECRET", os.getenv("SESSION_SECRET", "orb-pilot-readiness-check"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Check ORB Residential closed-pilot readiness")
    parser.add_argument("--json", action="store_true", help="Emit JSON report")
    parser.add_argument(
        "--allow-memory-fallback",
        action="store_true",
        help="Do not fail when migration tables are missing (local dev)",
    )
    args = parser.parse_args()

    from services.orb_pilot_readiness_service import run_pilot_readiness_checks

    report = run_pilot_readiness_checks(require_database=not args.allow_memory_fallback)

    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        print("ORB Closed Pilot Readiness")
        print("=" * 40)
        for check in report.checks:
            icon = {"pass": "✓", "concern": "!", "fail": "✗"}[check.status]
            print(f"[{icon}] {check.id}: {check.message}")
            if check.detail:
                print(f"    {check.detail}")
        print()
        print(f"Ready for controlled closed pilot: {'YES' if report.ready_for_pilot else 'NO'}")
        if report.pilot_blockers:
            print("Pilot blockers:", ", ".join(report.pilot_blockers))
        if report.production_blockers:
            print("Production concerns:", ", ".join(report.production_blockers))

    return 0 if report.ready_for_pilot else 1


if __name__ == "__main__":
    raise SystemExit(main())
