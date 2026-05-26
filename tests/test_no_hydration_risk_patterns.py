from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

APP_SHELL = FRONTEND / "components" / "indicare" / "app-shell.tsx"
ACTIVE_CHILD = FRONTEND / "lib" / "context" / "active-child-context.tsx"
ORB_COMPANION = FRONTEND / "components" / "orb-standalone" / "orb-care-companion.tsx"

RENDER_DATE_RE = re.compile(
    r"new\s+Date\s*\(\s*\)|Date\.now\s*\(\s*\)|toLocaleDateString|toLocaleTimeString|Intl\.DateTimeFormat"
)
RENDER_RANDOM_RE = re.compile(r"Math\.random\s*\(|crypto\.randomUUID|nanoid\s*\(|uuid\s*\(")
WINDOW_IN_RENDER_RE = re.compile(
    r"typeof\s+window\s*===\s*['\"]undefined['\"].*window\.(location|localStorage|sessionStorage)"
)


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_app_shell_no_live_date_in_render_path():
    text = _read(APP_SHELL)
    assert "OperationalTopBarDate" in text
    assert "new Intl.DateTimeFormat" not in text
    assert not re.search(r"format\s*\(\s*new\s+Date\s*\(\s*\)\s*\)", text)


def test_app_shell_no_window_location_search_in_render():
    text = _read(APP_SHELL)
    assert "useStableSearchParams" in text
    assert "window.location.search" not in text


def test_active_child_no_window_search_in_ready_state():
    text = _read(ACTIVE_CHILD)
    assert "useStableSearchParams" in text
    assert "window.location.search" not in text


def test_orb_companion_no_read_workspace_in_use_state_initializer():
    text = _read(ORB_COMPANION)
    assert "defaultWorkspace()" in text
    assert "useState<StandaloneWorkspace>(() => readStandaloneWorkspace())" not in text


def test_orb_companion_no_date_now_conversation_id_in_render():
    text = _read(ORB_COMPANION)
    assert "fallbackConversationId" in text
    assert "?? `standalone-${Date.now()" not in text
    assert "activeChat?.conversationId ?? `standalone-${Date.now()" not in text
