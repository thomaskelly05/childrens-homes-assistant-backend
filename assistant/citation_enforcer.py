from __future__ import annotations

"""Citation enforcement helpers for OS and regulatory answers.

This module does not call the model. It inspects a completed answer and returns
machine-readable enforcement results that routers/pipelines can use before an
answer is shown to users.
"""

from dataclasses import dataclass, field
import re
from typing import Any


RECORD_CITATION_RE = re.compile(r"\[([A-Za-z][A-Za-z0-9_\-]*):(\d+[A-Za-z0-9_\-]*)\]")
BROKEN_RECORD_CITATION_RE = re.compile(r"\[[A-Za-z][A-Za-z0-9_\-]*:\s*\]")
REGULATORY_CITATION_RE = re.compile(r"\[(reg\d+|guide|sccif)\]", re.IGNORECASE)


@dataclass(frozen=True)
class CitationEnforcementResult:
    ok: bool
    has_record_citations: bool
    has_regulatory_citations: bool
    missing_required_record_citations: bool
    broken_citations: list[str] = field(default_factory=list)
    unsupported_record_citations: list[str] = field(default_factory=list)
    visible_record_refs: list[str] = field(default_factory=list)
    used_record_refs: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    blockers: list[str] = field(default_factory=list)


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


def extract_record_citations(text: str) -> list[str]:
    return _dedupe([f"[{match.group(1)}:{match.group(2)}]" for match in RECORD_CITATION_RE.finditer(text or "")])


def extract_regulatory_citations(text: str) -> list[str]:
    return _dedupe([f"[{match.group(1).lower()}]" for match in REGULATORY_CITATION_RE.finditer(text or "")])


def extract_visible_record_refs(
    *,
    sources: list[dict[str, Any]] | None = None,
    evidence_index: list[dict[str, Any]] | None = None,
) -> list[str]:
    refs: list[str] = []

    for collection in (sources or [], evidence_index or []):
        if isinstance(collection, list):
            candidates = collection
        else:
            candidates = [collection]
        for item in candidates:
            if not isinstance(item, dict):
                continue
            citation_ref = _safe_string(item.get("citation_ref"))
            if citation_ref and RECORD_CITATION_RE.fullmatch(citation_ref):
                refs.append(citation_ref)
                continue

            record_type = _safe_string(item.get("record_type") or item.get("type"))
            record_id = _safe_string(item.get("record_id") or item.get("id"))
            if record_type and record_id:
                refs.append(f"[{record_type}:{record_id}]")
            continue

    return _dedupe(refs)


def enforce_citations(
    *,
    answer_text: str,
    assistant_surface: str,
    requires_os_citations: bool,
    requires_regulatory_basis: bool = False,
    sources: list[dict[str, Any]] | None = None,
    evidence_index: list[dict[str, Any]] | None = None,
) -> CitationEnforcementResult:
    text = _safe_string(answer_text)
    used_record_refs = extract_record_citations(text)
    regulatory_refs = extract_regulatory_citations(text)
    broken = _dedupe(BROKEN_RECORD_CITATION_RE.findall(text))
    visible_record_refs = extract_visible_record_refs(
        sources=sources,
        evidence_index=evidence_index,
    )

    visible_set = {ref.lower() for ref in visible_record_refs}
    unsupported = [
        ref for ref in used_record_refs
        if visible_set and ref.lower() not in visible_set
    ]

    warnings: list[str] = []
    blockers: list[str] = []

    if broken:
        blockers.append("broken_record_citations")

    if unsupported:
        blockers.append("unsupported_record_citations")

    missing_required_record_citations = requires_os_citations and bool(visible_record_refs) and not used_record_refs
    if missing_required_record_citations:
        blockers.append("missing_required_os_citations")

    if assistant_surface == "os_embedded" and requires_os_citations and not visible_record_refs:
        warnings.append("os_citations_required_but_no_visible_record_refs")

    if requires_regulatory_basis and not regulatory_refs:
        warnings.append("regulatory_basis_expected_without_regulatory_citation")

    ok = not blockers

    return CitationEnforcementResult(
        ok=ok,
        has_record_citations=bool(used_record_refs),
        has_regulatory_citations=bool(regulatory_refs),
        missing_required_record_citations=missing_required_record_citations,
        broken_citations=broken,
        unsupported_record_citations=unsupported,
        visible_record_refs=visible_record_refs,
        used_record_refs=used_record_refs,
        warnings=_dedupe(warnings),
        blockers=_dedupe(blockers),
    )


def serialise_citation_enforcement(result: CitationEnforcementResult) -> dict[str, Any]:
    return {
        "ok": result.ok,
        "has_record_citations": result.has_record_citations,
        "has_regulatory_citations": result.has_regulatory_citations,
        "missing_required_record_citations": result.missing_required_record_citations,
        "broken_citations": result.broken_citations,
        "unsupported_record_citations": result.unsupported_record_citations,
        "visible_record_refs": result.visible_record_refs,
        "used_record_refs": result.used_record_refs,
        "warnings": result.warnings,
        "blockers": result.blockers,
    }


def build_citation_repair_instruction(result: CitationEnforcementResult) -> str:
    if result.ok and not result.warnings:
        return ""

    lines = [
        "CITATION REPAIR REQUIRED",
        "Repair the answer before showing it to the user.",
    ]

    if result.visible_record_refs:
        lines.append("Visible record refs that may be used:")
        for ref in result.visible_record_refs[:30]:
            lines.append(f"- {ref}")

    if result.blockers:
        lines.append("Blockers:")
        for blocker in result.blockers:
            lines.append(f"- {blocker}")

    if result.warnings:
        lines.append("Warnings:")
        for warning in result.warnings:
            lines.append(f"- {warning}")

    lines.extend(
        [
            "Rules:",
            "- Add inline citations to evidence-based claims using only visible record refs.",
            "- Remove or replace broken citations.",
            "- Do not invent record refs.",
            "- If evidence is not visible, say that clearly instead of citing.",
        ]
    )

    return "\n".join(lines).strip()
