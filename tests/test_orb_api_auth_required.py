from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from auth.orb_dictate_dependency import require_orb_dictate_access
from auth.orb_residential_dependencies import orb_residential_premium_dependency
from auth.orb_standalone_premium_dependency import require_rich_orb_premium_access
from routers.orb_projects_routes import require_orb_projects_access
from routers.orb_voice_residential_routes import require_orb_voice_premium


def test_standalone_premium_rejects_unauthenticated():
    conn = MagicMock()
    with pytest.raises(HTTPException) as exc:
        require_rich_orb_premium_access(conn=conn, current_user={})
    assert exc.value.status_code == 401


def test_dictate_premium_rejects_unauthenticated():
    conn = MagicMock()
    request = MagicMock()
    dependency = require_orb_dictate_access
    with pytest.raises(HTTPException) as exc:
        dependency(request=request, conn=conn, current_user={})
    assert exc.value.status_code == 403


def test_voice_premium_rejects_unauthenticated():
    conn = MagicMock()
    request = MagicMock()
    with pytest.raises(HTTPException) as exc:
        require_orb_voice_premium(request=request, conn=conn, current_user={})
    assert exc.value.status_code == 403


def test_projects_premium_rejects_unauthenticated():
    conn = MagicMock()
    request = MagicMock()
    with pytest.raises(HTTPException) as exc:
        require_orb_projects_access(request=request, conn=conn, current_user={})
    assert exc.value.status_code == 403


def test_saved_outputs_route_module_uses_premium_alias():
    import routers.orb_saved_output_routes as routes

    assert routes.require_standalone_orb_access is require_rich_orb_premium_access


def test_document_routes_use_premium_alias():
    import routers.orb_document_routes as routes

    assert routes.require_standalone_orb_access is require_rich_orb_premium_access


def test_standalone_conversation_route_module_uses_premium_alias():
    import routers.orb_standalone_routes as routes

    assert routes.require_standalone_orb_access is require_rich_orb_premium_access


def test_premium_workflows_include_voice_and_dictate():
    from services.orb_access_service import PREMIUM_WORKFLOWS

    assert "voice_workflows" in PREMIUM_WORKFLOWS
    assert "record_this_properly" in PREMIUM_WORKFLOWS
    assert "document_support" in PREMIUM_WORKFLOWS
