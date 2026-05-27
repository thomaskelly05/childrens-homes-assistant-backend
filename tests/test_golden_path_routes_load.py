from __future__ import annotations

from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
APP = REPO / "frontend-next" / "app"

GOLDEN_ROUTES = [
    ("select-scope", None),
    ("homes/[id]/workspace", "home-workspace-page"),
    ("young-people/[id]/workspace", None),
    ("record", None),
    ("record/reviews", None),
    ("young-people/[id]/archive", "child-archive-page"),
    ("young-people/[id]/chronology", "child-chronology-story-section"),
    ("young-people/[id]/lifeecho", "child-lifeecho-page"),
    ("young-people/[id]/plan-impacts", "child-plan-impacts-page"),
    ("handover", None),
    ("record/alerts", "record-alerts-route"),
    ("intelligence/inspection-readiness", "inspection-readiness-page"),
    ("intelligence/sccif", "sccif-alignment-page"),
    ("intelligence/reg45", "reg45-quality-review-page"),
    ("orb", None),
    ("assistant/orb", None),
]

COMPONENT_TESTIDS = {
    "young-people/[id]/workspace": ("child-workspace-overview.tsx", "child-workspace-overview-page"),
    "record": ("record-hub.tsx", "record-hub-quick-links"),
    "record/reviews": ("recording-review-queue.tsx", "recording-review-queue"),
    "select-scope": ("select-scope/page.tsx", "select-scope-page"),
    "handover": ("handover-workspace.tsx", "handover-workspace"),
    "orb": ("orb-standalone-composer.tsx", "orb-standalone-composer"),
    "assistant/orb": ("operational-orb-page.tsx", "orb-operational-mobile-layout"),
}


def _page_path(route: str) -> Path:
    return APP / route / "page.tsx"


def test_golden_path_pages_exist():
    missing = [route for route, _ in GOLDEN_ROUTES if not _page_path(route).is_file()]
    assert not missing, f"Missing pages: {missing}"


def test_golden_path_testids_present():
    components = REPO / "frontend-next" / "components"
    for route, testid in GOLDEN_ROUTES:
        page = _page_path(route)
        assert page.is_file(), route
        text = page.read_text(encoding="utf-8")
        if testid and testid in text:
            continue
        if route in COMPONENT_TESTIDS:
            comp_name, comp_testid = COMPONENT_TESTIDS[route]
            if comp_name.endswith("/page.tsx"):
                comp_path = APP / comp_name.replace("/page.tsx", "") / "page.tsx"
                matches = [comp_path] if comp_path.is_file() else []
            else:
                matches = list(components.rglob(comp_name))
                if not matches:
                    matches = list((REPO / "frontend-next").rglob(comp_name))
            assert matches, f"No component {comp_name} for {route}"
            comp_text = matches[0].read_text(encoding="utf-8")
            assert comp_testid in comp_text, f"{route} missing {comp_testid} in {comp_name}"
            continue
        if testid:
            assert testid in text, f"{route} missing {testid}"
        else:
            assert "export default" in text
