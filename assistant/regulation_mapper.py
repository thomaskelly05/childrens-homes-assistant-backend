from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class RegulationReference:
    key: str
    label: str
    source_type: str
    rationale: str


@dataclass
class RegulationMappingResult:
    primary_references: list[RegulationReference] = field(default_factory=list)
    secondary_references: list[RegulationReference] = field(default_factory=list)

    def all_references(self) -> list[RegulationReference]:
        return [*self.primary_references, *self.secondary_references]


REGULATION_LIBRARY: dict[str, RegulationReference] = {
    "reg12": RegulationReference(
        key="reg12",
        label="Regulation 12 – Protection of children",
        source_type="regulation",
        rationale="Relevant where safeguarding, allegations, missing episodes, exploitation, violence, or immediate safety concerns are present.",
    ),
    "reg13": RegulationReference(
        key="reg13",
        label="Regulation 13 – Leadership and management standard",
        source_type="regulation",
        rationale="Relevant where management oversight, quality assurance, accountability, or provider-level follow-up are in view.",
    ),
    "reg14": RegulationReference(
        key="reg14",
        label="Regulation 14 – Care planning standard",
        source_type="regulation",
        rationale="Relevant where plans, risk strategies, support planning, placement planning, or review of planned responses are involved.",
    ),
    "qs_protection": RegulationReference(
        key="qs_protection",
        label="Quality Standards – The protection of children standard",
        source_type="quality_standard",
        rationale="Relevant where responses concern safeguarding, risk reduction, safe care, and protection.",
    ),
    "qs_leadership": RegulationReference(
        key="qs_leadership",
        label="Quality Standards – The leadership and management standard",
        source_type="quality_standard",
        rationale="Relevant where oversight, staff practice quality, management follow-up, or organisational accountability are involved.",
    ),
    "qs_care_planning": RegulationReference(
        key="qs_care_planning",
        label="Quality Standards – The care planning standard",
        source_type="quality_standard",
        rationale="Relevant where support plans, risk plans, placement plans, or review of plans are involved.",
    ),
    "qs_views": RegulationReference(
        key="qs_views",
        label="Quality Standards – The children’s views, wishes and feelings standard",
        source_type="quality_standard",
        rationale="Relevant where the child’s voice, wishes, preferences, or lived experience should remain visible.",
    ),
    "sccif": RegulationReference(
        key="sccif",
        label="Ofsted SCCIF for children’s homes",
        source_type="inspection_framework",
        rationale="Relevant where inspection-readiness, evidence quality, lived experience, leadership, and impact of care are considered.",
    ),
    "guide": RegulationReference(
        key="guide",
        label="Guide to the Children’s Homes Regulations including the Quality Standards",
        source_type="guidance",
        rationale="Relevant where statutory guidance and interpretation of regulations and standards should shape the response.",
    ),
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _contains_any(text: str, keywords: set[str]) -> bool:
    text = _safe_string(text).lower()
    return any(keyword in text for keyword in keywords)


def _add_reference(target: list[RegulationReference], key: str) -> None:
    ref = REGULATION_LIBRARY.get(key)
    if not ref:
        return
    if any(existing.key == ref.key for existing in target):
        return
    target.append(ref)


def map_regulation_references(
    *,
    message: str,
    mode: str,
    task_type: str,
    output_type: str,
    safeguarding_level: str,
    urgency: str,
    user_role_profile: str,
    response_stance: str = "practice_support",
) -> RegulationMappingResult:
    text = _safe_string(message).lower()
    result = RegulationMappingResult()

    high_safeguarding = safeguarding_level in {"heightened", "urgent"} or urgency == "urgent"
    planning_context = task_type == "planning" or mode == "support_planning" or output_type == "risk_summary"
    leadership_context = (
        user_role_profile in {"manager", "provider"}
        or task_type == "review"
        or mode in {"manager_review", "document_review", "supervision"}
        or response_stance == "management"
    )
    inspection_context = _contains_any(
        text,
        {"ofsted", "inspection", "inspect", "sccif", "inspection ready", "defensible"},
    )
    views_context = _contains_any(
        text,
        {"child said", "young person said", "views", "wishes", "feelings", "voice", "lived experience"},
    )

    if high_safeguarding:
        _add_reference(result.primary_references, "reg12")
        _add_reference(result.primary_references, "qs_protection")
        _add_reference(result.secondary_references, "guide")

    if planning_context:
        _add_reference(result.primary_references, "reg14")
        _add_reference(result.primary_references, "qs_care_planning")
        _add_reference(result.secondary_references, "guide")

    if leadership_context:
        _add_reference(result.primary_references, "reg13")
        _add_reference(result.primary_references, "qs_leadership")

    if inspection_context:
        _add_reference(result.secondary_references, "sccif")

    if views_context:
        _add_reference(result.secondary_references, "qs_views")

    if _contains_any(
        text,
        {
            "regulation",
            "regulations",
            "quality standard",
            "quality standards",
            "statutory",
            "guide",
            "law",
            "legal",
            "policy",
            "guidance",
        },
    ):
        _add_reference(result.secondary_references, "guide")

    return result


def build_regulation_context_block(mapping: RegulationMappingResult) -> str:
    refs = mapping.all_references()
    if not refs:
        return ""

    lines = [
        "Where relevant, anchor the response to the following regulatory and standards context.",
        "Do not force formal citations into every answer, but make the basis visible where it improves trust, defensibility, or clarity.",
        "",
        "Relevant references:",
    ]

    for ref in refs:
        lines.append(f"• {ref.label} — {ref.rationale}")

    return "\n".join(lines).strip()


def serialise_regulation_mapping(mapping: RegulationMappingResult) -> list[dict[str, str]]:
    serialised: list[dict[str, str]] = []

    for ref in mapping.all_references():
        serialised.append(
            {
                "key": ref.key,
                "label": ref.label,
                "source_type": ref.source_type,
                "rationale": ref.rationale,
            }
        )

    return serialised
