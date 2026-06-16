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
        refs: list[RegulationReference] = []
        seen: set[str] = set()

        for ref in [*self.primary_references, *self.secondary_references]:
            if ref.key in seen:
                continue
            seen.add(ref.key)
            refs.append(ref)

        return refs


REGULATION_LIBRARY: dict[str, RegulationReference] = {
    "reg12": RegulationReference(
        key="reg12",
        label="Regulation 12 – The protection of children standard",
        source_type="regulation",
        rationale="Relevant where safeguarding, allegations, missing episodes, exploitation, violence, self-harm, restraint concerns, or immediate safety concerns are present.",
    ),
    "reg13": RegulationReference(
        key="reg13",
        label="Regulation 13 – The leadership and management standard",
        source_type="regulation",
        rationale="Relevant where management oversight, quality assurance, accountability, staffing, governance, or provider-level follow-up are in view.",
    ),
    "reg14": RegulationReference(
        key="reg14",
        label="Regulation 14 – The care planning standard",
        source_type="regulation",
        rationale="Relevant where care plans, risk strategies, support planning, placement planning, review, or planned responses are involved.",
    ),
    "reg40": RegulationReference(
        key="reg40",
        label="Regulation 40 – Notification of a serious event",
        source_type="regulation",
        rationale="Relevant where serious incidents, police involvement, safeguarding notifications, serious injury, child protection concerns, or notifiable events may be in view.",
    ),
    "reg44": RegulationReference(
        key="reg44",
        label="Regulation 44 – Independent person visits",
        source_type="regulation",
        rationale="Relevant where independent monitoring, monthly visits, scrutiny, service quality, and children’s experiences of the home are being considered.",
    ),
    "reg45": RegulationReference(
        key="reg45",
        label="Regulation 45 – Review of quality of care",
        source_type="regulation",
        rationale="Relevant where the home is reviewing quality of care, outcomes, patterns, leadership, safeguarding, children’s views, and improvement priorities.",
    ),
    "qs_protection": RegulationReference(
        key="qs_protection",
        label="Quality Standard – The protection of children standard",
        source_type="quality_standard",
        rationale="Relevant where responses concern safeguarding, risk reduction, safe care, and protection.",
    ),
    "qs_leadership": RegulationReference(
        key="qs_leadership",
        label="Quality Standard – The leadership and management standard",
        source_type="quality_standard",
        rationale="Relevant where oversight, staff practice quality, management follow-up, governance, or organisational accountability are involved.",
    ),
    "qs_care_planning": RegulationReference(
        key="qs_care_planning",
        label="Quality Standard – The care planning standard",
        source_type="quality_standard",
        rationale="Relevant where support plans, risk plans, placement plans, pathway planning, or review of plans are involved.",
    ),
    "qs_views": RegulationReference(
        key="qs_views",
        label="Quality Standard – The children’s views, wishes and feelings standard",
        source_type="quality_standard",
        rationale="Relevant where the child’s voice, wishes, preferences, complaints, consultation, or lived experience should remain visible.",
    ),
    "qs_health": RegulationReference(
        key="qs_health",
        label="Quality Standard – The health and well-being standard",
        source_type="quality_standard",
        rationale="Relevant where physical health, emotional wellbeing, mental health, medication, appointments, or therapeutic support are in view.",
    ),
    "qs_education": RegulationReference(
        key="qs_education",
        label="Quality Standard – The education standard",
        source_type="quality_standard",
        rationale="Relevant where education, attendance, learning, school engagement, PEPs, or educational progress are in view.",
    ),
    "qs_relationships": RegulationReference(
        key="qs_relationships",
        label="Quality Standard – The positive relationships standard",
        source_type="quality_standard",
        rationale="Relevant where staff relationships, family time, peer relationships, behaviour support, boundaries, and relational practice are in view.",
    ),
    "sccif": RegulationReference(
        key="sccif",
        label="Ofsted SCCIF for children’s homes",
        source_type="inspection_framework",
        rationale="Relevant where inspection evidence preparation, evidence quality, lived experience, leadership, safeguarding, and impact of care are considered.",
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
    safe_text = _safe_string(text).lower()
    return any(keyword in safe_text for keyword in keywords)


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

    high_safeguarding = safeguarding_level in {"heightened", "urgent", "serious"} or urgency in {"heightened", "urgent"}
    planning_context = task_type == "planning" or mode == "support_planning" or output_type in {"risk_summary", "support_plan"}
    leadership_context = (
        user_role_profile in {"manager", "provider"}
        or task_type in {"review", "report"}
        or mode in {"manager_review", "document_review", "supervision", "quality_review", "inspection_review"}
        or response_stance == "management"
    )
    inspection_context = _contains_any(
        text,
        {"ofsted", "inspection", "inspect", "sccif", "inspection evidence preparation", "defensible", "audit trail", "evidence pack"},
    )
    views_context = _contains_any(
        text,
        {"child said", "young person said", "views", "wishes", "feelings", "voice", "lived experience", "what is going well"},
    )

    if high_safeguarding or _contains_any(text, {"safeguarding", "missing", "exploitation", "self-harm", "suicidal", "allegation", "police"}):
        _add_reference(result.primary_references, "reg12")
        _add_reference(result.primary_references, "qs_protection")
        _add_reference(result.secondary_references, "guide")

    if planning_context or _contains_any(text, {"support plan", "care plan", "risk assessment", "placement plan"}):
        _add_reference(result.primary_references, "reg14")
        _add_reference(result.primary_references, "qs_care_planning")
        _add_reference(result.secondary_references, "guide")

    if leadership_context:
        _add_reference(result.primary_references, "reg13")
        _add_reference(result.primary_references, "qs_leadership")

    if _contains_any(text, {"reg 40", "regulation 40", "notify", "notification", "serious event", "serious incident"}):
        _add_reference(result.primary_references, "reg40")

    if _contains_any(text, {"reg 44", "regulation 44", "independent person", "monthly visit"}):
        _add_reference(result.primary_references, "reg44")

    if _contains_any(text, {"reg 45", "reg45", "regulation 45", "quality of care review", "review of quality of care"}):
        _add_reference(result.primary_references, "reg45")
        _add_reference(result.primary_references, "reg13")
        _add_reference(result.secondary_references, "sccif")
        _add_reference(result.secondary_references, "guide")

    if inspection_context:
        _add_reference(result.secondary_references, "sccif")

    if views_context:
        _add_reference(result.secondary_references, "qs_views")

    if _contains_any(text, {"health", "wellbeing", "mental health", "medication", "appointment"}):
        _add_reference(result.secondary_references, "qs_health")

    if _contains_any(text, {"education", "school", "college", "pep", "attendance"}):
        _add_reference(result.secondary_references, "qs_education")

    if _contains_any(text, {"relationship", "family", "contact", "staff relationship", "positive relationship"}):
        _add_reference(result.secondary_references, "qs_relationships")

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
        "Do not force formal legal wording into every answer, but make the basis visible where it improves trust, defensibility, or clarity.",
        "Do not claim legal certainty beyond the information available.",
        "",
        "Relevant references:",
    ]

    for ref in refs:
        lines.append(f"• {ref.label} — {ref.rationale}")

    return "\n".join(lines).strip()


def serialise_regulation_mapping(mapping: RegulationMappingResult) -> list[dict[str, str]]:
    return [
        {
            "key": ref.key,
            "label": ref.label,
            "source_type": ref.source_type,
            "rationale": ref.rationale,
        }
        for ref in mapping.all_references()
    ]