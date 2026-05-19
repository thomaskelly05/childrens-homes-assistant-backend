from datetime import date
from pathlib import Path


def test_workforce_journey_routes_are_registered():
    import app as app_module

    route_paths = {getattr(route, "path", "") for route in app_module.app.routes}
    assert "/api/workforce-os/dashboard" in route_paths
    assert "/api/workforce-os/staff/{staff_id}/profile" in route_paths
    assert "/api/workforce-os/supervision" in route_paths
    assert "/api/workforce-os/training-matrix" in route_paths


def test_training_matrix_status_calculation():
    from services.workforce_journey_service import calculate_training_status

    requirement = {"training_name": "Safeguarding", "mandatory": True}
    assert calculate_training_status(requirement, None, today=date(2026, 5, 18))["status"] == "missing"
    assert calculate_training_status(requirement, {"completion_date": "2026-01-01", "expiry_date": "2026-06-15"}, today=date(2026, 5, 18))["status"] == "due"
    assert calculate_training_status(requirement, {"completion_date": "2025-01-01", "expiry_date": "2026-05-01"}, today=date(2026, 5, 18))["status"] == "expired"
    assert calculate_training_status(requirement, {"completion_date": "2026-01-01", "expiry_date": "2027-01-01"}, today=date(2026, 5, 18))["status"] == "completed"


def test_workforce_navigation_flags_hide_incomplete_modules(monkeypatch):
    from services.workforce_journey_service import WorkforceJourneyService

    monkeypatch.delenv("WORKFORCE_FULL_NAV_ENABLED", raising=False)
    navigation = WorkforceJourneyService().navigation()
    modules = {item["id"]: item for item in navigation["modules"]}
    assert modules["staff_dashboard"]["enabled"] is True
    assert modules["training_matrix"]["enabled"] is True
    assert modules["supervision"]["enabled"] is True
    assert modules["recruitment"]["enabled"] is False
    assert modules["conduct_capability"]["enabled"] is False


def test_staff_frontend_smoke_contracts():
    root = Path("frontend-next")
    staff_page = (root / "app/staff/page.tsx").read_text()
    profile_page = (root / "app/staff/[id]/page.tsx").read_text()
    workforce_adapter = (root / "lib/os-api/workforce.ts").read_text()
    app_shell = (root / "components/indicare/app-shell.tsx").read_text()
    operational_navigation = (root / "lib/navigation/operational-navigation.ts").read_text()

    assert "Workforce dashboard" in staff_page
    assert "Adults / Staff menu" in staff_page
    assert "Staff profile hub" in profile_page
    assert "/api/workforce-os/dashboard" in workforce_adapter
    assert "/api/workforce-os/supervision" in workforce_adapter
    assert "visibleOperationalNavigation" in app_shell
    assert "href: '/staff'" in operational_navigation
    assert "label: 'Workforce'" in operational_navigation
