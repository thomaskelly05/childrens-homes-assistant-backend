from __future__ import annotations

import re

from tests.full_system_qa_helpers import FRONTEND, os_surface_sources, read

API_HREF = re.compile(r"""<Link[^>]+href\s*=\s*['"]/api/[^'"]+['"]""")


def test_no_browser_link_to_api_json_routes():
    offenders: list[str] = []
    for path in os_surface_sources():
        text = read(path)
        if API_HREF.search(text):
            offenders.append(str(path.relative_to(FRONTEND)))
    assert not offenders, f"Browser links to API routes: {offenders}"


def test_life_echo_landing_avoids_manifest_api():
    text = read(FRONTEND / "app" / "life_echo" / "page.tsx")
    assert "/api/life-echo/manifest" not in text
