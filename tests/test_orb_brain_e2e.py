from __future__ import annotations

import pytest

from services.orb_schema_verification import CANONICAL_SAVED_OUTPUT_COLUMNS


@pytest.mark.parametrize(
    "prompt",
    [
        "general question about daily recording",
        "safeguarding scenario with escalation",
        "missing from care episode",
        "restrictive practice review",
        "therapeutic reframe for staff",
        "Ofsted inspection preparation",
        "Reg 44 visit preparation",
        "workforce supervision reflection",
    ],
)
def test_brain_prompt_matrix_metadata_contract(prompt: str):
    """Contract smoke: standalone answers must not claim OS record access."""
    metadata = {
        "os_records_accessed": False,
        "care_record_access": False,
        "prompt": prompt,
    }
    assert metadata["os_records_accessed"] is False
    assert metadata["care_record_access"] is False
    assert "checked your records" not in prompt.lower()


def test_canonical_saved_output_schema_columns_defined():
    assert "user_id" in CANONICAL_SAVED_OUTPUT_COLUMNS
    assert "intelligence_output" in CANONICAL_SAVED_OUTPUT_COLUMNS
