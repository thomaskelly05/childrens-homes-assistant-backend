from __future__ import annotations

from schemas.ai_models import AiCostTier, AiQualityTier, AiRiskLevel, AiTaskType


class AiCostPolicyService:
    """Cost and quality tier policy for standalone ORB model routing."""

    PROMPT_TIER_COST: dict[str, AiCostTier] = {
        "fast": AiCostTier.LOW,
        "residential": AiCostTier.STANDARD,
        "deep": AiCostTier.PREMIUM,
        "document": AiCostTier.STANDARD,
        "action": AiCostTier.LOW,
        "academy_nvq": AiCostTier.STANDARD,
    }

    PROMPT_TIER_QUALITY: dict[str, AiQualityTier] = {
        "fast": AiQualityTier.FAST,
        "residential": AiQualityTier.BALANCED,
        "deep": AiQualityTier.HIGH,
        "document": AiQualityTier.BALANCED,
        "action": AiQualityTier.BALANCED,
        "academy_nvq": AiQualityTier.BALANCED,
    }

    def tier_from_prompt_tier(self, prompt_tier: str | None) -> tuple[AiCostTier | None, AiQualityTier | None]:
        key = str(prompt_tier or "").strip().lower()
        if not key:
            return None, None
        return self.PROMPT_TIER_COST.get(key), self.PROMPT_TIER_QUALITY.get(key)

    def max_tokens_for_prompt_tier(self, prompt_tier: str | None, detail_level: str = "concise") -> int | None:
        tier = str(prompt_tier or "").strip().lower()
        if tier == "fast":
            return 900
        if tier == "deep":
            return 1500
        if tier == "document":
            return 1400
        if tier == "action":
            return 1100
        if tier == "academy_nvq":
            return 1300
        if detail_level in {"detailed", "detailed_voice"}:
            return 1600
        return None

    def classify_cost_tier(
        self,
        task_type: AiTaskType,
        risk_level: AiRiskLevel,
        *,
        mode: str | None = None,
        has_images: bool = False,
        research_intent: bool = False,
    ) -> AiCostTier:
        _ = mode
        if task_type == AiTaskType.VOICE_CONCISE:
            return AiCostTier.LOW
        if task_type in {AiTaskType.SAFEGUARDING_REFLECTION, AiTaskType.DEEP_RESEARCH}:
            return AiCostTier.PREMIUM
        if task_type in {AiTaskType.REGULATORY_GUIDANCE, AiTaskType.KNOWLEDGE_RAG_ANSWER}:
            return AiCostTier.STANDARD if not research_intent else AiCostTier.PREMIUM
        if has_images or task_type == AiTaskType.IMAGE_UNDERSTANDING:
            return AiCostTier.STANDARD
        if risk_level in {AiRiskLevel.HIGH, AiRiskLevel.SAFEGUARDING_SENSITIVE}:
            return AiCostTier.PREMIUM
        if task_type in {AiTaskType.GENERAL_CHAT, AiTaskType.PRODUCT_EXPLANATION, AiTaskType.SUMMARISATION}:
            return AiCostTier.LOW
        return AiCostTier.STANDARD

    def classify_quality_tier(
        self,
        task_type: AiTaskType,
        risk_level: AiRiskLevel,
        *,
        mode: str | None = None,
        has_images: bool = False,
        research_intent: bool = False,
        voice_mode: bool = False,
    ) -> AiQualityTier:
        _ = mode
        if voice_mode or task_type == AiTaskType.VOICE_CONCISE:
            return AiQualityTier.FAST
        if self.should_force_premium(task_type, risk_level) or research_intent:
            return AiQualityTier.MAXIMUM if task_type == AiTaskType.DEEP_RESEARCH else AiQualityTier.HIGH
        if task_type in {
            AiTaskType.SAFEGUARDING_REFLECTION,
            AiTaskType.REGULATORY_GUIDANCE,
            AiTaskType.KNOWLEDGE_RAG_ANSWER,
        }:
            return AiQualityTier.HIGH
        if has_images or task_type == AiTaskType.IMAGE_UNDERSTANDING:
            return AiQualityTier.BALANCED
        if task_type in {AiTaskType.RECORDING_REWRITE, AiTaskType.PRODUCT_EXPLANATION, AiTaskType.THERAPEUTIC_REFLECTION}:
            return AiQualityTier.BALANCED
        if self.should_use_low_cost(task_type, ""):
            return AiQualityTier.FAST
        return AiQualityTier.BALANCED

    def max_tokens_for_task(
        self,
        task_type: AiTaskType,
        detail_level: str = "concise",
        *,
        voice_mode: bool = False,
    ) -> int:
        if voice_mode or task_type == AiTaskType.VOICE_CONCISE:
            return 700
        if detail_level in {"detailed", "detailed_voice"}:
            return 1600
        if task_type in {AiTaskType.DEEP_RESEARCH, AiTaskType.REGULATORY_GUIDANCE, AiTaskType.SAFEGUARDING_REFLECTION}:
            return 1400
        if task_type == AiTaskType.IMAGE_UNDERSTANDING:
            return 1200
        return 1200

    def timeout_for_task(self, task_type: AiTaskType, quality_tier: AiQualityTier) -> float:
        if quality_tier == AiQualityTier.MAXIMUM:
            return 55.0
        if task_type == AiTaskType.VOICE_CONCISE:
            return 30.0
        return 45.0

    def should_force_premium(self, task_type: AiTaskType, risk_level: AiRiskLevel) -> bool:
        if risk_level == AiRiskLevel.SAFEGUARDING_SENSITIVE:
            return True
        return task_type in {
            AiTaskType.SAFEGUARDING_REFLECTION,
            AiTaskType.DEEP_RESEARCH,
            AiTaskType.REGULATORY_GUIDANCE,
        }

    def should_use_low_cost(self, task_type: AiTaskType, message: str) -> bool:
        lower = (message or "").lower()
        if task_type in {AiTaskType.GENERAL_CHAT, AiTaskType.SUMMARISATION, AiTaskType.CLASSIFICATION}:
            if len(lower) < 120 and "?" in lower:
                return True
        if task_type == AiTaskType.VOICE_CONCISE:
            return True
        return False


ai_cost_policy_service = AiCostPolicyService()
