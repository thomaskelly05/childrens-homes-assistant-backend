from __future__ import annotations

import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from services.indicare_ai_cross_system_service import IndiCareAICrossSystemService


@dataclass
class RealtimeSession:
    session_id: str
    user_id: int | None
    project_id: str
    mode: str = "children_home_specialist"
    status: str = "active"
    created_at: float = field(default_factory=time.time)
    updated_at: float = field(default_factory=time.time)
    last_interrupt_at: float | None = None
    turns: list[dict[str, Any]] = field(default_factory=list)


class IndiCareAIRealtimeService:
    """Realtime session coordination for standalone IndiCare AI.

    This is a lightweight runtime scaffold for the Tesla/Grok-style layer. It manages
    active voice/chat sessions, interruption state and cross-system context packets.
    Actual websocket/audio transport can sit on top of this service.
    """

    def __init__(self) -> None:
        self.sessions: dict[str, RealtimeSession] = {}
        self.cross_system = IndiCareAICrossSystemService()

    def start_session(
        self,
        *,
        current_user: dict[str, Any],
        project_id: str | None = None,
        mode: str | None = None,
    ) -> dict[str, Any]:
        session = RealtimeSession(
            session_id=str(uuid.uuid4()),
            user_id=self._user_id(current_user),
            project_id=(project_id or "standalone").strip() or "standalone",
            mode=mode or "children_home_specialist",
        )
        self.sessions[session.session_id] = session
        return self._session_payload(session)

    def interrupt(self, *, session_id: str, reason: str | None = None) -> dict[str, Any]:
        session = self.sessions.get(session_id)
        if not session:
            return {"ok": False, "error": "session_not_found"}
        session.last_interrupt_at = time.time()
        session.updated_at = time.time()
        session.turns.append({"type": "interrupt", "reason": reason or "user_interrupted", "at": session.last_interrupt_at})
        return {"ok": True, "session": self._session_payload(session), "recovery_prompt": self._recovery_prompt(reason)}

    def prepare_turn(
        self,
        *,
        session_id: str,
        text: str,
        current_user: dict[str, Any],
        project_id: str | None = None,
        young_person_id: int | None = None,
        home_id: int | None = None,
    ) -> dict[str, Any]:
        session = self.sessions.get(session_id)
        if not session:
            started = self.start_session(current_user=current_user, project_id=project_id, mode="children_home_specialist")
            session = self.sessions[started["session_id"]]
        session.updated_at = time.time()
        kind = self._kind(text)
        operational_picture = self.cross_system.build_operational_picture(
            question=text,
            current_user=current_user,
            project_id=project_id or session.project_id,
            young_person_id=young_person_id,
            home_id=home_id,
            limit=8,
        )
        turn = {
            "type": "user_turn",
            "text": text[:12000],
            "kind": kind,
            "at": time.time(),
            "project_id": project_id or session.project_id,
        }
        session.turns.append(turn)
        return {
            "ok": True,
            "session": self._session_payload(session),
            "conversation_kind": kind,
            "acknowledgement": self._acknowledgement(kind),
            "silence_ms": self._silence_ms(kind),
            "speech_rate": self._speech_rate(kind),
            "operational_picture": operational_picture,
            "prompt_context": self._compose_realtime_prompt(text=text, kind=kind, operational_picture=operational_picture),
        }

    def end_session(self, *, session_id: str) -> dict[str, Any]:
        session = self.sessions.get(session_id)
        if not session:
            return {"ok": False, "error": "session_not_found"}
        session.status = "ended"
        session.updated_at = time.time()
        return {"ok": True, "session": self._session_payload(session)}

    def _compose_realtime_prompt(self, *, text: str, kind: str, operational_picture: dict[str, Any]) -> str:
        return "\n".join([
            "INDICARE REALTIME CONVERSATION RUNTIME:",
            "Respond as a live conversation, not a finished written report.",
            "Start with a natural acknowledgement, then continue with short spoken paragraphs.",
            "Allow interruption. If the user corrects context, pivot naturally and do not defend the previous answer.",
            "Use calm British English and emotionally regulated pacing.",
            f"Conversation kind: {kind}.",
            "",
            operational_picture.get("prompt_context") or "",
            "",
            f"Current spoken request: {text}",
        ])

    def _session_payload(self, session: RealtimeSession) -> dict[str, Any]:
        return {
            "ok": True,
            "session_id": session.session_id,
            "project_id": session.project_id,
            "mode": session.mode,
            "status": session.status,
            "created_at": session.created_at,
            "updated_at": session.updated_at,
            "last_interrupt_at": session.last_interrupt_at,
            "turn_count": len(session.turns),
        }

    def _kind(self, text: str) -> str:
        q = (text or "").lower()
        if any(word in q for word in ["safeguarding", "disclosure", "allegation", "missing", "restraint", "risk", "police"]):
            return "safeguarding"
        if any(word in q for word in ["handover", "shift", "tonight", "today", "morning", "evening"]):
            return "handover"
        if any(word in q for word in ["pattern", "again", "repeated", "chronology", "trend", "previous"]):
            return "pattern"
        if any(word in q for word in ["stressed", "worried", "overwhelmed", "hard shift", "upset"]):
            return "support"
        return "general"

    def _acknowledgement(self, kind: str) -> str:
        return {
            "safeguarding": "Okay. Let’s slow this down and work through it carefully.",
            "handover": "Right. Let’s make this useful for handover.",
            "pattern": "I think it’s worth looking at the wider pattern here.",
            "support": "Okay. Let’s make this feel manageable and take it step by step.",
            "general": "Okay. Let me think that through with you.",
        }.get(kind, "Okay. Let me think that through with you.")

    def _silence_ms(self, kind: str) -> int:
        return {"safeguarding": 650, "support": 620, "pattern": 460, "handover": 320, "general": 380}.get(kind, 380)

    def _speech_rate(self, kind: str) -> float:
        return {"safeguarding": 0.84, "support": 0.86, "pattern": 0.9, "handover": 0.94, "general": 0.91}.get(kind, 0.91)

    def _recovery_prompt(self, reason: str | None) -> str:
        return "Of course. I’ll stop there. Tell me what changed, and I’ll adjust the answer."

    def _user_id(self, current_user: dict[str, Any]) -> int | None:
        try:
            value = current_user.get("user_id") or current_user.get("id")
            return int(value) if value else None
        except Exception:
            return None
