#!/usr/bin/env python3
"""ORB demo environment readiness check — inspect-only, non-destructive."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _load_env_readonly() -> None:
    """Load existing .env into process env without creating or modifying files."""
    env_path = ROOT / ".env"
    if not env_path.is_file():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Inspect ORB demo environment readiness without changing database or secrets"
    )
    parser.add_argument("--json", action="store_true", help="Emit JSON report")
    parser.add_argument(
        "--backend-url",
        default=os.getenv("ORB_DEMO_BACKEND_URL", "http://127.0.0.1:8000"),
        help="Backend base URL for /health probe (default: http://127.0.0.1:8000)",
    )
    parser.add_argument(
        "--frontend-url",
        default=os.getenv("ORB_DEMO_FRONTEND_URL", "http://127.0.0.1:3001"),
        help="Frontend base URL probe (default: http://127.0.0.1:3001)",
    )
    parser.add_argument(
        "--skip-service-probes",
        action="store_true",
        help="Skip HTTP checks for backend and frontend",
    )
    args = parser.parse_args()

    _load_env_readonly()

    from services.orb_demo_environment_service import run_demo_environment_checks

    report = run_demo_environment_checks(
        backend_url=args.backend_url,
        frontend_url=args.frontend_url,
        probe_services=not args.skip_service_probes,
    )

    if args.json:
        print(json.dumps(report.to_dict(), indent=2))
    else:
        print("ORB Demo Environment Readiness")
        print("=" * 40)
        for check in report.checks:
            icon = {"pass": "✓", "concern": "!", "fail": "✗", "skip": "-"}[check.status]
            print(f"[{icon}] {check.id}: {check.message}")
            if check.detail:
                print(f"    {check.detail}")
        print()
        print(f"Ready for ORB demo setup: {'YES' if report.ready_for_demo else 'NO'}")
        if report.blockers:
            print("Blockers:", ", ".join(report.blockers))
        if report.next_steps:
            print()
            print("Suggested next steps:")
            for index, step in enumerate(report.next_steps, start=1):
                print(f"  {index}. {step}")

    return 0 if report.ready_for_demo else 1


if __name__ == "__main__":
    raise SystemExit(main())
