"""Final-answer contract validation against the universal ORB answer contract map."""

from __future__ import annotations

import re
from typing import Any

from services.orb_placeholder_quality_guard_service import (
    BROKEN_PLACEHOLDER_RE,
    find_placeholder_issues,
    sanitize_placeholders_in_answer,
)
from services.orb_universal_answer_contract_map_service import (
    UNIVERSAL_FORBIDDEN_PATTERNS,
    find_forbidden_patterns,
    get_contract_family,
    sanitize_final_answer,
)

# Marker groups: at least one alternative in each group must appear in the answer.
FAMILY_MARKER_GROUPS: dict[str, list[tuple[str, tuple[str, ...]]]] = {
    "accessible_child_support_plan": [
        ("child_facing_title", ("my support plan", "support plan")),
        ("dreams_aspirations", ("my dreams", "my future", "my aspirations", "dreams and future", "dreams and aspirations")),
        ("communication_tools", ("my widgets", "widgets and how i communicate", "how i communicate", "aac", "communication tools")),
        ("say_yes", ("how i say yes", "yes:", "yes —", "yes -")),
        ("say_no", ("how i say no", "no:", "no —", "no -")),
        ("say_stop", ("how i say stop", "stop:", "stop —", "stop -")),
        ("ask_help", ("how i ask for help", "help:", "help —", "help -", "ask for help")),
        ("show_pain", ("how i show pain", "pain/unwell", "pain or discomfort", "show pain")),
        ("show_worry", ("how i show worry", "worried/upset", "worry or upset", "show worry")),
        ("what_helps", ("what helps me", "helps me feel calm")),
        ("adults_should", ("how adults should support", "adults should:", "adults should")),
        ("adults_should_not", ("things adults should not", "adults should not", "should not do")),
        ("independence", ("independence goals", "preparing for adulthood", "before adulthood", "my independence")),
        ("adult_guidance", ("adult guidance for using", "adult guidance", "guidance for using this plan")),
    ],
}

# Additional forbidden patterns per family (beyond universal list).
FAMILY_EXTRA_FORBIDDEN: dict[str, tuple[str, ...]] = {
    "accessible_child_support_plan": (
        "creating a child-friendly support plan",
        "here's a structured template",
        "here is a structured template",
        "tailored to their individual needs",
        "tailored to the young person's individual needs",
        "requires a focus on",
        "support strategies without",
    ),
}

GENERIC_AI_INTRO_RE = re.compile(
    r"^(?:creating a|here['']s a structured|here is a structured|this template is designed|"
    r"tailored to (?:their|the young person))",
    re.IGNORECASE | re.MULTILINE,
)


def _find_missing_marker_groups(answer: str, family_id: str) -> list[str]:
    groups = FAMILY_MARKER_GROUPS.get(family_id) or []
    lowered = (answer or "").lower()
    missing: list[str] = []
    for group_id, alternatives in groups:
        if not any(alt in lowered for alt in alternatives):
            missing.append(group_id)
    return missing


def _find_family_forbidden(answer: str, family_id: str | None) -> list[str]:
    hits = find_forbidden_patterns(answer, family_id=family_id)
    lowered = (answer or "").lower()
    extra = FAMILY_EXTRA_FORBIDDEN.get(family_id or "", ())
    seen = {h.lower() for h in hits}
    for pattern in extra:
        key = pattern.lower().strip()
        if key in lowered and key not in seen:
            seen.add(key)
            hits.append(pattern)
    if GENERIC_AI_INTRO_RE.search(answer or ""):
        if "generic_ai_introduction" not in hits:
            hits.append("generic_ai_introduction")
    return hits


def _build_repair_instructions(
    *,
    family_id: str | None,
    missing_markers: list[str],
    forbidden_patterns: list[str],
    placeholder_issues: list[str],
) -> list[str]:
    instructions: list[str] = []
    family = get_contract_family(family_id) or {}

    if family_id == "accessible_child_support_plan":
        instructions.append(
            "Rewrite as a child-facing support plan titled 'My Support Plan' with numbered sections."
        )
        instructions.append(
            "Centre widgets/AAC communication. Include yes/no/stop/help/pain/worried/happy markers."
        )
        instructions.append("Include dreams, independence goals, preparing for adulthood, and adult guidance.")
        instructions.append("Do not use generic AI introductions or internal contract names.")

    for marker in missing_markers:
        instructions.append(f"Add required content for: {marker.replace('_', ' ')}")
    for pattern in forbidden_patterns:
        instructions.append(f"Remove forbidden phrasing: {pattern}")
    for issue in placeholder_issues:
        instructions.append(f"Fix placeholder: {issue}")
    if not instructions and family:
        for section in (family.get("required_sections") or [])[:6]:
            instructions.append(f"Include section: {section}")
    return instructions


def validate_final_answer_contract(
    answer: str,
    *,
    contract_family: str | None,
    depth_tier: str | None = None,
    mode: str | None = None,
    public_explainability: bool = True,
    fast_opening: str | None = None,
    current_user_role: str | None = None,
) -> dict[str, Any]:
    """Validate final answer text against the selected answer contract."""
    _ = (depth_tier, mode, public_explainability, current_user_role)
    sanitized = sanitize_final_answer(
        answer,
        family_id=contract_family,
        fast_opening=fast_opening,
    )
    sanitized, placeholder_issues = sanitize_placeholders_in_answer(sanitized)
    forbidden = list(
        dict.fromkeys(
            _find_family_forbidden(answer, contract_family)
            + _find_family_forbidden(sanitized, contract_family)
        )
    )
    missing_markers = _find_missing_marker_groups(sanitized, contract_family or "")
    if not missing_markers and contract_family and contract_family not in FAMILY_MARKER_GROUPS:
        from services.orb_universal_answer_contract_map_service import find_missing_markers

        missing_markers.extend(find_missing_markers(sanitized, family_id=contract_family))
    if BROKEN_PLACEHOLDER_RE.search(sanitized) and "broken_truncated_placeholder" not in forbidden:
        forbidden.append("broken_truncated_placeholder")
        placeholder_issues.append("broken_truncated_placeholder_remaining")

    passed = not forbidden and not missing_markers and not placeholder_issues
    repair_instructions = [] if passed else _build_repair_instructions(
        family_id=contract_family,
        missing_markers=missing_markers,
        forbidden_patterns=forbidden,
        placeholder_issues=placeholder_issues,
    )

    return {
        "passed": passed,
        "family_id": contract_family,
        "sanitized_answer": sanitized,
        "missing_required_markers": missing_markers,
        "forbidden_patterns": forbidden,
        "placeholder_issues": placeholder_issues,
        "repair_instructions": repair_instructions,
    }


def evaluate_answer_quality_report(
    message: str,
    answer: str,
    *,
    fast_opening: str | None = None,
) -> dict[str, Any]:
    """Combined routing + final answer quality report for QA harness."""
    from services.orb_universal_answer_contract_map_service import (
        detect_contract_family,
        evaluate_routing_contract,
    )

    routing = evaluate_routing_contract(message)
    family_id = routing.get("contract_family") or detect_contract_family(message)
    validation = validate_final_answer_contract(
        answer,
        contract_family=family_id,
        depth_tier=routing.get("depth_tier"),
        fast_opening=fast_opening,
    )
    return {
        "contract_selection_passed": True,
        "contract_family": family_id,
        "expected_contract": family_id,
        "depth_tier": routing.get("depth_tier"),
        "final_answer_quality_passed": validation["passed"],
        "missing_markers": validation["missing_required_markers"],
        "forbidden_patterns": validation["forbidden_patterns"],
        "placeholder_issues": validation["placeholder_issues"],
        "notes": validation["repair_instructions"][:8],
        "routing": routing,
        "validation": validation,
    }


orb_final_answer_contract_validator_service = type(
    "OrbFinalAnswerContractValidatorService",
    (),
    {
        "FAMILY_MARKER_GROUPS": FAMILY_MARKER_GROUPS,
        "UNIVERSAL_FORBIDDEN": UNIVERSAL_FORBIDDEN_PATTERNS,
        "validate_final_answer_contract": staticmethod(validate_final_answer_contract),
        "evaluate_answer_quality_report": staticmethod(evaluate_answer_quality_report),
    },
)()
