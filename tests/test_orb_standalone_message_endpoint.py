from __future__ import annotations

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ROUTES = REPO_ROOT / "routers" / "orb_standalone_routes.py"
CLIENT = REPO_ROOT / "frontend-next" / "lib" / "orb" / "standalone-client.ts"
PERMISSIONS = REPO_ROOT / "auth" / "permissions.py"


def test_frontend_calls_standalone_conversation_endpoint():
    text = CLIENT.read_text(encoding="utf-8")
    assert "STANDALONE_ORB_API_PATHS.conversation" in text
    assert 'conversation: \'/orb/standalone/conversation\'' in text
    assert "/api/assistant/orb/operational" not in text
    assert "/api/orb/conversation" not in text


def test_backend_standalone_conversation_route_exists():
    text = ROUTES.read_text(encoding="utf-8")
    assert '@router.post("/conversation")' in text
    assert "standalone_orb_conversation" in text
    assert "require_standalone_orb_access" in text
    assert "require_assistant_access" not in text


def test_standalone_response_contract_flags():
    text = ROUTES.read_text(encoding="utf-8")
    assert '"standalone": True' in text
    assert '"os_records_accessed": False' in text
    assert '"os_linked": False' in text
    assert '"care_record_access": False' in text


def test_standalone_orb_access_dependency_exists():
    text = PERMISSIONS.read_text(encoding="utf-8")
    assert "def require_standalone_orb_access" in text
    assert "records:read" in text.split("def require_standalone_orb_access")[1].split("def require_permission")[0]
