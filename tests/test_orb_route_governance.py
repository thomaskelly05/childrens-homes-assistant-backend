from __future__ import annotations

from core.router_loader import REQUIRED_ROUTERS, ROUTER_GROUPS


CRITICAL_ORB_ROUTERS = frozenset(
    {
        "routers.orb_standalone_routes",
        "routers.orb_billing_routes",
        "routers.orb_launch_routes",
        "routers.orb_document_routes",
        "routers.orb_knowledge_routes",
        "routers.orb_agent_routes",
        "routers.orb_saved_output_routes",
        "routers.orb_projects_routes",
        "routers.orb_usage_routes",
        "routers.orb_templates_launch_routes",
        "routers.orb_voice_residential_routes",
        "routers.orb_dictate_routes",
        "routers.orb_saved_outputs_launch_routes",
        "routers.orb_system_routes",
    }
)


def test_critical_orb_routers_are_required():
    assert CRITICAL_ORB_ROUTERS.issubset(REQUIRED_ROUTERS)


def test_assistant_orb_group_declares_required_routers():
    group = next(g for g in ROUTER_GROUPS if g.name == "assistant_orb")
    assert CRITICAL_ORB_ROUTERS.issubset(set(group.required_routers))


def test_no_duplicate_critical_router_entries():
    assistant = next(g for g in ROUTER_GROUPS if g.name == "assistant_orb")
    routers = list(assistant.routers)
    assert len(routers) == len(set(routers))
