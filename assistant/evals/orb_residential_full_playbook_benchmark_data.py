"""ORB Residential full playbook benchmark — 54 categories × 5 prompts = 270."""

from __future__ import annotations

from typing import Any

from assistant.evals.orb_benchmark_prompt_helpers import build_benchmark_prompt
from assistant.evals.orb_residential_full_playbook_category_specs import PLAYBOOK_CATEGORY_SPECS

PACK_VERSION = "orb-residential-full-playbook-benchmark-v1"


def _build_category_pack() -> list[dict[str, Any]]:
    pack: list[dict[str, Any]] = []
    for spec in PLAYBOOK_CATEGORY_SPECS:
        defaults = dict(spec.get("defaults") or {})
        prompts: list[dict[str, Any]] = []
        for prompt_id, prompt_text, *overrides in spec["prompts"]:
            override = overrides[0] if overrides else {}
            merged = {**defaults, **override}
            prompts.append(
                build_benchmark_prompt(
                    prompt_id,
                    prompt_text,
                    merged["contract_family"],
                    merged["prompt_tier"],
                    merged["active_domains"],
                    merged["source_chips"],
                    merged["answer_shape"],
                    escalation=merged.get("escalation", ""),
                    char_cap=merged.get("char_cap"),
                    extra_banned=tuple(merged.get("extra_banned") or ()),
                    education_context=bool(merged.get("education_context")),
                    allow_dsl=bool(merged.get("allow_dsl")),
                    skip_diagnosis_firewall=bool(merged.get("skip_diagnosis_firewall")),
                )
            )
        pack.append(
            {
                "category_id": spec["category_id"],
                "label": spec["label"],
                "prompts": prompts,
            }
        )
    return pack


CATEGORY_BENCHMARK_PACK: list[dict[str, Any]] = _build_category_pack()


def all_category_prompts() -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for category in CATEGORY_BENCHMARK_PACK:
        for prompt in category["prompts"]:
            rows.append(
                {
                    "category_id": category["category_id"],
                    "category_label": category["label"],
                    **prompt,
                }
            )
    return rows


def category_ids() -> list[str]:
    return [category["category_id"] for category in CATEGORY_BENCHMARK_PACK]
