"""ORB Quality Lab source coverage risk map — highlights traceability gaps."""

from __future__ import annotations

from typing import Any

from assistant.evals.orb_external_framework_traceability import (
    build_traceability_report_section,
    load_rubric_traceability,
    load_scenario_expectation_traceability,
    source_index,
)
from assistant.evals.orb_residential_quality_rubric import RUBRIC_CATEGORIES

# Domains flagged for paragraph-level source deepening (known governance gaps).
HIGH_RISK_DOMAIN_GAPS: tuple[dict[str, Any], ...] = (
    {
        "domain": "restraint_physical_intervention",
        "label": "Restraint / physical intervention guidance",
        "risk_level": "high",
        "status": "partial_or_internal",
        "notes": "Scenario variants exist; dedicated statutory/professional source paragraphs not yet mapped.",
    },
    {
        "domain": "missing_from_care",
        "label": "Missing-from-care protocols",
        "risk_level": "high",
        "status": "partial",
        "notes": "Reg 40 / missing episodes referenced; paragraph-level traceability needs deepening.",
    },
    {
        "domain": "medication_recording",
        "label": "Medication recording standards",
        "risk_level": "high",
        "status": "emerging",
        "notes": "Health recording scenarios rely partly on practice-informed internal evidence.",
    },
    {
        "domain": "allegations_against_adults",
        "label": "Allegations against adults",
        "risk_level": "high",
        "status": "partial",
        "notes": "Safeguarding family mapped; allegations-specific source depth limited.",
    },
    {
        "domain": "peer_on_peer_harm",
        "label": "Peer-on-peer harmful behaviour",
        "risk_level": "high",
        "status": "emerging",
        "notes": "Behaviour/safeguarding overlap; dedicated peer-abuse source mapping thin.",
    },
    {
        "domain": "online_exploitation",
        "label": "Online exploitation concerns",
        "risk_level": "high",
        "status": "emerging",
        "notes": "CEOP/online safety sources not yet paragraph-mapped in traceability registry.",
    },
    {
        "domain": "complaints",
        "label": "Complaints",
        "risk_level": "medium",
        "status": "partial",
        "notes": "Reg 44/45 evidence themes cover oversight; complaints-specific mapping limited.",
    },
    {
        "domain": "deprivation_liberty_restriction",
        "label": "Deprivation / liberty / restriction language",
        "risk_level": "high",
        "status": "emerging",
        "notes": "DoLS/restriction recording boundaries need explicit external source paragraphs.",
    },
    {
        "domain": "equality_identity_recording",
        "label": "Equality / identity recording",
        "risk_level": "medium",
        "status": "emerging",
        "notes": "Equality Act / identity-affirming recording relies on emerging internal mapping.",
    },
    {
        "domain": "health_mental_health_boundaries",
        "label": "Health / mental health boundaries",
        "risk_level": "high",
        "status": "partial",
        "notes": "NICE referenced; clinical/diagnostic boundary language needs continued governance.",
    },
    {
        "domain": "family_contact_risk",
        "label": "Family contact risk patterns",
        "risk_level": "medium",
        "status": "partial",
        "notes": "Contact risk scenarios mapped at family level; contact-specific sources thin.",
    },
)


def _family_strength(family: dict[str, Any]) -> tuple[float, str]:
    ext_ids = family.get("external_source_ids") or []
    strength = str(family.get("evidence_strength") or "emerging")
    score_map = {"high": 3.0, "medium": 2.0, "emerging": 1.0, "internal_only": 0.5}
    base = score_map.get(strength, 1.0)
    bonus = min(len(ext_ids) * 0.15, 0.6)
    return base + bonus, strength


def build_source_coverage_risk_map(
    *,
    scenario_count: int = 1000,
    variants_report: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build JSON risk map for Quality Lab governance."""
    trace = build_traceability_report_section()
    rubric = load_rubric_traceability()
    scenario_map = load_scenario_expectation_traceability()
    src_index = source_index()

    categories = rubric.get("categories") or []
    internal_heavy: list[dict[str, Any]] = []
    for entry in categories:
        strength = str(entry.get("evidence_strength") or "")
        ext = entry.get("external_source_ids") or []
        if strength in {"emerging", "internal_only"} or len(ext) <= 1:
            internal_heavy.append(
                {
                    "rubric_category": entry.get("rubric_category"),
                    "evidence_strength": strength,
                    "external_source_count": len(ext),
                }
            )

    families = scenario_map.get("scenario_family_mappings") or []
    ranked_families = sorted(
        (
            {
                "scenario_family": f.get("scenario_family"),
                "evidence_strength": f.get("evidence_strength"),
                "external_source_count": len(f.get("external_source_ids") or []),
                "mapping_score": _family_strength(f)[0],
            }
            for f in families
        ),
        key=lambda x: float(x["mapping_score"]),
    )

    weakest_families = ranked_families[:4]
    strongest_families = list(reversed(ranked_families[-4:]))

    weakest_categories: list[dict[str, Any]] = []
    if variants_report:
        cat_avgs = variants_report.get("category_averages") or {}
        weakest_categories = [
            {"category": cat, "average_score": avg}
            for cat, avg in sorted(cat_avgs.items(), key=lambda x: float(x[1]))[:4]
        ]

    highest_risk_families = (
        (variants_report or {}).get("highest_risk_scenario_families") or weakest_families[:5]
    )

    return {
        "generated_for": "orb_quality_lab_governance",
        "scenario_variants_scored": scenario_count,
        "traceability_summary": {
            "rubric_external_coverage_percent": trace.get("rubric_external_coverage_percent"),
            "unsafe_flags_with_external_basis": trace.get("unsafe_flags_with_external_basis"),
            "unsafe_flags_total": trace.get("unsafe_flags_total"),
            "scenario_required_elements_mapped": trace.get("scenario_required_elements_mapped"),
            "scenario_required_elements_total": trace.get("scenario_required_elements_total"),
            "scenario_prohibited_elements_mapped": trace.get("scenario_prohibited_elements_mapped"),
            "scenario_prohibited_elements_total": trace.get("scenario_prohibited_elements_total"),
            "scenario_families_mapped": trace.get("scenario_families_mapped"),
            "scenario_families_total": trace.get("scenario_families_total"),
            "registered_sources": trace.get("source_count"),
        },
        "rubric_categories_covered_by_external_sources": trace.get("rubric_categories_externally_mapped"),
        "rubric_categories_total": trace.get("rubric_categories_total"),
        "unsafe_flags_covered_by_external_sources": trace.get("unsafe_flags_with_external_basis"),
        "scenario_required_elements_covered": trace.get("scenario_required_elements_mapped"),
        "scenario_prohibited_elements_covered": trace.get("scenario_prohibited_elements_mapped"),
        "scenario_families_strongest_mapping": strongest_families,
        "scenario_families_weakest_mapping": weakest_families,
        "categories_relying_on_internal_or_emerging_evidence": internal_heavy,
        "high_risk_domains_needing_source_deepening": list(HIGH_RISK_DOMAIN_GAPS),
        "highest_risk_weak_scenario_families": highest_risk_families,
        "weakest_scoring_categories_variants1000": weakest_categories,
        "internal_only_emerging_evidence_areas": trace.get("internal_only_categories") or [],
        "source_registry_ids": sorted(src_index.keys()),
        "warning": trace.get("warning"),
        "disclaimer": (
            "Source coverage percentages reflect mapped registry entries, not paragraph-level citation completeness. "
            "Scores are internal quality indicators, not regulatory judgements."
        ),
    }


def render_risk_map_markdown(risk_map: dict[str, Any]) -> str:
    trace = risk_map.get("traceability_summary") or {}
    lines = [
        "# ORB Quality Lab Source Coverage Risk Map",
        "",
        f"- **Scenario variants scored:** {risk_map.get('scenario_variants_scored')}",
        f"- **Registered external sources:** {trace.get('registered_sources')}",
        f"- **Rubric external coverage:** {trace.get('rubric_external_coverage_percent')}%",
        f"- **Unsafe flags with external basis:** "
        f"{trace.get('unsafe_flags_with_external_basis')}/{trace.get('unsafe_flags_total')}",
        f"- **Scenario required elements mapped:** "
        f"{trace.get('scenario_required_elements_mapped')}/{trace.get('scenario_required_elements_total')}",
        f"- **Scenario prohibited elements mapped:** "
        f"{trace.get('scenario_prohibited_elements_mapped')}/{trace.get('scenario_prohibited_elements_total')}",
        f"- **Scenario families mapped:** "
        f"{trace.get('scenario_families_mapped')}/{trace.get('scenario_families_total')}",
        "",
        f"> {risk_map.get('disclaimer')}",
        "",
        f"> {risk_map.get('warning')}",
        "",
        "## Strongest scenario family source mapping",
        "",
    ]
    for row in risk_map.get("scenario_families_strongest_mapping") or []:
        lines.append(
            f"- `{row.get('scenario_family')}` — strength `{row.get('evidence_strength')}`, "
            f"{row.get('external_source_count')} external sources"
        )

    lines.extend(["", "## Weakest scenario family source mapping", ""])
    for row in risk_map.get("scenario_families_weakest_mapping") or []:
        lines.append(
            f"- `{row.get('scenario_family')}` — strength `{row.get('evidence_strength')}`, "
            f"{row.get('external_source_count')} external sources"
        )

    lines.extend(["", "## Categories relying on internal / emerging evidence", ""])
    for row in risk_map.get("categories_relying_on_internal_or_emerging_evidence") or []:
        lines.append(
            f"- `{row.get('rubric_category')}` — {row.get('evidence_strength')} "
            f"({row.get('external_source_count')} external sources)"
        )

    lines.extend(["", "## High-risk domains needing paragraph-level source deepening", ""])
    for gap in risk_map.get("high_risk_domains_needing_source_deepening") or []:
        lines.append(f"- **{gap.get('label')}** ({gap.get('risk_level')}) — {gap.get('notes')}")

    if risk_map.get("highest_risk_weak_scenario_families"):
        lines.extend(["", "## Highest-risk weak scenario families (variants1000 scores)", ""])
        for row in risk_map["highest_risk_weak_scenario_families"]:
            if isinstance(row, dict):
                lines.append(
                    f"- `{row.get('scenario_family', row.get('scenario_id'))}` — "
                    f"avg {row.get('average_score', row.get('overall_score'))}"
                )

    lines.append("")
    return "\n".join(lines)
