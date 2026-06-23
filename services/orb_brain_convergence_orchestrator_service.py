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
from services.orb_domain_convergence_service import orb_domain_convergence_service
from services.orb_indicare_intelligence_convergence_service import (
    orb_indicare_intelligence_convergence_service,
)
from services.orb_mandatory_response_contract_service import orb_mandatory_response_contract_service
from services.orb_multi_scenario_detector_service import orb_multi_scenario_detector_service
from services.orb_residential_cognition_router import orb_residential_cognition_router
from services.orb_standalone_brain_service import orb_standalone_brain_service
from services.orb_universal_answer_contract_map_service import (
    build_contract_prompt_block as build_family_contract_prompt_block,
    detect_contract_family,
)
from services.orb_universal_response_contract_service import orb_universal_response_contract_service
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
    feature: str | None = None
    depth_tier: str = "standard"
    contract_mode: str | None = None
    contract_family: str | None = None
    public_considerations: list[str] = field(default_factory=list)
    universal_contract_block: str = ""
    active_final_domains: list[str] = field(default_factory=list)
    source_anchors: list[str] = field(default_factory=list)
    public_source_chips: list[dict[str, Any]] = field(default_factory=list)
    domain_prompt_block: str = ""
    domain_convergence_version: str | None = None

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
        feature: str | None = None,
        document_type: str | None = None,
        document_lens: str | None = None,
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

        resolved_note_type = note_type or document_type
        contract_mode = orb_universal_response_contract_service.resolve_contract_mode(
            mode=normalised_mode,
            feature=feature,
            requested_action=requested_action,
            note_type=resolved_note_type,
            document_lens=document_lens,
            source_surface=source_surface,
        )
        universal_lines = orb_universal_response_contract_service.contract_lines_for_surface(
            mode=normalised_mode,
            feature=feature,
            requested_action=requested_action,
            note_type=resolved_note_type,
            document_lens=document_lens,
            source_surface=source_surface,
        )
        soft_contract = list(standalone_brain.get("response_contract") or [])
        response_contract = self._dedupe(soft_contract + mandatory_lines + universal_lines)

        contract_family = detect_contract_family(
            user_message,
            scenario_types=scenario_types,
            requested_action=requested_action,
            note_type=resolved_note_type,
            source_surface=source_surface,
            feature=feature,
        )
        depth_tier = orb_universal_response_contract_service.depth_tier_for(
            scenario_types=scenario_types,
            risk_level=risk_level,
            contract_mode=contract_mode,
            feature=feature,
            requested_action=requested_action,
            message=user_message,
            source_surface=source_surface,
            note_type=resolved_note_type,
        )
        public_considerations = orb_universal_response_contract_service.public_considerations_for(
            contract_mode=contract_mode,
            scenario_types=scenario_types,
            risk_level=risk_level,
            active_brains=list(standalone_brain.get("active_brains") or []),
            contract_family=contract_family,
            message=user_message,
            requested_action=requested_action,
            note_type=resolved_note_type,
            source_surface=source_surface,
            feature=feature,
        )

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

        mandatory_block = orb_mandatory_response_contract_service.prompt_block(
            scenario_types,
            multi_scenario=bool(multi.get("multi_scenario")),
        )
        universal_block = orb_universal_response_contract_service.build_prompt_block(
            mode=normalised_mode,
            feature=feature,
            requested_action=requested_action,
            note_type=resolved_note_type,
            document_lens=document_lens,
            source_surface=source_surface,
        )
        family_block = build_family_contract_prompt_block(contract_family)
        depth_hint = f"ORB answer depth tier: {depth_tier} — adapt length and structure accordingly."

        domain_packet = orb_domain_convergence_service.build_packet(
            user_message,
            mode=normalised_mode,
            feature=feature,
            note_type=resolved_note_type,
            scenario_types=scenario_types,
            risk_level=risk_level,
            active_brains=active_brains,
        )
        domain_prompt_block = orb_domain_convergence_service.prompt_block(domain_packet)

        prompt_addendum = self._join_prompt_blocks(
            mandatory_block,
            universal_block,
            family_block,
            depth_hint,
            domain_prompt_block,
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
            feature=feature,
            depth_tier=depth_tier,
            contract_mode=contract_mode,
            contract_family=contract_family,
            public_considerations=public_considerations,
            universal_contract_block=universal_block,
            active_final_domains=list(domain_packet.active_domains),
            source_anchors=list(domain_packet.source_anchors),
            public_source_chips=list(domain_packet.public_source_chips),
            domain_prompt_block=domain_prompt_block,
            domain_convergence_version=orb_domain_convergence_service.VERSION,
        )

        if include_route_map:
            decision.route_map = orb_brain_route_map_service.trace_live_route(route=route)

        return decision

    def build_convergence_prompt_block(self, decision: OrbBrainConvergenceDecision) -> str:
        """Prompt addendum from a convergence decision — boundaries, contracts and depth."""
        parts = [
            "ORB brain convergence (canonical orchestrator-selected):",
            f"Depth tier: {decision.depth_tier}",
            "Boundaries:",
            *[f"- {line}" for line in (decision.boundaries or [])[:8]],
        ]
        if decision.response_contract:
            parts.append("Response contract:")
            parts.extend(f"- {line}" for line in decision.response_contract[:16])
        if decision.prompt_addendum:
            parts.append(decision.prompt_addendum)
        return "\n".join(part for part in parts if part).strip()

    def convergence_metadata(
        self,
        decision: OrbBrainConvergenceDecision,
        *,
        route: str | None = None,
    ) -> dict[str, Any]:
        """Safe-to-merge convergence summary for feature payloads (sanitised for clients)."""
        payload = {
            "surface": decision.surface,
            "mode": decision.mode,
            "feature": decision.feature,
            "depth_tier": decision.depth_tier,
            "contract_mode": decision.contract_mode,
            "contract_family": decision.contract_family,
            "detected_topic": decision.detected_topic,
            "risk_level": decision.risk_level,
            "multi_scenario": decision.multi_scenario,
            "scenario_types": list(decision.scenario_types),
            "active_brains": list(decision.active_brains),
            "active_lenses": list(decision.active_lenses),
            "active_intelligence_layers": list(decision.active_intelligence_layers),
            "knowledge_vaults": list(decision.knowledge_vaults),
            "response_contract": list(decision.response_contract),
            "boundaries": list(decision.boundaries),
            "standalone_boundary": decision.standalone_boundary,
            "public_considerations": list(decision.public_considerations),
            "active_final_domains": list(decision.active_final_domains),
            "source_anchors": list(decision.source_anchors),
            "public_source_chips": list(decision.public_source_chips),
            "domain_convergence": orb_domain_convergence_service.VERSION,
            "orchestrator": self.VERSION,
        }
        if route:
            payload["route"] = route
        return payload

    def convergence_source_chips_as_sources(
        self,
        decision: OrbBrainConvergenceDecision | dict[str, Any],
    ) -> list[dict[str, Any]]:
        """Map domain convergence chips into the existing frontend sources contract."""
        chips = (
            decision.public_source_chips
            if isinstance(decision, OrbBrainConvergenceDecision)
            else list(decision.get("public_source_chips") or [])
        )
        sources: list[dict[str, Any]] = []
        for chip in chips:
            label = str(chip.get("label") or "").strip()
            if not label:
                continue
            sources.append(
                {
                    "id": chip.get("id") or label.lower().replace(" ", "_"),
                    "label": label,
                    "type": chip.get("type") or "source_family",
                    "anchor": chip.get("anchor"),
                    "precision": chip.get("precision") or "source_family_anchor",
                    "domains": list(chip.get("domains") or []),
                    "basis": "ORB domain convergence source-family anchor",
                    "live_retrieved": False,
                }
            )
        return sources

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
        payload.pop("domain_prompt_block", None)
        payload["active_cognition"] = decision.active_cognition
        payload["domain_convergence"] = {
            "version": decision.domain_convergence_version,
            "active_final_domains": list(decision.active_final_domains),
            "source_anchors": list(decision.source_anchors),
            "public_source_chip_count": len(decision.public_source_chips),
        }
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

    def concise_prompt_addendum(self, decision: OrbBrainConvergenceDecision) -> str:
        """Compact convergence addendum for everyday simple-standard recording prompts."""
        lines = [
            "ORB brain convergence (concise everyday path):",
            f"- Contract family: {decision.contract_family or 'daily_record'}",
            f"- Depth tier: {decision.depth_tier}",
            "- Factual, child-centred recording support; do not invent facts.",
        ]
        if decision.response_contract:
            lines.append("Response contract:")
            lines.extend(f"- {line}" for line in decision.response_contract[:6])
        return "\n".join(lines)

    def _join_prompt_blocks(self, *blocks: str) -> str:
        parts = [block.strip() for block in blocks if block and block.strip()]
        if not parts:
            return ""
        return "\n\n".join(parts)

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
