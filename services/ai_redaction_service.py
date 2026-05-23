from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from schemas.ai_privacy import AiDataClass, AiRedactionFinding, AiRedactionMode, AiRedactionResult
from services.safe_logging import EMAIL_RE, PHONE_RE, DOB_RE


PERSON_NAME_RE = re.compile(r"\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b")
NHS_RE = re.compile(r"\b\d{3}\s?\d{3}\s?\d{4}\b")
POSTCODE_RE = re.compile(
    r"\b([A-Z]{1,2}\d{1,2}[A-Z]?)\s*(\d[A-Z]{2})\b",
    re.IGNORECASE,
)
DOB_INLINE_RE = re.compile(
    r"\b(?:DOB|D\.O\.B\.?|date of birth)[:\s]*\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}\b",
    re.IGNORECASE,
)
DOB_DATE_RE = re.compile(r"\b\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{4}\b")
SCHOOL_RE = re.compile(
    r"\b(?:school|college|academy)\s+(?:named|called)?\s*([A-Z][A-Za-z\s&'-]{2,40})",
    re.IGNORECASE,
)
FAMILY_RE = re.compile(
    r"\b(?:mum|dad|mother|father|sibling|brother|sister)\s+(?:named|called)?\s*([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?)",
    re.IGNORECASE,
)
ADDRESS_LINE_RE = re.compile(
    r"\b\d{1,4}\s+[A-Za-z0-9\s,'-]{3,40}(?:Street|Road|Avenue|Lane|Close|Drive|Way)\b",
    re.IGNORECASE,
)

REDACTION_WARNING = (
    "Automated redaction may not catch every identifier. Review before sharing or exporting."
)


@dataclass
class RedactionResult:
    text: str
    replacements: dict[str, str] = field(default_factory=dict)


class AIRedactionService:
    def redact_text(self, text: str | None, *, mode: str = "strict") -> RedactionResult:
        """Backward-compatible redaction returning dataclass result."""
        pydantic = self.redact_to_result(text or "", mode=self._normalise_mode(mode))
        return RedactionResult(pydantic.text, pydantic.replacements)

    def redact_to_result(
        self,
        text: str,
        *,
        mode: AiRedactionMode = "standard",
        data_classes: list[AiDataClass] | None = None,
        known_names: list[str] | None = None,
    ) -> AiRedactionResult:
        _ = data_classes
        if mode == "off":
            return AiRedactionResult(text=text, mode=mode, warnings=[REDACTION_WARNING])

        value = text or ""
        replacements: dict[str, str] = {}
        findings: list[AiRedactionFinding] = []

        def apply_pattern(pattern: re.Pattern[str], label: str, input_text: str) -> str:
            count = 0

            def _replacement(match: re.Match[str]) -> str:
                nonlocal count
                count += 1
                token = f"[{label}_{count}]"
                replacements[token] = match.group(0)
                return token

            updated = pattern.sub(_replacement, input_text)
            if count:
                findings.append(AiRedactionFinding(label=label, pattern_type=label, count=count))
            return updated

        effective = self._effective_mode(mode)
        value = apply_pattern(EMAIL_RE, "EMAIL", value)
        value = apply_pattern(PHONE_RE, "PHONE", value)
        value = apply_pattern(DOB_RE, "DOB", value)
        value = apply_pattern(DOB_INLINE_RE, "DOB", value)
        if effective in {"standard", "strict", "safeguarding_strict"}:
            value = apply_pattern(DOB_DATE_RE, "DATE", value)
            value = apply_pattern(NHS_RE, "NHS", value)
            value = apply_pattern(POSTCODE_RE, "POSTCODE", value)
        if effective in {"strict", "safeguarding_strict"}:
            value = apply_pattern(PERSON_NAME_RE, "NAME", value)
            value = apply_pattern(SCHOOL_RE, "SCHOOL", value)
            value = apply_pattern(FAMILY_RE, "FAMILY", value)
            value = apply_pattern(ADDRESS_LINE_RE, "ADDRESS", value)
            value = self.redact_names(value, known_names=known_names)
        if effective == "safeguarding_strict":
            value = self.redact_body_map_sensitive_detail(value)
            value = self.redact_third_party_details(value)

        return AiRedactionResult(
            text=value,
            mode=mode,
            findings=findings,
            replacements=replacements,
            warnings=[REDACTION_WARNING],
            redaction_applied=bool(replacements),
        )

    def redact_payload(
        self,
        payload: dict[str, Any],
        data_classes: list[AiDataClass] | None = None,
        *,
        mode: AiRedactionMode = "standard",
    ) -> dict[str, Any]:
        safe: dict[str, Any] = {}
        for key, value in (payload or {}).items():
            if isinstance(value, str):
                safe[key] = self.redact_to_result(value, mode=mode, data_classes=data_classes).text
            elif isinstance(value, dict):
                safe[key] = self.redact_payload(value, data_classes, mode=mode)
            elif isinstance(value, list):
                safe[key] = [
                    self.redact_to_result(item, mode=mode).text if isinstance(item, str) else item
                    for item in value[:50]
                ]
            else:
                safe[key] = value
        return safe

    def detect_identifiers(self, text: str) -> list[AiRedactionFinding]:
        findings: list[AiRedactionFinding] = []
        checks = [
            (EMAIL_RE, "email"),
            (PHONE_RE, "phone"),
            (DOB_INLINE_RE, "date_of_birth"),
            (NHS_RE, "nhs_number"),
            (POSTCODE_RE, "postcode"),
            (SCHOOL_RE, "school"),
            (FAMILY_RE, "family_member"),
            (PERSON_NAME_RE, "person_name"),
        ]
        for pattern, label in checks:
            matches = pattern.findall(text or "")
            if matches:
                findings.append(
                    AiRedactionFinding(label=label, pattern_type=label, count=len(matches))
                )
        return findings

    def redact_names(self, text: str, known_names: list[str] | None = None) -> str:
        value = text
        for name in known_names or []:
            cleaned = name.strip()
            if len(cleaned) < 3:
                continue
            value = re.sub(re.escape(cleaned), "[NAME]", value, flags=re.IGNORECASE)
        return value

    def redact_dates_of_birth(self, text: str) -> str:
        return DOB_INLINE_RE.sub("[DOB]", text)

    def redact_addresses(self, text: str) -> str:
        value = ADDRESS_LINE_RE.sub("[ADDRESS]", text)
        return POSTCODE_RE.sub("[POSTCODE]", value)

    def redact_phone_numbers(self, text: str) -> str:
        return PHONE_RE.sub("[PHONE]", text)

    def redact_emails(self, text: str) -> str:
        return EMAIL_RE.sub("[EMAIL]", text)

    def redact_nhs_numbers(self, text: str) -> str:
        return NHS_RE.sub("[NHS]", text)

    def redact_school_names(self, text: str) -> str:
        return SCHOOL_RE.sub("[SCHOOL]", text)

    def redact_family_member_names(self, text: str) -> str:
        return FAMILY_RE.sub("[FAMILY]", text)

    def redact_body_map_sensitive_detail(self, text: str) -> str:
        return re.sub(
            r"\b(?:bruise|laceration|injury|mark)\s+(?:on|to)\s+[\w\s]{3,40}",
            "[BODY_MAP_DETAIL]",
            text,
            flags=re.IGNORECASE,
        )

    def redact_third_party_details(self, text: str) -> str:
        return re.sub(
            r"\b(?:social worker|police officer|GP|CAMHS)\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?",
            "[THIRD_PARTY]",
            text,
        )

    def build_redaction_summary(self, findings: list[AiRedactionFinding]) -> str:
        if not findings:
            return "No automated identifiers detected."
        parts = [f"{f.label}: {f.count}" for f in findings]
        return "Redaction findings — " + ", ".join(parts)

    def safe_excerpt(self, text: str, max_chars: int = 800) -> str:
        excerpt = (text or "")[:max_chars]
        return self.redact_to_result(excerpt, mode="standard").text

    def redact_records(
        self, records: list[dict[str, Any]], *, mode: str = "strict"
    ) -> tuple[list[dict[str, Any]], dict[str, str]]:
        redacted: list[dict[str, Any]] = []
        mapping: dict[str, str] = {}
        hidden_fields = {
            "first_name",
            "last_name",
            "date_of_birth",
            "dob",
            "address",
            "email",
            "phone",
            "mobile",
        }
        name_fields = {
            "name",
            "full_name",
            "young_person_name",
            "child_name",
            "staff_name",
            "home_name",
        }
        effective = self._effective_mode(self._normalise_mode(mode))

        for index, record in enumerate(records, start=1):
            safe_record: dict[str, Any] = {}
            entity_label = self._entity_label(record, index)
            for key, value in record.items():
                key_norm = str(key).lower()
                if key_norm in hidden_fields:
                    safe_record[key] = (
                        entity_label if key_norm in {"first_name", "last_name"} else f"[REDACTED_{str(key).upper()}]"
                    )
                    continue
                if effective in {"strict", "safeguarding_strict"} and key_norm in name_fields:
                    safe_record[key] = entity_label
                    continue
                if isinstance(value, str):
                    result = self.redact_text(value, mode=mode)
                    safe_record[key] = result.text
                    mapping.update({f"record_{index}:{k}": v for k, v in result.replacements.items()})
                else:
                    safe_record[key] = value
            redacted.append(safe_record)

        return redacted, mapping

    def _entity_label(self, record: dict[str, Any], index: int) -> str:
        suffix = chr(ord("A") + ((index - 1) % 26))
        record_type = str(record.get("record_type") or record.get("type") or "").lower()
        keys = {str(key).lower() for key in record}
        if "home" in record_type or "home_name" in keys:
            return f"Home {suffix}"
        if "staff" in record_type or "adult" in record_type or "staff_name" in keys:
            return f"Staff member {suffix}"
        if "young_person" in record_type or "child" in record_type or {"young_person_name", "child_name"} & keys:
            return f"Young person {suffix}"
        return f"Person {suffix}"

    def _normalise_mode(self, mode: str) -> AiRedactionMode:
        cleaned = (mode or "standard").strip().lower()
        if cleaned == "off":
            return "off"
        if cleaned in {"light", "standard", "strict", "safeguarding_strict"}:
            return cleaned  # type: ignore[return-value]
        return "strict"

    def _effective_mode(self, mode: AiRedactionMode) -> str:
        if mode == "light":
            return "light"
        if mode == "standard":
            return "standard"
        return "strict"


ai_redaction_service = AIRedactionService()
