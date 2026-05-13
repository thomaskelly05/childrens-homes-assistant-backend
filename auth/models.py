from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from auth.rbac import normalise_role, permissions_for_role


class StaffUser(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: int
    email: EmailStr
    role: str
    home_id: int | None = None
    provider_id: int | None = None
    first_name: str | None = None
    last_name: str | None = None
    is_active: bool = True
    archived: bool = False
    allowed_home_ids: list[int] = Field(default_factory=list)
    permissions: list[str] = Field(default_factory=list)
    subscription_active: bool | None = None
    subscription_status: str | None = None
    plan_name: str | None = None
    mfa_enabled: bool | None = None
    mfa_verified: bool | None = None
    has_passkeys: bool | None = None
    created_at: datetime | None = None
    updated_at: datetime | None = None


class LoginResponse(BaseModel):
    ok: bool
    authenticated: bool
    message: str
    mfa_required: bool = False
    mfa_enabled: bool = False
    mfa_setup_required: bool = False
    mfa_mandatory: bool = False
    mfa_pending: bool = False
    user: StaffUser


def staff_user_payload(
    user: dict[str, Any],
    *,
    billing: dict[str, Any] | None = None,
    mfa_enabled: bool | None = None,
    mfa_verified: bool | None = None,
    has_passkeys: bool | None = None,
    include_audit_fields: bool = False,
) -> dict[str, Any]:
    role = normalise_role(user.get("role"))
    home_id = user.get("home_id")
    allowed_home_ids = []
    if home_id is not None:
        try:
            allowed_home_ids = [int(home_id)]
        except (TypeError, ValueError):
            allowed_home_ids = []

    payload: dict[str, Any] = {
        "id": user["id"],
        "email": user["email"],
        "role": role,
        "home_id": home_id,
        "provider_id": user.get("provider_id"),
        "first_name": user.get("first_name"),
        "last_name": user.get("last_name"),
        "is_active": bool(user.get("is_active")),
        "archived": bool(user.get("archived")),
        "allowed_home_ids": allowed_home_ids,
        "permissions": sorted(permissions_for_role(role)),
        "subscription_active": bool(billing and billing.get("subscription_active")),
        "subscription_status": billing.get("subscription_status") if billing else "inactive",
        "plan_name": billing.get("plan_name") if billing else None,
    }

    if mfa_enabled is not None:
        payload["mfa_enabled"] = mfa_enabled
    if mfa_verified is not None:
        payload["mfa_verified"] = mfa_verified
    if has_passkeys is not None:
        payload["has_passkeys"] = has_passkeys
    if include_audit_fields:
        payload.update(
            {
                "created_at": user.get("created_at"),
                "updated_at": user.get("updated_at"),
                "stripe_customer_id": billing.get("stripe_customer_id") if billing else None,
                "stripe_subscription_id": billing.get("stripe_subscription_id") if billing else None,
                "current_period_end": billing.get("current_period_end") if billing else None,
            }
        )
    return payload
