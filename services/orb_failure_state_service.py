from __future__ import annotations


FAILURE_COPY = {
    "internet_offline": "Connection paused. Your notes are still safe locally.",
    "websocket_failure": "Voice paused. Reconnecting now.",
    "audio_reconnect": "Audio paused. I can continue in text while it reconnects.",
    "microphone_denied": "Microphone access appears disabled.",
    "realtime_provider_unavailable": "Voice is unavailable just now. I can keep going in text.",
    "ai_unavailable": "ORB paused safely. Please try again in a moment.",
    "retrieval_blocked": "I can't access that record in this context.",
    "child_context_missing": "This child workspace is not ready yet.",
    "safeguarding_retrieval_denied": "I can't access that safeguarding record in this context.",
    "stale_session": "Your ORB session paused. Start again when you're ready.",
    "permission_expired": "Your permission has expired. Please sign in again.",
    "save_reconciliation": "Your notes are still safe locally while I check the save state.",
}


class OrbFailureStateService:
    def message_for(self, code: str) -> dict[str, str | bool]:
        return {
            "code": code,
            "message": FAILURE_COPY.get(code, "ORB paused safely. I can still help in text."),
            "show_raw_provider_error": False,
            "retryable": code not in {"retrieval_blocked", "safeguarding_retrieval_denied", "permission_expired"},
            "continuity_supported": code in {"internet_offline", "websocket_failure", "audio_reconnect", "realtime_provider_unavailable", "save_reconciliation"},
            "fallback_mode": "text" if code in {"internet_offline", "websocket_failure", "audio_reconnect", "realtime_provider_unavailable"} else "guided_retry",
        }


orb_failure_state_service = OrbFailureStateService()

