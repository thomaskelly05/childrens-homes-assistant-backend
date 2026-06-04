from __future__ import annotations

import json
import logging
import os
from typing import Any

from schemas.data_protection import DataClassification
from services.ai_external_call_governance import (
    FEATURE_DOCUMENT_AI_REVIEW,
    redact_plain_text,
    try_governed_draft_text,
)
from services.document_rules_engine import get_document_rule_payload, suggest_document_links

logger = logging.getLogger("indicare.document_ai_review")


AI_REVIEW_ACTIONS = {
    "improve_wording",
    "spell_check",
    "make_therapeutic",
    "make_more_factual",
    "make_more_practical",
    "make_more_concise",
    "check_safeguarding_language",
    "suggest_missing_details",
    "suggest_quality_standards",
    "suggest_links",
}


def _safe_string(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    return str(value).strip()


def _normalise_payload(payload: dict[str, Any] | None) -> dict[str, Any]:
    if not isinstance(payload, dict):
        return {}
    return payload


def _normalise_actions(actions: list[str] | None) -> list[str]:
    if not isinstance(actions, list):
        return ["improve_wording"]

    cleaned: list[str] = []
    for action in actions:
        text = _safe_string(action).lower()
        if text in AI_REVIEW_ACTIONS and text not in cleaned:
            cleaned.append(text)

    return cleaned or ["improve_wording"]


def _build_document_text(payload: dict[str, Any]) -> str:
    lines: list[str] = []

    for key, value in payload.items():
        text = _safe_string(value)
        if not text:
            continue
        label = key.replace("_", " ").strip().title()
        lines.append(f"{label}: {text}")

    return "\n".join(lines).strip()


def _build_action_guidance(actions: list[str]) -> str:
    guidance_map = {
        "improve_wording": "Improve clarity, grammar, structure, and professionalism without changing the meaning.",
        "spell_check": "Correct spelling, punctuation, spacing, and obvious grammatical issues.",
        "make_therapeutic": "Strengthen trauma-informed, child-centred, respectful, emotionally attuned wording.",
        "make_more_factual": "Reduce opinion, assumption, and vague language. Separate observation from interpretation.",
        "make_more_practical": "Make wording more usable for staff practice and clearer in next steps.",
        "make_more_concise": "Shorten wording while preserving the key facts and accountability.",
        "check_safeguarding_language": "Check whether safeguarding language is clear, proportionate, and professionally defensible.",
        "suggest_missing_details": "Identify important missing details needed for accountability, defensibility, or continuity of care.",
        "suggest_quality_standards": "Suggest the most relevant Quality Standards based on the content.",
        "suggest_links": "Suggest linked record areas such as chronology, health, education, family contact, risk, tasks, or safeguarding.",
    }

    return "\n".join(f"- {guidance_map[a]}" for a in actions if a in guidance_map)


def _build_system_prompt(document_type: str, rule: dict[str, Any], actions: list[str]) -> str:
    field_help_lines: list[str] = []

    for field_rule in rule.get("field_rules", []):
        label = _safe_string(field_rule.get("label"))
        key = _safe_string(field_rule.get("key"))
        help_text = _safe_string(field_rule.get("help_text"))
        required = bool(field_rule.get("required"))

        field_help_lines.append(
            f"- {label or key} ({key})"
            f"{' [required]' if required else ''}: {help_text}"
        )

    standards = ", ".join(rule.get("default_quality_standards", [])) or "None suggested"
    link_targets = ", ".join(rule.get("link_targets", [])) or "None"
    action_guidance = _build_action_guidance(actions)

    return f"""
You are IndiCare Document Review AI.

You are reviewing a children's home care record or planning document.

DOCUMENT TYPE: {document_type}
DOCUMENT TITLE: {_safe_string(rule.get("title"))}
DOCUMENT DESCRIPTION: {_safe_string(rule.get("description"))}

DOCUMENT RULES:
- Default Quality Standards: {standards}
- Link targets: {link_targets}
- Therapeutic style expected: {bool(rule.get("therapeutic_style"))}

FIELD EXPECTATIONS:
{chr(10).join(field_help_lines) if field_help_lines else "- No field guidance available"}

REVIEW ACTIONS REQUESTED:
{action_guidance}

STRICT OUTPUT RULES:
Return JSON only.
Do not include markdown.
Do not include commentary outside JSON.

Use this exact JSON shape:
{{
  "improved_text": "full improved document text",
  "field_feedback": [
    {{
      "field": "field_key",
      "issue": "what needs improving",
      "suggestion": "how to improve it"
    }}
  ],
  "missing_details": [
    "missing detail 1"
  ],
  "quality_standards": [
    {{
      "code": "1",
      "reason": "why it links"
    }}
  ],
  "link_suggestions": [
    {{
      "target": "chronology_events",
      "reason": "why this should link"
    }}
  ],
  "safeguarding_notes": [
    "any safeguarding wording or escalation note"
  ],
  "summary": "short one paragraph summary of improvements made"
}}

IMPORTANT:
- Keep wording professional, calm, clear, and suitable for care records.
- Keep the child's lived experience central.
- Avoid blame, slang, exaggeration, or judgemental wording.
- Do not invent facts that are not in the source text.
- If information is missing, flag it under missing_details.
""".strip()


def _extract_json(text: str) -> dict[str, Any]:
    raw = _safe_string(text)
    if not raw:
        return {}

    try:
        return json.loads(raw)
    except Exception:
        pass

    start = raw.find("{")
    end = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        snippet = raw[start : end + 1]
        try:
            return json.loads(snippet)
        except Exception:
            return {}

    return {}


def _fallback_response(
    document_type: str,
    payload: dict[str, Any],
    actions: list[str],
) -> dict[str, Any]:
    text = _build_document_text(payload)
    link_rows = suggest_document_links(document_type, payload)

    return {
        "improved_text": text,
        "field_feedback": [],
        "missing_details": [],
        "quality_standards": [],
        "link_suggestions": [
            {
                "target": row.get("target"),
                "reason": row.get("reason"),
            }
            for row in link_rows
        ],
        "safeguarding_notes": [],
        "summary": f"AI review fallback returned original text for document type '{document_type}'. Requested actions: {', '.join(actions)}.",
    }


def review_document_with_ai(
    *,
    document_type: str,
    payload: dict[str, Any] | None,
    actions: list[str] | None = None,
    model: str = "gpt-4o-mini",
    provider_id: int | None = None,
    home_id: int | None = None,
    user_id: int | None = None,
) -> dict[str, Any]:
    clean_document_type = _safe_string(document_type).lower()
    clean_payload = _normalise_payload(payload)
    clean_actions = _normalise_actions(actions)

    rule = get_document_rule_payload(clean_document_type)
    if not rule:
        return {
            "ok": False,
            "error": "Document rule not found",
            "review": _fallback_response(clean_document_type, clean_payload, clean_actions),
        }

    source_text = _build_document_text(clean_payload)
    if not source_text:
        return {
            "ok": False,
            "error": "No document content provided",
            "review": _fallback_response(clean_document_type, clean_payload, clean_actions),
        }

    prompt = _build_system_prompt(clean_document_type, rule, clean_actions)

    redacted_source, _ = redact_plain_text(source_text, mode="strict")
    redacted_payload = {
        key: redact_plain_text(_safe_string(value), mode="strict")[0]
        for key, value in clean_payload.items()
    }
    user_message = f"""
DOCUMENT PAYLOAD:
{json.dumps(redacted_payload, ensure_ascii=False, indent=2)}

FULL DOCUMENT TEXT:
{redacted_source}
""".strip()

    classification = (
        DataClassification.SAFEGUARDING_SENSITIVE
        if clean_document_type in {"safeguarding", "incident", "allegation"}
        else DataClassification.CONFIDENTIAL_CHILD
    )

    try:
        gateway_response = try_governed_draft_text(
            feature=FEATURE_DOCUMENT_AI_REVIEW,
            system_prompt=prompt,
            prompt=user_message,
            model=model,
            provider_id=provider_id,
            home_id=home_id,
            user_id=user_id,
            data_classification=classification,
            metadata={
                "route": "document_ai_review_service.review_document_with_ai",
                "document_type": clean_document_type,
                "draft_only": True,
            },
        )
        if gateway_response is None:
            return {
                "ok": True,
                "review": _fallback_response(clean_document_type, clean_payload, clean_actions),
                "governance_blocked": True,
                "draft_only": True,
                "human_review_required": True,
            }

        content = _safe_string(gateway_response.text)
        parsed = _extract_json(content)

        if not parsed:
            logger.warning("Document AI review returned non-JSON content")
            return {
                "ok": True,
                "review": _fallback_response(clean_document_type, clean_payload, clean_actions),
            }

        ai_link_suggestions = parsed.get("link_suggestions")
        if not isinstance(ai_link_suggestions, list):
            ai_link_suggestions = []

        engine_links = suggest_document_links(clean_document_type, clean_payload)

        merged_links: list[dict[str, Any]] = []
        seen: set[str] = set()

        for row in ai_link_suggestions + engine_links:
            target = _safe_string((row or {}).get("target"))
            reason = _safe_string((row or {}).get("reason"))
            if not target:
                continue
            if target in seen:
                continue
            seen.add(target)
            merged_links.append({"target": target, "reason": reason})

        parsed["link_suggestions"] = merged_links

        if not _safe_string(parsed.get("improved_text")):
            parsed["improved_text"] = source_text

        if not isinstance(parsed.get("field_feedback"), list):
            parsed["field_feedback"] = []

        if not isinstance(parsed.get("missing_details"), list):
            parsed["missing_details"] = []

        if not isinstance(parsed.get("quality_standards"), list):
            parsed["quality_standards"] = []

        if not isinstance(parsed.get("safeguarding_notes"), list):
            parsed["safeguarding_notes"] = []

        parsed["summary"] = _safe_string(parsed.get("summary"))

        return {
            "ok": True,
            "review": parsed,
            "draft_only": True,
            "human_review_required": True,
        }

    except Exception:
        logger.exception("Document AI review failed")
        return {
            "ok": False,
            "error": "AI review failed",
            "review": _fallback_response(clean_document_type, clean_payload, clean_actions),
        }
