import type { OrbState } from '@/lib/orb/types'
import type { OrbSoundHook } from './sound-engine'

const FAILURE_STATES: OrbState[] = ['offline', 'unavailable', 'permission_denied', 'error']

export function orbSoundHookForTransition(previous: OrbState, next: OrbState): OrbSoundHook | null {
  if (previous === next) return null
  if (next === 'connecting') return 'activation_pulse'
  if (next === 'listening') return previous === 'thinking' ? 'acknowledgement_pulse' : 'listening_tone'
  if (next === 'reconnecting') return 'reconnect_tone'
  if (next === 'idle' && (previous === 'speaking' || previous === 'thinking')) return 'completion_tone'
  if (next === 'muted' || next === 'private') return 'mute_transition'
  if (FAILURE_STATES.includes(next)) return 'soft_error_tone'
  return null
}
