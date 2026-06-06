from __future__ import annotations

import inspect


def test_standalone_access_route_does_not_require_premium_dependency():
    from routers import orb_billing_routes

    source = inspect.getsource(orb_billing_routes.orb_standalone_access)
    assert "require_rich_orb_premium_access" not in source
    assert "require_orb_residential_auth" not in source
    assert "get_optional_orb_residential_user" not in source
    assert "get_orb_residential_user" in source


def test_standalone_access_route_is_public_in_residential_guard():
    from middleware.orb_residential_guard_middleware import PUBLIC_PREFIXES

    assert "/orb/standalone/access" in PUBLIC_PREFIXES


def test_access_service_check_access_does_not_require_premium_for_payload_build():
    from services.orb_access_service import orb_access_service

    source = inspect.getsource(orb_access_service.build_access_payload)
    assert "require_rich_orb_premium_access" not in source
    assert "PREMIUM_WORKFLOWS" not in source
