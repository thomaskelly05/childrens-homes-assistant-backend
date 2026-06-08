#!/usr/bin/env python3
"""Repair duplicate ORB OAuth identities by linking providers to the canonical subscribed user.

Usage:
  source .venv/bin/activate
  export $(grep -v '^#' .env | xargs)
  python scripts/orb_repair_duplicate_accounts.py --email user@example.com --dry-run
  python scripts/orb_repair_duplicate_accounts.py --email user@example.com --apply
"""

from __future__ import annotations

import argparse
import json
import sys

from db.connection import get_db_connection, release_db_connection
from services.orb_account_linking_service import normalise_orb_email, repair_duplicate_accounts


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Repair duplicate ORB OAuth identities by verified email.")
    parser.add_argument("--email", required=True, help="Normalised email shared across duplicate accounts.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true", help="Show planned repair actions without writing.")
    mode.add_argument("--apply", action="store_true", help="Apply provider re-linking to the canonical user.")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = parser.parse_args(argv)

    email = normalise_orb_email(args.email)
    if not email:
        print("A valid email address is required.", file=sys.stderr)
        return 2

    conn = get_db_connection()
    try:
        report = repair_duplicate_accounts(conn, email, apply=bool(args.apply))
        if args.apply:
            conn.commit()
        else:
            conn.rollback()
    except Exception:
        conn.rollback()
        raise
    finally:
        release_db_connection(conn)

    if args.json:
        print(json.dumps(report, indent=2, default=str))
        return 0

    print("ORB duplicate account repair")
    print(f"mode: {'apply' if args.apply else 'dry-run'}")
    print(f"normalised_email: {report['normalised_email']}")
    print(f"canonical_user_id: {report['canonical_user_id']}")
    print(f"message: {report['message']}")
    for action in report.get("actions") or []:
        print(
            "  - link provider={provider} from duplicate_user_id={duplicate_user_id} "
            "to canonical_user_id={canonical_user_id}".format(**action)
        )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
