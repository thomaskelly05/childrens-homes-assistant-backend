from __future__ import annotations

import asyncio

import pytest
from fastapi import HTTPException

from auth.orb_product_bootstrap_dependency import require_orb_product_bootstrap_access
from routers.orb_standalone_routes import standalone_orb_config


def test_unauthenticated_config_dependency_returns_401():
    with pytest.raises(HTTPException) as exc:
        require_orb_product_bootstrap_access(conn=None, current_user={})
    assert exc.value.status_code == 401


def test_active_config_returns_contract(fake_state):
    payload = asyncio.run(standalone_orb_config(current_user=fake_state["user"]))
    assert payload["success"] is True
    assert "data" in payload
