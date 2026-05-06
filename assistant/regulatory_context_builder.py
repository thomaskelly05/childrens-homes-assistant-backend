from __future__ import annotations

"""Build regulatory context for adult-facing children’s homes answers.

This bridges the older keyword regulation mapper with the controlled quote
registry. Prompt builders and response metadata builders should use this module
instead of manually joining regulation labels.
"""

from typing import Any

from assistant.regulation_mapper import (
    RegulationMappingResult,
    build_regulation_context_block,
    map_regulation_references,
    serialise_regulation_mapping,
)
from assistant.regulation_quote_registry import (
    build_regulatory_basis,
    build_regulatory_prompt_block,
    get_regulation_quote,
    regulation_quote_to_source,
)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _dedupe_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    result: list[dict[str, Any]] = []
    seen: set[str] = set()

    for source in sources:
        if not isinstance(source, dict):
            continue

        key = "|".join(
            _safe_string(source.get(field))
            for field in ("citation_ref", "label", "url", "section")
        )
        if key in seen:
            continue
        seen.add(key)
        result.append(source)

    return result


def _quote_keys_from_mapping(mapping: RegulationMappingResult) -> list[str]:
    keys: list[str] = []
    for ref in mapping.all_references():
        if get_regulation_quote(ref.key):
            keys.append(ref.key)
    return keys


def build_adult_regulatory_context(
    *,
    message: str,
    mode: str = "",
    task_type: str = "",
    output_type: str = "",
    safeguarding_level: str = "normal",
    urgency: str = "routine",
    user_role_profile: str = "staff",
    response_stance: str = "practice_support",
) -> dict[str, Any]:
    """Return prompt, metadata and source objects for regulatory grounding.

    The result is safe to add to runtime metadata and prompt construction.
    It intentionally separates:
    - mapped references: labels/rationales from the mapper
    - regulatory_basis: controlled quotes and plain-English meaning
    - regulatory_sources: UI/source-panel objects
    - prompt_block: complete prompt-safe context block
    """
    mapping = map_regulation_references(
        message=message,
        mode=mode,
        task_type=task_type,
        output_type=output_type,
        safeguarding_level=safeguarding_level,
        urgency=urgency,
        user_role_profile=user_role_profile,
        response_stance=response_stance,
    )

    quote_keys = _quote_keys_from_mapping(mapping)
    mapped_block = build_regulation_context_block(mapping)
    quote_block = build_regulatory_prompt_block(quote_keys)

    blocks = [block for block in (mapped_block, quote_block) if block]

    regulatory_sources = _dedupe_sources(
        [
            regulation_quote_to_source(quote)
            for quote in (get_regulation_quote(key) for key in quote_keys)
            if quote is not None
        ]
    )

    return {
        "mapped_references": serialise_regulation_mapping(mapping),
        "regulatory_basis": build_regulatory_basis(quote_keys),
        "regulatory_sources": regulatory_sources,
        "regulatory_source_count": len(regulatory_sources),
        "prompt_block": "\n\n".join(blocks).strip(),
    }


def merge_regulatory_sources(
    existing_sources: list[dict[str, Any]] | None,
    regulatory_context: dict[str, Any] | None,
) -> list[dict[str, Any]]:
    """Merge regulatory source objects into an existing source list."""
    existing = existing_sources if isinstance(existing_sources, list) else []
    regulatory = []
    if isinstance(regulatory_context, dict):
        maybe_sources = regulatory_context.get("regulatory_sources")
        if isinstance(maybe_sources, list):
            regulatory = maybe_sources

    return _dedupe_sources([*existing, *regulatory])


def build_regulatory_answer_contract(regulatory_context: dict[str, Any]) -> str:
    """Build user-facing answer rules when regulation material is present."""
    if not isinstance(regulatory_context, dict):
        return ""

    basis = regulatory_context.get("regulatory_basis")
    if not isinstance(basis, list) or not basis:
        return ""

    return """
REGULATORY ANSWER CONTRACT
- If the adult asks what a regulation, SCCIF or statutory guidance requires, label the relevant regulation or framework.
- Include a short quote only when it directly helps answer the question.
- Explain the practical meaning for the worker, manager, RI or provider.
- Do not claim legal certainty where facts are missing.
- Do not use regulation text as evidence that something happened in the OS record.
- For record-specific OS answers, cite OS evidence separately using record citation refs.
""".strip()
