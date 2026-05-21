from __future__ import annotations

from datetime import datetime, timezone


class LifeEchoAuditTrail:
    """Captures audit events for safeguarding, compliance and governance."""

    def __init__(self) -> None:
        self._entries: list[dict] = []

    def log(self, *, action: str, actor: str, context: dict | None = None) -> None:
        self._entries.append(
            {
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "action": action,
                "actor": actor,
                "context": context or {},
            }
        )

    def list_entries(self) -> list[dict]:
        return self._entries


life_echo_audit_trail = LifeEchoAuditTrail()
