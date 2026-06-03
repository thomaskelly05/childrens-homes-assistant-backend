from __future__ import annotations

import pytest

from services.indicare_registered_home_domain_brain_service import indicare_registered_home_domain_brain_service


def test_domain_map_has_55_domains():
    assert indicare_registered_home_domain_brain_service.domain_count() == 55


def test_all_domain_ids_unique():
    domains = indicare_registered_home_domain_brain_service.list_domains()
    ids = [d["domain_id"] for d in domains]
    assert len(ids) == len(set(ids))


def test_missing_domain_match():
    ctx = indicare_registered_home_domain_brain_service.context_payload(
        "Young person missing from care overnight"
    )
    matched = ctx.get("matched_domain_ids") or []
    assert "missing_from_home" in matched


def test_allegation_domain_match():
    ctx = indicare_registered_home_domain_brain_service.context_payload(
        "Child said staff hurt them — LADO?"
    )
    matched = ctx.get("matched_domain_ids") or []
    assert "allegations_lado" in matched


@pytest.mark.parametrize("domain_id", [d["domain_id"] for d in indicare_registered_home_domain_brain_service.list_domains()])
def test_each_domain_has_minimum_fields(domain_id: str):
    domain = indicare_registered_home_domain_brain_service.get_domain(domain_id)
    assert domain is not None
    for key in (
        "domain_id",
        "name",
        "description",
        "triggers",
        "quality_standards",
        "minimum_answer_requirements",
    ):
        assert domain.get(key), f"{domain_id} missing {key}"
