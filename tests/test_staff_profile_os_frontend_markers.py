from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

STAFF_PROFILE_FILES = [
    FRONTEND / "app" / "staff" / "[id]" / "page.tsx",
    FRONTEND / "components" / "staff" / "staff-profile-os-dashboard.tsx",
    FRONTEND / "components" / "staff" / "staff-profile-os-header.tsx",
    FRONTEND / "lib" / "os-api" / "staff-profile-os.ts",
]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_staff_profile_page_markers():
    page = _read(FRONTEND / "app" / "staff" / "[id]" / "page.tsx")
    dashboard = _read(FRONTEND / "components" / "staff" / "staff-profile-os-dashboard.tsx")
    header = _read(FRONTEND / "components" / "staff" / "staff-profile-os-header.tsx")
    quick = _read(FRONTEND / "components" / "staff" / "staff-profile-os-actions.tsx")
    assert "StaffProfileOsDashboard" in page
    assert "Adult working-life profile" in header
    for label in (
        "Actions",
        "Training",
        "Supervision",
        "Probation",
        "Handover",
        "Wellbeing/support",
        "Workforce journey",
    ):
        assert label in quick
    assert "StaffProfileOsQuickCards" in dashboard


def test_confidential_hr_note():
    safety = _read(FRONTEND / "components" / "staff" / "staff-profile-os-safety-note.tsx")
    assert "Confidential HR" in safety or "confidential" in safety.lower()


def test_staff_profile_sccif_link():
    actions = _read(FRONTEND / "components" / "staff" / "staff-profile-os-actions.tsx")
    dashboard = _read(FRONTEND / "components" / "staff" / "staff-profile-os-dashboard.tsx")
    assert "staff-profile-sccif-alignment-link" in actions
    assert "staff-profile-inspection-readiness-link" in actions
    assert "/intelligence/inspection-readiness" in actions
    assert "/intelligence/sccif" in actions
    assert "StaffProfileOsSccifLink" in dashboard


def test_ask_os_orb():
    actions = _read(FRONTEND / "components" / "staff" / "staff-profile-os-actions.tsx")
    client = _read(FRONTEND / "lib" / "os-api" / "staff-profile-os.ts")
    assert "staffProfileOrbHref" in actions
    assert "/assistant/orb" in client
    assert "Ask OS ORB" in actions


def test_orb_links_use_assistant_orb():
    combined = "\n".join(_read(p) for p in STAFF_PROFILE_FILES)
    for href in re.findall(r'href=["\']([^"\']+)["\']', combined):
        if "/orb" not in href:
            continue
        assert href.startswith("/assistant/orb"), f"Staff profile UI must use operational ORB: {href}"


def test_standalone_orb_does_not_import_staff_profile_os_client():
    standalone = _read(FRONTEND / "lib" / "orb" / "standalone-client.ts")
    orb_page = _read(FRONTEND / "app" / "orb" / "page.tsx")
    assert "staff-profile-os" not in standalone
    assert "staff-profile-os" not in orb_page
    assert "/api/staff-profile-os" not in standalone
