import type { OrbState } from '@/lib/orb/types'
import type { OrbSoundHook } from './sound-engine'

const FAILURE_STATES: OrbState[] = ['offline', 'unavailable', 'permission_denied', 'error']

export function orbSoundHookForTransition(previous: OrbState, next: OrbState): OrbSoundHook | null {
  if (previous === next) return null
  if (next === 'connecting') return 'activation_pulse'
  if (next === 'listening') return previous === 'thinking' ? 'acknowledgement_cue' : 'listening_ambience'
  if (next === 'reconnecting') return 'reconnect_softness'
  if (next === 'idle' && (previous === 'speaking' || previous === 'thinking')) return 'completion_warmth'
  if (next === 'muted' || next === 'private') return 'muted_transition_cue'
  if (FAILURE_STATES.includes(next)) return 'soft_error_tone'
  return null
}
