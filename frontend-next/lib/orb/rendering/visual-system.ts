export type OrbVisualState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'reconnecting'
  | 'offline'
  | 'permission_denied'
  | 'private_mode'
  | 'safeguarding_cautious'
  | 'child_present'
  | 'emotional_safety'
  | 'reduced_motion'
  | 'night_shift'
  | 'handover'
  | 'inspection'
  | 'reflective_writing'

export type OrbHueProfile = {
  hueA: string
  hueB: string
  hueC: string
  warm: string
  glow: number
  motionSpeed: string
  edgeOpacity: number
}

export type OrbMotionProfile = {
  speed: string
  liquid: string
  edge: string
  reducedMotion: boolean
}

export type OrbAccessibilityVisuals = {
  state: OrbVisualState
  ambientClass: string
  sphereClass: string
  textGlowClass: string
  edgePulseClass: string
  ariaLabel: string
  reduceMotion: boolean
}

export const ORB_VISUAL_STATES: Record<OrbVisualState, OrbVisualState> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'speaking',
  interrupted: 'interrupted',
  reconnecting: 'reconnecting',
  offline: 'offline',
  permission_denied: 'permission_denied',
  private_mode: 'private_mode',
  safeguarding_cautious: 'safeguarding_cautious',
  child_present: 'child_present',
  emotional_safety: 'emotional_safety',
  reduced_motion: 'reduced_motion',
  night_shift: 'night_shift',
  handover: 'handover',
  inspection: 'inspection',
  reflective_writing: 'reflective_writing'
}

export const ORB_HUE_PROFILES: Record<OrbVisualState, OrbHueProfile> = {
  idle: {
    hueA: '34 211 238',
    hueB: '168 85 247',
    hueC: '244 114 182',
    warm: '251 146 60',
    glow: 0.62,
    motionSpeed: '8s',
    edgeOpacity: 0.34
  },
  listening: {
    hueA: '125 211 252',
    hueB: '59 130 246',
    hueC: '167 139 250',
    warm: '251 146 60',
    glow: 0.76,
    motionSpeed: '4.6s',
    edgeOpacity: 0.54
  },
  thinking: {
    hueA: '129 140 248',
    hueB: '168 85 247',
    hueC: '34 211 238',
    warm: '251 146 60',
    glow: 0.6,
    motionSpeed: '10.5s',
    edgeOpacity: 0.34
  },
  speaking: {
    hueA: '103 232 249',
    hueB: '217 70 239',
    hueC: '251 146 60',
    warm: '251 146 60',
    glow: 0.78,
    motionSpeed: '3.4s',
    edgeOpacity: 0.52
  },
  interrupted: {
    hueA: '251 191 36',
    hueB: '251 146 60',
    hueC: '125 211 252',
    warm: '251 146 60',
    glow: 0.48,
    motionSpeed: '6.2s',
    edgeOpacity: 0.38
  },
  reconnecting: {
    hueA: '148 163 184',
    hueB: '125 211 252',
    hueC: '203 213 225',
    warm: '251 146 60',
    glow: 0.36,
    motionSpeed: '5.8s',
    edgeOpacity: 0.28
  },
  offline: {
    hueA: '148 163 184',
    hueB: '226 232 240',
    hueC: '100 116 139',
    warm: '251 146 60',
    glow: 0.24,
    motionSpeed: '14s',
    edgeOpacity: 0.16
  },
  permission_denied: {
    hueA: '251 191 36',
    hueB: '251 146 60',
    hueC: '125 211 252',
    warm: '251 146 60',
    glow: 0.44,
    motionSpeed: '9.8s',
    edgeOpacity: 0.3
  },
  private_mode: {
    hueA: '148 163 184',
    hueB: '226 232 240',
    hueC: '100 116 139',
    warm: '251 146 60',
    glow: 0.22,
    motionSpeed: '14s',
    edgeOpacity: 0.14
  },
  safeguarding_cautious: {
    hueA: '251 191 36',
    hueB: '251 146 60',
    hueC: '125 211 252',
    warm: '251 146 60',
    glow: 0.44,
    motionSpeed: '9.8s',
    edgeOpacity: 0.3
  },
  child_present: {
    hueA: '186 230 253',
    hueB: '196 181 253',
    hueC: '226 232 240',
    warm: '251 146 60',
    glow: 0.32,
    motionSpeed: '14s',
    edgeOpacity: 0.2
  },
  emotional_safety: {
    hueA: '186 230 253',
    hueB: '196 181 253',
    hueC: '226 232 240',
    warm: '251 146 60',
    glow: 0.3,
    motionSpeed: '16s',
    edgeOpacity: 0.18
  },
  reduced_motion: {
    hueA: '186 230 253',
    hueB: '196 181 253',
    hueC: '226 232 240',
    warm: '251 146 60',
    glow: 0.28,
    motionSpeed: '18s',
    edgeOpacity: 0.16
  },
  night_shift: {
    hueA: '125 211 252',
    hueB: '99 102 241',
    hueC: '148 163 184',
    warm: '251 146 60',
    glow: 0.22,
    motionSpeed: '18s',
    edgeOpacity: 0.14
  },
  handover: {
    hueA: '103 232 249',
    hueB: '129 140 248',
    hueC: '251 146 60',
    warm: '251 146 60',
    glow: 0.42,
    motionSpeed: '10s',
    edgeOpacity: 0.28
  },
  inspection: {
    hueA: '251 191 36',
    hueB: '125 211 252',
    hueC: '226 232 240',
    warm: '251 146 60',
    glow: 0.34,
    motionSpeed: '12s',
    edgeOpacity: 0.24
  },
  reflective_writing: {
    hueA: '186 230 253',
    hueB: '196 181 253',
    hueC: '244 114 182',
    warm: '251 146 60',
    glow: 0.32,
    motionSpeed: '16s',
    edgeOpacity: 0.18
  }
}

export const orbVisualStateLabels: Record<OrbVisualState, string> = {
  idle: 'Ready when you are',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  interrupted: 'Paused and listening',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
  permission_denied: 'Microphone disabled',
  private_mode: 'Private mode',
  safeguarding_cautious: 'Safeguarding aware',
  child_present: 'Child-present mode',
  emotional_safety: 'Emotional safety',
  reduced_motion: 'Reduced motion',
  night_shift: 'Night shift',
  handover: 'Handover continuity',
  inspection: 'Inspection evidence',
  reflective_writing: 'Reflective writing'
}

const orbVisualStateTone: Record<OrbVisualState, string> = {
  idle: 'Tap the ORB or press Ctrl Shift Space',
  listening: 'Speak naturally',
  thinking: 'I will keep this brief',
  speaking: 'Calm voice response',
  interrupted: 'Of course - I am listening',
  reconnecting: 'Connection paused. I am reconnecting',
  offline: 'Voice is unavailable just now',
  permission_denied: 'Microphone access looks disabled',
  private_mode: 'Transcript storage is limited',
  safeguarding_cautious: 'Careful with safeguarding context',
  child_present: 'Plain, child-aware language',
  emotional_safety: 'Soft motion and calmer contrast',
  reduced_motion: 'Motion reduced for comfort',
  night_shift: 'Quiet, low-stimulation presence',
  handover: 'Continuity first',
  inspection: 'Evidence and chronology first',
  reflective_writing: 'Reflective writing support'
}

const stateAliases: Record<string, OrbVisualState> = {
  connecting: 'thinking',
  passive_listening: 'listening',
  recording: 'listening',
  dictation: 'listening',
  muted: 'private_mode',
  unavailable: 'offline',
  expired: 'permission_denied',
  private: 'private_mode',
  error: 'offline',
  safeguarding_sensitive: 'safeguarding_cautious',
  inspection_prep: 'inspection',
  document_writing: 'reflective_writing'
}

export function getOrbVisualState(state?: string | null, reducedMotion = false): OrbVisualState {
  if (reducedMotion) return 'reduced_motion'
  if (!state) return 'idle'
  if (state in ORB_VISUAL_STATES) return state as OrbVisualState
  return stateAliases[state] || 'idle'
}

export function getOrbHueProfile(state?: string | null, reducedMotion = false): OrbHueProfile {
  return ORB_HUE_PROFILES[getOrbVisualState(state, reducedMotion)]
}

export function getOrbMotionProfile(state?: string | null, reducedMotion = false): OrbMotionProfile {
  const visualState = getOrbVisualState(state, reducedMotion)
  const hueProfile = getOrbHueProfile(visualState)
  return {
    speed: hueProfile.motionSpeed,
    liquid: visualState === 'reduced_motion' ? 'orb-motion-still' : 'orb-motion-wave',
    edge: visualState === 'listening' || visualState === 'speaking' ? 'orb-motion-cadence' : 'orb-motion-soft-ring',
    reducedMotion: visualState === 'reduced_motion'
  }
}

export function getOrbAmbientClass(state?: string | null, reducedMotion = false): string {
  return `orb-ambient-frame orb-ambient-frame--${getOrbVisualState(state, reducedMotion)}`
}

export function getOrbSphereClass(state?: string | null, reducedMotion = false): string {
  const visualState = getOrbVisualState(state, reducedMotion)
  return `orb-sphere orb-sphere--${visualState} ${getOrbMotionProfile(visualState).liquid}`
}

export function getOrbTextGlowClass(state?: string | null, reducedMotion = false): string {
  return `orb-title-glow orb-title-glow--${getOrbVisualState(state, reducedMotion)}`
}

export function getOrbEdgePulseClass(state?: string | null, reducedMotion = false): string {
  return `orb-screen-edge-pulse orb-screen-edge-pulse--${getOrbVisualState(state, reducedMotion)}`
}

export function getOrbAccessibilityVisuals(state?: string | null, reducedMotion = false): OrbAccessibilityVisuals {
  const visualState = getOrbVisualState(state, reducedMotion)
  return {
    state: visualState,
    ambientClass: getOrbAmbientClass(visualState),
    sphereClass: getOrbSphereClass(visualState),
    textGlowClass: getOrbTextGlowClass(visualState),
    edgePulseClass: getOrbEdgePulseClass(visualState),
    ariaLabel: `ORB ${orbVisualStateLabels[visualState].toLowerCase()}`,
    reduceMotion: visualState === 'reduced_motion'
  }
}

export function orbStateTone(state?: string | null): string {
  return orbVisualStateTone[getOrbVisualState(state)]
}
