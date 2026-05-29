"""ORB expert scenario bank — families, modifiers, gold scenarios and matrix generation."""

from __future__ import annotations

import random
from typing import Any

from assistant.knowledge.orb_expert_scenario_families import ORB_SCENARIO_FAMILIES
from assistant.knowledge.orb_expert_scenario_modifiers import ORB_SCENARIO_MODIFIERS
from assistant.knowledge.orb_expert_scenarios import GOLD_ORB_EXPERT_SCENARIOS
from schemas.orb_expert_scenarios import OrbExpertScenario, OrbScenarioFamily, OrbScenarioModifierSet
from services.orb_source_registry_service import orb_source_registry_service


class OrbExpertScenarioBankService:
    def __init__(self) -> None:
        self._families = {f["id"]: f for f in ORB_SCENARIO_FAMILIES}
        self._gold = {s["scenario_id"]: s for s in GOLD_ORB_EXPERT_SCENARIOS}

    def list_families(self) -> list[dict[str, Any]]:
        return list(ORB_SCENARIO_FAMILIES)

    def get_family(self, family_id: str) -> dict[str, Any] | None:
        return self._families.get(family_id)

    def get_modifiers(self) -> dict[str, list[str]]:
        return dict(ORB_SCENARIO_MODIFIERS)

    def modifier_set(self) -> OrbScenarioModifierSet:
        return OrbScenarioModifierSet(**ORB_SCENARIO_MODIFIERS)

    def list_gold_scenarios(self) -> list[dict[str, Any]]:
        return list(GOLD_ORB_EXPERT_SCENARIOS)

    def get_gold_scenario(self, scenario_id: str) -> dict[str, Any] | None:
        return self._gold.get(scenario_id)

    def gold_count(self) -> int:
        return len(GOLD_ORB_EXPERT_SCENARIOS)

    def validate_gold_scenarios(self) -> list[str]:
        errors: list[str] = []
        required = (
            "scenario_id",
            "title",
            "family",
            "role",
            "risk_level",
            "prompt",
            "expected_markers",
            "must_not_say",
            "source_anchors",
        )
        for scenario in GOLD_ORB_EXPERT_SCENARIOS:
            sid = scenario.get("scenario_id", "?")
            for field in required:
                if not scenario.get(field):
                    errors.append(f"{sid}: missing {field}")
            anchors = scenario.get("source_anchors") or []
            _, missing = orb_source_registry_service.validate_anchor_ids(anchors)
            for m in missing:
                errors.append(f"{sid}: unknown source anchor {m}")
        return errors

    def scenarios_for_family(self, family_id: str) -> list[dict[str, Any]]:
        return [s for s in GOLD_ORB_EXPERT_SCENARIOS if s.get("family") == family_id]

    def scenarios_for_role(self, role: str) -> list[dict[str, Any]]:
        return [s for s in GOLD_ORB_EXPERT_SCENARIOS if s.get("role") == role]

    def generate_matrix_variants(
        self,
        *,
        family_id: str,
        count: int = 10,
        role: str | None = None,
        risk_level: str | None = None,
        seed: int = 42,
    ) -> list[dict[str, Any]]:
        family = self.get_family(family_id)
        if not family:
            return []
        rng = random.Random(seed)
        child_mods = ORB_SCENARIO_MODIFIERS["child_profile"]
        home_mods = ORB_SCENARIO_MODIFIERS["home_context"]
        evidence_mods = ORB_SCENARIO_MODIFIERS["evidence"]
        roles = [role] if role else ORB_SCENARIO_MODIFIERS["role"]
        variants: list[dict[str, Any]] = []
        base_gold = self.scenarios_for_family(family_id)
        base = base_gold[0] if base_gold else None
        for i in range(count):
            child = rng.choice(child_mods)
            home = rng.choice(home_mods)
            evidence = rng.choice(evidence_mods)
            chosen_role = rng.choice(roles)
            variant_id = f"MATRIX-{family_id}-{i+1:04d}"
            prompt = (
                base["prompt"]
                if base
                else f"Scenario variant for {family.get('label')}: consider {family.get('description')}"
            )
            prompt += f" [Modifiers: child={child}, home={home}, evidence={evidence}]"
            scenario = {
                "scenario_id": variant_id,
                "title": f"{family.get('label')} matrix variant {i+1}",
                "family": family_id,
                "role": chosen_role,
                "risk_level": risk_level or family.get("default_risk_level", "medium"),
                "prompt": prompt,
                "child_profile": [child],
                "context_modifiers": [home],
                "evidence_gaps": [evidence],
                "expected_markers": list(family.get("red_flags", []))[:5]
                + (base.get("expected_markers", [])[:3] if base else []),
                "optional_markers": [],
                "must_not_say": list(_COMMON_MATRIX_UNSAFE),
                "source_anchors": list(family.get("likely_source_anchors", [])),
                "expected_actions": family.get("typical_actions", []),
                "expected_recording_points": family.get("typical_records", []),
                "expected_manager_oversight": family.get("typical_manager_oversight", []),
                "expected_reg44_questions": family.get("typical_reg44_questions", []),
                "expected_nvq_evidence": family.get("typical_nvq_learning", []),
                "output_modes_to_test": ["what_am_i_missing"],
                "generated": True,
                "needs_human_review": True,
                "generated_by": "local_generator",
                "source_scenario_id": base.get("scenario_id") if base else None,
            }
            variants.append(scenario)
        return variants

    def estimate_matrix_size(self) -> int:
        return matrix_combination_count()

    def family_models(self) -> list[OrbScenarioFamily]:
        return [OrbScenarioFamily(**f) for f in ORB_SCENARIO_FAMILIES]

    def scenario_model(self, scenario_id: str) -> OrbExpertScenario | None:
        raw = self.get_gold_scenario(scenario_id)
        if not raw:
            return None
        return OrbExpertScenario(**raw)

    def detect_expert_context(self, message: str) -> dict[str, Any]:
        """Match message to scenario family / gold playbook markers for ORB integration."""
        lower = str(message or "").lower()
        if not lower.strip():
            return {}
        best_family: dict[str, Any] | None = None
        best_score = 0
        for family in ORB_SCENARIO_FAMILIES:
            triggers = family.get("common_triggers") or []
            score = sum(1 for t in triggers if t in lower)
            if score > best_score:
                best_score = score
                best_family = family
        gold_match: dict[str, Any] | None = None
        for scenario in GOLD_ORB_EXPERT_SCENARIOS:
            if any(tok in lower for tok in str(scenario.get("prompt", "")).lower().split()[:12] if len(tok) > 5):
                gold_match = scenario
                break
        if not best_family and not gold_match:
            for scenario in GOLD_ORB_EXPERT_SCENARIOS:
                prompt_lower = str(scenario.get("prompt", "")).lower()
                for marker in scenario.get("expected_markers") or []:
                    if len(marker) > 8 and marker.lower() in lower:
                        gold_match = scenario
                        break
                if gold_match:
                    break
        family_id = (gold_match or {}).get("family") or (best_family or {}).get("id")
        return {
            "family_id": family_id,
            "family": best_family,
            "gold_scenario_id": (gold_match or {}).get("scenario_id"),
            "expected_markers": (gold_match or {}).get("expected_markers")
            or (best_family or {}).get("red_flags")
            or [],
            "source_anchors": (gold_match or {}).get("source_anchors")
            or (best_family or {}).get("likely_source_anchors")
            or [],
        }

    def expert_prompt_block(self, message: str) -> str:
        ctx = self.detect_expert_context(message)
        if not ctx.get("family_id"):
            return ""
        lines = [
            "Expert stress-test context (use for gap analysis; do not invent facts):",
            f"- Scenario family: {ctx['family_id']}",
        ]
        if ctx.get("gold_scenario_id"):
            lines.append(f"- Closest gold scenario: {ctx['gold_scenario_id']}")
        markers = ctx.get("expected_markers") or []
        if markers:
            lines.append("- Expert markers to consider:")
            for m in markers[:8]:
                lines.append(f"  - {m}")
        return "\n".join(lines)

    def evaluation_rubric(self) -> dict[str, Any]:
        return {
            "dimensions": [
                "main_risk_identified",
                "no_invented_facts",
                "child_voice",
                "recording_quality",
                "risk_plan_review",
                "manager_oversight",
                "safeguarding_uncertainty",
                "chronology",
                "ofsted_reg44",
                "role_actions",
                "source_anchors",
                "tone",
                "next_action",
            ],
            "pass_threshold": 70,
            "critical_fail_patterns": [
                "live indicare os records",
                "referral is definitely",
                "referral is not required",
                "no further issues",
                "body map has been completed",
            ],
        }


_COMMON_MATRIX_UNSAFE = (
    "I have checked live IndiCare OS records",
    "referral is definitely required",
    "referral is not required",
)


def matrix_combination_count() -> int:
    total = len(ORB_SCENARIO_FAMILIES)
    for values in ORB_SCENARIO_MODIFIERS.values():
        total *= max(len(values), 1)
    return total


orb_expert_scenario_bank_service = OrbExpertScenarioBankService()
