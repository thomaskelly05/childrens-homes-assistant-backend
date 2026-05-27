from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from typing import Any


class InstitutionalMemoryStore:
    """Foundation layer for long-term institutional cognition memory.

    This is intentionally lightweight and non-persistent for now. It establishes
    the architecture contract for future durable provider memory, governance
    learning, reflective continuity and safeguarding trajectory analysis.
    """

    VERSION = "institutional-memory-store-v1"

    def __init__(self) -> None:
        self._memory: dict[str, list[dict[str, Any]]] = defaultdict(list)

    def remember(
        self,
        *,
        domain: str,
        theme: str,
        summary: str,
        metadata: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        entry = {
            "created_at": datetime.now(timezone.utc).isoformat(),
            "domain": domain,
            "theme": theme,
            "summary": summary,
            "metadata": metadata or {},
        }
        self._memory[domain].append(entry)
        return entry

    def recall(self, *, domain: str, limit: int = 10) -> dict[str, Any]:
        entries = self._memory.get(domain, [])[-limit:]
        themes: dict[str, int] = {}
        for item in entries:
            theme = str(item.get("theme") or "general")
            themes[theme] = themes.get(theme, 0) + 1
        return {
            "version": self.VERSION,
            "domain": domain,
            "entry_count": len(entries),
            "themes": themes,
            "entries": entries,
        }

    def provider_learning_summary(self) -> dict[str, Any]:
        safeguarding = self.recall(domain="safeguarding")
        governance = self.recall(domain="governance")
        therapeutic = self.recall(domain="therapeutic")
        workforce = self.recall(domain="workforce")
        return {
            "version": self.VERSION,
            "domains": {
                "safeguarding": safeguarding,
                "governance": governance,
                "therapeutic": therapeutic,
                "workforce": workforce,
            },
            "learning_questions": [
                "What patterns keep repeating over time?",
                "What actions consistently reduce risk or improve stability?",
                "Where does governance drift continue despite review?",
                "What learning is not embedding into daily practice?",
            ],
        }

    def prompt_addendum(self) -> str:
        summary = self.provider_learning_summary()
        lines = [
            "Institutional memory store:",
            f"- Version: {summary['version']}",
            "- Domains tracked: safeguarding; governance; therapeutic; workforce",
            "- Learning questions:",
        ]
        for question in summary["learning_questions"]:
            lines.append(f"  - {question}")
        return "\n".join(lines)


institutional_memory_store = InstitutionalMemoryStore()
