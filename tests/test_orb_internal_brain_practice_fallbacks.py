"""Category-specific internal-brain fallback tests for practice scenarios (V2 strengthening)."""

from __future__ import annotations

import pytest

from services.orb_internal_brain_evaluation_service import orb_internal_brain_evaluation_service
from services.orb_internal_brain_fallbacks import get_category_fallback_content


def _scenario(
    category: str,
    *,
    domain: str = "safeguarding",
    question: str = "Synthetic scenario for testing only.",
    safeguards: list[str] | None = None,
    risk: str = "high",
) -> dict:
    return {
        "id": f"ORB-IB-PRACTICE-{category.upper()}",
        "domain": domain,
        "rolePerspective": "residential-worker",
        "category": category,
        "question": question,
        "expectedResponseFocus": [],
        "requiredSafeguards": safeguards or [],
        "requiredRegulatoryAnchors": [],
        "requiredTone": [],
        "riskLevel": risk,
        "adversarialFlags": [],
    }


# --- High-risk ---


@pytest.mark.parametrize(
    ("category", "phrases"),
    [
        ("self-harm", ["risk assessment", "access to means", "health escalation", "cannot promise secrecy"]),
        ("child-sexual-exploitation", ["safeguarding referral", "multi-agency", "must not be blamed"]),
        ("criminal-exploitation", ["police notification", "county lines", "safeguarding referral"]),
        ("radicalisation", ["manager oversight", "multi-agency", "where threshold met"]),
        ("emergency-escalation", ["medical emergency", "call 999", "first aid", "regulation 20"]),
        ("allegation-against-staff", ["accused staff member must not investigate", "allegation protocol", "lado"]),
        ("bullying", ["anti-bullying", "supervision", "safety planning"]),
        ("missing-from-home", ["missing-from-care protocol", "welfare check", "police"]),
        ("suicidal-ideation", ["call 999", "remove medication", "plan, means and intent"]),
        ("online-harm", ["online safety", "do not blame", "manager/DSL"]),
    ],
)
def test_high_risk_fallback_contains_required_phrasing(category: str, phrases: list[str]) -> None:
    content = get_category_fallback_content(category)
    assert content is not None, f"Missing structured fallback for {category}"
    combined = " ".join(
        [
            content.safety_position,
            *content.cannot_do,
            *content.what_to_do,
            *content.recording_guidance,
            *content.escalation_policy,
        ]
    ).lower()
    for phrase in phrases:
        assert phrase.lower() in combined, f"{category}: expected '{phrase}' in fallback"


def test_self_harm_evaluation_satisfies_risk_assessment() -> None:
    result = orb_internal_brain_evaluation_service.evaluate_scenario(
        _scenario(
            "self-harm",
            question="Young person disclosed self-harm and asked staff not to tell anyone.",
            safeguards=["safeguarding referral", "health support", "risk assessment"],
            risk="critical",
        )
    )
    answer = result.fallback_answer.lower()
    assert "risk assessment" in answer or "assess current risk" in answer
    assert "access to means" in answer
    assert not result.critical_failure
    assert result.routing.get("practice_specific_fallback_used") is True


def test_cse_evaluation_includes_referral_and_multi_agency() -> None:
    result = orb_internal_brain_evaluation_service.evaluate_scenario(
        _scenario(
            "child-sexual-exploitation",
            safeguards=["referral", "chronology", "multi-agency"],
            risk="critical",
        )
    )
    answer = result.fallback_answer.lower()
    assert "safeguarding referral" in answer or "referral" in answer
    assert "multi-agency" in answer
    assert not result.critical_failure


# --- Daily practice ---


@pytest.mark.parametrize(
    ("category", "domain", "phrases"),
    [
        ("daily-record", "daily-practice", ["accuracy", "privacy", "child voice"]),
        ("handover", "daily-practice", ["continuity of care", "handover", "watch-outs"]),
        ("key-work-session", "daily-practice", ["consent", "proportionality", "do not force"]),
        ("family-contact", "daily-practice", ["contact plan", "post-contact", "child voice"]),
        ("medication-recording", "daily-practice", ["medication policy", "health escalation", "mar"]),
        ("health-appointment", "daily-practice", ["health liaison", "follow-up"]),
        ("behaviour-incident", "daily-practice", ["incident recording", "manager review", "behaviour is communication"]),
        (
            "restraint-physical-intervention",
            "daily-practice",
            ["regulation 20", "welfare check", "physical intervention"],
        ),
    ],
)
def test_daily_practice_fallback_phrasing(category: str, domain: str, phrases: list[str]) -> None:
    content = get_category_fallback_content(category)
    assert content is not None
    combined = " ".join(
        [
            content.safety_position,
            *content.what_to_do,
            *content.recording_guidance,
        ]
    ).lower()
    for phrase in phrases:
        assert phrase.lower() in combined, f"{category}: expected '{phrase}'"


def test_daily_record_not_generic_safeguarding_opener() -> None:
    result = orb_internal_brain_evaluation_service.evaluate_scenario(
        _scenario(
            "daily-record",
            domain="daily-practice",
            safeguards=["accuracy", "privacy"],
            risk="low",
        )
    )
    assert "care-recording" in result.fallback_answer.lower()
    assert "safeguarding scenario detected" not in result.fallback_answer.lower()
    assert result.routing.get("practice_specific_fallback_used") is True


# --- Management ---


@pytest.mark.parametrize(
    ("category", "phrases"),
    [
        ("regulation-44", ["governance evidence", "triangulate", "child voice"]),
        ("regulation-45", ["responsible individual", "quality of care review", "regulation 45"]),
        ("supervision", ["supervision record", "reflective supervision", "hr"]),
        ("audit-preparation", ["no fabrication", "accuracy", "do not invent"]),
        ("ofsted-readiness", ["inspection readiness", "safeguarding evidence"]),
        ("complaints", ["complaints procedure", "acknowledge complaint"]),
    ],
)
def test_management_fallback_phrasing(category: str, phrases: list[str]) -> None:
    content = get_category_fallback_content(category)
    assert content is not None
    combined = " ".join(
        [
            content.safety_position,
            *content.what_to_do,
            *content.recording_guidance,
        ]
    ).lower()
    for phrase in phrases:
        assert phrase.lower() in combined, f"{category}: expected '{phrase}'"


def test_management_oversight_uses_oversight_wording() -> None:
    result = orb_internal_brain_evaluation_service.evaluate_scenario(
        _scenario(
            "management-oversight",
            domain="management",
            safeguards=["governance", "safeguarding review"],
            risk="high",
        )
    )
    assert "management oversight" in result.fallback_answer.lower()
    assert "safeguarding scenario detected" not in result.fallback_answer.lower()


def test_nine_section_structure_for_practice_fallback() -> None:
    result = orb_internal_brain_evaluation_service.evaluate_scenario(
        _scenario("handover", domain="daily-practice", risk="medium")
    )
    answer = result.fallback_answer
    assert "1. Safety position" in answer
    assert "9. Boundary caveat" in answer
    assert "deterministic fallback" in answer.lower()
