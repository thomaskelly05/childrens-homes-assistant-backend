from __future__ import annotations

from pathlib import Path

import pytest
from fastapi import HTTPException

from auth.permissions import require_standalone_orb_access

REPO_ROOT = Path(__file__).resolve().parents[1]
STANDALONE_ROUTERS = [
    REPO_ROOT / "routers" / "orb_standalone_routes.py",
    REPO_ROOT / "routers" / "orb_agent_routes.py",
    REPO_ROOT / "routers" / "orb_document_routes.py",
    REPO_ROOT / "routers" / "orb_knowledge_routes.py",
    REPO_ROOT / "routers" / "orb_saved_output_routes.py",
]


def test_viewer_without_assistant_access_can_use_standalone_orb():
    viewer = {"id": 9, "role": "viewer", "home_id": 1}
    assert require_standalone_orb_access(viewer) == viewer


def test_support_worker_without_assistant_still_allowed_with_orb_access():
    worker = {"id": 2, "role": "support_worker", "home_id": 1}
    assert require_standalone_orb_access(worker) == worker


def test_user_without_any_read_permission_is_denied():
    outsider = {"id": 99, "role": "unknown_role", "home_id": 1, "permissions": []}
    with pytest.raises(HTTPException) as exc:
        require_standalone_orb_access(outsider)
    assert exc.value.status_code == 403


def test_standalone_routers_do_not_require_assistant_access():
    for path in STANDALONE_ROUTERS:
        text = path.read_text(encoding="utf-8")
        assert "require_standalone_orb_access" in text, f"{path.name} must use standalone ORB access"
        assert "require_assistant_access" not in text, f"{path.name} must not require assistant access"
