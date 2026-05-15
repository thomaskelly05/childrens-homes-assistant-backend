export type OrbSoundHook =
  | 'activation_pulse'
  | 'acknowledgement_pulse'
  | 'acknowledgement_cue'
  | 'listening_tone'
  | 'listening_ambience'
  | 'reconnect_tone'
  | 'reconnect_softness'
  | 'save_confirmation'
  | 'safe_confirmation_cue'
  | 'completion_tone'
  | 'completion_warmth'
  | 'soft_error_tone'
  | 'mute_transition'
  | 'muted_transition_cue'
  | 'transition_ambience'
  | 'ambient_hover_tone'

export type OrbSoundEnginePreferences = {
  soundEnabled: boolean
  childPresent: boolean
  emotionalRegulationMode: boolean
  hearingAccessibility: boolean
}

export class OrbSoundEngine {
  private lastPlayedAt = 0
  private context: AudioContext | null = null

  constructor(private preferences: OrbSoundEnginePreferences) {}

  updatePreferences(preferences: OrbSoundEnginePreferences) {
    this.preferences = preferences
  }

  canPlay() {
    return this.preferences.soundEnabled && !this.preferences.childPresent && !this.preferences.emotionalRegulationMode && !this.preferences.hearingAccessibility
  }

  play(hook: OrbSoundHook) {
    const now = Date.now()
    if (!this.canPlay() || now - this.lastPlayedAt < 650) return { played: false, hook, reason: 'sound_preference_or_rate_limit' }
    const context = this.audioContext()
    if (!context) return { played: false, hook, reason: 'web_audio_unavailable' }
    this.lastPlayedAt = now
    this.scheduleHook(context, this.normaliseHook(hook))
    return { played: true, hook, reason: 'scheduled_subtle_web_audio' }
  }

  private audioContext() {
    if (typeof window === 'undefined') return null
    if (this.context) return this.context
    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) return null
    this.context = new AudioContextCtor()
    return this.context
  }

  private scheduleHook(context: AudioContext, hook: OrbSoundHook) {
    const now = context.currentTime
    if (context.state === 'suspended') void context.resume().catch(() => undefined)
    const settings = this.settingsFor(hook)
    settings.forEach(({ frequency, delay, duration, gain }) => {
      const oscillator = context.createOscillator()
      const volume = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(frequency[0], now + delay)
      oscillator.frequency.exponentialRampToValueAtTime(frequency[1], now + delay + duration)
      volume.gain.setValueAtTime(0.0001, now + delay)
      volume.gain.exponentialRampToValueAtTime(gain, now + delay + duration * 0.28)
      volume.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration)
      oscillator.connect(volume)
      volume.connect(context.destination)
      oscillator.start(now + delay)
      oscillator.stop(now + delay + duration + 0.02)
    })
  }

  private normaliseHook(hook: OrbSoundHook): OrbSoundHook {
    const aliases: Partial<Record<OrbSoundHook, OrbSoundHook>> = {
      acknowledgement_cue: 'acknowledgement_pulse',
      listening_ambience: 'listening_tone',
      reconnect_softness: 'reconnect_tone',
      safe_confirmation_cue: 'save_confirmation',
      completion_warmth: 'completion_tone',
      muted_transition_cue: 'mute_transition',
      ambient_hover_tone: 'transition_ambience'
    }
    return aliases[hook] || hook
  }

  private settingsFor(hook: OrbSoundHook) {
    const hooks: Record<OrbSoundHook, Array<{ frequency: [number, number]; delay: number; duration: number; gain: number }>> = {
      activation_pulse: [{ frequency: [392, 523], delay: 0, duration: 0.16, gain: 0.018 }],
      acknowledgement_pulse: [{ frequency: [330, 392], delay: 0, duration: 0.11, gain: 0.012 }],
      acknowledgement_cue: [{ frequency: [330, 392], delay: 0, duration: 0.11, gain: 0.012 }],
      listening_tone: [{ frequency: [294, 330], delay: 0, duration: 0.18, gain: 0.01 }],
      listening_ambience: [{ frequency: [294, 330], delay: 0, duration: 0.18, gain: 0.01 }],
      reconnect_tone: [{ frequency: [262, 330], delay: 0, duration: 0.14, gain: 0.012 }],
      reconnect_softness: [{ frequency: [262, 330], delay: 0, duration: 0.14, gain: 0.012 }],
      save_confirmation: [{ frequency: [392, 587], delay: 0, duration: 0.18, gain: 0.014 }],
      safe_confirmation_cue: [{ frequency: [392, 587], delay: 0, duration: 0.18, gain: 0.014 }],
      completion_tone: [
        { frequency: [349, 440], delay: 0, duration: 0.13, gain: 0.012 },
        { frequency: [440, 523], delay: 0.09, duration: 0.16, gain: 0.01 }
      ],
      completion_warmth: [
        { frequency: [349, 440], delay: 0, duration: 0.13, gain: 0.012 },
        { frequency: [440, 523], delay: 0.09, duration: 0.16, gain: 0.01 }
      ],
      soft_error_tone: [{ frequency: [330, 294], delay: 0, duration: 0.16, gain: 0.009 }],
      mute_transition: [{ frequency: [392, 330], delay: 0, duration: 0.12, gain: 0.008 }],
      muted_transition_cue: [{ frequency: [392, 330], delay: 0, duration: 0.12, gain: 0.008 }],
      transition_ambience: [{ frequency: [220, 247], delay: 0, duration: 0.22, gain: 0.006 }],
      ambient_hover_tone: [{ frequency: [220, 247], delay: 0, duration: 0.22, gain: 0.006 }]
    }
    return hooks[hook]
  }
}

