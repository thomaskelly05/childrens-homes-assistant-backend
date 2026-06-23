"""Shared helpers for ORB residential benchmark prompt definitions."""

from __future__ import annotations

from typing import Any

RESIDENTIAL_BANNED_WORDING: tuple[str, ...] = (
    "DSL",
    "Designated Safeguarding Lead",
    "school DSL",
    "young person's name",
)

EDUCATION_ALLOWED_DSL: tuple[str, ...] = ("school DSL", "DSL")


def build_benchmark_prompt(
    prompt_id: str,
    prompt: str,
    contract_family: str,
    prompt_tier: str,
    active_domains: list[str],
    source_chips: list[str],
    answer_shape: list[str],
    *,
    escalation: str = "",
    char_cap: int | None = None,
    extra_banned: tuple[str, ...] = (),
    education_context: bool = False,
    allow_dsl: bool = False,
    skip_diagnosis_firewall: bool = False,
) -> dict[str, Any]:
    banned = list(RESIDENTIAL_BANNED_WORDING)
    if education_context and allow_dsl:
        banned = [b for b in banned if b not in {"DSL", "Designated Safeguarding Lead"}]
    banned.extend(extra_banned)
    return {
        "prompt_id": prompt_id,
        "prompt": prompt,
        "expected_contract_family": contract_family,
        "expected_prompt_tier": prompt_tier,
        "expected_active_domains": active_domains,
        "expected_source_chips": source_chips,
        "expected_answer_shape": answer_shape,
        "banned_wording": banned,
        "escalation_expectations": escalation,
        "prompt_char_cap": char_cap,
        "education_context": education_context,
        "allow_dsl": allow_dsl,
        "skip_diagnosis_firewall": skip_diagnosis_firewall,
    }
