from __future__ import annotations

import re
from typing import Any

from services.orb_citation_service import orb_citation_service
from services.orb_knowledge_retrieval_service import orb_knowledge_retrieval_service

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
    return orb_citation_service.frontend_sources_payload(citations)


def append_sources_basis_section(answer: str, sources: list[dict[str, Any]]) -> str:
    citations = orb_citation_service.normalise_sources(sources)
    return orb_citation_service.append_sources_basis(answer, citations)


INDICARE_PRODUCT_FALLBACK = """IndiCare is a residential children's homes operating system and intelligence platform built to support staff and managers in registered homes.

It is designed around care recording, safeguarding, Ofsted and SCCIF readiness, Quality Standards, governance, workforce support and reflective practice. The aim is to simplify recording and oversight while making records more child-centred, evidence-led and easier to review.

Key areas include Care Hub (command centre), Record, Young People, Chronology, Documents, Actions, the Intelligence Spine, Ofsted readiness, workforce support, governance, reports and ORB.

ORB Care Companion is this standalone experience at /orb — a ChatGPT-style, voice-enabled companion for general questions, recording quality, Ofsted/SCCIF reflection, safeguarding thinking and therapeutic practice. It does not access live OS records.

IndiCare OS ORB at /assistant/orb is the operational, permissioned assistant that may use OS and Care Hub context where your role allows.

Sources / basis
- IndiCare product context: product-level description of the platform and ORB split.
- Standalone ORB product boundary: no live OS records are accessed from standalone /orb."""
