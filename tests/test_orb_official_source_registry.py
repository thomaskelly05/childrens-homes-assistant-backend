from __future__ import annotations

from services.orb_official_source_registry_service import orb_official_source_registry_service


def test_list_known_sources():
    sources = orb_official_source_registry_service.list_known_sources()
    keys = {s["family_key"] for s in sources}
    assert "sccif_childrens_homes" in keys
    assert "quality_standards_guide" in keys


def test_detects_sccif():
    family = orb_official_source_registry_service.detect_source_family(
        "Ofsted SCCIF children's homes",
        "Social Care Common Inspection Framework",
    )
    assert family == "sccif_childrens_homes"


def test_detects_quality_standards():
    family = orb_official_source_registry_service.detect_source_family(
        "Children's Homes Quality Standards guide",
        "quality standard 1 positive relationships",
    )
    assert family == "quality_standards_guide"


def test_detects_childrens_homes_regulations():
    family = orb_official_source_registry_service.detect_source_family(
        "Children's Homes Regulations 2015",
        "regulation 44 review",
    )
    assert family == "childrens_homes_regulations"


def test_detects_provider_policy():
    family = orb_official_source_registry_service.detect_source_family(
        "Provider safeguarding policy",
        "reporting concerns procedure",
    )
    assert family == "provider_policy"


def test_default_metadata_official():
    meta = orb_official_source_registry_service.default_metadata_for_family("sccif_childrens_homes")
    assert meta["official_source"] is True
    assert meta["confidence_level"] == "official"
    assert meta["publisher"] == "Ofsted"


def test_summary_only_warning():
    warn = orb_official_source_registry_service.source_warning_for_integrity(
        {"source_integrity": "summary_only"}
    )
    assert warn and "summary" in warn.lower()
