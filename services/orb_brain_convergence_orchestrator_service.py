"""Canonical ORB Residential brain convergence orchestrator.

Converges existing brain services through one decision path for standalone ORB.
Does not create a competing brain — orchestrates routing, contracts and metadata only.
"""

from __future__ import annotations

from dataclasses import asdict, dataclass, field
from typing import Any

from services.ai_model_router_service import ai_model_router_service
from services.orb_brain_route_map_service import orb_brain_route_map_service
from services.orb_brain_route_service import OrbBrainRouteDecision, orb_brain_route_service
from services.orb_data_vault_registry_service import orb_data_vault_registry_service
from services.orb_indicare_intelligence_convergence_service import (
    orb_indicare_intelligence_convergence_service,
)
from services.orb_mandatory_response_contract_service import orb_mandatory_response_contract_service
from services.orb_multi_scenario_detector_service import orb_multi_scenario_detector_service
from services.orb_residential_cognition_router import orb_residential_cognition_router
from services.orb_standalone_brain_service import orb_standalone_brain_service
from services.shared_institutional_cognition_runtime import shared_institutional_cognition_runtime

_SENSITIVE_KEYS = frozenset(
    {
        "api_key",
        "apikey",
        "secret",
        "password",
        "token",
        "authorization",
        "raw_prompt",
        "provider_prompt",
        "system_prompt",
        "openai_api_key",
    }
)


@dataclass
class OrbBrainConvergenceDecision:
    surface: str = "orb_standalone"
    mode: str = "Ask ORB"
    detected_topic: str | None = None
    risk_level: str = "low"
    multi_scenario: bool = False
    scenario_types: list[str] = field(default_factory=list)
    brain_route: dict[str, Any] = field(default_factory=dict)
    standalone_brain: dict[str, Any] = field(default_factory=dict)
    residential_cognition: dict[str, Any] = field(default_factory=dict)
    indicare_intelligence_convergence: dict[str, Any] = field(default_factory=dict)
    active_brains: list[str] = field(default_factory=list)
    active_lenses: list[str] = field(default_factory=list)
    active_intelligence_layers: list[str] = field(default_factory=list)
    active_cognition: list[str] = field(default_factory=list)
    knowledge_vaults: list[str] = field(default_factory=list)
    response_contract: list[str] = field(default_factory=list)
    mandatory_contracts: list[dict[str, Any]] = field(default_factory=list)
    boundaries: list[str] = field(default_factory=list)
    standalone_boundary: bool = True
    route_map: dict[str, Any] = field(default_factory=dict)
    prompt_addendum: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbBrainConvergenceOrchestratorService:
    """Single source of truth for standalone ORB brain selection metadata."""

    VERSION = "orb-brain-convergence-orchestrator-v1"

    def build_brain_decision(
        self,
        message: str,
        *,
        mode: str | None = "Ask ORB",
        source_surface: str | None = None,
        client_route_hint: str | None = None,
        location_hint: str | None = None,
        requested_action: str | None = None,
        note_type: str | None = None,
        profile_context: bool = False,
        route: str = "/orb/standalone/conversation",
        prompt_tier: str | None = None,
        history: list[dict[str, Any]] | None = None,
        operational_context: dict[str, Any] | None = None,
        include_route_map: bool = False,
    ) -> OrbBrainConvergenceDecision:
        normalised_mode = orb_standalone_brain_service.normalise_mode(mode)
        user_message = orb_brain_route_service.extract_user_message(message)

        brain_route_decision = orb_brain_route_service.decide_orb_brain_route(
            message,
            mode=normalised_mode,
            source_surface=source_surface,
            client_route_hint=client_route_hint,
            location_hint=location_hint,
            requested_action=requested_action,
            note_type=note_type,
            profile_context=profile_context,
        )
        standalone_brain = orb_standalone_brain_service.context_payload(user_message, mode=normalised_mode)
        standalone_brain["brain_route"] = brain_route_decision.to_dict()

        residential_cognition = orb_residential_cognition_router.route(
            message=user_message,
            mode=normalised_mode,
        )
        intelligence_convergence = orb_indicare_intelligence_convergence_service.route(
            user_message,
            mode=normalised_mode,
        )
        multi = orb_multi_scenario_detector_service.detect(user_message)

        detected_topic = residential_cognition.get("topic") or standalone_brain.get("intent_summary")
        risk_level = self._resolve_risk_level(
            user_message,
            mode=normalised_mode,
            brain_route=brain_route_decision,
            residential_cognition=residential_cognition,
            scenario_types=multi.get("scenario_types") or [],
        )

        scenario_types = list(multi.get("scenario_types") or [])
        mandatory_contracts = orb_mandatory_response_contract_service.contracts_for_scenarios(scenario_types)
        mandatory_lines = orb_mandatory_response_contract_service.build_response_contract(
            scenario_types,
            multi_scenario=bool(multi.get("multi_scenario")),
        )

        soft_contract = list(standalone_brain.get("response_contract") or [])
        response_contract = self._dedupe(soft_contract + mandatory_lines)

        active_brains = self._merge_brain_ids(
            standalone_brain.get("active_brains") or [],
            residential_cognition.get("active_brains") or [],
            [f"intelligence:{engine}" for engine in intelligence_convergence.get("active_engines") or []],
        )
        active_cognition = list(residential_cognition.get("active_brains") or [])
        active_lenses = list(intelligence_convergence.get("active_lenses") or [])
        active_intelligence_layers = list(intelligence_convergence.get("active_engines") or [])

        vault_domains = list(residential_cognition.get("vault_domains") or [])
        knowledge_vaults = self._vault_labels(vault_domains)

        boundaries = list(standalone_brain.get("safety_boundaries") or orb_standalone_brain_service.CORE_BOUNDARIES)

        prompt_addendum = orb_mandatory_response_contract_service.prompt_block(
            scenario_types,
            multi_scenario=bool(multi.get("multi_scenario")),
        )

        decision = OrbBrainConvergenceDecision(
            surface="orb_standalone",
            mode=normalised_mode,
            detected_topic=str(detected_topic) if detected_topic else None,
            risk_level=risk_level,
            multi_scenario=bool(multi.get("multi_scenario")),
            scenario_types=scenario_types,
            brain_route=brain_route_decision.to_dict(),
            standalone_brain=standalone_brain,
            residential_cognition=residential_cognition,
            indicare_intelligence_convergence=intelligence_convergence,
            active_brains=active_brains,
            active_lenses=active_lenses,
            active_intelligence_layers=active_intelligence_layers,
            active_cognition=active_cognition,
            knowledge_vaults=knowledge_vaults,
            response_contract=response_contract,
            mandatory_contracts=mandatory_contracts,
            boundaries=boundaries,
            standalone_boundary=True,
            prompt_addendum=prompt_addendum,
        )

        if include_route_map:
            decision.route_map = orb_brain_route_map_service.trace_live_route(route=route)

        return decision

    def build_shared_cognition(
        self,
        *,
        message: str,
        mode: str,
        prompt_tier: str,
        history: list[dict[str, Any]] | None = None,
        operational_context: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        if prompt_tier == "fast":
            return {
                "surface": "standalone_orb",
                "mode": mode,
                "active_brains": ["general_assistant"],
                "cognition_display_labels": ["ORB"],
                "explainability": {"cognition_display_labels": ["ORB"]},
                "citations": [],
                "prompt_blocks": [],
                "skipped": True,
            }
        return shared_institutional_cognition_runtime.build_context(
            surface="standalone_orb",
            message=message,
            mode=mode,
            operational_context=operational_context or None,
            history=history,
        )

    def build_debug_payload(
        self,
        message: str,
        *,
        mode: str | None = "Ask ORB",
        route: str = "/orb/standalone/brain-route/debug",
    ) -> dict[str, Any]:
        decision = self.build_brain_decision(
            message,
            mode=mode,
            route=route,
            include_route_map=True,
        )
        payload = decision.to_dict()
        payload.pop("standalone_brain", None)
        payload.pop("brain_route", None)
        payload.pop("residential_cognition", None)
        payload.pop("indicare_intelligence_convergence", None)
        payload.pop("mandatory_contracts", None)
        payload.pop("prompt_addendum", None)
        payload["active_cognition"] = decision.active_cognition
        return self._sanitize_debug_payload(payload)

    def _resolve_risk_level(
        self,
        message: str,
        *,
        mode: str,
        brain_route: OrbBrainRouteDecision,
        residential_cognition: dict[str, Any],
        scenario_types: list[str],
    ) -> str:
        high_risk_scenarios = {
            "suicide_self_harm",
            "allegation_against_staff",
            "missing_return_substance_risk",
            "parent_forced_removal",
            "historic_sexual_abuse_disclosure",
            "exploitation_county_lines",
        }
        if scenario_types and any(s in high_risk_scenarios for s in scenario_types):
            return "critical" if "suicide_self_harm" in scenario_types else "high"
        if residential_cognition.get("depth_level") == "critical":
            return "critical"
        if residential_cognition.get("high_attention"):
            return "high"
        ai_risk = ai_model_router_service.classify_risk(message, mode=mode)
        risk_value = getattr(ai_risk, "value", str(ai_risk)).lower()
        if "safeguarding" in risk_value:
            return "high"
        if risk_value in {"high", "critical", "medium", "low"}:
            return risk_value
        classification = brain_route.classification or {}
        if classification.get("intents", {}).get("safeguarding_principles"):
            return "high"
        return "medium" if brain_route.route == "residential_specialist" else "low"

    def _vault_labels(self, vault_domains: list[str]) -> list[str]:
        if not vault_domains:
            return []
        described = orb_data_vault_registry_service.describe_domains(vault_domains)
        labels: list[str] = []
        for item in described:
            name = item.get("name") or item.get("domain")
            if name and name not in labels:
                labels.append(str(name))
        if not labels:
            labels = list(vault_domains)
        return labels[:12]

    def _merge_brain_ids(self, *groups: list[str]) -> list[str]:
        return self._dedupe([item for group in groups for item in (group or []) if item])

    def _dedupe(self, items: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in items:
            if item in seen:
                continue
            seen.add(item)
            out.append(item)
        return out

    def _sanitize_debug_payload(self, payload: dict[str, Any]) -> dict[str, Any]:
        def scrub(value: Any) -> Any:
            if isinstance(value, dict):
                cleaned: dict[str, Any] = {}
                for key, item in value.items():
                    if str(key).lower() in _SENSITIVE_KEYS:
                        continue
                    cleaned[key] = scrub(item)
                return cleaned
            if isinstance(value, list):
                return [scrub(item) for item in value]
            if isinstance(value, str) and any(marker in value.lower() for marker in ("sk-", "api_key=", "bearer ")):
                return "[redacted]"
            return value

        return scrub(payload)


orb_brain_convergence_orchestrator_service = OrbBrainConvergenceOrchestratorService()
