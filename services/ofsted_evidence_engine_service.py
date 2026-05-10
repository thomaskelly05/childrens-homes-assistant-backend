from __future__ import annotations

from collections import Counter
from typing import Any


class OfstedEvidenceEngineService:
    """Builds inspection evidence cards from existing workspace data.

    This is deliberately evidence-led: it only transforms records already visible
    through the workspace orchestration layer. It does not invent facts.
    """

    def build_home_evidence(self, workspace: dict[str, Any]) -> dict[str, Any]:
        events = workspace.get("child_journey_overview", {}).get("recent_events") or []
        documents = workspace.get("documents") or []
        review_queue = workspace.get("manager_oversight", {}).get("review_queue") or []
        actions = workspace.get("manager_oversight", {}).get("open_or_overdue_actions") or []

        cards = []
        cards.extend(self._experience_cards(events))
        cards.extend(self._safeguarding_cards(events, review_queue))
        cards.extend(self._leadership_cards(review_queue, actions, documents))

        return {
            "ok": True,
            "scope": "home",
            "home_id": workspace.get("home_id"),
            "summary": self._summary(cards),
            "cards": cards,
            "gaps": self._gaps(events, documents, review_queue),
            "judgement_sections": self._sections(cards),
        }

    def build_child_evidence(self, workspace: dict[str, Any]) -> dict[str, Any]:
        events = workspace.get("journey", {}).get("timeline") or workspace.get("journey", {}).get("recent_events") or []
        documents = workspace.get("documents") or []
        review_queue = workspace.get("manager_oversight", {}).get("review_queue") or []
        actions = workspace.get("adult_workspace", {}).get("actions") or []

        cards = []
        cards.extend(self._experience_cards(events, child_level=True))
        cards.extend(self._safeguarding_cards(events, review_queue, child_level=True))
        cards.extend(self._leadership_cards(review_queue, actions, documents, child_level=True))

        return {
            "ok": True,
            "scope": "child",
            "young_person_id": workspace.get("young_person_id"),
            "summary": self._summary(cards),
            "cards": cards,
            "gaps": self._gaps(events, documents, review_queue),
            "judgement_sections": self._sections(cards),
        }

    def _experience_cards(self, events: list[dict[str, Any]], child_level: bool = False) -> list[dict[str, Any]]:
        counts = self._counts(events)
        cards = []
        daily = counts.get("daily_note", 0) + counts.get("daily_notes", 0)
        keywork = counts.get("keywork", 0) + counts.get("keywork_sessions", 0)
        education = counts.get("education", 0) + counts.get("education_records", 0)
        health = counts.get("health", 0) + counts.get("health_records", 0)

        if daily:
            cards.append(self._card(
                section="experiences_and_progress",
                strength="medium",
                title="Daily lived experience evidence is visible",
                statement=f"{daily} recent daily record(s) are available to evidence the child's lived experience and adult response.",
                impact="Supports inspection evidence about day-to-day care, consistency, routines and relationships.",
                source_count=daily,
            ))
        if keywork:
            cards.append(self._card(
                section="experiences_and_progress",
                strength="high",
                title="Child voice and direct work evidence is visible",
                statement=f"{keywork} keywork/direct work record(s) are visible.",
                impact="Supports evidence that adults are listening to the child and responding to wishes, feelings and goals.",
                source_count=keywork,
            ))
        if education or health:
            cards.append(self._card(
                section="experiences_and_progress",
                strength="medium",
                title="Outcome-area records are visible",
                statement=f"Education records: {education}. Health records: {health}.",
                impact="Supports evidence of progress beyond incidents and demonstrates attention to wider outcomes.",
                source_count=education + health,
            ))
        return cards

    def _safeguarding_cards(self, events: list[dict[str, Any]], review_queue: list[dict[str, Any]], child_level: bool = False) -> list[dict[str, Any]]:
        counts = self._counts(events)
        cards = []
        incidents = counts.get("incident", 0) + counts.get("incidents", 0)
        safeguarding = counts.get("safeguarding", 0) + counts.get("safeguarding_records", 0)
        missing = counts.get("missing_episode", 0) + counts.get("missing_episodes", 0)
        pending_safeguarding = [item for item in review_queue if "safeguarding" in self._text(item)]

        if incidents:
            cards.append(self._card(
                section="help_and_protection",
                strength="medium",
                title="Incident evidence is visible",
                statement=f"{incidents} incident record(s) are visible in the workspace.",
                impact="Inspectors can sample whether staff response, debrief, learning and plan updates are recorded.",
                source_count=incidents,
            ))
        if safeguarding:
            cards.append(self._card(
                section="help_and_protection",
                strength="high" if not pending_safeguarding else "medium",
                title="Safeguarding evidence is visible",
                statement=f"{safeguarding} safeguarding record(s) are visible.",
                impact="Supports evidence that adults identify concerns and take protective action. Manager review should be checked.",
                source_count=safeguarding,
            ))
        if missing:
            cards.append(self._card(
                section="help_and_protection",
                strength="medium",
                title="Missing-from-care evidence is visible",
                statement=f"{missing} missing episode record(s) are visible.",
                impact="Supports evidence of response to vulnerability, return work and pattern analysis.",
                source_count=missing,
            ))
        return cards

    def _leadership_cards(self, review_queue: list[dict[str, Any]], actions: list[dict[str, Any]], documents: list[dict[str, Any]], child_level: bool = False) -> list[dict[str, Any]]:
        cards = []
        pending = len(review_queue)
        open_actions = len(actions)
        pending_documents = [doc for doc in documents if str(doc.get("approval_status") or "").lower() in {"pending", "submitted", "changes_requested", "rejected"}]

        cards.append(self._card(
            section="leadership_and_management",
            strength="high" if pending == 0 else "medium",
            title="Manager oversight queue is visible",
            statement=f"{pending} record(s) are awaiting manager review.",
            impact="Shows whether leaders have grip on recording quality, risk and follow-through.",
            source_count=pending,
        ))
        if open_actions:
            cards.append(self._card(
                section="leadership_and_management",
                strength="medium",
                title="Improvement actions are visible",
                statement=f"{open_actions} open or overdue action(s) are visible.",
                impact="Supports evidence that leaders identify issues and track improvement actions.",
                source_count=open_actions,
            ))
        if pending_documents:
            cards.append(self._card(
                section="leadership_and_management",
                strength="medium",
                title="Document approval workflow is active",
                statement=f"{len(pending_documents)} document(s) require approval or changes.",
                impact="Shows document control, manager review and audit trail for plans and policies.",
                source_count=len(pending_documents),
            ))
        return cards

    def _gaps(self, events: list[dict[str, Any]], documents: list[dict[str, Any]], review_queue: list[dict[str, Any]]) -> list[dict[str, str]]:
        counts = self._counts(events)
        gaps = []
        if not (counts.get("keywork", 0) or counts.get("keywork_sessions", 0)):
            gaps.append({"area": "Child voice", "gap": "No keywork/direct work evidence visible in this workspace view."})
        if not documents:
            gaps.append({"area": "Documents", "gap": "No documents visible for this workspace view."})
        if review_queue:
            gaps.append({"area": "Leadership", "gap": f"{len(review_queue)} item(s) still awaiting manager review."})
        return gaps

    def _sections(self, cards: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
        sections = {
            "experiences_and_progress": {"title": "Overall experiences and progress", "cards": []},
            "help_and_protection": {"title": "How well children are helped and protected", "cards": []},
            "leadership_and_management": {"title": "Effectiveness of leaders and managers", "cards": []},
        }
        for card in cards:
            section = card.get("section")
            if section in sections:
                sections[section]["cards"].append(card)
        return sections

    def _summary(self, cards: list[dict[str, Any]]) -> dict[str, Any]:
        counts = Counter(card.get("section") for card in cards)
        return {
            "total_cards": len(cards),
            "experiences_and_progress": counts.get("experiences_and_progress", 0),
            "help_and_protection": counts.get("help_and_protection", 0),
            "leadership_and_management": counts.get("leadership_and_management", 0),
        }

    def _counts(self, events: list[dict[str, Any]]) -> Counter:
        return Counter(str(event.get("record_type") or event.get("source_table") or "record") for event in events)

    def _text(self, value: dict[str, Any]) -> str:
        return " ".join(str(v or "") for v in value.values()).lower()

    def _card(self, *, section: str, strength: str, title: str, statement: str, impact: str, source_count: int) -> dict[str, Any]:
        return {
            "section": section,
            "strength": strength,
            "title": title,
            "statement": statement,
            "impact": impact,
            "source_count": source_count,
        }
