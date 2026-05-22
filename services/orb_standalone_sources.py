from __future__ import annotations

import re
from typing import Any

SOURCE_TYPES = (
    "product_context",
    "regulatory_framework",
    "general_knowledge",
    "user_provided",
    "safety_boundary",
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def _lower(message: str) -> str:
    return _text(message).lower()


def build_standalone_sources(
    message: str,
    *,
    has_images: bool = False,
    profile_context: bool = False,
    mode: str | None = None,
) -> list[dict[str, Any]]:
    lower = _lower(message)
    sources: list[dict[str, Any]] = [
        {
            "label": "Standalone ORB product boundary",
            "type": "product_context",
            "note": "No live IndiCare OS records, Care Hub, chronology or dashboards are accessed in standalone /orb.",
        }
    ]

    if profile_context or "standalone context profiles" in lower or "profile:" in lower:
        sources.append(
            {
                "label": "Standalone profile/context you provided",
                "type": "user_provided",
                "note": "Based on user-provided standalone profiles or project notes, not OS records.",
            }
        )

    if has_images:
        sources.append(
            {
                "label": "User-uploaded image",
                "type": "user_provided",
                "note": "Image supplied in the conversation prompt.",
            }
        )

    indicare_terms = ("indicare", "orb care companion", "care companion", "/orb", "intelligence spine", "care hub")
    if any(term in lower for term in indicare_terms):
        sources.append(
            {
                "label": "IndiCare product context",
                "type": "product_context",
                "note": "Product-level description of IndiCare OS and ORB Care Companion.",
            }
        )

    regulatory_terms = (
        "ofsted",
        "sccif",
        "quality standard",
        "children's homes regulation",
        "childrens homes regulation",
        "reg 44",
        "reg 45",
        "inspection",
    )
    if any(term in lower for term in regulatory_terms) or (mode or "").strip() == "Ofsted Lens":
        sources.append(
            {
                "label": "Ofsted SCCIF framework knowledge",
                "type": "regulatory_framework",
                "note": "Guidance framing from known inspection frameworks; not a live Ofsted lookup.",
            }
        )
        sources.append(
            {
                "label": "Children's Homes Regulations / Quality Standards",
                "type": "regulatory_framework",
                "note": "Statutory and regulatory framing for registered children's homes in England.",
            }
        )

    safeguarding_terms = ("safeguarding", "abuse", "exploitation", "missing", "self-harm", "self harm")
    if any(term in lower for term in safeguarding_terms) or (mode or "").strip() == "Safeguarding":
        sources.append(
            {
                "label": "Safeguarding practice principles",
                "type": "safety_boundary",
                "note": "Reflective support only; follow local policy and escalate immediate risk through proper channels.",
            }
        )
        sources.append(
            {
                "label": "Working Together / statutory safeguarding principles",
                "type": "regulatory_framework",
                "note": "General statutory safeguarding framing; not a quote or live policy retrieval.",
            }
        )

    if not any(item["type"] == "general_knowledge" for item in sources):
        sources.append(
            {
                "label": "General model knowledge",
                "type": "general_knowledge",
                "note": "Unless external browsing is added, answers draw on model training and built-in product context.",
            }
        )

    return _dedupe_sources(sources)


def _dedupe_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    seen: set[str] = set()
    deduped: list[dict[str, Any]] = []
    for item in sources:
        key = f"{item.get('type')}|{item.get('label')}"
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def append_sources_basis_section(answer: str, sources: list[dict[str, Any]]) -> str:
    text = _text(answer)
    if not text or not sources:
        return text
    if re.search(r"(?i)sources\s*/\s*basis", text):
        return text
    lines = ["", "Sources / basis"]
    for item in sources[:6]:
        label = _text(item.get("label"))
        note = _text(item.get("note"))
        if note:
            lines.append(f"- {label}: {note}")
        elif label:
            lines.append(f"- {label}")
    return text + "\n".join(lines)


INDICARE_PRODUCT_FALLBACK = """IndiCare is a residential children's homes operating system and intelligence platform built to support staff and managers in registered homes.

It is designed around care recording, safeguarding, Ofsted and SCCIF readiness, Quality Standards, governance, workforce support and reflective practice. The aim is to simplify recording and oversight while making records more child-centred, evidence-led and easier to review.

Key areas include Care Hub (command centre), Record, Young People, Chronology, Documents, Actions, the Intelligence Spine, Ofsted readiness, workforce support, governance, reports and ORB.

ORB Care Companion is this standalone experience at /orb — a ChatGPT-style, voice-enabled companion for general questions, recording quality, Ofsted/SCCIF reflection, safeguarding thinking and therapeutic practice. It does not access live OS records.

IndiCare OS ORB at /assistant/orb is the operational, permissioned assistant that may use OS and Care Hub context where your role allows.

Sources / basis
- IndiCare product context: product-level description of the platform and ORB split.
- Standalone ORB product boundary: no live OS records are accessed from standalone /orb."""
