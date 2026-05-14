'use client'

import { Mic, Shield, Volume2, VolumeX, Zap } from 'lucide-react'

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
  const dimension = isSmall ? 'h-12 w-12' : 'h-28 w-28'
  const pulse = ['connecting', 'passive_listening', 'listening', 'speaking', 'recording', 'dictation', 'reconnecting'].includes(state)
  const muted = state === 'muted' || state === 'private'
  const error = ['error', 'unavailable', 'permission_denied', 'expired'].includes(state)
  const inspection = state === 'inspection' || state === 'safeguarding_sensitive'

  return (
    <div className="relative inline-flex items-center justify-center" aria-label={`Orb status: ${stateLabels[state]}`} role="img">
      {pulse ? <span className={`absolute ${dimension} motion-safe:animate-ping rounded-full bg-blue-300/40`} /> : null}
      {!isSmall && !muted && !error ? (
        <span className={`absolute ${dimension} rounded-full border border-cyan-200/70 motion-safe:animate-pulse`} />
      ) : null}
      <span className={`absolute ${dimension} rounded-full blur-xl ${error ? 'bg-red-300/60' : inspection ? 'bg-amber-300/50' : muted ? 'bg-slate-300/50' : 'bg-cyan-300/60'}`} />
      <div className={`${dimension} relative flex items-center justify-center rounded-full border border-white/80 bg-gradient-to-br ${error ? 'from-red-100 via-white to-red-300' : inspection ? 'from-amber-100 via-white to-blue-300' : muted ? 'from-slate-100 via-white to-slate-300' : 'from-white via-blue-100 to-cyan-400'} shadow-2xl shadow-blue-900/20 transition`}>
        <div className="absolute inset-2 rounded-full border border-white/70 bg-white/20" />
        {state === 'speaking' ? (
          <div className="relative flex h-9 items-end gap-1">
            {[12, 24, 16, 30, 18].map((height, index) => (
              <span key={index} className="w-1.5 motion-safe:animate-pulse rounded-full bg-blue-700" style={{ height }} />
            ))}
          </div>
        ) : state === 'listening' || state === 'passive_listening' || state === 'recording' || state === 'dictation' ? (
          <Mic className={`${isSmall ? 'h-5 w-5' : 'h-9 w-9'} relative text-blue-800`} aria-hidden />
        ) : muted ? (
          <VolumeX className={`${isSmall ? 'h-5 w-5' : 'h-9 w-9'} relative text-slate-700`} aria-hidden />
        ) : inspection ? (
          <Shield className={`${isSmall ? 'h-5 w-5' : 'h-9 w-9'} relative text-amber-800`} aria-hidden />
        ) : state === 'interrupted' ? (
          <Zap className={`${isSmall ? 'h-5 w-5' : 'h-9 w-9'} relative text-blue-800`} aria-hidden />
        ) : (
          <Volume2 className={`${isSmall ? 'h-5 w-5' : 'h-9 w-9'} relative text-blue-800`} aria-hidden />
        )}
      </div>
      {!isSmall ? <p className="sr-only">{stateLabels[state]}</p> : null}
    </div>
  )
}

export function orbStateLabel(state: OrbState) {
  return stateLabels[state]
}

