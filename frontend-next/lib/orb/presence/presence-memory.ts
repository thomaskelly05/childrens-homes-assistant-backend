import type { OrbProductMode } from '../identity'

export type OrbPresenceMemory = {
  preferredResponseLength?: 'brief' | 'concise' | 'detailed'
  captionPreference?: 'on' | 'off'
  voiceCaptionMode?: 'voice_first' | 'captions_first' | 'transcript'
  reducedMotion?: boolean
  highContrast?: boolean
  pacingPreference?: 'slow' | 'steady'
  interactionStyle?: 'brief' | 'step_by_step' | 'calm_practical'
  recentUnresolvedTopic?: string
  recentActiveWorkflow?: string
  lastUsedMode?: string
}

const storageKey = (productMode: OrbProductMode) => `indicare.orb.presence.${productMode}.v1`

export function loadOrbPresenceMemory(productMode: OrbProductMode): OrbPresenceMemory {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.localStorage.getItem(storageKey(productMode)) || '{}') as OrbPresenceMemory
  } catch {
    return {}
  }
}

export function saveOrbPresenceMemory(productMode: OrbProductMode, memory: OrbPresenceMemory) {
  if (typeof window === 'undefined') return
  const safe = { ...memory }
  if (productMode === 'standalone') {
    delete safe.recentActiveWorkflow
  }
  window.localStorage.setItem(storageKey(productMode), JSON.stringify(safe))
}

