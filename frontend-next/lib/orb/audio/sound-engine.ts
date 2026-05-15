export type OrbSoundHook = 'activation_pulse' | 'listening_tone' | 'reconnect_tone' | 'save_confirmation' | 'completion_tone' | 'soft_error_tone' | 'transition_ambience'

export type OrbSoundEnginePreferences = {
  soundEnabled: boolean
  childPresent: boolean
  emotionalRegulationMode: boolean
  hearingAccessibility: boolean
}

export class OrbSoundEngine {
  private lastPlayedAt = 0

  constructor(private preferences: OrbSoundEnginePreferences) {}

  canPlay() {
    return this.preferences.soundEnabled && !this.preferences.childPresent && !this.preferences.emotionalRegulationMode && !this.preferences.hearingAccessibility
  }

  play(hook: OrbSoundHook) {
    const now = Date.now()
    if (!this.canPlay() || now - this.lastPlayedAt < 1500) return { played: false, hook, reason: 'sound_preference_or_rate_limit' }
    this.lastPlayedAt = now
    return { played: false, hook, reason: 'audio_assets_not_bundled' }
  }
}

