from __future__ import annotations

from services.trusted_source_registry_service import trusted_source_registry_service


def test_registry_validates_without_errors():
    errors = trusted_source_registry_service.validate_registry()
    assert errors == []


def test_gold_statutory_sources_not_auto_applied():
    for src in trusted_source_registry_service.list_sources():
        if src.get("trust_tier") in {"gold", "silver"} and src.get("source_type") in {
            "statutory_guidance",
            "legislation",
            "inspection_framework",
        }:
            assert src.get("auto_apply_allowed") is False
            assert trusted_source_registry_service.allowed_for_auto_apply(src["source_id"]) is False


def test_protected_types_block_auto_apply_even_if_flag_set():
    for src in trusted_source_registry_service.list_sources():
        if src.get("source_type") in {"statutory_guidance", "legislation", "local_safeguarding"}:
            assert trusted_source_registry_service.allowed_for_auto_apply(src["source_id"]) is False


def test_local_policy_requires_human_approval():
    local_sources = [
        s
        for s in trusted_source_registry_service.list_sources()
        if s.get("trust_tier") == "local" or s.get("source_type") == "local_safeguarding"
    ]
    assert local_sources, "expected local policy entries in registry"
    for src in local_sources:
        assert src.get("human_approval_required") is True
