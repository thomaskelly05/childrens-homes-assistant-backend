from __future__ import annotations


FAILURE_COPY = {
    "internet_offline": "Voice connection paused. I can still help in text.",
    "websocket_failure": "Voice connection paused. I can still help in text.",
    "microphone_denied": "Microphone access looks disabled.",
    "realtime_provider_unavailable": "I couldn't reach voice just now. I'll keep the conversation here.",
    "ai_unavailable": "I couldn't reach ORB just now. Please try again in a moment.",
    "retrieval_blocked": "I can't access that record in this context.",
    "child_context_missing": "This child workspace is not ready yet.",
    "safeguarding_retrieval_denied": "I can't access that safeguarding record in this context.",
    "stale_session": "Your ORB session paused. Start again when you're ready.",
    "permission_expired": "Your permission has expired. Please sign in again.",
}


class OrbFailureStateService:
    def message_for(self, code: str) -> dict[str, str | bool]:
        return {
            "code": code,
            "message": FAILURE_COPY.get(code, "ORB paused safely. I can still help in text."),
            "show_raw_provider_error": False,
            "retryable": code not in {"retrieval_blocked", "safeguarding_retrieval_denied", "permission_expired"},
        }


orb_failure_state_service = OrbFailureStateService()

