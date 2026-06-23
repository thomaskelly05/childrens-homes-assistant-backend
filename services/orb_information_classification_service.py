from __future__ import annotations

"""Fast deterministic information classification for ORB Residential.

DEPRECATED: Superseded by the live governance stack:
``ai_external_call_governance`` → ``ai_privacy_decision_service`` + ``ai_redaction_service``.
Do not wire this service into new routes.
"""

import re
from dataclasses import asdict, dataclass, field
from typing import Any, Literal

InformationClass = Literal["public", "professional", "sensitive", "highly_sensitive", "restricted"]

_EMAIL_RE = re.compile(r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", re.I)
_PHONE_RE = re.compile(r"(?<!\d)(?:\+44\s?7\d{3}|07\d{3}|01\d{3}|02\d{3}|03\d{3})[\s-]?\d{3}[\s-]?\d{3}(?!\d)")
_POSTCODE_RE = re.compile(r"\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b", re.I)
_DOB_RE = re.compile(r"\b(?:dob|date of birth|born)[:\s-]*(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+[A-Za-z]+\s+\d{2,4})\b", re.I)
_NHS_RE = re.compile(r"\b(?:nhs\s*(?:number|no)?[:\s-]*)?\d{3}[\s-]?\d{3}[\s-]?\d{4}\b", re.I)
_REF_RE = re.compile(r"\b(?:police|crime|case|court|la|ref(?:erence)?)\s*(?:number|no|ref)?[:#\s-]*[A-Z0-9/-]{5,}\b", re.I)

SENSITIVE_TERMS = (
    "safeguarding", "disclosure", "abuse", "neglect", "exploitation", "cse", "cce", "county lines",
    "self-harm", "suicide", "ligature", "overdose", "sexual", "assault", "allegation", "lado",
    "missing", "restraint", "physical intervention", "medication error", "pregnancy", "police",
)

RESTRICTED_TERMS = (
    "court order", "family court", "police reference", "nhs number", "address", "dob", "date of birth",
    "full name", "legal proceedings", "criminal investigation", "strategy meeting", "child protection conference",
)


@dataclass(frozen=True)
class InformationClassification:
    classification: InformationClass
    risk_score: int
    detected_categories: list[str] = field(default_factory=list)
    protections_required: list[str] = field(default_factory=list)
    safe_for_model: bool = True
    boundary: str = "Apply minimum necessary information and professional judgement."

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


class OrbInformationClassificationService:
    """DEPRECATED — use ``ai_privacy_decision_service`` and ``DataClassification`` enums."""

    VERSION = "orb-information-classification-v1-deprecated"

    def classify(self, text: str, *, surface: str | None = None) -> InformationClassification:
        body = text or ""
        lower = body.lower()
        detected: list[str] = []
        score = 0

        patterns = (
            ("email", _EMAIL_RE, 20),
            ("phone", _PHONE_RE, 20),
            ("postcode", _POSTCODE_RE, 20),
            ("date_of_birth", _DOB_RE, 35),
            ("nhs_number", _NHS_RE, 35),
            ("case_reference", _REF_RE, 25),
        )
        for label, pattern, weight in patterns:
            if pattern.search(body):
                detected.append(label)
                score += weight

        sensitive_hits = [term for term in SENSITIVE_TERMS if term in lower]
        if sensitive_hits:
            detected.append("sensitive_context")
            score += min(35, 10 + len(sensitive_hits) * 3)

        restricted_hits = [term for term in RESTRICTED_TERMS if term in lower]
        if restricted_hits:
            detected.append("restricted_context")
            score += min(45, 20 + len(restricted_hits) * 5)

        if surface in {"voice", "dictate"}:
            detected.append("transient_audio_surface")
            score += 5

        classification: InformationClass
        if score >= 75:
            classification = "restricted"
        elif score >= 55:
            classification = "highly_sensitive"
        elif score >= 25:
            classification = "sensitive"
        elif body.strip():
            classification = "professional"
        else:
            classification = "public"

        protections = ["privacy_notice"]
        if classification in {"sensitive", "highly_sensitive", "restricted"}:
            protections.extend(["mask_identifiers", "minimise_context", "avoid_unnecessary_third_party_detail"])
        if classification in {"highly_sensitive", "restricted"}:
            protections.extend(["no_raw_debug_payloads", "audit_safe_metadata_only", "do_not_store_audio_by_default"])
        if classification == "restricted":
            protections.append("prefer_user_redaction_or_internal_model_route")

        return InformationClassification(
            classification=classification,
            risk_score=min(score, 100),
            detected_categories=self._dedupe(detected),
            protections_required=self._dedupe(protections),
            safe_for_model=classification != "restricted",
            boundary="Do not send unnecessary identifiers to model providers; mask before generation where possible.",
        )

    def context_payload(self, text: str, **kwargs: Any) -> dict[str, Any]:
        payload = self.classify(text, **kwargs).to_dict()
        payload["service_version"] = self.VERSION
        return payload

    def _dedupe(self, items: list[str]) -> list[str]:
        seen: set[str] = set()
        out: list[str] = []
        for item in items:
            if item and item not in seen:
                seen.add(item)
                out.append(item)
        return out


orb_information_classification_service = OrbInformationClassificationService()
