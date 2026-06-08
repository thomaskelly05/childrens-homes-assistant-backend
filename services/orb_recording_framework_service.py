"""Shared ORB / IndiCare recording framework — single source for record types."""

from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

_FRAMEWORK_PATH = (
    Path(__file__).resolve().parents[1] / "assistant" / "knowledge" / "orb_recording_framework.json"
)

_POLICY_KEYWORDS: dict[str, list[str]] = {
    "missing_from_home_record": ["missing", "absent", "return conversation", "exploitation", "cse"],
    "safeguarding_concern": ["safeguarding", "harm", "neglect", "dsl", "child protection"],
    "physical_intervention": ["restraint", "physical intervention", "hold", "rip"],
    "incident_report": ["incident", "behaviour", "injury", "damage"],
    "reg_44_evidence_summary": ["reg 44", "reg44", "independent visitor"],
    "reg_45_reflection": ["reg 45", "reg45", "quality of care"],
    "reg_40_notification_prep": ["reg 40", "reg40", "serious event", "ofsted notification"],
    "education_school_refusal": ["school", "education", "attendance", "pep", "refusal"],
    "health_medication_note": ["medication", "health", "mar", "gp", "camhs"],
    "family_contact_record": ["contact", "family time", "supervised contact"],
    "allegation_against_staff": ["allegation", "lado", "staff conduct"],
    "complaint_or_child_concern": ["complaint", "concern raised", "advocate"],
    "risk_assessment_update": ["risk assessment", "risk management"],
    "care_plan_update": ["care plan", "lac review", "pep"],
    "handover": ["handover", "shift handover"],
    "manager_summary": ["manager oversight", "manager review"],
}


@lru_cache(maxsize=1)
def _load_framework_raw() -> dict[str, Any]:
    with _FRAMEWORK_PATH.open(encoding="utf-8") as fh:
        return json.load(fh)


def get_framework_version() -> str:
    return str(_load_framework_raw().get("version", "1.0.0"))


def list_record_types() -> list[dict[str, Any]]:
    return list(_load_framework_raw().get("record_types", []))


def get_record_type(record_type_id: str) -> dict[str, Any] | None:
    for row in list_record_types():
        if row.get("id") == record_type_id:
            return dict(row)
    return None


def get_record_type_by_dictate_note_type(note_type: str) -> dict[str, Any] | None:
    for row in list_record_types():
        if row.get("dictate_note_type") == note_type and row.get("studio_template_id"):
            return dict(row)
    for row in list_record_types():
        if row.get("dictate_note_type") == note_type:
            return dict(row)
    return None


def get_record_type_by_studio_id(studio_template_id: str) -> dict[str, Any] | None:
    for row in list_record_types():
        if row.get("studio_template_id") == studio_template_id:
            return dict(row)
    return None


def resolve_record_type(
    *,
    record_type_id: str | None = None,
    template_id: str | None = None,
    note_type: str | None = None,
) -> dict[str, Any]:
    if record_type_id:
        found = get_record_type(record_type_id)
        if found:
            return found
    if template_id:
        found = get_record_type_by_studio_id(template_id)
        if found:
            return found
    if note_type:
        found = get_record_type_by_dictate_note_type(note_type)
        if found:
            return found
    return get_record_type("general_dictation") or list_record_types()[0]


def orb_checks_summary(record_type: dict[str, Any]) -> list[str]:
    checks: list[str] = []
    checks.extend(record_type.get("missing_evidence_checks", [])[:4])
    checks.extend(record_type.get("safeguarding_checks", [])[:2])
    checks.extend(record_type.get("manager_oversight_checks", [])[:1])
    # dedupe preserving order
    seen: set[str] = set()
    out: list[str] = []
    for item in checks:
        key = item.lower()
        if key not in seen:
            seen.add(key)
            out.append(item)
    return out[:8]


def suggested_output_labels(record_type_id: str) -> list[str]:
    record = resolve_record_type(record_type_id=record_type_id)
    labels: list[str] = []
    for out_id in record.get("suggested_outputs", []):
        target = get_record_type(str(out_id))
        labels.append(str(target.get("label") if target else out_id))
    return labels


def suggested_outputs_payload(record_type_id: str) -> list[dict[str, str]]:
    record = resolve_record_type(record_type_id=record_type_id)
    outputs: list[dict[str, str]] = []
    for out_id in record.get("suggested_outputs", []):
        target = get_record_type(str(out_id))
        if target:
            outputs.append(
                {
                    "id": str(target["id"]),
                    "label": str(target["label"]),
                    "dictate_note_type": str(target.get("dictate_note_type", "daily_record")),
                }
            )
    return outputs


def framework_missing_checks(record_type: dict[str, Any], transcript: str) -> list[str]:
    """Heuristic missing-evidence hints guided by framework — not AI."""
    text = transcript.lower()
    missing: list[str] = []
    for check in record_type.get("missing_evidence_checks", []):
        tokens = [t.strip() for t in re.split(r"[/,]", check.lower()) if t.strip()]
        if not any(tok in text for tok in tokens if len(tok) > 3):
            missing.append(f"{check} — not clearly present in transcript")
    for check in record_type.get("child_voice_checks", []):
        if "child" in check.lower() and not re.search(r"\b(said|told|asked|child|yp|young person)\b", text):
            missing.append("Child voice — add what the young person said or communicated")
            break
    return missing[:10]


def recording_quality_guidance(record_type: dict[str, Any]) -> str:
    guidance = str(record_type.get("professional_language_guidance", "")).strip()
    if guidance:
        return guidance
    return "Use observable facts, name adults and times, and review before finalising."


def _extract_section_content(body: str, heading: str) -> str | None:
    """Return content under a markdown heading if present."""
    pattern = re.compile(
        rf"^##\s+{re.escape(heading)}\s*\n+(.*?)(?=^##\s+|\Z)",
        re.MULTILINE | re.DOTALL | re.IGNORECASE,
    )
    match = pattern.search(body)
    if not match:
        return None
    content = match.group(1).strip()
    if not content or content.startswith("*") and "not yet captured" in content.lower():
        return None
    return content


def build_structured_write_body(
    *,
    record_type: dict[str, Any],
    note_type: str,
    transcript: str = "",
    professional_note: str = "",
    missing_prompts: list[str] | None = None,
) -> str:
    """Map notes into template sections with prompts for missing information — no invented facts."""
    from services.orb_dictate_template_registry import get_dictate_template

    body = professional_note.strip()
    if body and re.search(r"^##\s+", body, re.MULTILINE):
        return body

    try:
        template = get_dictate_template(note_type)  # type: ignore[arg-type]
        sections = template.sections
    except (KeyError, ValueError):
        return structure_document_body(
            record_type=record_type,
            professional_note=professional_note or transcript,
            missing_notes=missing_prompts,
            adult_edits_preserved=False,
        )

    source_text = f"{transcript}\n\n{professional_note}".strip()
    blocks: list[str] = []
    for section in sections:
        heading = section.title
        existing = _extract_section_content(body, heading) if body else None
        if existing:
            blocks.append(f"## {heading}\n\n{existing}\n")
            continue
        prompt = section.prompts[0] if section.prompts else f"Add {heading.lower()} from your notes."
        if section.required:
            blocks.append(f"## {heading}\n\n*{prompt}*\n")
        elif source_text:
            blocks.append(f"## {heading}\n\n*{prompt}*\n")
    structured = "\n".join(blocks).strip()
    if missing_prompts:
        structured += "\n\n## Recording gaps to review\n\n"
        structured += "\n".join(f"- {note}" for note in missing_prompts[:8])
        structured += "\n"
    return structured


def structure_document_body(
    *,
    record_type: dict[str, Any],
    professional_note: str,
    missing_notes: list[str] | None = None,
    adult_edits_preserved: bool = True,
    note_type: str | None = None,
    transcript: str = "",
) -> str:
    """Apply framework headings when body is not already sectioned."""
    body = professional_note.strip()
    if adult_edits_preserved and re.search(r"^##\s+", body, re.MULTILINE):
        return body

    if note_type:
        return build_structured_write_body(
            record_type=record_type,
            note_type=note_type,
            transcript=transcript,
            professional_note=body,
            missing_prompts=missing_notes,
        )

    headings = record_type.get("final_document_headings") or record_type.get("pdf_heading_order") or []
    if not headings:
        return body

    sections: list[str] = []
    for heading in headings:
        sections.append(f"## {heading}\n\n")
    structured = "\n".join(sections).rstrip() + "\n\n"
    if body:
        structured += "---\n\n" + body + "\n"
    if missing_notes:
        structured += "\n## Recording gaps to review\n\n"
        structured += "\n".join(f"- {note}" for note in missing_notes[:6])
        structured += "\n"
    return structured.strip()


def document_title_for_record_type(record_type: dict[str, Any]) -> str:
    return str(record_type.get("label", "ORB Document"))


def match_record_types_for_document(text: str, *, limit: int = 6) -> list[dict[str, Any]]:
    lowered = text.lower()
    scores: list[tuple[int, dict[str, Any]]] = []
    for row in list_record_types():
        score = 0
        for kw in _POLICY_KEYWORDS.get(str(row["id"]), []):
            if kw in lowered:
                score += 2
        label = str(row.get("label", "")).lower()
        if label and label in lowered:
            score += 3
        if score:
            scores.append((score, row))
    scores.sort(key=lambda item: item[0], reverse=True)
    return [dict(row) for _, row in scores[:limit]]


def get_framework_payload() -> dict[str, Any]:
    return {
        "version": get_framework_version(),
        "record_types": list_record_types(),
    }


def studio_templates_from_framework() -> list[dict[str, Any]]:
    """Studio selector entries derived from framework (no duplicate copy)."""
    templates: list[dict[str, Any]] = []
    for row in list_record_types():
        studio_id = row.get("studio_template_id")
        if not studio_id:
            continue
        templates.append(
            {
                "id": studio_id,
                "label": row["label"],
                "record_type_id": row["id"],
                "note_type": row.get("dictate_note_type"),
                "description": row.get("purpose"),
            }
        )
    return templates
