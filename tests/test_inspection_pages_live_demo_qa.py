from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
FRONTEND = REPO / "frontend-next"

PAGES = {
    "inspection-readiness": FRONTEND / "app" / "intelligence" / "inspection-readiness" / "page.tsx",
    "sccif": FRONTEND / "app" / "intelligence" / "sccif" / "page.tsx",
    "reg45": FRONTEND / "app" / "intelligence" / "reg45" / "page.tsx",
}

SAFE_PHRASES = [
    "does not guarantee",
    "Manager judgement",
]

FORBIDDEN_POSITIVE_CLAIMS = [
    "we guarantee compliance",
    "guaranteed to pass",
    "predicted grade",
    "will achieve outstanding",
]


def test_inspection_pages_use_safe_copy():
    for name, path in PAGES.items():
        text = path.read_text(encoding="utf-8")
        assert any(k in text.lower() for k in ("inspection", "sccif", "reg45", "quality")), name
        combined = text + (FRONTEND / "components" / "inspection-readiness" / "inspection-readiness-workspace.tsx").read_text(encoding="utf-8")
        if name == "inspection-readiness":
            assert "Evidence snapshot" in combined or "evidence snapshot" in combined.lower()
        for bad in FORBIDDEN_POSITIVE_CLAIMS:
            assert bad.lower() not in text.lower(), f"{name} must not claim: {bad}"
        if name == "inspection-readiness":
            assert "does not guarantee" in combined.lower() or "not guarantee" in combined.lower()


def test_sccif_has_home_workspace_back_link():
    text = PAGES["sccif"].read_text(encoding="utf-8")
    assert "sccif-back-home-workspace" in text


def test_reg45_preserves_home_id_on_cross_links():
    workspace = (FRONTEND / "components" / "reg45" / "reg45-review-workspace.tsx").read_text(encoding="utf-8")
    assert "home_id" in workspace
    assert "reg45-link-sccif" in workspace
