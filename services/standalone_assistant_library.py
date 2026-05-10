from __future__ import annotations

"""Standalone assistant knowledge library.

This module exposes only generic guidance resources suitable for the external
standalone assistant surface. It must not load child, home, chronology,
safeguarding workspace, inspection dashboard, or OS operational records.
"""

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class StandaloneLibraryItem:
    item_id: str
    title: str
    category: str
    summary: str
    source_label: str
    content: str


LIBRARY_ITEMS: tuple[StandaloneLibraryItem, ...] = (
    StandaloneLibraryItem(
        item_id="regulation-12-protection",
        title="Regulation 12: The protection of children standard",
        category="Regulations",
        source_label="Children's Homes (England) Regulations 2015",
        summary="High-level support for understanding protection of children duties.",
        content=(
            "Use this resource to support general understanding of Regulation 12. "
            "When answering, name the regulation, quote only wording supplied by official sources or the user, "
            "and separate practice explanation from quoted wording."
        ),
    ),
    StandaloneLibraryItem(
        item_id="recording-good-practice",
        title="Good recording practice",
        category="Practice guidance",
        source_label="IndiCare practice guidance",
        summary="Factual, chronological and child-centred recording principles.",
        content=(
            "Good residential care records should be factual, timely, proportionate and useful for care planning, "
            "safeguarding review, management oversight and inspection. Separate observation from interpretation, "
            "record the child's voice where known, and include actions, outcomes and follow-up."
        ),
    ),
    StandaloneLibraryItem(
        item_id="handover-writing",
        title="Handover writing support",
        category="Templates",
        source_label="IndiCare assistant template",
        summary="A concise structure for shift handovers and daily summaries.",
        content=(
            "A useful handover normally includes: key events, child's presentation, health/medication updates, "
            "safeguarding concerns, contact/family updates, education or appointments, actions outstanding, and matters "
            "requiring manager oversight."
        ),
    ),
    StandaloneLibraryItem(
        item_id="risk-summary-structure",
        title="Risk summary structure",
        category="Templates",
        source_label="IndiCare assistant template",
        summary="A practical structure for risk summaries without inventing facts.",
        content=(
            "A risk summary can be structured as: current concerns, known triggers, protective factors, indicators of escalation, "
            "staff responses that help, current controls, unresolved actions and review points. Do not add risks that are not supplied."
        ),
    ),
)


def list_standalone_library_items() -> list[dict[str, Any]]:
    return [
        {
            "item_id": item.item_id,
            "title": item.title,
            "category": item.category,
            "summary": item.summary,
            "source_label": item.source_label,
        }
        for item in LIBRARY_ITEMS
    ]


def get_standalone_library_item(item_id: str) -> dict[str, Any] | None:
    for item in LIBRARY_ITEMS:
        if item.item_id == item_id:
            return {
                "item_id": item.item_id,
                "title": item.title,
                "category": item.category,
                "summary": item.summary,
                "source_label": item.source_label,
                "content": item.content,
            }
    return None
