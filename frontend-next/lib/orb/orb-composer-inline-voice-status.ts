import type { OrbVoiceCaptureState } from '@/lib/orb/voice/orb-voice-capture'

export function orbComposerInlineVoiceStatusLine(input: {
  listening: boolean
  speaking: boolean
  pending: boolean
  phase: string
  voiceCaptureState: OrbVoiceCaptureState
  micNotice: string | null
  voiceCaptureEnabled: boolean
}): string {
  if (input.micNotice?.trim()) return input.micNotice.trim()
  if (!input.voiceCaptureEnabled) return ''
  if (input.voiceCaptureState === 'requesting_permission') return 'Allow microphone access…'
  if (input.voiceCaptureState === 'starting') return 'Opening microphone…'
  if (input.listening || input.phase === 'continuous_listening' || input.phase === 'wake_listening') {
    return 'Listening…'
  }
  if (input.phase === 'transcript_ready' && input.pending) return 'Sending to ORB…'
  if (input.pending) return 'Processing…'
  if (input.speaking) return 'Speaking…'
  return ''
}
