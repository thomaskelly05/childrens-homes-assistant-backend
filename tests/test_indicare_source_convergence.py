from __future__ import annotations

from services.indicare_source_convergence_service import indicare_source_convergence_service
from services.trusted_source_registry_service import trusted_source_registry_service


def test_pack_maps_to_trusted_registry():
    mappings = indicare_source_convergence_service.all_pack_mappings()
    ofsted = next(m for m in mappings if m["pack_key"] == "ofsted_sccif")
    assert "ofsted_sccif_childrens_homes" in ofsted["trusted_source_ids"]


def test_source_basis_layers():
    basis = indicare_source_convergence_service.build_source_basis(
        message="Ofsted inspection tomorrow",
        pack_keys=["ofsted_sccif", "safeguarding_principles"],
    )
    assert basis.get("no_random_scraping") is True
    assert basis.get("auto_apply_gold_silver") is False
    assert basis.get("human_review_required_for_statutory") is True
    tiers = {layer["basis_tier"] for layer in basis.get("layers") or []}
    assert "gold_statutory" in tiers or "built_in_practice" in tiers


def test_gold_sources_no_auto_apply():
    for src in trusted_source_registry_service.list_sources():
        if src.get("trust_tier") == "gold":
            assert src.get("auto_apply_allowed") is False
