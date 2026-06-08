#!/usr/bin/env python3
"""Inspect ORB auth identities for duplicate Google/Microsoft users sharing an email.

Safe output only — never prints OAuth tokens, refresh tokens, password hashes, or secrets.

Usage:
  source .venv/bin/activate
  export $(grep -v '^#' .env | xargs)
  python scripts/orb_diagnose_duplicate_accounts.py --email user@example.com
  python scripts/orb_diagnose_duplicate_accounts.py --email user@example.com --dry-run
"""

from __future__ import annotations

import argparse
import json
import sys

from db.connection import get_db_connection, release_db_connection
from services.orb_account_linking_service import diagnose_duplicate_accounts, normalise_orb_email


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Diagnose duplicate ORB OAuth identities by email.")
    parser.add_argument("--email", required=True, help="Email address to inspect (normalised internally).")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Explicit dry-run mode (default behaviour; included for operational clarity).",
    )
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = parser.parse_args(argv)

    email = normalise_orb_email(args.email)
    if not email:
        print("A valid email address is required.", file=sys.stderr)
        return 2

    conn = get_db_connection()
    try:
        report = diagnose_duplicate_accounts(conn, email)
    finally:
        release_db_connection(conn)

    if args.json:
        print(json.dumps(report, indent=2, default=str))
        return 0

    mode = "dry-run" if args.dry_run else "inspect"
    print(f"ORB duplicate account diagnostic ({mode})")
    print(f"normalised_email: {report['normalised_email']}")
    print(f"user_count: {report['user_count']}")
    print(f"canonical_user_id: {report['canonical_user_id']}")
    print(f"duplicate_user_ids: {', '.join(str(value) for value in report['duplicate_user_ids']) or 'none'}")
    print("")
    for user in report["users"]:
        print(f"user_id={user['user_id']}")
        print(f"  email={user['email']}")
        print(f"  normalised_email={user['normalised_email']}")
        print(f"  provider_accounts_linked={', '.join(user['provider_accounts_linked']) or 'none'}")
        print(f"  subscription_status={user['subscription_status']}")
        print(f"  stripe_customer_id_present={'yes' if user['stripe_customer_id_present'] else 'no'}")
        print(f"  stripe_subscription_id_present={'yes' if user['stripe_subscription_id_present'] else 'no'}")
        print(f"  created_at={user['created_at']}")
        print(f"  last_login={user['last_login'] or 'n/a'}")
        print("")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
