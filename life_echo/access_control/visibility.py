from __future__ import annotations

from life_echo.schemas import LifeEchoVisibility


class LifeEchoVisibilityPolicy:
    """Controls visibility of emotional continuity records."""

    @staticmethod
    def can_access(*, role: str, visibility: LifeEchoVisibility) -> bool:
        matrix = {
            "admin": {
                LifeEchoVisibility.internal,
                LifeEchoVisibility.therapeutic,
                LifeEchoVisibility.child_memory,
                LifeEchoVisibility.restricted,
            },
            "therapist": {
                LifeEchoVisibility.therapeutic,
                LifeEchoVisibility.child_memory,
            },
            "staff": {
                LifeEchoVisibility.internal,
                LifeEchoVisibility.therapeutic,
            },
            "child": {
                LifeEchoVisibility.child_memory,
            },
        }

        allowed = matrix.get(role, set())
        return visibility in allowed
