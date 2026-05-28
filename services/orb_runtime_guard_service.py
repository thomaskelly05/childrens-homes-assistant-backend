from __future__ import annotations

"""ORB Residential runtime guard service.

Purpose:
- enforce standalone-only runtime behaviour
- block operational route access from ORB Residential sessions
- prevent accidental OS runtime leakage
- provide one central runtime boundary layer
"""

from dataclasses import dataclass
from typing import Any


BLOCKED_OPERATIONAL_ROUTE_PATTERNS = (
    "/os",
    "/chronology",
    "/provider",
    "/governance",
    "/dashboard",
    "/operational",
    "/management",
    "/safeguarding/live",
    "/young-people",
    "/childrens-home-os",
    "/visibility/young-people",
    "/assistant/os",
    "/orb/operational",
)


@dataclass(frozen=True)
class OrbRuntimeGuardDecision:
    allowed: bool
    reason: str
    route: str
    surface: str
    blocked_by_policy: bool

    def to_dict(self) -> dict[str, Any]:
        return {
            "allowed": self.allowed,
            "reason": self.reason,
            "route": self.route,
            "surface": self.surface,
            "blocked_by_policy": self.blocked_by_policy,
        }


class OrbRuntimeGuardService:
    """Central standalone runtime enforcement layer."""

    def check_route_access(
        self,
        *,
        route: str,
        surface: str = "orb_residential",
    ) -> OrbRuntimeGuardDecision:
        route_path = str(route or "").strip().lower()

        if surface == "orb_residential":
            for blocked in BLOCKED_OPERATIONAL_ROUTE_PATTERNS:
                if blocked in route_path:
                    return OrbRuntimeGuardDecision(
                        allowed=False,
                        reason="operational_routes_blocked_for_orb_residential",
                        route=route_path,
                        surface=surface,
                        blocked_by_policy=True,
                    )

        return OrbRuntimeGuardDecision(
            allowed=True,
            reason="allowed",
            route=route_path,
            surface=surface,
            blocked_by_policy=False,
        )

    def build_boundary_response(self) -> dict[str, Any]:
        return {
            "ok": False,
            "surface": "orb_residential",
            "error": "operational_access_blocked",
            "message": (
                "ORB Residential is a standalone premium intelligence product and does not include IndiCare OS operational access."
            ),
            "powered_by": "IndiCare Intelligence",
        }


orb_runtime_guard_service = OrbRuntimeGuardService()
