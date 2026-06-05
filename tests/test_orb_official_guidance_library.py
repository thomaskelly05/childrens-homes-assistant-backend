from __future__ import annotations

from pathlib import Path

import json

ROOT = Path(__file__).resolve().parents[1]


def test_curated_json_has_required_entries():
    path = ROOT / "data" / "orb_official_guidance_curated.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    titles = {item["title"] for item in data}
    assert "Children's Homes Regulations 2015" in titles
    assert "Working Together to Safeguard Children" in titles
    assert "Ofsted SCCIF: children's homes" in titles


def test_frontend_official_guidance_module():
    text = (ROOT / "frontend-next" / "lib" / "orb" / "knowledge" / "orb-official-guidance.ts").read_text()
    assert "ORB_OFFICIAL_GUIDANCE_ENTRIES" in text
    assert "metadata_only: true" in text
    assert "legislation.gov.uk" in text or "gov.uk" in text
