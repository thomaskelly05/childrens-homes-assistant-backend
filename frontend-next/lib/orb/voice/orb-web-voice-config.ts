/**
 * ORB Residential web Voice transport — launch defaults.
 * Realtime WebRTC is disabled for standalone /orb until explicitly enabled for dev.
 */

export const ORB_WEB_REALTIME_VOICE_ENABLED = false

export const ORB_WEB_REALTIME_DISABLED_REASON = 'disabled_for_orb_residential_launch' as const

export const ORB_WEB_REALTIME_DEV_OVERRIDE_KEY = 'indicare.orb.voice.realtime.dev'

/** Dev-only: set localStorage `indicare.orb.voice.realtime.dev` = "1" to trial realtime on /orb. */
export function isOrbWebRealtimeVoiceEnabled(): boolean {
  if (ORB_WEB_REALTIME_VOICE_ENABLED) return true
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(ORB_WEB_REALTIME_DEV_OVERRIDE_KEY) === '1'
  } catch {
    return false
  }
}

export const ORB_WEB_VOICE_CAPTURE_MODE = 'browser_speech_recognition' as const
