from __future__ import annotations

from schemas.orb import OrbContext, OrbModeDecision, OrbSelectedMode
from services.orb_intent_router import can_use_inspector_brain, route_orb_intent


def route_orb_mode(
    *,
    message: str | None,
    current_user: dict,
    selected_mode: OrbSelectedMode = "auto",
    context: OrbContext | None = None,
) -> OrbModeDecision:
    """Backward-compatible wrapper around the broader Orb intent router."""

    return route_orb_intent(
        message=message,
        current_user=current_user,
        selected_mode=selected_mode,
        context=context,
    )

