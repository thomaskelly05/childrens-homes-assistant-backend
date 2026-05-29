from __future__ import annotations

import re
from typing import Any

from services.orb_citation_decision_service import orb_citation_decision_service
from services.orb_citation_service import orb_citation_service
from services.orb_expert_scenario_bank_service import orb_expert_scenario_bank_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service
from services.orb_professional_curiosity_service import orb_professional_curiosity_service

GENERIC_DISPLAY_SOURCE_LABELS = frozenset(
    {
        "standalone orb product boundary",
        "indicare product context",
        "general model knowledge",
        "built-in product-level knowledge",
        "ofsted sccif framework knowledge",
        "children's homes regulations",
        "quality standards",
        "residential children's homes practice",
        "safeguarding practice principles",
        "recording quality",
        "therapeutic practice",
    }
)

GENERIC_SOURCE_TYPES = frozenset(
    {
        "product_context",
        "safety_boundary",
        "general_knowledge",
    }
)

SOURCE_TYPES = (
    "product_context",
    "regulatory_framework",
    "general_knowledge",
    "user_provided",
    "safety_boundary",
    "recording_quality",
    "therapeutic_practice",
    "safeguarding_principles",
    "image_context",
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def filter_display_sources(
    sources: list[dict[str, Any]],
    *,
    message: str | None = None,
    mode: str | None = None,
) -> list[dict[str, Any]]:
    """Drop generic product-boundary chips unless the question is product-related."""
    if not sources:
        return sources
    lower = str(message or "").lower()
    is_product = any(
        term in lower for term in ("indicare", "what is orb", "care companion", "tell me about indicare", "/orb")
    )
    topic = orb_professional_curiosity_service.detect_topic(message or "", mode=mode)
    high_attention = topic in orb_professional_curiosity_service.HIGH_ATTENTION_TOPICS if topic else False
    therapeutic_topic = topic == "therapeutic"
    medication_topic = topic == "medication"
    regulatory_types = frozenset(
        {"regulatory_framework", "recording_quality", "safeguarding_principles", "therapeutic_practice"}
    )
    filtered: list[dict[str, Any]] = []
    for item in sources:
        label = str(item.get("label") or "").strip().lower()
        source_type = str(item.get("type") or "").strip().lower()
        if not is_product:
            if label in GENERIC_DISPLAY_SOURCE_LABELS:
                continue
            if source_type in GENERIC_SOURCE_TYPES:
                continue
            if "product boundary" in label or "product context" in label:
                continue
            if source_type == "general_knowledge":
                continue
            if medication_topic and (source_type == "therapeutic_practice" or "therapeutic" in label):
                continue
            if not therapeutic_topic and source_type == "therapeutic_practice":
                continue
            if therapeutic_topic and not any(
                term in lower for term in ("safeguard", "harm", "injury", "abuse", "exploit", "missing", "police")
            ):
                if label in {"[reg 12]", "[reg 13]"} or "reg 12" in label or "reg 13" in label:
                    continue
        filtered.append(item)
    if filtered:
        return filtered
    if is_product:
        return sources
    regulatory_only = [s for s in sources if str(s.get("type") or "") in regulatory_types]
    if regulatory_only:
        return regulatory_only
    if high_attention:
        return []
    return sources[:3]


def build_standalone_sources(
    message: str,
    *,
    has_images: bool = False,
    profile_context: bool = False,
    mode: str | None = None,
) -> list[dict[str, Any]]:
    """Build legacy-compatible source list using knowledge retrieval and citations."""
    packs = orb_knowledge_retrieval_service.retrieve_sources(
        message,
        mode=mode,
        profile_context=profile_context,
        attachments=["image"] if has_images else None,
    )
    citations = orb_citation_service.build_citations(
        packs,
        message=message,
        mode=mode,
        has_images=has_images,
    )
    payload = orb_citation_service.frontend_sources_payload(citations)
    expert_ctx = orb_expert_scenario_bank_service.detect_expert_context(message)
    family_id = expert_ctx.get("family_id")
    if family_id:
        registry_citations = orb_citation_decision_service.select_sources(
            family_id=family_id,
            scenario_anchors=expert_ctx.get("source_anchors"),
            max_sources=4,
        )
        existing_labels = {str(p.get("label", "")).lower() for p in payload}
        for rc in registry_citations:
            label = str(rc.get("label", "")).lower()
            if label and label not in existing_labels:
                payload.append(
                    {
                        "label": rc.get("label"),
                        "type": "regulatory_framework",
                        "source_id": rc.get("source_id"),
                        "source_url": rc.get("source_url"),
                        "why_cited": rc.get("why_cited"),
                        "exact_text_available": rc.get("exact_text_available"),
                        "basis_type": rc.get("basis_type"),
                        "summary_basis": rc.get("summary_basis"),
                    }
                )
                existing_labels.add(label)
    return filter_display_sources(payload, message=message, mode=mode)


def append_sources_basis_section(
    answer: str,
    sources: list[dict[str, Any]],
    *,
    message: str | None = None,
    mode: str | None = None,
) -> str:
    text = str(answer or "").strip()
    if not text:
        return text
    if re.search(r"\[[^\]]+\]", text):
        return text
    if re.search(r"(?i)sources\s*/\s*basis", text):
        return text
    citations = orb_citation_service.normalise_sources(sources)
    topic = orb_professional_curiosity_service.detect_topic(message or "", mode=mode)
    if topic in orb_professional_curiosity_service.HIGH_ATTENTION_TOPICS:
        if re.search(r"\[(reg\s*12|reg\s*13|sccif|lado|working together|recording quality)\]", text, re.I):
            return text
    if topic and topic not in {"indicare_product", "general_residential"}:
        return text
    display_sources = filter_display_sources(citations, message=message, mode=mode)
    if not display_sources:
        return text
    return orb_citation_service.append_sources_basis(text, display_sources)


INDICARE_PRODUCT_FALLBACK = """IndiCare is a residential children's homes operating system and intelligence platform built to support staff and managers in registered homes.

It is designed around care recording, safeguarding, Ofsted and SCCIF readiness, Quality Standards, governance, workforce support and reflective practice. The aim is to simplify recording and oversight while making records more child-centred, evidence-led and easier to review.

Key areas include Care Hub (command centre), Record, Young People, Chronology, Documents, Actions, the Intelligence Spine, Ofsted readiness, workforce support, governance, reports and ORB.

ORB Care Companion is this standalone experience at /orb — a ChatGPT-style, voice-enabled companion for general questions, recording quality, Ofsted/SCCIF reflection, safeguarding thinking and therapeutic practice. It does not access live OS records.

IndiCare OS ORB at /assistant/orb is the operational, permissioned assistant that may use OS and Care Hub context where your role allows.

Sources / basis
- IndiCare product context: product-level description of the platform and ORB split.
- Standalone ORB product boundary: no live OS records are accessed from standalone /orb."""
