"""Register LifeEcho as a standalone router group at startup.

This avoids a large router_loader rewrite while keeping LifeEcho separate from
IndiCare's existing domains. The patch runs before create_app() imports and
loads router groups.
"""

from __future__ import annotations

from core import router_loader

LIFE_ECHO_ROUTERS = (
    "routers.life_echo_routes",
    "routers.life_echo_experience_routes",
    "routers.life_echo_page_routes",
)


def _install_life_echo_router() -> None:
    if all(router in router_loader.ROUTERS for router in LIFE_ECHO_ROUTERS):
        return

    life_echo_group = router_loader.RouterGroup(
        "life_echo",
        LIFE_ECHO_ROUTERS,
        classification="primary",
        notes="Standalone emotional continuity, virtual memory box and therapeutic intelligence engine.",
        required_routers=LIFE_ECHO_ROUTERS,
    )

    router_loader.ROUTER_GROUPS = (
        router_loader.ROUTER_GROUPS[0],
        life_echo_group,
        *router_loader.ROUTER_GROUPS[1:],
    )
    router_loader.ROUTERS = [
        router for group in router_loader.ROUTER_GROUPS for router in group.routers
    ]
    router_loader.REQUIRED_ROUTERS = frozenset(
        router
        for group in router_loader.ROUTER_GROUPS
        for router in group.required_routers
    )


_install_life_echo_router()
