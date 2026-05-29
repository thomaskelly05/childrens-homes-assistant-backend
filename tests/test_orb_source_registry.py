from __future__ import annotations

from services.orb_source_registry_service import orb_source_registry_service


def test_core_official_sources_exist():
    core = orb_source_registry_service.core_official_sources()
    ids = {s["source_id"] for s in core}
    assert "dfe_childrens_homes_regulations_guide" in ids
    assert "childrens_homes_regulations_2015" in ids
    assert "ofsted_sccif_childrens_homes" in ids
    assert "working_together_safeguarding" in ids
    assert "missing_from_care_guidance" in ids


def test_gov_uk_urls_present():
    for sid in (
        "dfe_childrens_homes_regulations_guide",
        "missing_from_care_guidance",
        "working_together_safeguarding",
        "ofsted_sccif_childrens_homes",
    ):
        src = orb_source_registry_service.get_source(sid)
        assert src
        assert str(src.get("url", "")).startswith("https://www.gov.uk/")


def test_legislation_url_present():
    src = orb_source_registry_service.get_source("childrens_homes_regulations_2015")
    assert src
    assert "legislation.gov.uk" in src.get("url", "")


def test_exact_text_and_basis_fields():
    payload = orb_source_registry_service.to_citation_payload("working_together_safeguarding")
    assert payload
    assert "exact_text_available" in payload
    assert payload.get("basis_type") in ("exact", "summary")


def test_non_statutory_not_marked_legislation():
    for sid in ("academy_nvq_source_pack", "skills_for_care_workforce", "prevent_duty_guidance"):
        src = orb_source_registry_service.get_source(sid)
        assert src
        assert src.get("source_type") != "legislation"
