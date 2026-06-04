from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend-next"


def read_frontend(rel: str) -> str:
    return (FRONTEND / rel).read_text(encoding="utf-8")


def test_documents_workspace_sections():
    panel = read_frontend("components/orb-standalone/orb-document-panel.tsx")
    assert "data-orb-document-panel" in panel
    assert "data-orb-document-upload-section" in panel
    assert "data-orb-document-lens-section" in panel
    assert "data-orb-document-output-section" in panel


def test_documents_upload_and_paste():
    panel = read_frontend("components/orb-standalone/orb-document-panel.tsx")
    assert "data-orb-document-input-tab" in panel
    assert "data-orb-doc-paste" in panel
    assert "orb-doc-upload-zone" in panel


def test_documents_lens_chips():
    panel = read_frontend("components/orb-standalone/orb-document-panel.tsx")
    lenses = read_frontend("lib/orb/document-intelligence.ts")
    assert "data-orb-document-lens-selector" in panel
    assert "safeguarding" in lenses
    assert "reg44" in lenses
    assert "recording_quality" in lenses


def test_documents_boundary_copy():
    panel = read_frontend("components/orb-standalone/orb-document-panel.tsx")
    assert "data-orb-document-boundary" in panel
    assert "ORB_DOCUMENT_BOUNDARY_LINES" in panel
