import type { OrbState } from '@/lib/orb/types'

export type OrbCadence = {
  motion: 'breathing' | 'shimmer' | 'wave' | 'cadence' | 'still'
  glow: string
  label: string
}

export function cadenceForOrbState(state: OrbState): OrbCadence {
  if (state === 'listening' || state === 'dictation' || state === 'recording') {
    return { motion: 'shimmer', glow: 'shadow-[0_0_70px_rgba(34,211,238,0.4)]', label: 'Listening' }
  }
  if (state === 'thinking' || state === 'connecting' || state === 'reconnecting') {
    return { motion: 'wave', glow: 'shadow-[0_0_68px_rgba(59,130,246,0.32)]', label: 'Thinking' }
  }
  if (state === 'speaking') {
    return { motion: 'cadence', glow: 'shadow-[0_0_76px_rgba(14,165,233,0.44)]', label: 'Speaking' }
  }
  if (state === 'interrupted') {
    return { motion: 'still', glow: 'shadow-[0_0_50px_rgba(251,191,36,0.28)]', label: 'Paused' }
  }
  return { motion: 'breathing', glow: 'shadow-[0_0_64px_rgba(34,211,238,0.26)]', label: 'Present' }
}
