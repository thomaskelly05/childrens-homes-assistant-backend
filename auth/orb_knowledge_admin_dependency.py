"""ORB Knowledge Library admin mutations — platform admin only."""

from __future__ import annotations

from typing import Any

from auth.permissions import require_admin


def require_orb_knowledge_admin(current_user: dict[str, Any] = require_admin) -> dict[str, Any]:
    return current_user
