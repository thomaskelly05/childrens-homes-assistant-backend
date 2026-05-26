from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
CLIENT = REPO / "frontend-next" / "lib" / "orb" / "standalone-client.ts"
COMPANION = REPO / "frontend-next" / "components" / "orb-standalone" / "orb-care-companion.tsx"
ORB_PAGE = REPO / "frontend-next" / "app" / "orb" / "page.tsx"

ALLOWED_STANDALONE_API_MARKERS = [
    "/orb/standalone/conversation",
    "/orb/standalone/config",
    "/orb/standalone/outputs/summary",
    "/auth/me",
]

FORBIDDEN_NETWORK_MARKERS = [
    "/api/os/scope/current",
    "/api/os/menu-summary",
    "/os/young-people",
    "/api/workforce-os/",
    "/api/governance-os/",
    "/api/notifications/operational-feed",
    "/api/assistant/orb",
    "/assistant/orb/outputs",
]


def test_standalone_client_only_declares_standalone_orb_paths():
    text = CLIENT.read_text(encoding="utf-8")
    assert "/orb/standalone/conversation" in text
    for marker in FORBIDDEN_NETWORK_MARKERS:
        assert marker not in text


def test_orb_page_and_companion_avoid_os_fetch_clients():
    sources = ORB_PAGE.read_text(encoding="utf-8") + COMPANION.read_text(encoding="utf-8")
    for marker in FORBIDDEN_NETWORK_MARKERS:
        assert marker not in sources, f"standalone /orb must not reference {marker}"
    for marker in ALLOWED_STANDALONE_API_MARKERS:
        if marker.startswith("/orb/"):
            assert marker in CLIENT.read_text(encoding="utf-8")
