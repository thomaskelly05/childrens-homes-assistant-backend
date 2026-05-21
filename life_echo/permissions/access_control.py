from __future__ import annotations


class LifeEchoAccessControl:
    """Simple RBAC foundations for LifeEcho experiences."""

    ROLE_PERMISSIONS = {
        "child": {
            "read:own_memories",
            "create:reflections",
        },
        "staff": {
            "read:child_memories",
            "create:memories",
            "create:voice_memories",
        },
        "therapist": {
            "read:therapeutic_insights",
            "read:child_memories",
        },
        "family": {
            "read:shared_memories",
        },
    }

    @classmethod
    def has_permission(cls, role: str, permission: str) -> bool:
        return permission in cls.ROLE_PERMISSIONS.get(role, set())
