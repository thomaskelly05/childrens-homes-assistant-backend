from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from services.safe_logging import EMAIL_RE, PHONE_RE, DOB_RE


PERSON_NAME_RE = re.compile(r"\b([A-Z][a-z]{2,})\s+([A-Z][a-z]{2,})\b")


@dataclass
class RedactionResult:
    text: str
    replacements: dict[str, str] = field(default_factory=dict)


class AIRedactionService:
    def redact_text(self, text: str | None, *, mode: str = "strict") -> RedactionResult:
        if mode == "off":
            return RedactionResult(text or "", {})

        value = text or ""
        replacements: dict[str, str] = {}

        def replace(pattern: re.Pattern[str], label: str, input_text: str) -> str:
            counter = 0

            def _replacement(match: re.Match[str]) -> str:
                nonlocal counter
                counter += 1
                token = f"[{label}_{counter}]"
                replacements[token] = match.group(0)
                return token

            return pattern.sub(_replacement, input_text)

        value = replace(EMAIL_RE, "EMAIL", value)
        value = replace(PHONE_RE, "PHONE", value)
        value = replace(DOB_RE, "DOB", value)

        if mode == "strict":
            person_counter = 0

            def replace_person(match: re.Match[str]) -> str:
                nonlocal person_counter
                person_counter += 1
                token = f"Person {person_counter}"
                replacements[token] = match.group(0)
                return token

            value = PERSON_NAME_RE.sub(replace_person, value)

        return RedactionResult(value, replacements)

    def redact_records(self, records: list[dict[str, Any]], *, mode: str = "strict") -> tuple[list[dict[str, Any]], dict[str, str]]:
        redacted: list[dict[str, Any]] = []
        mapping: dict[str, str] = {}
        hidden_fields = {"first_name", "last_name", "date_of_birth", "dob", "address", "email", "phone", "mobile"}
        name_fields = {"name", "full_name", "young_person_name", "child_name", "staff_name", "home_name"}

        for index, record in enumerate(records, start=1):
            safe_record: dict[str, Any] = {}
            entity_label = self._entity_label(record, index)
            for key, value in record.items():
                key_norm = str(key).lower()
                if key_norm in hidden_fields:
                    safe_record[key] = entity_label if key_norm in {"first_name", "last_name"} else f"[REDACTED_{str(key).upper()}]"
                    continue
                if mode == "strict" and key_norm in name_fields:
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


ai_redaction_service = AIRedactionService()
