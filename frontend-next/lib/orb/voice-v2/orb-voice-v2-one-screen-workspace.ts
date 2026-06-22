/** Phase 5J — one persistent live Voice workspace helpers. */

import type { OrbVoiceV2BrainTier, OrbVoiceV2State } from './orb-voice-v2-types.ts'
import { ORB_VOICE_V2_THINKING_COPY } from './orb-voice-v2-showstopper.ts'

export const ORB_VOICE_V2_ONE_SCREEN_WORKSPACE = 'one_screen_live' as const

export const ORB_VOICE_V2_DIDNT_CATCH_COPY =
  'I didn’t catch enough there. You can keep speaking.' as const

export const ORB_VOICE_V2_CHECKING_FRAME_COPY = 'Checking the right frame…' as const

export const ORB_VOICE_V2_SPECIALIST_BRAIN_COPY =
  'Using ORB’s residential childcare brain…' as const

/** Full speech-detected duplex barge-in requires continuous VAD during playback and is intentionally deferred. */
export const ORB_VOICE_V2_DUPLEX_BARGE_IN_DEFERRED = true

export type OrbVoiceLiveRailTab = 'transcript' | 'summary' | 'tools'

export function resolveOrbVoiceLiveRailTab(state: OrbVoiceV2State): OrbVoiceLiveRailTab {
  if (state === 'summary_ready') return 'summary'
  return 'transcript'
}

export function orbVoiceV2PrimaryActionLabel(
  state: OrbVoiceV2State,
  options?: { speaking?: boolean; voicePreparing?: boolean; micRetry?: boolean }
): string {
  if (options?.speaking || options?.voicePreparing) return 'Interrupt'
  if (state === 'idle') return 'Start conversation'
  if (state === 'paused') return 'Resume'
  if (state === 'summary_ready') return 'Start new conversation'
  if (state === 'error' && options?.micRetry) return 'Try again'
  if (state === 'interrupted') return 'Listening…'
  if (state === 'requesting_microphone') return 'Requesting microphone…'
  if (state === 'listening' || state === 'speech_detected') return 'Listening…'
  if (state === 'transcribing' || state === 'thinking') return ORB_VOICE_V2_THINKING_COPY
  if (state === 'speaking') return 'Interrupt'
  return 'Continue'
}

export function resolveOrbVoiceV2LiveStatusCopy(input: {
  state: OrbVoiceV2State
  acknowledgement?: string | null
  tinyTurnNotice?: string | null
  voicePreparing?: boolean
  brainTier?: OrbVoiceV2BrainTier | null
  listeningHint?: string
  preparingVoice?: string
}): string | null {
  if (input.tinyTurnNotice) return input.tinyTurnNotice
  if (input.acknowledgement) return input.acknowledgement
  if (input.state === 'thinking') {
    if (input.brainTier && input.brainTier !== 'voice_fast') {
      return ORB_VOICE_V2_SPECIALIST_BRAIN_COPY
    }
    return ORB_VOICE_V2_THINKING_COPY
  }
  if (input.state === 'transcribing') return ORB_VOICE_V2_CHECKING_FRAME_COPY
  if (input.voicePreparing && input.state === 'speaking' && input.preparingVoice) {
    return input.preparingVoice
  }
  if (input.state === 'listening' || input.state === 'speech_detected') {
    return input.listeningHint ?? null
  }
  return null
}

export function isOrbVoiceV2SpecialistTier(tier: OrbVoiceV2BrainTier | null | undefined): boolean {
  return tier === 'voice_specialist' || tier === 'voice_safeguarding'
}
