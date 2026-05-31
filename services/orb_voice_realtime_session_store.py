from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

from schemas.orb_voice_realtime import VoiceProviderCapabilities, VoiceProviderType, VoiceSessionStatus


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ResidentialVoiceSession:
    session_id: str
    user_id: int | None
    provider: VoiceProviderType
    status: VoiceSessionStatus
    mode: str
    voice_id: str
    capabilities: VoiceProviderCapabilities
    created_at: str = field(default_factory=_now)
    interrupted: bool = False
    metadata: dict[str, Any] = field(default_factory=dict)


class OrbVoiceRealtimeSessionStore:
    def __init__(self) -> None:
        self._sessions: dict[str, ResidentialVoiceSession] = {}

    def create(
        self,
        *,
        user_id: int | None,
        provider: VoiceProviderType,
        status: VoiceSessionStatus,
        mode: str,
        voice_id: str,
        capabilities: VoiceProviderCapabilities,
    ) -> ResidentialVoiceSession:
        session_id = f"orb_voice_{uuid.uuid4().hex[:16]}"
        record = ResidentialVoiceSession(
            session_id=session_id,
            user_id=user_id,
            provider=provider,
            status=status,
            mode=mode,
            voice_id=voice_id,
            capabilities=capabilities,
        )
        self._sessions[session_id] = record
        return record

    def get(self, session_id: str) -> ResidentialVoiceSession | None:
        return self._sessions.get(session_id)

    def require(self, session_id: str) -> ResidentialVoiceSession:
        record = self.get(session_id)
        if not record:
            raise KeyError(session_id)
        return record

    def delete(self, session_id: str) -> None:
        self._sessions.pop(session_id, None)

    def mark_interrupted(self, session_id: str) -> None:
        record = self.get(session_id)
        if record:
            record.interrupted = True


orb_voice_realtime_session_store = OrbVoiceRealtimeSessionStore()
