from pathlib import Path


LIVE_UI_FILES = [
    "frontend-next/app/workspace/page.tsx",
    "frontend-next/app/profile/page.tsx",
    "frontend-next/app/young-people/[id]/page.tsx",
    "frontend-next/app/children/[id]/page.tsx",
    "frontend-next/app/homes/[id]/page.tsx",
    "frontend-next/components/care-operating-stream.tsx",
    "frontend-next/components/indicare/record-question-panel.tsx",
    "frontend-next/app/documents/new/page.tsx",
    "frontend-next/app/documents/templates/page.tsx",
]


def test_live_routes_do_not_reference_known_demo_operational_ids():
    root = Path(__file__).resolve().parents[1]
    forbidden = ("yp-1", "yp-jamie", "yp-noah", "yp-mia", "staff-abi", "demo-1", "demo-2", "mock-answerer")

    for relative_path in LIVE_UI_FILES:
        content = (root / relative_path).read_text()
        for marker in forbidden:
            assert marker not in content, f"{relative_path} still references {marker}"
