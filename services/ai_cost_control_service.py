from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from schemas.data_intelligence import EvidencePack, ProviderDataIntelligenceSettings
from services.provider_data_intelligence_settings_service import provider_data_intelligence_settings_service


MODEL_BUDGETS: dict[str, dict[str, Any]] = {
    "rules": {"model_tier": "rules", "max_tokens": 0, "max_records": 8, "max_citations": 8},
    "cheap": {"model_tier": "cheap_local_rules", "max_tokens": 350, "max_records": 4, "max_citations": 3},
    "medium": {"model_tier": "medium", "max_tokens": 900, "max_records": 8, "max_citations": 6},
    "high": {"model_tier": "high", "max_tokens": 1800, "max_records": 8, "max_citations": 8},
    "realtime": {"model_tier": "realtime_voice", "max_tokens": 900, "max_records": 4, "max_citations": 4},
}

CHEAP_FEATURES = {
    "tagging",
    "categorisation",
    "metadata",
    "regulatory_mapping",
    "record_quality_flags",
    "link_suggestions",
    "navigation",
    "route",
}
MEDIUM_FEATURES = {"summary", "handover", "daily_note_improvement", "report_section_draft"}
HIGH_FEATURES = {"complex_safeguarding_synthesis", "reg45_narrative", "ofsted_challenge", "management_analysis"}


@dataclass(frozen=True)
class AIRequestPlan:
    feature: str
    model_tier: str
    should_call_external_ai: bool
    reason: str
    max_tokens: int
    max_records: int
    max_citations: int
    cache_first: bool = True
    summarise_before_reasoning: bool = True
    realtime_voice_allowed: bool = False


class AICostControlService:
    """Central low-cost AI routing and answer-budget controls."""

    def plan_request(
        self,
        *,
        feature: str,
        mode: str = "balanced",
        cache_hit: bool = False,
        metadata_answer_available: bool = False,
        active_voice_session: bool = False,
        settings: ProviderDataIntelligenceSettings | dict[str, Any] | None = None,
    ) -> AIRequestPlan:
        resolved_settings = (
            settings
            if isinstance(settings, ProviderDataIntelligenceSettings)
            else provider_data_intelligence_settings_service.from_record(settings or {})
        )
        feature_key = (feature or "metadata").strip().lower()
        if cache_hit:
            return self._plan(feature_key, "rules", False, "cache_hit")
        if metadata_answer_available:
            return self._plan(feature_key, "rules", False, "deterministic_metadata_answer")
        if feature_key in CHEAP_FEATURES:
            return self._plan(feature_key, "rules", False, "simple_metadata_or_navigation")
        if not resolved_settings.external_ai_enabled:
            return self._plan(feature_key, "rules", False, "external_ai_disabled")
        if feature_key == "realtime_voice":
            if active_voice_session and resolved_settings.realtime_voice_enabled:
                return self._plan(feature_key, "realtime", True, "active_realtime_voice_session", realtime_voice_allowed=True)
            return self._plan(feature_key, "rules", False, "realtime_only_when_user_is_speaking")
        if feature_key in HIGH_FEATURES or mode == "deep":
            return self._plan(feature_key, "high", True, "complex_reasoning_required")
        if feature_key in MEDIUM_FEATURES or mode == "balanced":
            return self._plan(feature_key, "medium", True, "draft_or_summary_allowed")
        return self._plan(feature_key, "cheap", True, "low_cost_model_allowed")

    def compress_evidence_pack(self, pack: EvidencePack, *, plan: AIRequestPlan | None = None) -> EvidencePack:
        plan = plan or self.plan_request(feature="summary")
        data = pack.model_dump()
        data["citations"] = data["citations"][: plan.max_citations]
        data["linked_actions"] = data["linked_actions"][: plan.max_records]
        data["ai_required"] = plan.should_call_external_ai
        data["external_ai_allowed"] = plan.should_call_external_ai
        data["relevant_metadata"] = {
            **data.get("relevant_metadata", {}),
            "cost_plan": {
                "model_tier": plan.model_tier,
                "max_tokens": plan.max_tokens,
                "max_records": plan.max_records,
                "max_citations": plan.max_citations,
                "reason": plan.reason,
            },
        }
        return EvidencePack(**data)

    def _plan(
        self,
        feature: str,
        budget_key: str,
        should_call_external_ai: bool,
        reason: str,
        *,
        realtime_voice_allowed: bool = False,
    ) -> AIRequestPlan:
        budget = MODEL_BUDGETS[budget_key]
        return AIRequestPlan(
            feature=feature,
            model_tier=budget["model_tier"],
            should_call_external_ai=should_call_external_ai,
            reason=reason,
            max_tokens=budget["max_tokens"],
            max_records=budget["max_records"],
            max_citations=budget["max_citations"],
            realtime_voice_allowed=realtime_voice_allowed,
        )


ai_cost_control_service = AICostControlService()
