from __future__ import annotations

from typing import Any

from fastapi import HTTPException

FORBIDDEN_STANDALONE_OS_KEYS = (
    "child_id",
    "young_person_id",
    "staff_id",
    "home_id",
    "record_id",
    "chronology_id",
)


def reject_standalone_os_ids(payload: dict[str, Any]) -> None:
    scopes = [payload, payload.get("metadata") or {}, payload.get("context") or {}]
    for scope in scopes:
        if not isinstance(scope, dict):
            continue
        for key in FORBIDDEN_STANDALONE_OS_KEYS:
            if scope.get(key) is not None:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "error": "standalone_os_boundary",
                        "message": (
                            "Standalone ORB cannot accept live IndiCare OS record identifiers. "
                            "Use IndiCare OS ORB at /assistant/orb for permissioned records."
                        ),
                        "field": key,
                    },
                )
