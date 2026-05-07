from __future__ import annotations

"""Audit/export infrastructure for IndiCare OS assistant.

This module builds export-ready audit payloads from assistant intelligence. It is
read-only: it does not create files or send data externally. It preserves source
modules, citations, warnings and governance statements so exported material can
be reviewed safely by managers, RIs, providers and QA leads.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from assistant.inspection_evidence_pack import build_inspection_evidence_pack, serialise_inspection_evidence_pack
from assistant.management_summary_builder import build_management_summary, serialise_management_summary
from assistant.operational_dashboard import build_operational_dashboard, serialise_operational_dashboard
from assistant.quality_scoring import build_quality_score, serialise_quality_score
from assistant.regulatory_concern_detection import build_regulatory_concern_detection, serialise_regulatory_concern_detection
from assistant.shift_intelligence import build_shift_intelligence, serialise_shift_intelligence


SUPPORTED_EXPORT_TYPES = {
    "management_summary",
    "inspection_evidence_pack",
    "operational_dashboard",
    "quality_score",
    "regulatory_concern_review",
    "shift_handover",
    "full_audit_bundle",
}


@dataclass(frozen=True)
class AuditExportSection:
    key: str
    title: str
    payload: dict[str, Any]
    citations: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class AuditExportBundle:
    export_type: str
    scope_type: str
    audience: str
    generated_at: str
    evidence_count: int
    governance_statement: str
    sections: list[AuditExportSection] = field(default_factory=list)
    citations: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _dedupe(items: list[str]) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for item in items:
        text = _safe_string(item)
        if not text:
            continue
        key = text.lower()
        if key in seen:
            continue
        seen.add(key)
        result.append(text)
    return result


def _collect_citations(value: Any, limit: int = 100) -> list[str]:
    refs: list[str] = []

    def walk(node: Any) -> None:
        if len(refs) >= limit:
            return
        if isinstance(node, dict):
            for key in ("citation_ref",):
                ref = _safe_string(node.get(key))
                if ref and ref not in refs:
                    refs.append(ref)
            for key in ("citation_refs", "evidence_refs", "visible_record_refs", "used_record_refs"):
                maybe = node.get(key)
                if isinstance(maybe, list):
                    for item in maybe:
                        ref = _safe_string(item)
                        if ref and ref not in refs:
                            refs.append(ref)
                            if len(refs) >= limit:
                                return
            for child in node.values():
                walk(child)
        elif isinstance(node, list):
            for item in node:
                walk(item)
                if len(refs) >= limit:
                    return

    walk(value)
    return refs[:limit]


def _collect_warnings(value: Any, limit: int = 100) -> list[str]:
    warnings: list[str] = []

    def walk(node: Any) -> None:
        if len(warnings) >= limit:
            return
        if isinstance(node, dict):
            maybe = node.get("warnings")
            if isinstance(maybe, list):
                for item in maybe:
                    text = _safe_string(item)
                    if text and text not in warnings:
                        warnings.append(text)
                        if len(warnings) >= limit:
                            return
            for child in node.values():
                walk(child)
        elif isinstance(node, list):
            for item in node:
                walk(item)
                if len(warnings) >= limit:
                    return

    walk(value)
    return warnings[:limit]


def _section(key: str, title: str, payload: dict[str, Any]) -> AuditExportSection:
    return AuditExportSection(
        key=key,
        title=title,
        payload=payload,
        citations=_collect_citations(payload),
        warnings=_collect_warnings(payload),
    )


def _governance_statement(export_type: str) -> str:
    return (
        "This export is generated from visible scoped evidence and assistant intelligence. "
        "It is for professional review, management oversight and quality assurance. "
        "It must not be treated as an Ofsted judgement, legal determination or final safeguarding threshold decision. "
        f"Export type: {export_type}."
    )


def build_audit_export_bundle(
    *,
    evidence_index: list[dict[str, Any]] | None,
    export_type: str = "full_audit_bundle",
    scope_type: str = "home",
    audience: str = "manager",
) -> AuditExportBundle:
    evidence = evidence_index if isinstance(evidence_index, list) else []
    safe_export_type = export_type if export_type in SUPPORTED_EXPORT_TYPES else "full_audit_bundle"
    generated_at = datetime.utcnow().isoformat() + "Z"

    sections: list[AuditExportSection] = []

    if safe_export_type in {"management_summary", "full_audit_bundle"}:
        summary = serialise_management_summary(
            build_management_summary(evidence_index=evidence, audience=audience, scope_type=scope_type)
        )
        sections.append(_section("management_summary", "Management summary", summary))

    if safe_export_type in {"inspection_evidence_pack", "full_audit_bundle"}:
        pack = serialise_inspection_evidence_pack(build_inspection_evidence_pack(evidence_index=evidence))
        sections.append(_section("inspection_evidence_pack", "Inspection evidence pack", pack))

    if safe_export_type in {"operational_dashboard", "full_audit_bundle"}:
        dashboard = serialise_operational_dashboard(
            build_operational_dashboard(evidence_index=evidence, scope_type=scope_type, user_role=audience)
        )
        sections.append(_section("operational_dashboard", "Operational dashboard", dashboard))

    if safe_export_type in {"quality_score", "full_audit_bundle"}:
        quality = serialise_quality_score(build_quality_score(evidence_index=evidence))
        sections.append(_section("quality_score", "Quality score", quality))

    if safe_export_type in {"regulatory_concern_review", "full_audit_bundle"}:
        regulatory = serialise_regulatory_concern_detection(
            build_regulatory_concern_detection(evidence_index=evidence)
        )
        sections.append(_section("regulatory_concern_review", "Regulatory concern review", regulatory))

    if safe_export_type in {"shift_handover", "full_audit_bundle"}:
        shift = serialise_shift_intelligence(build_shift_intelligence(evidence_index=evidence))
        sections.append(_section("shift_handover", "Shift handover", shift))

    citations: list[str] = []
    warnings: list[str] = []
    for section in sections:
        citations.extend(section.citations)
        warnings.extend(section.warnings)

    if not evidence:
        warnings.append("no_visible_evidence_for_audit_export")

    return AuditExportBundle(
        export_type=safe_export_type,
        scope_type=scope_type,
        audience=audience,
        generated_at=generated_at,
        evidence_count=len(evidence),
        governance_statement=_governance_statement(safe_export_type),
        sections=sections,
        citations=_dedupe(citations),
        warnings=_dedupe(warnings),
    )


def serialise_audit_export_bundle(bundle: AuditExportBundle) -> dict[str, Any]:
    return {
        "export_type": bundle.export_type,
        "scope_type": bundle.scope_type,
        "audience": bundle.audience,
        "generated_at": bundle.generated_at,
        "evidence_count": bundle.evidence_count,
        "governance_statement": bundle.governance_statement,
        "citations": bundle.citations,
        "warnings": bundle.warnings,
        "sections": [
            {
                "key": section.key,
                "title": section.title,
                "payload": section.payload,
                "citations": section.citations,
                "warnings": section.warnings,
            }
            for section in bundle.sections
        ],
    }


def build_audit_export_prompt_block(bundle: AuditExportBundle) -> str:
    lines = [
        "AUDIT EXPORT CONTEXT",
        bundle.governance_statement,
        f"Scope: {bundle.scope_type}. Audience: {bundle.audience}. Evidence count: {bundle.evidence_count}. Generated: {bundle.generated_at}.",
        "",
    ]

    if bundle.sections:
        lines.append("Export sections:")
        for section in bundle.sections:
            lines.append(f"- {section.title}: {len(section.citations)} citation(s), {len(section.warnings)} warning(s).")

    if bundle.citations:
        lines.append("")
        lines.append("Citations included:")
        for ref in bundle.citations[:40]:
            lines.append(f"- {ref}")

    if bundle.warnings:
        lines.append("")
        lines.append("Warnings:")
        for warning in bundle.warnings[:20]:
            lines.append(f"- {warning}")

    return "\n".join(lines).strip()
