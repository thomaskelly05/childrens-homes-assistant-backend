import type { OrbVoiceV2PermissionState, OrbVoiceV2Status } from './orb-voice-v2-types.ts'
import {
  ORB_VOICE_V2_AUDIO_PLAYBACK_BLOCKED,
  ORB_VOICE_V2_KATHERINE_FORCED_OPENAI,
  ORB_VOICE_V2_KATHERINE_MISSING_ELEVENLABS,
  ORB_VOICE_V2_MIC_DENIED,
  ORB_VOICE_V2_SAFARI_AUTO_RESUME
} from './orb-voice-v2-copy.ts'

export function isNotAllowedError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const name = 'name' in error ? String((error as { name?: string }).name) : ''
  if (name === 'NotAllowedError') return true
  const message = 'message' in error ? String((error as { message?: string }).message) : ''
  return /not allowed|permission denied|user denied/i.test(message)
}

export function isOrbVoiceV2CaptureNotAllowed(error: unknown): boolean {
  if (error && typeof error === 'object' && 'code' in error) {
    return (error as { code?: string }).code === 'not_allowed'
  }
  return isNotAllowedError(error)
}

export function permissionStateForCaptureError(error: unknown): OrbVoiceV2PermissionState {
  if (isOrbVoiceV2CaptureNotAllowed(error) || isNotAllowedError(error)) {
    return 'microphone_denied'
  }
  return 'ready'
}

export function permissionNoticeForState(state: OrbVoiceV2PermissionState): string | null {
  switch (state) {
    case 'microphone_denied':
      return ORB_VOICE_V2_MIC_DENIED
    case 'auto_resume_blocked':
      return ORB_VOICE_V2_SAFARI_AUTO_RESUME
    case 'audio_playback_blocked':
    case 'autoplay_blocked':
      return ORB_VOICE_V2_AUDIO_PLAYBACK_BLOCKED
    default:
      return null
  }
}

export function resolveOrbVoiceV2KatherineStatusMessage(status: OrbVoiceV2Status): string {
  if (status.katherineReady) return 'Katherine ready'
  if (status.ttsProviderForced === 'openai' || status.fallbackReason === 'provider_forced_openai') {
    return ORB_VOICE_V2_KATHERINE_FORCED_OPENAI
  }
  if (
    !status.elevenLabsConfigured ||
    status.fallbackReason === 'missing_api_key' ||
    status.fallbackReason === 'missing_voice_id'
  ) {
    return ORB_VOICE_V2_KATHERINE_MISSING_ELEVENLABS
  }
  return 'Katherine unavailable — fallback voice active'
}
