from __future__ import annotations

from datetime import datetime, timezone


class LifeEchoMemoryCapsuleService:
    """Stores future-release emotional memory capsules."""

    def __init__(self) -> None:
        self._capsules: list[dict] = []

    def create_capsule(
        self,
        *,
        child_id: str,
        title: str,
        message: str,
        unlock_at: str,
    ) -> dict:
        capsule = {
            "id": f"capsule_{len(self._capsules) + 1}",
            "child_id": child_id,
            "title": title,
            "message": message,
            "unlock_at": unlock_at,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "status": "locked",
        }

        self._capsules.append(capsule)
        return capsule

    def available_capsules(self, child_id: str) -> list[dict]:
        now = datetime.now(timezone.utc)

        available = []

        for capsule in self._capsules:
            if capsule["child_id"] != child_id:
                continue

            unlock_time = datetime.fromisoformat(capsule["unlock_at"])

            if unlock_time <= now:
                available.append(capsule)

        return available


life_echo_memory_capsules = LifeEchoMemoryCapsuleService()
