"""ORB Knowledge Library source priority for standalone answering — no separate AI brain."""

from __future__ import annotations

from typing import Any

SOURCE_PRIORITY_ORDER: list[tuple[str, str]] = [
    ("immediate_safeguarding", "Immediate safeguarding and safety boundaries"),
    ("approved_provider_home_policy", "Approved provider or home policy"),
    ("approved_local_protocol", "Approved local protocol"),
    ("official_guidance_library", "Official guidance library (metadata and approved uploads)"),
    ("orb_recording_framework", "ORB Recording Framework structure"),
    ("general_orb_intelligence", "General ORB intelligence (IndiCare Intelligence Core)"),
]

NO_APPROVED_HOME_POLICY_MESSAGE = (
    "I can give general guidance, but I cannot see an approved home policy for this yet."
)

POLICY_CLAIM_GUARD = (
    "Do not say 'your policy says' unless an approved provider/home document is selected and used. "
    "State source status (approved, draft, needs review) when referencing uploaded material."
)


def _text(value: Any) -> str:
    return str(value or "").strip()


def rank_knowledge_sources(sources: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Sort sources by answering priority (highest first)."""

    def score(source: dict[str, Any]) -> int:
        if source.get("priority_tier"):
            try:
                return int(source["priority_tier"])
            except (TypeError, ValueError):
                pass
        gov = _text(source.get("governance_status"))
        family = _text(source.get("document_family"))
        official = bool(source.get("official_source"))
        if gov == "approved" and family == "provider_policy":
            return 1
        if gov == "approved" and family in {"internal_guidance", "safeguarding"}:
            return 2
        if official and gov == "approved":
            return 3
        if gov == "approved":
            return 4
        if official:
            return 5
        return 6

    ranked = sorted(sources, key=score)
    for idx, item in enumerate(ranked):
        item["priority_rank"] = idx + 1
    return ranked


def build_priority_prompt_block(
    *,
    sources: list[dict[str, Any]] | None = None,
    topic: str | None = None,
    has_approved_home_policy: bool | None = None,
) -> str:
    lines = [
        "Knowledge Library source priority (standalone ORB — IndiCare Intelligence Core):",
    ]
    for idx, (_, label) in enumerate(SOURCE_PRIORITY_ORDER, start=1):
        lines.append(f"{idx}. {label}")
    lines.append(f"- Topic context: {topic or 'general'}")
    if has_approved_home_policy is False:
        lines.append(f"- Policy availability: {NO_APPROVED_HOME_POLICY_MESSAGE}")
    lines.append(f"- Citation guard: {POLICY_CLAIM_GUARD}")
    if sources:
        ranked = rank_knowledge_sources(list(sources))
        lines.append("- Selected sources (highest priority first):")
        for src in ranked[:6]:
            title = _text(src.get("title") or src.get("source_label"))
            status = _text(src.get("governance_status") or "unknown")
            lines.append(f"  - {title} [{status}]")
    return "\n".join(lines)


class OrbKnowledgeAnswerPriorityService:
    SOURCE_PRIORITY_ORDER = SOURCE_PRIORITY_ORDER
    NO_APPROVED_HOME_POLICY_MESSAGE = NO_APPROVED_HOME_POLICY_MESSAGE

    rank_knowledge_sources = staticmethod(rank_knowledge_sources)
    build_priority_prompt_block = staticmethod(build_priority_prompt_block)


orb_knowledge_answer_priority_service = OrbKnowledgeAnswerPriorityService()
