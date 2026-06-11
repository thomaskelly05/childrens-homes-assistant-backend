"""ORB Residential privacy request service."""

from __future__ import annotations

from typing import Any

from db.orb_privacy_requests_db import (
    create_privacy_request,
    list_privacy_requests_admin,
    list_privacy_requests_for_user,
    sanitise_privacy_request_summary,
)
from schemas.orb_privacy import OrbPrivacyRequestCreate, OrbPrivacyRequestResponse


class OrbPrivacyService:
    def submit_request(
        self,
        conn,
        *,
        user_id: int,
        payload: OrbPrivacyRequestCreate,
    ) -> OrbPrivacyRequestResponse:
        _, error = sanitise_privacy_request_summary(payload.summary)
        if error:
            raise ValueError(error)
        row = create_privacy_request(
            conn,
            user_id=user_id,
            request_type=payload.request_type,
            summary=payload.summary,
        )
        if not row:
            raise RuntimeError("Privacy request storage is unavailable.")
        return OrbPrivacyRequestResponse.model_validate(row)

    def list_mine(self, conn, *, user_id: int) -> list[OrbPrivacyRequestResponse]:
        rows = list_privacy_requests_for_user(conn, user_id=user_id)
        return [OrbPrivacyRequestResponse.model_validate(row) for row in rows]

    def list_admin(self, conn, *, limit: int = 100) -> list[dict[str, Any]]:
        return list_privacy_requests_admin(conn, limit=limit)


orb_privacy_service = OrbPrivacyService()
