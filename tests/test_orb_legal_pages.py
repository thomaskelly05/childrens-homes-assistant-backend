from __future__ import annotations

"""Privacy and Terms pages for ORB Residential."""

from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_privacy_page_exists_and_has_required_sections():
    path = REPO_ROOT / "frontend-next/app/privacy/page.tsx"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "data-orb-privacy-page" in text
    assert "IndiCare" in text
    assert "Account data" in text or "account data" in text.lower()
    assert "billing" in text.lower()
    assert "AI processing" in text or "AI" in text
    assert "cookies" in text.lower() or "local storage" in text.lower()
    assert "legal review" not in text.lower()


def test_terms_page_exists_and_has_required_sections():
    path = REPO_ROOT / "frontend-next/app/terms/page.tsx"
    assert path.is_file()
    text = path.read_text(encoding="utf-8")
    assert "data-orb-terms-page" in text
    assert "safeguarding" in text.lower()
    assert "emergency" in text.lower()
    assert "subscription" in text.lower()
    assert "Stripe" in text
    assert "review" in text.lower()


def test_legal_links_component():
    text = (REPO_ROOT / "frontend-next/components/orb-residential/orb-legal-links.tsx").read_text(
        encoding="utf-8"
    )
    assert 'href="/privacy"' in text
    assert 'href="/terms"' in text
    assert "data-orb-privacy-link" in text
    assert "data-orb-terms-link" in text


def test_login_links_to_legal_pages():
    login = (REPO_ROOT / "frontend-next/components/orb-residential/orb-login-screen.tsx").read_text(
        encoding="utf-8"
    )
    assert "OrbLegalLinks" in login


def test_audit_doc_notes_legal_review_required():
    audit = (REPO_ROOT / "docs/orb-production-access-readiness-audit.md").read_text(encoding="utf-8")
    assert "legal review" in audit.lower() or "Legal review" in audit
