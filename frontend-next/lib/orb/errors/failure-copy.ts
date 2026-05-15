export const orbFailureCopy = {
  internet_offline: 'Voice connection paused. I can still help in text.',
  websocket_failure: 'Voice connection paused. I can still help in text.',
  microphone_denied: 'Microphone access looks disabled.',
  realtime_provider_unavailable: "I couldn't reach voice just now. I'll keep the conversation here.",
  ai_unavailable: "I couldn't reach ORB just now. Please try again in a moment.",
  retrieval_blocked: "I can't access that record in this context.",
  child_context_missing: 'This child workspace is not ready yet.',
  safeguarding_retrieval_denied: "I can't access that safeguarding record in this context.",
  stale_session: 'Your ORB session paused. Start again when you are ready.',
  permission_expired: 'Your permission has expired. Please sign in again.'
} as const

export type OrbFailureCode = keyof typeof orbFailureCopy

export function safeOrbFailureCopy(code: string) {
  return orbFailureCopy[code as OrbFailureCode] ?? 'ORB paused safely. I can still help in text.'
}

