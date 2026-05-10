from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from db.connection import close_db_pool, init_db_pool
from db.partner_assistant_db import (
    create_partner_api_key,
    init_partner_assistant_tables,
)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Create a partner IndiCare Assistant API key."
    )
    parser.add_argument(
        "--organisation-id",
        required=True,
        help="Stable organisation identifier, e.g. demo-home or compass-demo.",
    )
    parser.add_argument(
        "--organisation-name",
        default=None,
        help="Human-readable organisation name.",
    )
    parser.add_argument(
        "--allowed-origin",
        default=None,
        help="Optional allowed website origin, e.g. https://partner-system.co.uk.",
    )
    parser.add_argument(
        "--rate-limit-per-minute",
        type=int,
        default=60,
        help="Requests allowed per minute for this key. Stored for enforcement later.",
    )

    args = parser.parse_args()

    required_env = ["DATABASE_URL"]
    missing = [name for name in required_env if not os.getenv(name)]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

    init_db_pool()
    try:
        init_partner_assistant_tables()
        result = create_partner_api_key(
            organisation_id=args.organisation_id,
            organisation_name=args.organisation_name,
            allowed_origin=args.allowed_origin,
            rate_limit_per_minute=args.rate_limit_per_minute,
        )
    finally:
        close_db_pool()

    print("\nPartner Assistant API key created. Store this securely now; it will not be shown again.\n")
    print(json.dumps(result, indent=2, default=str))


if __name__ == "__main__":
    main()
