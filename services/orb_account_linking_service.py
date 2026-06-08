from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime
from typing import Any

from db.orb_subscription_db import get_orb_subscription
from services.orb_oauth_service import (
    create_orb_residential_user,
    find_orb_user_by_email,
    find_orb_user_by_oauth,
    is_os_scoped_user,
    link_oauth_account,
)
from services.orb_subscription_plan_service import subscription_grants_orb_access

logger = logging.getLogger(__name__)

ACTIVE_PROVIDER_NAMES = frozenset({"google", "microsoft", "apple", "email"})


def normalise_orb_email(email: str | None) -> str:
    return str(email or "").strip().lower()


def _row_dict(row: Any) -> dict[str, Any]:
    return dict(row) if row else {}


def _parse_created_at(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            pass
    return datetime.max.replace(tzinfo=None)


def find_all_orb_users_by_normalised_email(conn, email: str) -> list[dict[str, Any]]:
    from psycopg2.extras import RealDictCursor

    normalised = normalise_orb_email(email)
    if not normalised:
        return []
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT DISTINCT
                u.id,
                u.email,
                lower(u.email) AS normalised_email,
                u.role,
                u.first_name,
                u.last_name,
                u.home_id,
                u.provider_id,
                u.is_active,
                u.archived,
                u.created_at,
                u.updated_at
            FROM users u
            LEFT JOIN orb_oauth_accounts oa ON oa.user_id = u.id
            WHERE lower(u.email) = %s
               OR (oa.email IS NOT NULL AND lower(oa.email) = %s)
            ORDER BY u.id ASC
            """,
            (normalised, normalised),
        )
        return [dict(row) for row in cur.fetchall()]


def list_user_oauth_accounts(conn, user_id: int) -> list[dict[str, Any]]:
    from psycopg2.extras import RealDictCursor

    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        cur.execute(
            """
            SELECT provider, provider_subject, email, email_verified, linked_at, updated_at, metadata
            FROM orb_oauth_accounts
            WHERE user_id = %s
            ORDER BY provider ASC, linked_at ASC
            """,
            (int(user_id),),
        )
        return [dict(row) for row in cur.fetchall()]


def _subscription_summary(conn, user_id: int) -> dict[str, Any]:
    subscription = get_orb_subscription(conn, int(user_id)) or {}
    status = str(subscription.get("subscription_status") or "inactive").lower()
    active = subscription_grants_orb_access(
        status,
        period_end=subscription.get("current_period_end"),
    )
    return {
        "subscription_status": status or None,
        "subscription_active": active,
        "stripe_customer_id_present": bool(subscription.get("stripe_customer_id")),
        "stripe_subscription_id_present": bool(subscription.get("stripe_subscription_id")),
        "stripe_customer_id": subscription.get("stripe_customer_id"),
        "stripe_subscription_id": subscription.get("stripe_subscription_id"),
        "orb_plan": subscription.get("orb_plan"),
        "current_period_end": subscription.get("current_period_end"),
    }


def _canonical_priority(conn, user: dict[str, Any]) -> tuple[int, int, int, float]:
    user_id = int(user["id"])
    summary = _subscription_summary(conn, user_id)
    created_at = _parse_created_at(user.get("created_at"))
    created_ts = created_at.timestamp() if created_at != datetime.max.replace(tzinfo=None) else float("inf")
    return (
        1 if summary["subscription_active"] else 0,
        1 if summary["stripe_subscription_id_present"] else 0,
        1 if summary["stripe_customer_id_present"] else 0,
        -created_ts,
    )


def identify_canonical_user(conn, email: str) -> dict[str, Any] | None:
    candidates = find_all_orb_users_by_normalised_email(conn, email)
    orb_candidates = [user for user in candidates if not is_os_scoped_user(user)]
    if not orb_candidates:
        return None
    return max(orb_candidates, key=lambda user: _canonical_priority(conn, user))


def user_has_paid_or_active_access(conn, user_id: int) -> bool:
    summary = _subscription_summary(conn, int(user_id))
    return bool(summary["subscription_active"])


def build_user_identity_report(conn, user: dict[str, Any]) -> dict[str, Any]:
    user_id = int(user["id"])
    oauth_accounts = list_user_oauth_accounts(conn, user_id)
    subscription = _subscription_summary(conn, user_id)
    providers = [str(row.get("provider") or "") for row in oauth_accounts if row.get("provider")]
    return {
        "user_id": user_id,
        "email": user.get("email"),
        "normalised_email": normalise_orb_email(str(user.get("email") or "")),
        "role": user.get("role"),
        "provider_accounts_linked": providers,
        "auth_provider_values": providers,
        "subscription_status": subscription["subscription_status"],
        "subscription_active": subscription["subscription_active"],
        "stripe_customer_id_present": subscription["stripe_customer_id_present"],
        "stripe_subscription_id_present": subscription["stripe_subscription_id_present"],
        "created_at": user.get("created_at"),
        "last_login": None,
        "oauth_accounts": [
            {
                "provider": row.get("provider"),
                "provider_subject": row.get("provider_subject"),
                "email": row.get("email"),
                "email_verified": bool(row.get("email_verified")),
                "linked_at": row.get("linked_at"),
            }
            for row in oauth_accounts
        ],
    }


def diagnose_duplicate_accounts(conn, email: str) -> dict[str, Any]:
    normalised = normalise_orb_email(email)
    users = find_all_orb_users_by_normalised_email(conn, normalised)
    canonical = identify_canonical_user(conn, normalised)
    reports = [build_user_identity_report(conn, user) for user in users]
    duplicate_ids = []
    if canonical:
        duplicate_ids = [
            int(report["user_id"])
            for report in reports
            if int(report["user_id"]) != int(canonical["id"])
        ]
    return {
        "normalised_email": normalised,
        "user_count": len(reports),
        "canonical_user_id": int(canonical["id"]) if canonical else None,
        "duplicate_user_ids": duplicate_ids,
        "users": reports,
    }


@dataclass(frozen=True)
class OrbOAuthResolveResult:
    user: dict[str, Any]
    user_created: bool
    linked_existing_by_email: bool
    rehomed_provider_from_duplicate_user: bool
    canonical_user_id: int | None
    duplicate_user_id: int | None


def resolve_orb_oauth_user(
    conn,
    *,
    provider: str,
    subject: str,
    email: str,
    email_verified: bool,
    first_name: str | None = None,
    last_name: str | None = None,
) -> OrbOAuthResolveResult:
    normalised_email = normalise_orb_email(email)
    provider_user = find_orb_user_by_oauth(conn, provider=provider, subject=subject)
    canonical_user = identify_canonical_user(conn, normalised_email) if email_verified and normalised_email else None

    user_created = False
    linked_existing_by_email = False
    rehomed = False
    duplicate_user_id: int | None = None
    canonical_user_id: int | None = int(canonical_user["id"]) if canonical_user else None

    if canonical_user:
        if provider_user and int(provider_user["id"]) != int(canonical_user["id"]):
            duplicate_user_id = int(provider_user["id"])
            if is_os_scoped_user(canonical_user):
                raise ValueError("canonical_user_os_scoped")
            user = canonical_user
            linked_existing_by_email = True
            rehomed = True
            logger.info(
                "ORB OAuth provider rehome provider=%s duplicate_user_id=%s canonical_user_id=%s "
                "rehomed_provider_from_duplicate_user=true linked_via=verified_email_repair",
                provider,
                duplicate_user_id,
                canonical_user_id,
            )
        elif provider_user:
            user = provider_user
        else:
            if is_os_scoped_user(canonical_user):
                raise ValueError("canonical_user_os_scoped")
            user = canonical_user
            linked_existing_by_email = True
            logger.info(
                "ORB OAuth provider linked provider=%s user_id=%s linked_via=verified_email reused_existing_user=true",
                provider,
                int(canonical_user["id"]),
            )
    elif provider_user:
        user = provider_user
    else:
        existing = find_orb_user_by_email(conn, normalised_email)
        if existing:
            if is_os_scoped_user(existing):
                raise ValueError("existing_user_os_scoped")
            user = existing
            linked_existing_by_email = True
            canonical_user_id = int(existing["id"])
            logger.info(
                "ORB OAuth provider linked provider=%s user_id=%s linked_via=verified_email reused_existing_user=true",
                provider,
                int(existing["id"]),
            )
        else:
            user = create_orb_residential_user(
                conn,
                email=normalised_email,
                first_name=first_name,
                last_name=last_name,
            )
            user_created = True
            canonical_user_id = int(user["id"])

    return OrbOAuthResolveResult(
        user=user,
        user_created=user_created,
        linked_existing_by_email=linked_existing_by_email,
        rehomed_provider_from_duplicate_user=rehomed,
        canonical_user_id=canonical_user_id,
        duplicate_user_id=duplicate_user_id,
    )


def repair_duplicate_accounts(conn, email: str, *, apply: bool = False) -> dict[str, Any]:
    diagnosis = diagnose_duplicate_accounts(conn, email)
    normalised = diagnosis["normalised_email"]
    canonical_id = diagnosis["canonical_user_id"]
    actions: list[dict[str, Any]] = []

    if not canonical_id or diagnosis["user_count"] <= 1:
        return {
            **diagnosis,
            "applied": False,
            "actions": actions,
            "message": "No duplicate ORB users found for this email.",
        }

    canonical = next(user for user in diagnosis["users"] if int(user["user_id"]) == int(canonical_id))
    for report in diagnosis["users"]:
        duplicate_id = int(report["user_id"])
        if duplicate_id == int(canonical_id):
            continue
        oauth_accounts = report.get("oauth_accounts") or []
        for account in oauth_accounts:
            provider_name = str(account.get("provider") or "")
            subject = str(account.get("provider_subject") or "")
            action = {
                "duplicate_user_id": duplicate_id,
                "canonical_user_id": int(canonical_id),
                "provider": provider_name,
                "provider_subject": subject,
                "linked_via": "verified_email_repair",
            }
            actions.append(action)
            if apply and provider_name and subject:
                link_oauth_account(
                    conn,
                    user_id=int(canonical_id),
                    provider=provider_name,
                    subject=subject,
                    email=normalise_orb_email(str(account.get("email") or normalised)),
                    email_verified=bool(account.get("email_verified", True)),
                    metadata={"repair_source_user_id": duplicate_id},
                )
                logger.info(
                    "ORB account repair linked provider=%s duplicate_user_id=%s canonical_user_id=%s "
                    "linked_via=verified_email_repair",
                    provider_name,
                    duplicate_id,
                    canonical_id,
                )

    return {
        **diagnosis,
        "applied": bool(apply and actions),
        "actions": actions,
        "canonical_subscription_status": canonical.get("subscription_status"),
        "canonical_subscription_active": canonical.get("subscription_active"),
        "message": (
            f"Would link {len(actions)} provider account(s) to user_id={canonical_id}."
            if not apply
            else f"Linked {len(actions)} provider account(s) to user_id={canonical_id}."
        ),
    }
