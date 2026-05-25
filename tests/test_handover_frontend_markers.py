from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

HANDOVER_FILES = [
    FRONTEND / "app" / "handover" / "page.tsx",
    FRONTEND / "components" / "handover" / "handover-workspace.tsx",
    FRONTEND / "components" / "handover" / "handover-intelligence-panel.tsx",
    FRONTEND / "components" / "handover" / "handover-draft-editor.tsx",
    FRONTEND / "components" / "handover" / "handover-completion-panel.tsx",
    FRONTEND / "components" / "handover" / "handover-orb-support.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-handover.tsx",
    FRONTEND / "lib" / "os-api" / "handover-intelligence.ts",
    FRONTEND / "lib" / "handover" / "handover-sections.ts",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_handover_sccif_alignment_link():
    workspace = _read(FRONTEND / "components" / "handover" / "handover-workspace.tsx")
    assert "handover-sccif-alignment-link" in workspace
    assert "/intelligence/sccif" in workspace


def test_handover_page_markers():
    combined = "\n".join(_read(p) for p in HANDOVER_FILES)
    for marker in (
        "Shift handover",
        "Safeguarding and ISN",
        "Recording alerts",
        "Reviews awaiting action",
        "Next shift priorities",
        "Save draft",
        "Complete handover",
        "Send to review",
        "Open review queue",
        "Formal record created",
        "Timeline linked",
        "Ask OS ORB",
        "metadata and safe summaries",
        "Staff and shift context",
    ):
        assert marker in combined, f"Missing marker: {marker}"


def test_handover_operational_orb_only():
    combined = "\n".join(_read(p) for p in HANDOVER_FILES)
    for href in re.findall(r'href=["\']([^"\']+)["\']', combined):
        if "/orb" not in href:
            continue
        assert href.startswith("/assistant/orb"), f"Handover must use operational ORB: {href}"


def test_handover_client_not_in_standalone():
    standalone = _read(FRONTEND / "lib" / "orb" / "standalone-client.ts")
    assert "handover-intelligence" not in standalone
    assert "/api/handover" not in standalone
