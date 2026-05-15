from __future__ import annotations

from typing import Any

from fastapi import HTTPException

from auth.errors import forbidden, unauthorised
from services.assistant_security import is_provider_level_role, normalise_role, safe_int
from services.young_person_service import YoungPersonService


def _user_id(current_user: dict[str, Any]) -> int | None:
    return safe_int(
        current_user.get("id")
        or current_user.get("user_id")
        or current_user.get("sub")
    )


def _home_id(current_user: dict[str, Any]) -> int | None:
    return safe_int(
        current_user.get("home_id")
        or current_user.get("homeId")
        or current_user.get("selected_home_id")
        or current_user.get("default_home_id")
    )


def _allowed_home_ids(current_user: dict[str, Any]) -> set[int]:
    raw_values = (
        current_user.get("allowed_home_ids")
        or current_user.get("allowedHomeIds")
        or current_user.get("home_ids")
        or current_user.get("homeIds")
        or []
    )
    if isinstance(raw_values, (str, int)):
        raw_values = [raw_values]

    allowed = {safe_int(value) for value in raw_values}
    allowed.add(_home_id(current_user))
    return {value for value in allowed if value is not None}


class ChildWorkspaceContextService:
    """Validates and preloads the active child workspace before routes render."""

    def assert_authenticated(self, current_user: dict[str, Any]) -> None:
        if not isinstance(current_user, dict) or not current_user or _user_id(current_user) is None:
            raise unauthorised("session_invalid", "Valid authenticated user required.")

    def assert_child_access(
        self,
        *,
        young_person_id: int,
        current_user: dict[str, Any],
    ) -> dict[str, Any]:
        self.assert_authenticated(current_user)
        child = YoungPersonService.get_young_person_by_id(young_person_id)
        if not child:
            raise HTTPException(status_code=404, detail="No records found yet.")

        child_home_id = safe_int(child.get("home_id") or child.get("homeId"))
        role = normalise_role(current_user.get("role"))
        if is_provider_level_role(role):
            return child

        if child_home_id is None:
            raise forbidden("home_scope_missing", "Child home access could not be verified.")

        if child_home_id not in _allowed_home_ids(current_user):
            raise forbidden("child_scope_denied", "You do not have access to this child workspace.")

        return child

    def assert_home_access(
        self,
        *,
        home_id: int,
        current_user: dict[str, Any],
    ) -> None:
        self.assert_authenticated(current_user)
        role = normalise_role(current_user.get("role"))
        if is_provider_level_role(role):
            return
        if home_id not in _allowed_home_ids(current_user):
            raise forbidden("home_scope_denied", "You do not have access to this home workspace.")

    def resolve_context(
        self,
        *,
        young_person_id: int,
        current_user: dict[str, Any],
    ) -> dict[str, Any]:
        child = self.assert_child_access(
            young_person_id=young_person_id,
            current_user=current_user,
        )
        counts = YoungPersonService.get_dashboard_counts(young_person_id)
        recent_activity = YoungPersonService.get_recent_activity(young_person_id, limit=10)
        alerts = YoungPersonService.get_active_alerts(young_person_id)

        display_name = (
            child.get("display_name")
            or " ".join(str(value) for value in [child.get("first_name"), child.get("last_name")] if value)
            or f"Young person {young_person_id}"
        )

        return {
            "ok": True,
            "context_ready": True,
            "scope": {
                "type": "child",
                "young_person_id": young_person_id,
                "home_id": safe_int(child.get("home_id") or child.get("homeId")),
                "retrieval_scope": "selected_child_only",
                "allow_global_search": False,
            },
            "child": {
                "id": young_person_id,
                "display_name": display_name,
                "preferred_name": child.get("preferred_name") or child.get("first_name"),
                "status": child.get("status"),
                "risk_level": child.get("risk_level"),
                "safeguarding_status": child.get("safeguarding_status"),
            },
            "summary": {
                "counts": counts,
                "recent_activity": recent_activity,
                "alerts": alerts,
            },
        }


child_workspace_context_service = ChildWorkspaceContextService()
