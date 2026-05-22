from __future__ import annotations

from schemas.ai_models import AiCostTier, AiQualityTier, AiRiskLevel, AiTaskType
from services.ai_cost_policy_service import ai_cost_policy_service


def test_voice_concise_fast_low():
    quality = ai_cost_policy_service.classify_quality_tier(
        AiTaskType.VOICE_CONCISE,
        AiRiskLevel.LOW,
        voice_mode=True,
    )
    cost = ai_cost_policy_service.classify_cost_tier(AiTaskType.VOICE_CONCISE, AiRiskLevel.LOW)
    assert quality == AiQualityTier.FAST
    assert cost == AiCostTier.LOW


def test_safeguarding_high_premium():
    quality = ai_cost_policy_service.classify_quality_tier(
        AiTaskType.SAFEGUARDING_REFLECTION,
        AiRiskLevel.SAFEGUARDING_SENSITIVE,
    )
    cost = ai_cost_policy_service.classify_cost_tier(
        AiTaskType.SAFEGUARDING_REFLECTION,
        AiRiskLevel.SAFEGUARDING_SENSITIVE,
    )
    assert quality in {AiQualityTier.HIGH, AiQualityTier.MAXIMUM}
    assert cost == AiCostTier.PREMIUM
    assert ai_cost_policy_service.should_force_premium(
        AiTaskType.SAFEGUARDING_REFLECTION,
        AiRiskLevel.SAFEGUARDING_SENSITIVE,
    )


def test_regulatory_high_quality():
    quality = ai_cost_policy_service.classify_quality_tier(
        AiTaskType.REGULATORY_GUIDANCE,
        AiRiskLevel.HIGH,
    )
    cost = ai_cost_policy_service.classify_cost_tier(
        AiTaskType.REGULATORY_GUIDANCE,
        AiRiskLevel.HIGH,
    )
    assert quality == AiQualityTier.HIGH
    assert cost in {AiCostTier.STANDARD, AiCostTier.PREMIUM}


def test_image_understanding_balanced():
    quality = ai_cost_policy_service.classify_quality_tier(
        AiTaskType.IMAGE_UNDERSTANDING,
        AiRiskLevel.LOW,
        has_images=True,
    )
    assert quality == AiQualityTier.BALANCED


def test_simple_general_low_cost_hint():
    assert ai_cost_policy_service.should_use_low_cost(
        AiTaskType.GENERAL_CHAT,
        "What is quantum computing?",
    )
