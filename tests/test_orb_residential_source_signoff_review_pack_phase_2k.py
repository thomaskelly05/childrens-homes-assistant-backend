"""ORB Residential Phase 2k named source sign-off review pack tests."""

from __future__ import annotations

from pathlib import Path

import pytest

from scripts.generate_orb_source_signoff_review_pack import (
    GUIDE_REQUIRED_PHRASES,
    OVERVIEW_PATH,
    REGULATIONS_REQUIRED_PHRASES,
    SCCIF_REQUIRED_PHRASES,
    SOURCE_REVIEW_PATHS,
    build_source_review_pack,
    verify_review_packs,
)
from scripts.verify_orb_guide_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_GUIDE_CHUNK_JSON_SHA256,
    GUIDE_CHUNKS_PATH,
    calculate_checksum as calculate_guide_checksum,
    load_payload as load_guide_payload,
)
from scripts.verify_orb_named_source_signoffs import (
    SIGNOFF_ARTEFACT_PATH,
    SIGNOFF_TEMPLATE_PATH,
    SOURCE_TYPE_TO_ID,
)
from scripts.verify_orb_regulations_2015_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_REGULATIONS_CHUNK_JSON_SHA256,
    REGULATIONS_CHUNKS_PATH,
    calculate_checksum as calculate_regulations_checksum,
    load_payload as load_regulations_payload,
)
from scripts.verify_orb_sccif_children_homes_chunks import (
    EXPECTED_CHUNK_JSON_SHA256 as EXPECTED_SCCIF_CHUNK_JSON_SHA256,
    SCCIF_CHUNKS_PATH,
    calculate_checksum as calculate_sccif_checksum,
    load_payload as load_sccif_payload,
)
from services.orb_residential_source_grounded_answer_assembly_service import (
    orb_residential_source_grounded_answer_assembly_service,
)

REPO_ROOT = Path(__file__).resolve().parents[1]
AUDIT_PATH = REPO_ROOT / "docs" / "audits" / "orb-residential-source-signoff-review-pack-phase-2k.md"
GENERATOR_PATH = REPO_ROOT / "scripts" / "generate_orb_source_signoff_review_pack.py"
KNOWLEDGE_RETRIEVAL_PATH = REPO_ROOT / "services" / "orb_knowledge_retrieval_service.py"
INTELLIGENCE_PATH = REPO_ROOT / "services" / "orb_residential_intelligence_service.py"
FINALIZATION_PATH = REPO_ROOT / "services" / "orb_residential_finalization_service.py"
CONVERGED_PATH = REPO_ROOT / "services" / "orb_converged_general_assistant_service.py"


def test_phase_2k_audit_documentation_exists():
    assert AUDIT_PATH.is_file()
    content = AUDIT_PATH.read_text(encoding="utf-8")
    assert "Phase 2k" in content
    assert "not completed sign-off" in content.lower()
    assert "NR-1 remains open" in content
    assert "public promise remains blocked" in content


def test_review_pack_files_exist():
    assert OVERVIEW_PATH.is_file()
    for path in SOURCE_REVIEW_PATHS.values():
        assert path.is_file()


def test_review_pack_verification_script_passes():
    assert verify_review_packs() == []


def test_source_ids_match_known_sources():
    for source_type, path in SOURCE_REVIEW_PATHS.items():
        pack = build_source_review_pack(source_type)
        content = path.read_text(encoding="utf-8")
        assert pack["source_id"] == SOURCE_TYPE_TO_ID[source_type]
        assert pack["source_id"] in content


@pytest.mark.parametrize(
    ("source_type", "expected_count", "chunk_path", "loader", "checksum_fn", "expected_checksum"),
    [
        (
            "guide",
            371,
            GUIDE_CHUNKS_PATH,
            load_guide_payload,
            calculate_guide_checksum,
            EXPECTED_GUIDE_CHUNK_JSON_SHA256,
        ),
        (
            "regulations_2015",
            100,
            REGULATIONS_CHUNKS_PATH,
            load_regulations_payload,
            calculate_regulations_checksum,
            EXPECTED_REGULATIONS_CHUNK_JSON_SHA256,
        ),
        (
            "sccif",
            951,
            SCCIF_CHUNKS_PATH,
            load_sccif_payload,
            calculate_sccif_checksum,
            EXPECTED_SCCIF_CHUNK_JSON_SHA256,
        ),
    ],
)
def test_review_pack_checksums_match_verified_artefacts(
    source_type,
    expected_count,
    chunk_path,
    loader,
    checksum_fn,
    expected_checksum,
):
    pack = build_source_review_pack(source_type)  # type: ignore[arg-type]
    payload = loader(chunk_path)
    assert len(payload["chunks"]) == expected_count
    assert checksum_fn(payload) == expected_checksum
    assert pack["chunk_count"] == expected_count
    assert pack["chunk_checksum"] == expected_checksum
    assert expected_checksum in SOURCE_REVIEW_PATHS[source_type].read_text(encoding="utf-8")


def test_live_wiring_described_as_blocked():
    for source_type, path in SOURCE_REVIEW_PATHS.items():
        content = path.read_text(encoding="utf-8").lower()
        assert "blocked" in content
        assert "runtime_answer_wiring_enabled: false" in content


def test_citable_live_answers_described_as_blocked():
    for path in SOURCE_REVIEW_PATHS.values():
        content = path.read_text(encoding="utf-8").lower()
        assert "citable in live answers" in content
        assert "false" in content


def test_template_is_not_treated_as_completed_signoff():
    assert SIGNOFF_TEMPLATE_PATH.is_file()
    assert not SIGNOFF_ARTEFACT_PATH.is_file()
    template = SIGNOFF_TEMPLATE_PATH.read_text(encoding="utf-8")
    assert "template_only" in template
    overview = OVERVIEW_PATH.read_text(encoding="utf-8").lower()
    assert "template treated as sign-off" in overview or "template is scaffold only" in overview


def test_completed_signoff_artefact_remains_absent():
    assert not SIGNOFF_ARTEFACT_PATH.is_file()


def test_all_sources_remain_unsigned():
    assembly = orb_residential_source_grounded_answer_assembly_service
    for source_type in ("guide", "regulations_2015", "sccif"):
        status = assembly.signoff_gate().source_signoff_status(source_type)  # type: ignore[arg-type]
        assert status["signed_off"] is False


def test_guide_review_pack_contains_required_boundaries():
    content = SOURCE_REVIEW_PATHS["guide"].read_text(encoding="utf-8")
    for phrase in GUIDE_REQUIRED_PHRASES:
        assert phrase.lower() in content.lower()


def test_regulations_review_pack_contains_required_boundaries():
    content = SOURCE_REVIEW_PATHS["regulations_2015"].read_text(encoding="utf-8")
    for phrase in REGULATIONS_REQUIRED_PHRASES:
        assert phrase.lower() in content.lower()


def test_sccif_review_pack_contains_required_boundaries():
    content = SOURCE_REVIEW_PATHS["sccif"].read_text(encoding="utf-8")
    for phrase in SCCIF_REQUIRED_PHRASES:
        assert phrase.lower() in content.lower()


def test_review_pack_does_not_claim_compliance_or_ofsted_readiness():
    forbidden = (
        "guarantees compliance",
        "ofsted ready",
        "inspection readiness confirmed",
        "sign-off has been completed",
    )
    for path in [OVERVIEW_PATH, *SOURCE_REVIEW_PATHS.values()]:
        content = path.read_text(encoding="utf-8").lower()
        for phrase in forbidden:
            assert phrase not in content


def test_review_pack_does_not_claim_signoff_happened():
    overview = OVERVIEW_PATH.read_text(encoding="utf-8").lower()
    assert "completed named sign-off" in overview
    assert "not completed sign-off" in overview or "review pack only" in overview


def test_review_pack_does_not_enable_live_answering():
    summary = orb_residential_source_grounded_answer_assembly_service.governance_summary()
    assert summary["live_source_grounded_answers_enabled"] is False
    assert summary["source_grounded_assembly_allowed"] is False
    overview = OVERVIEW_PATH.read_text(encoding="utf-8").lower()
    assert "does not enable live source-grounded" in overview


def test_guide_chunks_unchanged():
    payload = load_guide_payload(GUIDE_CHUNKS_PATH)
    assert len(payload["chunks"]) == 371
    assert calculate_guide_checksum(payload) == EXPECTED_GUIDE_CHUNK_JSON_SHA256


def test_regulations_chunks_unchanged():
    payload = load_regulations_payload(REGULATIONS_CHUNKS_PATH)
    assert len(payload["chunks"]) == 100
    assert calculate_regulations_checksum(payload) == EXPECTED_REGULATIONS_CHUNK_JSON_SHA256


def test_sccif_chunks_unchanged():
    payload = load_sccif_payload(SCCIF_CHUNKS_PATH)
    assert len(payload["chunks"]) == 951
    assert calculate_sccif_checksum(payload) == EXPECTED_SCCIF_CHUNK_JSON_SHA256


def test_no_runtime_answer_route_changed():
    for path in (KNOWLEDGE_RETRIEVAL_PATH, INTELLIGENCE_PATH, FINALIZATION_PATH, CONVERGED_PATH):
        source = path.read_text(encoding="utf-8")
        assert "generate_orb_source_signoff_review_pack" not in source
        assert "review-packs" not in source


def test_no_frontend_or_os_assistant_files_changed():
    forbidden = (
        "from fastapi",
        "APIRouter",
        "include_router",
        "frontend/",
        "frontend-next",
        "assistant_routes",
        "assistant_os_knowledge_routes",
    )
    source = GENERATOR_PATH.read_text(encoding="utf-8")
    for marker in forbidden:
        assert marker not in source


def test_governance_summary_remains_blocked():
    summary = orb_residential_source_grounded_answer_assembly_service.governance_summary()
    assert summary["nr_1_remains_open"] is True
    assert summary["public_promise_remains_blocked"] is True
    assert summary["completed_signoff_artefact_present"] is False
