from __future__ import annotations

from services.orb_knowledge_library_service import orb_knowledge_library_service


def test_list_curated_official_guidance():
    entries = orb_knowledge_library_service.list_curated_official_guidance()
    assert len(entries) >= 6
    first = entries[0]
    assert first.get("url", "").startswith("https://")
    assert first.get("metadata_only") is True
    assert first.get("official_source") is True


def test_has_approved_home_policy_defaults_false():
    assert orb_knowledge_library_service.has_approved_home_or_provider_policy() is False
