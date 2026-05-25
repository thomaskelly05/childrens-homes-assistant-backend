from __future__ import annotations

from services.inspection_pack_registry_service import inspection_pack_registry_service


def test_reg44_template_exists():
    template = inspection_pack_registry_service.get_pack_template("reg44")
    assert template["pack_type"] == "reg44"
    sections = inspection_pack_registry_service.reg44_sections()
    assert len(sections) >= 8
    assert any("Independent visitor" in s["title"] for s in sections)


def test_reg45_template_exists():
    sections = inspection_pack_registry_service.reg45_sections()
    assert len(sections) >= 8
    assert any("Quality of care review" in s["title"] for s in sections)


def test_safe_disclaimer_exists():
    disclaimer = inspection_pack_registry_service.safe_pack_disclaimer()
    assert "not a compliance decision" in disclaimer.lower()
    assert "does not predict" in disclaimer.lower() or "does not generate" in disclaimer.lower()


def test_official_sources_exist():
    refs = inspection_pack_registry_service.official_source_refs()
    assert len(refs) >= 2
    assert any("SCCIF" in r.title for r in refs)


def test_default_pack_title():
    title = inspection_pack_registry_service.default_pack_title("reg44", "2026-01-01", "2026-01-31")
    assert "Reg 44" in title
    assert "2026-01-01" in title
