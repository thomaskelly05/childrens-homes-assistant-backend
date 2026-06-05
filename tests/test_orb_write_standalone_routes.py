from __future__ import annotations

from pathlib import Path


def test_orb_write_frontend_route_exists():
    write_page = Path("frontend-next/app/orb/write/page.tsx")
    residential_page = Path("frontend-next/app/orb-residential/write/page.tsx")
    assert write_page.is_file()
    assert residential_page.is_file()
    content = residential_page.read_text(encoding="utf-8")
    assert "station=write" in content


def test_orb_write_panel_type_registered():
    panel_types = Path("frontend-next/components/orb-standalone/orb-standalone-panel-types.ts").read_text(
        encoding="utf-8"
    )
    assert "'orb_write'" in panel_types
    core_panels = Path("frontend-next/components/orb-standalone/orb-core-workspace-panels.ts").read_text(
        encoding="utf-8"
    )
    assert "'orb_write'" in core_panels
