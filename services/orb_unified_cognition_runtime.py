from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from services.child_lived_experience_cognition_service import child_lived_experience_cognition_service
from services.orb_cognitive_state_engine_service import orb_cognitive_state_engine_service
from services.orb_confidence_calibration_service import orb_confidence_calibration_service
from services.orb_emotional_climate_service import orb_emotional_climate_service
from services.orb_evidence_lineage_service import orb_evidence_lineage_service
from services.orb_evidence_reasoning_service import orb_evidence_reasoning_service
from services.orb_explainability_engine_service import orb_explainability_engine_service
from services.orb_inspector_brain_service import orb_inspector_brain_service
from services.orb_inspector_evidence_score_service import orb_inspector_evidence_score_service
from services.orb_knowledge_vault_service import orb_knowledge_vault_service
from services.orb_legal_knowledge_service import orb_legal_knowledge_service
from services.orb_multi_agent_reasoning_service import orb_multi_agent_reasoning_service
from services.orb_priority_reasoning_service import orb_priority_reasoning_service
from services.orb_record_to_action_service import orb_record_to_action_service
from services.orb_residential_brain_catalog_service import orb_residential_brain_catalog_service
from services.orb_scenario_simulator_service import orb_scenario_simulator_service
from services.provider_wide_cognition_service import provider_wide_cognition_service
from services.signal_decay_and_drift_service import signal_decay_and_drift_service


@dataclass(frozen=True)
class UnifiedCognitionRuntimeResult:
    route: str
    top_priority: str
    context: dict[str, Any]
    prompt_block: str
    activated_layers: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbUnifiedCognitionRuntime:
    """Central orchestration layer for ORB cognition.

    This service is the conductor. It does not replace the specialist cognition
    services; it activates and combines them into one coherent runtime context.

    Standalone mode must not access live care records. Operational mode can later
    pass permissioned operational context into this runtime.
    """

    VERSION = "orb-unified-cognition-runtime-v2"

    def build(
        self,
        message: str,
        *,
        mode: str | None = None,
        route: str = "standalone",
        operational_context: dict[str, Any] | None = None,
    ) -> UnifiedCognitionRuntimeResult:
        text = str(message or "")
        activated_layers = [
            "priority_reasoning",
            "cognitive_state",
            "multi_agent_reasoning",
            "confidence_calibration",
            "provider_wide_cognition",
            "signal_decay_and_drift",
            "child_lived_experience",
            "emotional_climate",
            "inspector_brain",
            "legal_knowledge",
            "residential_brain_catalog",
            "evidence_reasoning",
            "evidence_lineage",
            "evidence_score",
            "record_to_action",
            "scenario_simulator",
            "explainability",
            "knowledge_vaults",
        ]

        priority = orb_priority_reasoning_service.prioritise(text)
        cognitive_state = orb_cognitive_state_engine_service.analyse(text)
        multi_agent = orb_multi_agent_reasoning_service.synthesise(text, mode=mode)
        child_experience = child_lived_experience_cognition_service.analyse(text)
        emotional_climate = orb_emotional_climate_service.analyse(text)
        explainability = orb_explainability_engine_service.explain(text, purpose="orb_unified_runtime")
        evidence_lineage = orb_evidence_lineage_service.build(text)
        evidence_scores = orb_inspector_evidence_score_service.context_payload(text)
        legal = orb_legal_knowledge_service.context_payload(text)
        residential_catalog = orb_residential_brain_catalog_service.context_payload(text, mode=mode)
        scenario = orb_scenario_simulator_service.build(text)
        record_to_action = orb_record_to_action_service.analyse(text)
        inspector = orb_inspector_brain_service.context_payload()
        vaults = orb_knowledge_vault_service.context_payload()
        evidence_reasoning = orb_evidence_reasoning_service.context_payload()
        provider = provider_wide_cognition_service.analyse()
        drift = signal_decay_and_drift_service.analyse()
        confidence = self._confidence_from_explainability(explainability)

        context = {
            "version": self.VERSION,
            "route": route,
            "mode": mode or "Ask ORB",
            "standalone_boundaries": {
                "live_records_accessed": False if route == "standalone" else None,
                "care_record_writes": False,
                "human_review_required_for_safeguarding": True,
                "no_ofsted_grade_prediction": True,
            },
            "priority": priority,
            "cognitive_state": cognitive_state,
            "multi_agent_reasoning": multi_agent,
            "confidence_calibration": confidence,
            "provider_wide_cognition": provider,
            "signal_decay_and_drift": drift,
            "child_lived_experience": child_experience,
            "emotional_climate": emotional_climate,
            "inspector": inspector,
            "legal": legal,
            "residential_catalog": residential_catalog,
            "evidence_reasoning": evidence_reasoning,
            "evidence_lineage": evidence_lineage,
            "evidence_scores": evidence_scores,
            "record_to_action": record_to_action,
            "scenario_simulator": scenario,
            "explainability": explainability,
            "knowledge_vaults": vaults,
            "operational_context_present": bool(operational_context),
            "operational_context": operational_context or {},
        }

        prompt_block = self._prompt_block(text, context=context, mode=mode, route=route)
        return UnifiedCognitionRuntimeResult(
            route=route,
            top_priority=str(priority.get("top_priority") or "normal_practice_support"),
            context=context,
            prompt_block=prompt_block,
            activated_layers=activated_layers,
        )

    def _confidence_from_explainability(self, explainability: dict[str, Any]) -> dict[str, Any]:
        markers = explainability.get("evidence_markers") or {}
        evidence_markers = sum(len(value or []) for value in markers.values())
        findings = explainability.get("findings") or []
        missing_core_areas = sum(len(finding.get("missing_evidence") or []) for finding in findings if isinstance(finding, dict))
        safeguarding_uncertainty = any(
            "safeguarding" in str(finding.get("reason", "")).lower()
            for finding in findings
            if isinstance(finding, dict)
        )
        oversight_missing = "manager_oversight" in str(findings).lower()
        return orb_confidence_calibration_service.calibrate(
            evidence_markers=evidence_markers,
            missing_core_areas=missing_core_areas,
            safeguarding_uncertainty=safeguarding_uncertainty,
            oversight_missing=oversight_missing,
            contradictions_present=False,
        )

    def _prompt_block(self, text: str, *, context: dict[str, Any], mode: str | None, route: str) -> str:
        parts = [
            "ORB Unified Cognition Runtime:",
            f"- Runtime version: {self.VERSION}",
            f"- Route: {route}",
            f"- Mode: {mode or 'Ask ORB'}",
            f"- Top priority: {context['priority'].get('top_priority')} ({context['priority'].get('top_level')})",
            f"- Confidence: {context['confidence_calibration'].get('confidence')}",
            "",
            "Runtime rule:",
            "- Safeguarding and child safety override convenience, speed and ordinary workflow completion.",
            "- Child lived experience, emotional safety, evidence quality and leadership oversight must be considered where relevant.",
            "- In standalone ORB, do not claim access to live care records or write to records.",
            "- Explain why recommendations are made, what evidence supports them, what is missing and what needs human review.",
            "- Use the multi-agent perspectives to produce one coherent response, not a list of separate agents.",
            "",
            orb_priority_reasoning_service.prompt_addendum(text),
            "",
            orb_cognitive_state_engine_service.prompt_addendum(text),
            "",
            orb_multi_agent_reasoning_service.prompt_addendum(text, mode=mode),
            "",
            orb_confidence_calibration_service.prompt_addendum(
                evidence_markers=sum(len(value or []) for value in (context.get('explainability', {}).get('evidence_markers') or {}).values()),
                missing_core_areas=sum(len(finding.get('missing_evidence') or []) for finding in (context.get('explainability', {}).get('findings') or []) if isinstance(finding, dict)),
                safeguarding_uncertainty=context.get('priority', {}).get('top_priority') == 'safeguarding_first',
                oversight_missing='manager_oversight' in str(context.get('explainability', {}).get('findings') or []).lower(),
                contradictions_present=False,
            ),
            "",
            provider_wide_cognition_service.prompt_addendum(),
            "",
            signal_decay_and_drift_service.prompt_addendum(),
            "",
            child_lived_experience_cognition_service.prompt_addendum(text),
            "",
            orb_emotional_climate_service.prompt_addendum(text),
            "",
            orb_inspector_brain_service.prompt_addendum(text),
            "",
            orb_legal_knowledge_service.prompt_addendum(text),
            "",
            orb_residential_brain_catalog_service.prompt_addendum(text, mode=mode),
            "",
            orb_evidence_reasoning_service.prompt_addendum(),
            "",
            orb_evidence_lineage_service.prompt_addendum(text),
            "",
            orb_inspector_evidence_score_service.prompt_addendum(text),
            "",
            orb_record_to_action_service.prompt_addendum(text),
            "",
            orb_scenario_simulator_service.prompt_addendum(text),
            "",
            orb_explainability_engine_service.prompt_addendum(text, purpose="orb_unified_runtime"),
            "",
            orb_knowledge_vault_service.prompt_addendum(),
        ]
        return "\n".join(part for part in parts if part)


orb_unified_cognition_runtime = OrbUnifiedCognitionRuntime()
