from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_home_documents_section_renders():
    section = read_frontend(
        "components/orb-standalone/knowledge-library/orb-knowledge-home-documents-section.tsx"
    )
    assert "data-orb-knowledge-home-documents" in section
    assert "data-orb-home-document-upload" in section
    assert "data-orb-home-document-paste" in section
    assert "approval_status" in section


def test_home_documents_local_store():
    store = read_frontend("lib/orb/knowledge/orb-home-documents-store.ts")
    assert "orb-home-documents-library-v1" in store
    assert "saveOrbHomeDocument" in store
