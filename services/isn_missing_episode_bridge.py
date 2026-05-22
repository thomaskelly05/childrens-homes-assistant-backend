from __future__ import annotations

from typing import Any

from schemas.isn_contracts import ISNSignalCreateRequest
from services.isn_service import isn_service


class ISNMissingEpisodeBridge:
    """Projects high-risk missing episodes into ISN safeguarding intelligence."""

    HIGH_RISK_LEVELS = {"high", "critical"}

    def project_missing_episode(
        self,
        conn: Any,
        *,
        missing_episode,
        current_user: dict[str, Any],
    ) -> None:
        if str(missing_episode.risk_level).lower() not in self.HIGH_RISK_LEVELS:
            return

        payload = ISNSignalCreateRequest(
            provider_id=missing_episode.provider_id,
            home_id=missing_episode.home_id,
            young_person_id=missing_episode.young_person_id,
            signal_type="missing_episode",
            occurred_at=missing_episode.created_at,
            title="High-risk missing episode",
            summary=missing_episode.circumstances,
            risk_level=missing_episode.risk_level,
            location_text=missing_episode.last_seen_location,
            source_record_type="missing_episode",
            source_record_id=missing_episode.id,
            indicator_tags=[
                "missing_episode",
                "contextual_safeguarding",
                "exploitation_risk",
            ],
            anonymised_context={
                "lifecycle_state": missing_episode.lifecycle_state,
                "police_notified": bool(missing_episode.police_notified_at),
            },
        )

        isn_service.create_signal(
            conn,
            payload=payload,
            current_user=current_user,
        )


isn_missing_episode_bridge = ISNMissingEpisodeBridge()
