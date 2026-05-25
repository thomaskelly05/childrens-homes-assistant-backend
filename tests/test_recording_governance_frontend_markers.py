from __future__ import annotations

import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
FRONTEND = REPO_ROOT / "frontend-next"

GOVERNANCE_FILES = [
    FRONTEND / "app" / "record" / "governance" / "page.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-governance-dashboard.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-governance-card.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-governance-backlog.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-governance-quality.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-governance-form-usage.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-governance-alerts.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-governance-actions.tsx",
    FRONTEND / "components" / "indicare" / "record" / "recording-manager-digest.tsx",
    FRONTEND / "lib" / "os-api" / "recording-governance.ts",
]

INTEGRATION_FILES = [
    FRONTEND / "components" / "indicare" / "record" / "record-hub.tsx",
    FRONTEND / "components" / "command-centre" / "care-hub-recording-section.tsx",
    FRONTEND / "lib" / "child-journey" / "child-journey-routes.ts",
]

STANDALONE_ORB = FRONTEND / "app" / "orb"


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_recording_governance_page_exists():
    page = FRONTEND / "app" / "record" / "governance" / "page.tsx"
    assert page.is_file()
    text = _read(page)
    assert "Recording governance" in text
    assert "recording-governance-page" in text


def test_recording_governance_sccif_link():
    page = _read(FRONTEND / "app" / "record" / "governance" / "page.tsx")
    assert "recording-governance-sccif-link" in page
    assert "/intelligence/sccif" in page


def test_governance_ui_markers():
    combined = "\n".join(_read(path) for path in GOVERNANCE_FILES)
    assert "Review backlog" in combined
    assert "Quality and privacy flags" in combined
    assert "Structured completion gaps" in combined
    assert "Form usage" in combined
    assert "ORB supports oversight" in combined or "manager judgement remains required" in combined
    assert "does not display full raw record bodies" in combined
    assert "Open review queue" in combined
    assert "Ask OS ORB" in combined or "Ask ORB for recording governance summary" in combined


def test_orb_links_use_operational_orb_only():
    combined = "\n".join(_read(path) for path in GOVERNANCE_FILES)
    assert "operationalOrbGovernanceHref" in combined
    assert "/assistant/orb" in combined
    orb_hrefs = re.findall(r'["\']([^"\']*/(?:assistant/)?orb[^"\']*)["\']', combined)
    for href in orb_hrefs:
        lower = href.lower()
        assert "draft=" not in lower
        assert "body=" not in lower
        assert "child_id=" not in lower


def test_standalone_orb_does_not_import_recording_governance():
    if not STANDALONE_ORB.exists():
        return
    for path in list(STANDALONE_ORB.rglob("*.tsx")) + list(STANDALONE_ORB.rglob("*.ts")):
        text = _read(path)
        assert "recording-governance" not in text, f"Standalone ORB must not import recording governance: {path}"


def test_record_and_care_hub_governance_links():
    combined = "\n".join(_read(path) for path in INTEGRATION_FILES)
    assert "/record/governance" in combined
    assert "Recording governance" in combined
    assert "/record/alerts" in combined
    assert "Recording alerts" in combined


def test_child_journey_scoped_governance_link():
    routes = _read(FRONTEND / "lib" / "child-journey" / "child-journey-routes.ts")
    assert "/record/governance?child_id=" in routes


def test_governance_alert_digest_integration():
    dashboard = _read(FRONTEND / "components" / "indicare" / "record" / "recording-governance-dashboard.tsx")
    assert "recording-governance-alert-digest" in dashboard
    assert "RecordingManagerDigest" in dashboard
