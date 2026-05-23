from __future__ import annotations

from schemas.orb_evaluation import OrbEvaluationRequest
from services.orb_answer_quality_service import orb_answer_quality_service


def test_british_english_flag():
    result = orb_answer_quality_service.evaluate(
        OrbEvaluationRequest(answer_text="The child showed bad behavior during the incident.")
    )
    british = next(d for d in result.dimensions if d.dimension == "british_english")
    assert british.score <= 0.7


def test_standalone_boundary_passes_clean_answer():
    result = orb_answer_quality_service.evaluate(
        OrbEvaluationRequest(
            answer_text="Here is reflective guidance. Sources / basis: general knowledge.",
            sources=[{"label": "Practice guidance"}],
        )
    )
    boundary = next(d for d in result.dimensions if d.dimension == "standalone_boundary")
    assert boundary.score == 1.0
