from __future__ import annotations

"""Static children homes knowledge available to the standalone assistant."""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class SectorKnowledgeItem:
    item_id: str
    title: str
    category: str
    source_type: str
    reference: str
    summary: str
    keywords: tuple[str, ...]


SECTOR_KNOWLEDGE: tuple[SectorKnowledgeItem, ...] = (
    SectorKnowledgeItem(
        item_id="children-homes-reg-2015",
        title="Children's Homes Regulations 2015",
        category="Legal framework",
        source_type="static_regulation",
        reference="Children's Homes (England) Regulations 2015",
        summary="Use the Regulations as the statutory frame for quality standards, leadership, protection, care planning and review. Distinguish explanatory guidance from legal advice.",
        keywords=("regulation", "reg", "quality standard", "children's homes regulations", "legal"),
    ),
    SectorKnowledgeItem(
        item_id="reg-12-protection",
        title="Regulation 12: The protection of children standard",
        category="Safeguarding",
        source_type="static_regulation",
        reference="Children's Homes (England) Regulations 2015, Regulation 12",
        summary="Protection answers should be child-centred, evidence-aware and avoid unsupported safeguarding conclusions. Recommend manager and safeguarding lead review where risk is unclear.",
        keywords=("regulation 12", "reg 12", "safeguarding", "protection", "harm"),
    ),
    SectorKnowledgeItem(
        item_id="reg-44-visits",
        title="Regulation 44 independent visits",
        category="Quality assurance",
        source_type="static_regulation",
        reference="Children's Homes (England) Regulations 2015, Regulation 44",
        summary="Reg 44 work should test children's welfare, safeguarding, leadership oversight, records, staff practice and whether actions improve children's lived experience.",
        keywords=("reg 44", "reg44", "independent visit", "visitor"),
    ),
    SectorKnowledgeItem(
        item_id="reg-45-review",
        title="Regulation 45 quality of care review",
        category="Quality assurance",
        source_type="static_regulation",
        reference="Children's Homes (England) Regulations 2015, Regulation 45",
        summary="Reg 45 reviews should evaluate quality of care, feedback, patterns, action plans and whether the home is improving outcomes for children.",
        keywords=("reg 45", "reg45", "quality of care", "improvement plan"),
    ),
    SectorKnowledgeItem(
        item_id="sccif-judgement-areas",
        title="SCCIF judgement areas",
        category="Inspection",
        source_type="static_framework",
        reference="Ofsted SCCIF for children's homes",
        summary="SCCIF preparation should cover overall experiences and progress, help and protection, leadership and management, and the effectiveness of wider professional work.",
        keywords=("sccif", "ofsted", "inspection", "judgement", "leadership"),
    ),
    SectorKnowledgeItem(
        item_id="child-voice-lived-experience",
        title="Child voice and lived experience",
        category="Practice",
        source_type="static_guidance",
        reference="IndiCare sector practice guidance",
        summary="Good practice records what the child says, how they present, what staff did, what changed, and what remains unresolved without over-claiming impact.",
        keywords=("child voice", "lived experience", "child-centred", "keywork", "direct work"),
    ),
    SectorKnowledgeItem(
        item_id="missing-from-care",
        title="Missing from care practice",
        category="Safeguarding",
        source_type="static_guidance",
        reference="Children's homes safeguarding practice concepts",
        summary="Missing episode work should consider prevention planning, push/pull factors, return home conversations, professional notifications, patterns and review of safety planning.",
        keywords=("missing", "return home", "push", "pull", "absence"),
    ),
    SectorKnowledgeItem(
        item_id="workforce-leadership",
        title="Leadership, safer recruitment and staff supervision",
        category="Leadership",
        source_type="static_guidance",
        reference="Children's homes leadership and management practice concepts",
        summary="Leadership evidence usually includes safer recruitment, induction, supervision, learning culture, management oversight, staff skill, escalation and action completion.",
        keywords=("supervision", "leadership", "management", "safer recruitment", "staff"),
    ),
)


def search_sector_knowledge(query: str, *, limit: int = 4) -> list[dict[str, Any]]:
    text = query.lower()
    scored: list[tuple[int, SectorKnowledgeItem]] = []
    for item in SECTOR_KNOWLEDGE:
        score = sum(1 for keyword in item.keywords if keyword in text)
        if item.title.lower() in text:
            score += 2
        if score:
            scored.append((score, item))

    if not scored:
        scored = [(1, item) for item in SECTOR_KNOWLEDGE[:limit]]

    return [
        {
            "label": item.reference,
            "source_type": item.source_type,
            "source_id": item.item_id,
            "excerpt": item.summary,
            "confidence": "high" if score > 1 else "medium",
        }
        for score, item in sorted(scored, key=lambda pair: pair[0], reverse=True)[:limit]
    ]


def list_sector_knowledge() -> list[dict[str, Any]]:
    return [
        {
            "item_id": item.item_id,
            "title": item.title,
            "category": item.category,
            "reference": item.reference,
            "summary": item.summary,
        }
        for item in SECTOR_KNOWLEDGE
    ]
