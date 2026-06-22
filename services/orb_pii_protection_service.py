from __future__ import annotations

"""Fast PII masking for ORB Residential.

The aim is not perfect legal anonymisation; it is a fast pre-model protection
layer that removes obvious identifiers before prompts leave the ORB boundary.
"""

import re
from dataclasses import asdict, dataclass, field
from typing import Any

_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
_PHONE_RE = re.compile(r"(?<!\d)(?:\+44\s?7\d{3}|07\d{3}|01\d{3}|02\d{3}|03\d{3})[\s-]?\d{3}[\s-]?\d{3}(?!\d)")
_POSTCODE_RE = re.compile(r"\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b", re.I)
_DOB_RE = re.compile(r"\b(?:dob|date of birth|born)[:\s-]*(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})\b", re.I)
_NHS_RE = re.compile(r"\b(?:nhs\s*(?:number|no)?[:\s-]*)?\d{3}[\s-]?\d{3}[\s-]?\d{4}\b", re.I)
_REF_RE = re.compile(r"\b(?:police|crime|case|court|la|ref(?:erence)?)\s*(?:number|no|ref)?[:#\s-]*[A-Z0-9/-]{5,}\b", re.I)
_ADDRESS_RE = re.compile(r"\b\d{1,4}\s+[A-Z][A-Za-z'\-]+\s+(?:Street|St|Road|Rd|Avenue|Ave|Lane|Ln|Close|Drive|Dr|Way|Court|Crescent)\b", re.I)


@dataclass(frozen=True)
class PiiProtectionResult:
    protected_text: str
    identifiers_masked: int
    categories: list[str] = field(default_factory=list)
    replacements: dict[str, int] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbPiiProtectionService:
    VERSION = "orb-pii-protection-v1"

    PATTERNS: tuple[tuple[str, re.Pattern[str], str], ...] = (
        ("email", _EMAIL_RE, "[Email]"),
        ("phone", _PHONE_RE, "[Phone number]"),
        ("postcode", _POSTCODE_RE, "[Postcode]"),
        ("date_of_birth", _DOB_RE, "[Date of birth]"),
        ("nhs_number", _NHS_RE, "[NHS number]"),
        ("case_reference", _REF_RE, "[Case reference]"),
        ("address", _ADDRESS_RE, "[Address]"),
    )

    def protect(self, text: str) -> PiiProtectionResult:
        protected = text or ""
        categories: list[str] = []
        replacements: dict[str, int] = {}
        count = 0

        for category, pattern, token in self.PATTERNS:
            protected, n = pattern.subn(token, protected)
            if n:
                categories.append(category)
                replacements[category] = n
                count += n

        return PiiProtectionResult(
            protected_text=protected,
            identifiers_masked=count,
            categories=categories,
            replacements=replacements,
        )

    def context_payload(self, text: str, **_: Any) -> dict[str, Any]:
        payload = self.protect(text).to_dict()
        payload["service_version"] = self.VERSION
        return payload


orb_pii_protection_service = OrbPiiProtectionService()
