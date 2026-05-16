from __future__ import annotations

import pytest
from pydantic import ValidationError

from schemas.inspection_contracts import (
    INSPECTION_CONTRACT_SCHEMA_VERSION,
    EvidenceGap,
    EvidenceStrength,
    InspectionArea,
    InspectionReview,
)


def test_inspection_contracts_are_typed_versioned_and_linked():
    review = InspectionReview(
        review_id="review-1",
        area=InspectionArea(area_id="sccif-help", title="Help and protection"),
        evidence_gaps=[
            EvidenceGap(
                gap_id="gap-1",
                title="Missing chronology link",
                chronology_ids=["chr-1", "chr-1", ""],
                evidence_ids=["ev-1"],
                stale_evidence=True,
            )
        ],
        evidence_strengths=[EvidenceStrength(strength_id="strength-1", title="Clear manager review")],
    )

    payload = review.model_dump(mode="json")

    assert payload["schema_version"] == INSPECTION_CONTRACT_SCHEMA_VERSION
    assert payload["evidence_gaps"][0]["chronology_ids"] == ["chr-1"]
    assert payload["evidence_gaps"][0]["stale_evidence"] is True


def test_inspection_contracts_reject_blank_required_fields():
    with pytest.raises(ValidationError):
        EvidenceGap(gap_id=" ", title="Missing evidence")
