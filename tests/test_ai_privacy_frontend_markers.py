from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]


def _read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def test_privacy_page_exists():
    page = REPO / "frontend-next" / "app" / "intelligence" / "governance" / "privacy" / "page.tsx"
    assert page.is_file()
    text = _read(page)
    assert "PrivacyGovernanceDashboard" in text
    assert "fetchAiPrivacyDashboard" in text


def test_privacy_dashboard_markers():
    dash = REPO / "frontend-next" / "components" / "intelligence-governance" / "privacy-governance-dashboard.tsx"
    text = _read(dash)
    assert 'data-testid="privacy-governance-dashboard"' in text
    assert "privacy-redaction-applied" in text
    assert "does not display raw care records" in text


def test_redaction_preview_labels():
    preview = REPO / "frontend-next" / "components" / "intelligence-governance" / "privacy-redaction-preview.tsx"
    text = _read(preview)
    assert "privacy-redaction-preview-label" in text
    assert "Automated redaction may not catch every identifier" in text


def test_ai_governance_privacy_metrics_section():
    gov = REPO / "frontend-next" / "components" / "intelligence-governance" / "ai-governance-dashboard.tsx"
    text = _read(gov)
    assert "ai-governance-privacy-metrics" in text
    assert "/intelligence/governance/privacy" in text
