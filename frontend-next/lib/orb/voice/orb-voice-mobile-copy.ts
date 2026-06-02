export type VoiceMobileSessionPhase =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'unavailable'
  | 'error'

export function voiceMobilePrimaryButton(input: {
  sessionLive: boolean
  starting: boolean
}): string {
  if (input.sessionLive) return 'End'
  return 'Start'
}

export function voiceMobileStatusLine(input: {
  phase: VoiceMobileSessionPhase
  permissionDenied?: boolean
  blockedReason?: string | null
}): string {
  if (input.permissionDenied) return 'Microphone access is blocked'
  if (input.blockedReason?.trim()) return input.blockedReason.trim()
  switch (input.phase) {
    case 'connecting':
      return 'Connecting…'
    case 'listening':
      return "I'm listening"
    case 'thinking':
      return 'Thinking…'
    case 'speaking':
      return 'ORB is speaking'
    case 'unavailable':
      return 'Live voice is unavailable right now'
    case 'error':
      return 'Voice is unavailable'
    default:
      return 'Tap to start'
  }
}

export function voiceMobileUnavailableDetail(dictateRealtimeReady?: boolean): string {
  if (dictateRealtimeReady) {
    return 'Dictate is ready. Live conversation is unavailable right now.'
  }
  return 'You can still use Dictate or type to ORB.'
}
