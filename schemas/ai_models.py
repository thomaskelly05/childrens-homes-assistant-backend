from __future__ import annotations

from enum import StrEnum
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AiTaskType(StrEnum):
    GENERAL_CHAT = "general_chat"
    VOICE_CONCISE = "voice_concise"
    IMAGE_UNDERSTANDING = "image_understanding"
    PRODUCT_EXPLANATION = "product_explanation"
    REGULATORY_GUIDANCE = "regulatory_guidance"
    SAFEGUARDING_REFLECTION = "safeguarding_reflection"
    RECORDING_REWRITE = "recording_rewrite"
    THERAPEUTIC_REFLECTION = "therapeutic_reflection"
    DEEP_RESEARCH = "deep_research"
    KNOWLEDGE_RAG_ANSWER = "knowledge_rag_answer"
    SUMMARISATION = "summarisation"
    CLASSIFICATION = "classification"
    OPERATIONAL_OS_CONTEXT = "operational_os_context"


class AiRiskLevel(StrEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    SAFEGUARDING_SENSITIVE = "safeguarding_sensitive"


class AiQualityTier(StrEnum):
    FAST = "fast"
    BALANCED = "balanced"
    HIGH = "high"
    MAXIMUM = "maximum"


class AiCostTier(StrEnum):
    LOW = "low"
    STANDARD = "standard"
    PREMIUM = "premium"


class AiProviderName(StrEnum):
    OPENAI = "openai"
    ANTHROPIC = "anthropic"
    GOOGLE = "google"
    LOCAL = "local"
    MOCK = "mock"


class AiModelCapability(StrEnum):
    TEXT = "text"
    VISION = "vision"
    AUDIO = "audio"
    TOOL_USE = "tool_use"
    JSON = "json"
    LONG_CONTEXT = "long_context"
    LOW_LATENCY = "low_latency"
    REASONING = "reasoning"
    CITATIONS = "citations"
    SAFETY = "safety"


class AiModelProfile(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: AiProviderName
    model: str
    capabilities: list[AiModelCapability] = Field(default_factory=list)
    quality_tier: AiQualityTier = AiQualityTier.BALANCED
    cost_tier: AiCostTier = AiCostTier.STANDARD
    supports_vision: bool = False
    supports_json: bool = False
    supports_long_context: bool = False
    supports_low_latency: bool = False
    supports_reasoning: bool = False
    default_timeout_seconds: float = 45.0


class AiRoutingRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    message: str
    system_prompt: str = ""
    history: list[dict[str, Any]] = Field(default_factory=list)
    images: list[str] = Field(default_factory=list)
    mode: str | None = None
    detail_level: str = "concise"
    research_intent: bool = False
    retrieval_context: dict[str, Any] | None = None
    surface: str = "standalone_orb_ai"
    voice_mode: bool = False


class AiRoutingDecision(BaseModel):
    model_config = ConfigDict(extra="forbid")

    provider: AiProviderName
    model: str
    task_type: AiTaskType
    risk_level: AiRiskLevel
    quality_tier: AiQualityTier
    cost_tier: AiCostTier
    reason: str
    fallback_provider: AiProviderName | None = None
    fallback_model: str | None = None
    estimated_cost_tier: AiCostTier = AiCostTier.STANDARD
    requires_citations: bool = False
    requires_rag: bool = False
    requires_vision: bool = False
    requires_safety_review: bool = False
    max_output_tokens: int = 1200
    timeout_seconds: float = 45.0
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiProviderRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    provider: AiProviderName
    model: str
    system_prompt: str
    message: str
    history: list[dict[str, Any]] = Field(default_factory=list)
    images: list[str] = Field(default_factory=list)
    temperature: float = 0.2
    max_output_tokens: int = 1200
    timeout_seconds: float = 45.0
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiUsageEstimate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    input_tokens: int | None = None
    output_tokens: int | None = None
    total_tokens: int | None = None
    estimated_cost_tier: AiCostTier | None = None


class AiProviderResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    text: str
    raw: dict[str, Any] | None = None
    provider: AiProviderName
    model: str
    usage: AiUsageEstimate | None = None
    latency_ms: int | None = None
    finish_reason: str | None = None
    safety_flags: list[str] = Field(default_factory=list)
    error: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class AiModelRouterTrace(BaseModel):
    model_config = ConfigDict(extra="forbid")

    task_type: AiTaskType
    risk_level: AiRiskLevel
    quality_tier: AiQualityTier
    cost_tier: AiCostTier
    provider: AiProviderName
    model: str
    reason: str
    fallback_used: bool = False
    fallback_provider: AiProviderName | None = None
    fallback_model: str | None = None
    latency_ms: int | None = None
    error: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
