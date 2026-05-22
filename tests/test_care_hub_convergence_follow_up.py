from __future__ import annotations

import inspect
from pathlib import Path

from fastapi import FastAPI

from core.router_loader import ROUTER_GROUPS, ROUTERS
from services.care_hub_safeguarding_queues_service import care_hub_safeguarding_queues_service
from services.intelligence_cache_service import CACHE_EVENTS, intelligence_cache_service


def _paths(router) -> set[str]:
    return {getattr(route, "path", "") for route in router.routes}


def test_care_hub_safeguarding_queues_split_categories() -> None:
    feed = {
        "events": [
            {
                "event_id": "missing_episodes:1",
                "source_table": "missing_episodes",
                "title": "Missing from home",
                "summary": "Child missing overnight",
                "risk_tags": ["missing"],
                "event_at": "2026-05-22T10:00:00Z",
            },
            {
                "event_id": "incidents:2",
                "source_table": "incidents",
                "title": "Reg 40 serious incident",
                "summary": "Notifiable serious incident discussed with manager",
                "risk_tags": [],
                "event_at": "2026-05-22T11:00:00Z",
            },
            {
                "event_id": "incidents:3",
                "source_table": "incidents",
                "title": "Physical intervention",
                "summary": "Restraint used during de-escalation",
                "risk_tags": ["restraint"],
                "event_at": "2026-05-22T12:00:00Z",
            },
            {
                "event_id": "incidents:4",
                "source_table": "incidents",
                "title": "Allegation review",
                "summary": "Staff allegation referred to LADO",
                "risk_tags": [],
                "event_at": "2026-05-22T13:00:00Z",
            },
            {
                "event_id": "health_records:5",
                "source_table": "health_records",
                "title": "Medication concern",
                "summary": "Missed dose and refused medication",
                "risk_tags": [],
                "event_at": "2026-05-22T14:00:00Z",
            },
        ]
    }
    result = care_hub_safeguarding_queues_service.build_from_feed(feed)
    queues = result["queues"]
    assert result["summary"]["missing_episode_queue"] == 1
    assert result["summary"]["reg_40_queue"] == 1
    assert result["summary"]["restraint_physical_intervention_queue"] == 1
    assert result["summary"]["allegation_queue"] == 1
    assert result["summary"]["medication_risk_queue"] == 1
    assert len(queues["missing_episode_queue"]) == 1


def test_care_hub_live_cache_invalidates_on_operational_events() -> None:
    intelligence_cache_service.clear()
    key = intelligence_cache_service.build_cache_key(cache_type="care_hub_live", home_id=3, extra={"limit": 50})
    intelligence_cache_service.set(key=key, value={"ok": True}, cache_type="care_hub_live", home_id=3)
    result = intelligence_cache_service.invalidate_for_event("incident_saved", scope={"home_id": 3})
    assert "care_hub_live" in result["affected_cache_types"]
    assert key in result["invalidated_keys"]
    assert "care_hub_live" in CACHE_EVENTS["missing_episode_saved"]


def test_experience_bundle_routers_are_registered() -> None:
    group = next(item for item in ROUTER_GROUPS if item.name == "experience_bundles")
    assert "routers.workspace_routes" in group.routers
    assert "routers.connect_routes" in group.routers
    assert "routers.workspace_routes" in ROUTERS
    assert "routers.connect_routes" in ROUTERS


def test_care_hub_routes_require_authentication_dependencies() -> None:
    source = Path("routers/care_hub_routes.py").read_text()
    assert "Depends(get_current_user)" in source
    assert "def care_hub_dashboard" in source
    assert "def care_hub_safeguarding_queues" in source


def test_care_hub_route_surface_includes_split_queues() -> None:
    source = Path("routers/care_hub_routes.py").read_text()
    assert '@router.get("/safeguarding-queues")' in source
    assert 'prefix="/os/care-hub"' in source


def test_frontend_care_hub_client_uses_canonical_paths() -> None:
    root = Path("frontend-next")
    adapter = (root / "lib/os-api/care-hub.ts").read_text()
    platform = (root / "lib/os-api/platform.ts").read_text()
    mapper = (root / "lib/os-api/care-hub.ts").read_text()
    page = (root / "app/command-centre/page.tsx").read_text()
    widgets = (root / "components/indicare/care-hub/care-hub-widgets.tsx").read_text()

    assert "/os/care-hub" in adapter
    assert "/os/care-hub/live" in adapter
    assert "/os/care-hub/safeguarding-queues" in adapter
    assert "mapCareHubToCommandCentre" in platform
    assert "getCareHub" in page
    assert "care-hub-widgets-error" in widgets
    assert "safeguarding_queues" in mapper or "safeguarding_queues" in widgets


def test_provider_operational_convergence_supports_parallel_workers() -> None:
    from services.provider_intelligence_service import ProviderIntelligenceService

    source = inspect.getsource(ProviderIntelligenceService.build_operational_convergence)
    assert "ThreadPoolExecutor" in source
