"""Deterministic variant profiles for ORB Residential Quality Lab scale expansion.

100 profiles per core scenario → 10,000 total variants (100 core × 100).
No LLM calls; synthetic anonymised inputs only.
"""

from __future__ import annotations

import re
from typing import Any

from assistant.evals.orb_residential_scenario_schema import VARIANT_TYPES

# Dimension modifiers applied on top of base variant types (profiles 11–100).
DIMENSION_SLOTS: tuple[dict[str, Any], ...] = (
  {"slot": "base_extended", "child_voice": "present", "adult_response": "present", "outcome": "present",
   "chronology": "clear", "direct_speech": "present", "safeguarding_cue": "neutral", "action_ownership": "present",
   "pathway_need": "routine", "input_roughness": "standard", "adult_role": "shift_staff"},
  {"slot": "child_voice_absent", "child_voice": "absent", "adult_response": "present", "outcome": "present",
   "chronology": "clear", "direct_speech": "absent", "safeguarding_cue": "neutral", "action_ownership": "present",
   "pathway_need": "routine", "input_roughness": "sparse", "adult_role": "shift_staff"},
  {"slot": "adult_response_absent", "child_voice": "present", "adult_response": "absent", "outcome": "absent",
   "chronology": "clear", "direct_speech": "present", "safeguarding_cue": "neutral", "action_ownership": "absent",
   "pathway_need": "routine", "input_roughness": "sparse", "adult_role": "shift_staff"},
  {"slot": "unclear_chronology", "child_voice": "present", "adult_response": "present", "outcome": "absent",
   "chronology": "unclear", "direct_speech": "present", "safeguarding_cue": "neutral", "action_ownership": "present",
   "pathway_need": "routine", "input_roughness": "fragmented", "adult_role": "shift_staff"},
  {"slot": "no_direct_speech", "child_voice": "absent", "adult_response": "present", "outcome": "present",
   "chronology": "clear", "direct_speech": "absent", "safeguarding_cue": "neutral", "action_ownership": "present",
   "pathway_need": "routine", "input_roughness": "observation_only", "adult_role": "shift_staff"},
  {"slot": "safeguarding_cue", "child_voice": "present", "adult_response": "present", "outcome": "absent",
   "chronology": "clear", "direct_speech": "present", "safeguarding_cue": "present", "action_ownership": "absent",
   "pathway_need": "safeguarding_consider", "input_roughness": "standard", "adult_role": "shift_staff"},
  {"slot": "meeting_ownership_gap", "child_voice": "present", "adult_response": "present", "outcome": "absent",
   "chronology": "clear", "direct_speech": "present", "safeguarding_cue": "neutral", "action_ownership": "absent",
   "pathway_need": "meeting_follow_up", "input_roughness": "standard", "adult_role": "meeting_chair"},
  {"slot": "plan_review_prompt", "child_voice": "present", "adult_response": "present", "outcome": "present",
   "chronology": "clear", "direct_speech": "present", "safeguarding_cue": "neutral", "action_ownership": "present",
   "pathway_need": "plan_review", "input_roughness": "standard", "adult_role": "key_worker"},
  {"slot": "professional_consultation", "child_voice": "present", "adult_response": "present", "outcome": "absent",
   "chronology": "clear", "direct_speech": "present", "safeguarding_cue": "neutral", "action_ownership": "present",
   "pathway_need": "professional_consultation", "input_roughness": "standard", "adult_role": "registered_manager"},
  {"slot": "high_risk_proportionate", "child_voice": "present", "adult_response": "present", "outcome": "absent",
   "chronology": "unclear", "direct_speech": "present", "safeguarding_cue": "present", "action_ownership": "absent",
   "pathway_need": "high_risk_consider", "input_roughness": "urgent_brief", "adult_role": "on_call_manager"},
)

VARIANTS_PER_CORE = 100
PROFILES_PER_DIMENSION_SLOT = 10


def _truncate_words(text: str, max_len: int) -> str:
    text = str(text or "").strip()
    if len(text) <= max_len:
        return text
    cut = text[:max_len].rsplit(" ", 1)[0].rstrip(".,;:")
    return cut or text[:max_len]


def profile_for_index(variant_index: int) -> dict[str, Any]:
    """Return profile metadata for variant_index 1–100."""
    if variant_index < 1 or variant_index > VARIANTS_PER_CORE:
        raise ValueError(f"variant_index must be 1–{VARIANTS_PER_CORE}, got {variant_index}")
    if variant_index <= len(VARIANT_TYPES):
        return {
            "variant_type": VARIANT_TYPES[variant_index - 1],
            "variant_index": variant_index,
            "dimension_slot": "base",
            **{k: v for k, v in DIMENSION_SLOTS[0].items() if k != "slot"},
        }
    slot_idx = (variant_index - 1) // PROFILES_PER_DIMENSION_SLOT
    base_type = VARIANT_TYPES[(variant_index - 1) % len(VARIANT_TYPES)]
    dimensions = DIMENSION_SLOTS[slot_idx]
    return {
        "variant_type": base_type,
        "variant_index": variant_index,
        "dimension_slot": dimensions["slot"],
        **{k: v for k, v in dimensions.items() if k != "slot"},
    }


def _apply_dimension_input(base_input: str, profile: dict[str, Any], core: dict[str, Any]) -> str:
    text = base_input
    roughness = profile.get("input_roughness", "standard")
    if roughness == "sparse":
        text = f"{_truncate_words(text, 90)} [brief note — detail missing]"
    elif roughness == "fragmented":
        text = f"Earlier… then later… {_truncate_words(text, 100)}"
    elif roughness == "observation_only":
        text = f"Observed: {_truncate_words(text.replace(' said ', ' showed '), 120)}"
    elif roughness == "urgent_brief":
        text = f"Urgent brief: {_truncate_words(text, 80)}"

    if profile.get("child_voice") == "absent":
        text = re.sub(r"(?i)\b(?:young person|child|yp)\s+said\b[^.!?]*[.!?]?\s*", "", text)
        text = re.sub(r"\s+", " ", text).strip(" .,;:")
        text = f"{text} [child words not recorded]"
    if profile.get("adult_response") == "absent":
        text = f"{text.strip()} [adult response not yet recorded]"
    if profile.get("outcome") == "absent":
        text = f"{text.strip()} [outcome not yet known]"
    if profile.get("chronology") == "unclear":
        text = f"Timeline unclear — {_truncate_words(text, 100)}"
    if profile.get("safeguarding_cue") == "present" and "safeguarding" not in text.lower():
        text = f"{text.strip()} possible safeguarding cue — responsible adult to review."
    if profile.get("action_ownership") == "absent":
        text = f"{text.strip()} [action owner not stated]"
    pathway = profile.get("pathway_need", "routine")
    if pathway == "plan_review":
        text = f"Plan review prompt: {_truncate_words(text, 140)}"
    elif pathway == "professional_consultation":
        text = f"Professional consultation to consider: {_truncate_words(text, 130)}"
    elif pathway == "meeting_follow_up":
        text = f"Meeting note — agreed actions unclear: {_truncate_words(text, 130)}"
    elif pathway == "high_risk_consider":
        flags = core.get("safeguarding_flags") or []
        if not flags:
            text = f"{_truncate_words(text, 120)} high-risk context — pathway for responsible adult to decide."
    role = profile.get("adult_role", "shift_staff")
    if role == "registered_manager":
        text = f"Manager perspective: {_truncate_words(text, 150)}"
    elif role == "on_call_manager":
        text = f"On-call manager brief: {_truncate_words(text, 130)}"
    elif role == "key_worker":
        text = f"Key-work note: {_truncate_words(text, 140)}"
    elif role == "meeting_chair":
        text = f"Meeting chair note: {_truncate_words(text, 140)}"
    return text.strip()


def build_variant_input(core: dict[str, Any], profile: dict[str, Any], base_input_fn) -> str:
    """Build variant input using base transform then dimension modifiers."""
    variant_type = profile["variant_type"]
    variant_num = profile["variant_index"]
    base = base_input_fn(core, variant_type, variant_num)
    return _apply_dimension_input(base, profile, core)


def build_variant_record(core: dict[str, Any], variant_index: int, base_input_fn) -> dict[str, Any]:
    """Build one canonical variant scenario record."""
    profile = profile_for_index(variant_index)
    core_id = core["scenario_id"]
    variant_type = profile["variant_type"]
    variant_id = f"{core_id}_v{variant_index:03d}_{variant_type}"
    inp = build_variant_input(core, profile, base_input_fn)

    variant: dict[str, Any] = {
        **{k: v for k, v in core.items() if k not in ("baseline_id", "source_baseline_id")},
        "scenario_id": variant_id,
        "title": f"{core['title']} — {variant_type.replace('_', ' ')} ({profile.get('dimension_slot', 'base')})",
        "source": "variants10000_generator",
        "parent_scenario_id": core_id,
        "variant_type": variant_type,
        "variant_index": variant_index,
        "variant_dimensions": {k: profile.get(k) for k in (
            "dimension_slot", "child_voice", "adult_response", "outcome", "chronology",
            "direct_speech", "safeguarding_cue", "action_ownership", "pathway_need",
            "input_roughness", "adult_role",
        )},
        "input": inp,
        "synthetic_data_confirmation": True,
    }
    ft_map = {
        "rough_note": "Magic Notes",
        "voice_dictate_transcript": "Voice",
        "manager_oversight": "Management oversight",
        "reg44_evidence": "Regulation evidence",
        "reflective_supervision": "Management oversight",
    }
    if variant_type in ft_map:
        variant["feature_target"] = ft_map[variant_type]
    if profile.get("pathway_need") == "plan_review":
        variant["quality_focus"] = f"{core.get('quality_focus', '')} — plan review prompt".strip(" —")
    return variant


def build_all_variants_for_core(core: dict[str, Any], base_input_fn) -> list[dict[str, Any]]:
    return [build_variant_record(core, i, base_input_fn) for i in range(1, VARIANTS_PER_CORE + 1)]
