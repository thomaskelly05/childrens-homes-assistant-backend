'use client'

import type { OrbState } from '@/lib/orb/types'
import { cadenceForOrbState } from '@/lib/orb/state/emotional-cadence'

const stateLabels: Record<OrbState, string> = {
  idle: 'Ready',
  connecting: 'Connecting',
  passive_listening: 'Wake word standby',
  listening: 'Listening',
  thinking: 'Thinking',
  speaking: 'Speaking',
  interrupted: 'Interrupted',
  reconnecting: 'Reconnecting',
  offline: 'Offline',
  muted: 'Muted',
  unavailable: 'Unavailable',
  permission_denied: 'Microphone blocked',
  expired: 'Session expired',
  private: 'Private mode',
  recording: 'Recording',
  dictation: 'Dictation',
  safeguarding_sensitive: 'Safeguarding-sensitive',
  inspection: 'Inspection mode',
  error: 'Needs attention'
}

export function OrbVisual({ state, size = 'large' }: { state: OrbState; size?: 'small' | 'large' }) {
  const isSmall = size === 'small'
  const dimension = isSmall ? 'h-14 w-14' : 'h-36 w-36'
  const pulse = ['connecting', 'passive_listening', 'listening', 'speaking', 'recording', 'dictation', 'reconnecting'].includes(state)
  const muted = state === 'muted' || state === 'private'
  const error = ['error', 'unavailable', 'permission_denied', 'expired'].includes(state)
  const inspection = state === 'inspection' || state === 'safeguarding_sensitive'
  const cadence = cadenceForOrbState(state)
  const motionClass = `orb-motion-${cadence.motion}`

  return (
    <div className="relative inline-flex items-center justify-center" aria-label={`Orb status: ${stateLabels[state]}`} role="img">
      {pulse ? <span className={`absolute ${dimension} rounded-full bg-cyan-200/15 orb-motion-soft-ring`} /> : null}
      <span className={`absolute ${dimension} rounded-full blur-3xl ${error ? 'bg-amber-200/55' : inspection ? 'bg-amber-200/50' : muted ? 'bg-slate-300/50' : 'bg-cyan-200/60'}`} />
      <span className={`absolute ${dimension} rounded-full border border-white/45 ${pulse ? 'orb-motion-soft-ring' : ''}`} />
      <div className={`${dimension} ${motionClass} relative overflow-hidden rounded-full border border-white/65 bg-gradient-to-br ${error ? 'from-amber-50 via-white to-orange-200' : inspection ? 'from-amber-100 via-white to-cyan-200' : muted ? 'from-slate-100 via-white to-slate-300' : 'from-white via-sky-100 to-cyan-300'} ${cadence.glow} transition duration-700 ease-out`}>
        <span className="absolute inset-2 rounded-full bg-white/25 blur-sm" />
        <span className="absolute inset-x-8 bottom-5 h-6 rounded-full bg-white/25 blur-xl orb-motion-wave" />
        <span className="absolute inset-4 rounded-full bg-cyan-100/20 orb-motion-cadence" />
        <span className="absolute left-3 top-3 h-1/3 w-1/3 rounded-full bg-white/80 blur-md" />
        <span className="absolute bottom-2 right-3 h-1/4 w-1/4 rounded-full bg-blue-200/45 blur-lg" />
      </div>
      {!isSmall ? <p className="sr-only">{stateLabels[state]} - {cadence.label}</p> : null}
    </div>
  )
}

export function orbStateLabel(state: OrbState) {
  return stateLabels[state]
}

