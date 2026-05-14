'use client'

import type { OrbState } from '@/lib/orb/types'

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

  return (
    <div className="relative inline-flex items-center justify-center" aria-label={`Orb status: ${stateLabels[state]}`} role="img">
      {pulse ? <span className={`absolute ${dimension} motion-safe:animate-ping rounded-full bg-cyan-300/30`} /> : null}
      <span className={`absolute ${dimension} rounded-full blur-2xl ${error ? 'bg-red-300/70' : inspection ? 'bg-amber-200/60' : muted ? 'bg-slate-300/60' : 'bg-cyan-300/70'}`} />
      <span className={`absolute ${dimension} rounded-full border border-white/60 ${pulse ? 'motion-safe:animate-pulse' : ''}`} />
      <div className={`${dimension} relative overflow-hidden rounded-full border border-white/80 bg-gradient-to-br ${error ? 'from-red-100 via-white to-red-300' : inspection ? 'from-amber-100 via-white to-cyan-300' : muted ? 'from-slate-100 via-white to-slate-300' : 'from-white via-blue-100 to-cyan-400'} shadow-[0_0_64px_rgba(34,211,238,0.36)] transition`}>
        <span className="absolute inset-2 rounded-full bg-white/25 blur-sm" />
        <span className="absolute left-3 top-3 h-1/3 w-1/3 rounded-full bg-white/80 blur-md" />
        <span className="absolute bottom-2 right-3 h-1/4 w-1/4 rounded-full bg-blue-300/50 blur-lg" />
      </div>
      {!isSmall ? <p className="sr-only">{stateLabels[state]}</p> : null}
    </div>
  )
}

export function orbStateLabel(state: OrbState) {
  return stateLabels[state]
}

