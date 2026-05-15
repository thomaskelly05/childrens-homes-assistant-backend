export const orbFailureCopy = {
  internet_offline: "Voice paused. I'm reconnecting.",
  websocket_failure: "Voice paused. I'm reconnecting.",
  microphone_denied: 'Microphone access appears off. I can continue in text.',
  realtime_provider_unavailable: "Voice is taking a moment. I'll keep the conversation here.",
  ai_unavailable: "ORB paused safely. I'll stay with the thread.",
  retrieval_blocked: "I can't access that record in this context.",
  child_context_missing: 'This child workspace is not ready yet.',
  safeguarding_retrieval_denied: "I can't access that safeguarding record in this context.",
  stale_session: 'Your ORB session paused. Start again when you’re ready.',
  permission_expired: 'Your permission has expired. Please sign in again.'
} as const

export type OrbFailureCode = keyof typeof orbFailureCopy

export function safeOrbFailureCopy(code: string) {
  return orbFailureCopy[code as OrbFailureCode] ?? 'ORB paused safely. I can still help in text.'
}

