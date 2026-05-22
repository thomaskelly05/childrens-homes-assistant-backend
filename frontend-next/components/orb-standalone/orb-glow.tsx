'use client'

import { useEffect, useState } from 'react'

import { OrbSphere } from '@/components/orb-core/orb-sphere'
import type { OrbRenderState } from '@/components/orb-core/orb-sphere'

export type StandaloneOrbGlowState =
  | 'idle'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'recording'
  | 'safeguarding'
  | 'error'

const STATE_LABELS: Record<StandaloneOrbGlowState, string> = {
  idle: 'ORB is ready',
  listening: 'Listening…',
  thinking: 'Thinking…',
  speaking: 'Speaking…',
  recording: 'Helping with recording',
  safeguarding: 'Safeguarding reflection',
  error: 'Voice unavailable — type instead'
}

const STATE_TO_RENDER: Record<StandaloneOrbGlowState, OrbRenderState> = {
  idle: 'idle',
  listening: 'listening',
  thinking: 'thinking',
  speaking: 'speaking',
  recording: 'handover',
  safeguarding: 'safeguarding_cautious',
  error: 'permission_denied'
}

const STATE_HUES: Record<StandaloneOrbGlowState, { ring: string; glow: string }> = {
  idle: { ring: 'from-cyan-400/40 via-sky-500/20 to-indigo-500/10', glow: 'shadow-cyan-500/30' },
  listening: { ring: 'from-cyan-300/70 via-sky-400/40 to-blue-500/20', glow: 'shadow-cyan-400/50' },
  thinking: { ring: 'from-violet-400/60 via-indigo-500/35 to-purple-600/20', glow: 'shadow-violet-500/40' },
  speaking: { ring: 'from-amber-300/70 via-orange-400/40 to-yellow-500/25', glow: 'shadow-amber-400/45' },
  recording: { ring: 'from-emerald-300/60 via-teal-400/35 to-cyan-500/20', glow: 'shadow-emerald-400/40' },
  safeguarding: { ring: 'from-rose-300/55 via-amber-400/35 to-orange-500/20', glow: 'shadow-rose-400/35' },
  error: { ring: 'from-red-400/35 via-slate-500/25 to-slate-700/15', glow: 'shadow-red-900/25' }
}

export function OrbGlow({
  state,
  mode,
  voiceEnabled,
  label
}: {
  state: StandaloneOrbGlowState
  mode?: string
  voiceEnabled?: boolean
  label?: string
}) {
  const [reducedMotion, setReducedMotion] = useState(false)
  const renderState = STATE_TO_RENDER[state]
  const hues = STATE_HUES[state]
  const statusText = label || STATE_LABELS[state]

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const pulseClass = reducedMotion
    ? ''
    : state === 'listening'
      ? 'animate-[orb-standalone-pulse_1.4s_ease-in-out_infinite]'
      : state === 'thinking'
        ? 'animate-[orb-standalone-breathe_3.2s_ease-in-out_infinite]'
        : state === 'speaking'
          ? 'animate-[orb-standalone-ring_2s_ease-in-out_infinite]'
          : ''

  return (
    <div className="flex flex-col items-center text-center" aria-live="polite" aria-atomic="true">
      <div
        className={`relative mx-auto flex h-56 w-56 items-center justify-center md:h-72 md:w-72 ${pulseClass}`}
        data-standalone-orb-state={state}
        data-orb-state={renderState}
      >
        <div
          className={`pointer-events-none absolute inset-[-18%] rounded-full bg-gradient-to-br ${hues.ring} blur-2xl ${hues.glow}`}
          aria-hidden
        />
        <div
          className={`pointer-events-none absolute inset-[-8%] rounded-full border border-white/15 ${reducedMotion ? '' : 'animate-[orb-standalone-spin_12s_linear_infinite]'}`}
          aria-hidden
        />
        <OrbSphere state={renderState} size="xlarge" />

        {(state === 'listening' || state === 'speaking') && !reducedMotion ? (
          <div className="pointer-events-none absolute bottom-2 flex gap-1" aria-hidden>
            {[0, 1, 2, 3, 4].map((bar) => (
              <span
                key={bar}
                className="inline-block w-1 rounded-full bg-white/70"
                style={{
                  height: state === 'listening' ? `${10 + (bar % 3) * 6}px` : `${8 + (bar % 4) * 5}px`,
                  animation: `orb-standalone-bar 0.${9 + bar}s ease-in-out infinite alternate`
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      <p className="mt-6 text-sm font-black uppercase tracking-[0.2em] text-cyan-100/90">{statusText}</p>
      {mode ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{mode}</p>
      ) : null}
      {voiceEnabled === false ? (
        <p className="mt-2 text-xs text-slate-500">Voice replies off — typing always available</p>
      ) : null}
    </div>
  )
}
