from __future__ import annotations

from services.orb_citation_decision_service import orb_citation_decision_service


def _ids(decisions: list[dict]) -> set[str]:
    return {d["source_id"] for d in decisions}


def test_missing_from_care_sources():
    decisions = orb_citation_decision_service.select_sources(family_id="missing_from_care")
    ids = _ids(decisions)
    assert "missing_from_care_guidance" in ids
    assert "working_together_safeguarding" in ids
    assert "childrens_homes_regulations_2015" in ids
    assert "ofsted_sccif_childrens_homes" in ids


def test_restraint_sources():
    decisions = orb_citation_decision_service.select_sources(family_id="physical_intervention")
    ids = _ids(decisions)
    assert "dfe_childrens_homes_regulations_guide" in ids
    assert "childrens_homes_regulations_2015" in ids
    assert "provider_restraint_policy" in ids
    assert "ofsted_sccif_childrens_homes" in ids


def test_reg44_output_mode():
    decisions = orb_citation_decision_service.select_sources(
        family_id="reg44_action_not_closed",
        role="reg44_visitor",
        output_mode="reg44_questions",
    )
    ids = _ids(decisions)
    assert "childrens_homes_regulations_2015" in ids
    assert "ofsted_sccif_childrens_homes" in ids


def test_nvq_sources():
    decisions = orb_citation_decision_service.select_sources(
        family_id="nvq_reflective_restraint",
        role="nvq_learner",
        output_mode="nvq_evidence_mapping",
    )
    ids = _ids(decisions)
    assert "academy_nvq_source_pack" in ids
