"""Known official source families and metadata classification for standalone ORB."""

from __future__ import annotations

import re
from datetime import timedelta
from typing import Any

OrbDocumentFamily = str
OrbSourceIntegrity = str

KNOWN_SOURCE_FAMILIES: dict[str, dict[str, Any]] = {
    "childrens_homes_regulations": {
        "document_family": "legislation",
        "publisher": "UK legislation / Department for Education",
        "official_source": True,
        "confidence_level": "official",
        "source_integrity": "summary_only",
        "citation_style": "legislation",
        "jurisdiction": "England",
        "review_period_days": 365,
    },
    "quality_standards_guide": {
        "document_family": "dfe",
        "publisher": "Department for Education",
        "official_source": True,
        "confidence_level": "official",
        "source_integrity": "summary_only",
        "citation_style": "dfe_guidance",
        "jurisdiction": "England",
        "review_period_days": 365,
    },
    "sccif_childrens_homes": {
        "document_family": "ofsted",
        "publisher": "Ofsted",
        "official_source": True,
        "confidence_level": "official",
        "source_integrity": "summary_only",
        "citation_style": "ofsted_framework",
        "jurisdiction": "England",
        "review_period_days": 180,
    },
    "working_together": {
        "document_family": "safeguarding",
        "publisher": "HM Government / Department for Education",
        "official_source": True,
        "confidence_level": "official",
        "source_integrity": "summary_only",
        "citation_style": "statutory_guidance",
        "jurisdiction": "England",
        "review_period_days": 365,
    },
    "missing_children_guidance": {
        "document_family": "safeguarding",
        "publisher": "Department for Education / statutory guidance",
        "official_source": True,
        "confidence_level": "official",
        "source_integrity": "summary_only",
        "citation_style": "statutory_guidance",
        "jurisdiction": "England",
        "review_period_days": 365,
    },
    "provider_policy": {
        "document_family": "provider_policy",
        "publisher": "Provider",
        "official_source": False,
        "confidence_level": "high",
        "source_integrity": "full_document",
        "citation_style": "provider_policy",
        "jurisdiction": "England",
        "review_period_days": 365,
    },
    "indicare_product_docs": {
        "document_family": "indicare_product",
        "publisher": "IndiCare",
        "official_source": False,
        "confidence_level": "high",
        "source_integrity": "full_document",
        "citation_style": "product",
        "jurisdiction": None,
        "review_period_days": 180,
    },
    "internal_guidance": {
        "document_family": "internal_guidance",
        "publisher": "Organisation",
        "official_source": False,
        "confidence_level": "medium",
        "source_integrity": "full_document",
        "citation_style": "internal",
        "jurisdiction": "England",
        "review_period_days": 180,
    },
}

DETECTION_PATTERNS: list[tuple[str, list[str]]] = [
    ("sccif_childrens_homes", ["sccif", "social care common inspection", "ofsted inspection framework"]),
    ("quality_standards_guide", ["quality standard", "children's homes quality", "quality standards guide"]),
    ("childrens_homes_regulations", ["children's homes regulations", "childrens homes regulations", "regulation 44"]),
    ("working_together", ["working together", "working together to safeguard"]),
    ("missing_children_guidance", ["missing from care", "missing children", "absent without permission"]),
    ("provider_policy", ["safeguarding policy", "provider policy", "our policy", "organisation policy"]),
    ("indicare_product_docs", ["indicare", "care hub", "intelligence spine", "orb care companion"]),
    ("internal_guidance", ["internal guidance", "house guidance", "home guidance"]),
]


def _text(value: Any) -> str:
    return str(value or "").strip()


class OrbOfficialSourceRegistryService:
    """Metadata registry for official and provider knowledge sources."""

    def list_known_sources(self) -> list[dict[str, Any]]:
        return [
            {"family_key": key, **meta}
            for key, meta in KNOWN_SOURCE_FAMILIES.items()
        ]

    def detect_source_family(
        self,
        title: str,
        text: str = "",
        *,
        file_name: str | None = None,
        source_url: str | None = None,
    ) -> str | None:
        combined = f"{title} {text[:4000]} {file_name or ''} {source_url or ''}".lower()
        for family_key, patterns in DETECTION_PATTERNS:
            if any(pat in combined for pat in patterns):
                return family_key
        if re.search(r"\bofsted\b", combined) and "inspection" in combined:
            return "sccif_childrens_homes"
        if "regulation" in combined and "children" in combined:
            return "childrens_homes_regulations"
        return None

    def default_metadata_for_family(self, family: str) -> dict[str, Any]:
        meta = dict(KNOWN_SOURCE_FAMILIES.get(family) or {})
        meta["family_key"] = family
        return meta

    def recommended_review_period(self, family: str) -> timedelta:
        days = int((KNOWN_SOURCE_FAMILIES.get(family) or {}).get("review_period_days") or 365)
        return timedelta(days=days)

    def citation_style_for_family(self, family: str) -> str:
        return _text((KNOWN_SOURCE_FAMILIES.get(family) or {}).get("citation_style")) or "general"

    def source_warning_for_integrity(self, source: dict[str, Any]) -> str | None:
        integrity = _text(source.get("source_integrity")) or "unknown"
        if integrity == "summary_only":
            return "This is a built-in summary, not the full official document."
        if integrity == "excerpt_only":
            return "This source is an excerpt only; verify against the full document."
        if integrity == "user_pasted":
            return "This source was pasted by a user; confirm accuracy before relying on it."
        if integrity == "unknown":
            return "Source integrity is unknown; treat with caution."
        return None


orb_official_source_registry_service = OrbOfficialSourceRegistryService()
