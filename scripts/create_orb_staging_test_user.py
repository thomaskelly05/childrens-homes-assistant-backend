#!/usr/bin/env python3
"""Create or document an active ORB staging test user (manager/admin) for live-LLM sign-off."""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))


def _load_env() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--email", default=os.getenv("ORB_STAGING_TEST_EMAIL", "staging.orb@indicare.local"))
    parser.add_argument("--password", default=os.getenv("ORB_STAGING_TEST_PASSWORD", "ChangeMeStagingORB1!"))
    parser.add_argument("--role", default=os.getenv("ORB_STAGING_TEST_ROLE", "manager"), choices=["manager", "admin"])
    parser.add_argument("--create", action="store_true", help="Insert user when DATABASE_URL is configured")
    args = parser.parse_args()

    print("# ORB staging test account")
    print()
    print("Use an **active** manager/admin account on Render — not inactive admin@indicare.co.uk.")
    print()
    print("| Field | Value |")
    print("|-------|-------|")
    print(f"| Email | `{args.email}` |")
    print(f"| Password | set via `ORB_STAGING_TEST_PASSWORD` secret |")
    print(f"| Role | `{args.role}` |")
    print("| MFA | Configure TOTP on the account **or** use approved staging MFA bypass for automation |")
    print("| ORB access | Premium / standalone access with safety acceptance completed |")
    print("| Entry | `/orb` after login — session cookie + CSRF required for stream POST |")
    print()
    print("Render secrets (backend service `childrens-homes-assistant-backend-new`):")
    print("- `OPENAI_API_KEY` — live staging key (not placeholder)")
    print("- `AI_PROVIDER_STRICT=true` — block mock fallback during sign-off")
    print("- `ORB_LIVE_SIGN_OFF=1` — optional flag for harness preflight")
    print()
    print("Sign-off harness:")
    print("```bash")
    print("export ORB_LIVE_SIGN_OFF=1")
    print("export AI_PROVIDER_STRICT=true")
    print("export OPENAI_API_KEY=\"<staging-key>\"")
    print("python scripts/run_orb_live_ui_verification_pr1724.py")
    print("```")

    if not args.create:
        print()
        print("Run with `--create` against a configured DATABASE_URL to insert the user.")
        return 0

    _load_env()
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        print("DATABASE_URL is not set; cannot create user.", file=sys.stderr)
        return 1

    from auth.passwords import hash_password
    from db.connection import get_connection

    password_hash = hash_password(args.password)
    with get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, is_active FROM users WHERE lower(email) = lower(%s)
                """,
                (args.email,),
            )
            row = cur.fetchone()
            if row:
                user_id, is_active = row
                cur.execute(
                    """
                    UPDATE users
                    SET role = %s, is_active = true, password_hash = %s, updated_at = NOW()
                    WHERE id = %s
                    """,
                    (args.role, password_hash, user_id),
                )
                print(f"Updated existing user id={user_id} (was_active={is_active})")
            else:
                cur.execute(
                    """
                    INSERT INTO users (email, password_hash, role, is_active, first_name, last_name, home_id)
                    VALUES (%s, %s, %s, true, 'Staging', 'ORB', 1)
                    RETURNING id
                    """,
                    (args.email, password_hash, args.role),
                )
                user_id = cur.fetchone()[0]
                print(f"Created staging ORB user id={user_id}")
        conn.commit()

    print("Complete MFA setup in the browser before admin/manager sign-off if enforcement applies.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
