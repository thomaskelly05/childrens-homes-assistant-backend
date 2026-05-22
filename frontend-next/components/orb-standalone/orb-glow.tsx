'use client'

import { useEffect, useState, type CSSProperties } from 'react'

import { OrbSphere } from '@/components/orb-core/orb-sphere'
import type { OrbRenderState } from '@/components/orb-core/orb-sphere'

export type StandaloneOrbGlowState =
  | 'idle'
  | 'wake_listening'
  | 'wake_detected'
  | 'listening'
  | 'continuous_listening'
  | 'transcript_ready'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'recording'
  | 'safeguarding'
  | 'error'

const STATE_LABELS: Record<StandaloneOrbGlowState, string> = {
  idle: 'Ready',
  wake_listening: "Say 'Hey ORB'",
  wake_detected: "Hey, I'm here.",
  listening: "I'm listening…",
  continuous_listening: 'Listening for your reply…',
  transcript_ready: 'Ready to send',
  thinking: 'Thinking that through…',
  speaking: "Here's how I'd think about it…",
  interrupted: "Stopped — I'm listening.",
  recording: 'Recording support',
  safeguarding: 'Safeguarding reflection',
  error: 'Voice unavailable — type instead'
}

const STATE_TO_RENDER: Record<StandaloneOrbGlowState, OrbRenderState> = {
  idle: 'idle',
  wake_listening: 'listening',
  wake_detected: 'listening',
  listening: 'listening',
  continuous_listening: 'listening',
  transcript_ready: 'idle',
  thinking: 'thinking',
  speaking: 'speaking',
  interrupted: 'listening',
  recording: 'handover',
  safeguarding: 'safeguarding_cautious',
  error: 'permission_denied'
}

const STATE_HUES: Record<StandaloneOrbGlowState, { ring: string; glow: string; core: string }> = {
  idle: {
    ring: 'from-cyan-400/45 via-sky-500/25 to-indigo-500/12',
    glow: 'shadow-cyan-500/35',
    core: 'rgba(34,211,238,0.18)'
  },
  wake_listening: {
    ring: 'from-sky-400/40 via-blue-500/22 to-indigo-600/14',
    glow: 'shadow-sky-500/28',
    core: 'rgba(56,189,248,0.14)'
  },
  wake_detected: {
    ring: 'from-cyan-200/90 via-sky-300/60 to-blue-400/35',
    glow: 'shadow-cyan-300/65',
    core: 'rgba(34,211,238,0.38)'
  },
  listening: {
    ring: 'from-cyan-200/80 via-sky-300/50 to-blue-400/25',
    glow: 'shadow-cyan-300/55',
    core: 'rgba(56,189,248,0.28)'
  },
  continuous_listening: {
    ring: 'from-cyan-200/75 via-teal-300/48 to-blue-400/28',
    glow: 'shadow-cyan-300/50',
    core: 'rgba(45,212,191,0.26)'
  },
  transcript_ready: {
    ring: 'from-teal-300/55 via-cyan-400/35 to-emerald-500/18',
    glow: 'shadow-teal-400/40',
    core: 'rgba(45,212,191,0.22)'
  },
  thinking: {
    ring: 'from-violet-400/65 via-indigo-500/40 to-purple-700/22',
    glow: 'shadow-violet-500/45',
    core: 'rgba(139,92,246,0.24)'
  },
  speaking: {
    ring: 'from-amber-200/75 via-orange-300/45 to-yellow-400/28',
    glow: 'shadow-amber-300/50',
    core: 'rgba(251,191,36,0.26)'
  },
  interrupted: {
    ring: 'from-amber-300/55 via-cyan-400/40 to-sky-500/28',
    glow: 'shadow-amber-300/38',
    core: 'rgba(251,191,36,0.22)'
  },
  recording: {
    ring: 'from-emerald-300/60 via-teal-400/38 to-cyan-500/22',
    glow: 'shadow-emerald-400/42',
    core: 'rgba(52,211,153,0.22)'
  },
  safeguarding: {
    ring: 'from-rose-300/50 via-amber-400/38 to-orange-500/22',
    glow: 'shadow-rose-400/38',
    core: 'rgba(251,113,133,0.2)'
  },
  error: {
    ring: 'from-red-400/30 via-slate-500/22 to-slate-700/14',
    glow: 'shadow-red-900/28',
    core: 'rgba(248,113,113,0.12)'
  }
}

const ORB_SIZE_CLASSES = {
  hero: 'h-52 w-52 md:h-64 md:w-64 lg:h-72 lg:w-72',
  dock: 'h-28 w-28 md:h-32 md:w-32',
  compact: 'h-20 w-20'
} as const

const ORB_SPHERE_SIZE = {
  hero: 'xlarge' as const,
  dock: 'large' as const,
  compact: 'medium' as const
}

export type OrbGlowSize = keyof typeof ORB_SIZE_CLASSES

export function OrbGlow({
  state,
  mode,
  voiceEnabled,
  label,
  onOrbActivate,
  interactive = true,
  size = 'hero',
  compactLabels = false
}: {
  state: StandaloneOrbGlowState
  mode?: string
  voiceEnabled?: boolean
  label?: string
  onOrbActivate?: () => void
  interactive?: boolean
  size?: OrbGlowSize
  compactLabels?: boolean
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
    : state === 'wake_listening'
      ? 'animate-[orb-standalone-wake-pulse_3.2s_ease-in-out_infinite]'
      : state === 'wake_detected'
        ? 'animate-[orb-standalone-wake-flare_0.9s_ease-out_forwards]'
        : state === 'listening' || state === 'continuous_listening' || state === 'interrupted'
          ? 'animate-[orb-standalone-pulse_1.2s_ease-in-out_infinite]'
          : state === 'transcript_ready'
            ? 'animate-[orb-standalone-breathe_2.4s_ease-in-out_infinite]'
            : state === 'thinking'
              ? 'animate-[orb-standalone-breathe_3.2s_ease-in-out_infinite]'
              : state === 'speaking'
                ? 'animate-[orb-standalone-ring_1.8s_ease-in-out_infinite]'
                : state === 'idle'
                  ? 'animate-[orb-standalone-breathe_4.5s_ease-in-out_infinite]'
                  : ''

  const showWaveform =
    state === 'listening' ||
    state === 'continuous_listening' ||
    state === 'speaking' ||
    state === 'interrupted' ||
    state === 'wake_detected'

  const sizeClass = ORB_SIZE_CLASSES[size]
  const sphereSize = ORB_SPHERE_SIZE[size]

  const orbButton = (
    <div
      className={`relative mx-auto flex items-center justify-center ${sizeClass} ${pulseClass}`}
      data-standalone-orb-state={state}
      data-orb-state={renderState}
      style={{ '--orb-core-glow': hues.core } as CSSProperties}
    >
      <div
        className={`pointer-events-none absolute inset-[-22%] rounded-full bg-gradient-to-br ${hues.ring} blur-3xl ${hues.glow} orb-standalone-halo`}
        aria-hidden
      />
      {(state === 'listening' ||
        state === 'continuous_listening' ||
        state === 'wake_listening' ||
        state === 'wake_detected') &&
      !reducedMotion ? (
        <>
          <div className="pointer-events-none absolute inset-[-14%] rounded-full border border-cyan-300/25 orb-standalone-listen-ring" aria-hidden />
          <div
            className="pointer-events-none absolute inset-[-20%] rounded-full border border-cyan-200/15 orb-standalone-listen-ring"
            style={{ animationDelay: '0.6s' }}
            aria-hidden
          />
        </>
      ) : null}
      {state === 'interrupted' && !reducedMotion ? (
        <div className="pointer-events-none absolute inset-[-12%] rounded-full border border-amber-300/35 orb-standalone-interrupt-ring" aria-hidden />
      ) : null}
      <div
        className={`pointer-events-none absolute inset-[-10%] rounded-full border border-white/20 bg-white/[0.03] backdrop-blur-sm ${reducedMotion ? '' : 'animate-[orb-standalone-spin_14s_linear_infinite]'}`}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-[12%] rounded-full bg-gradient-to-br from-white/25 via-white/5 to-transparent opacity-80" aria-hidden />
      <OrbSphere state={renderState} size={sphereSize} />

      {showWaveform && !reducedMotion ? (
        <div className="pointer-events-none absolute bottom-3 flex items-end gap-1.5" aria-hidden>
          {[0, 1, 2, 3, 4, 5].map((bar) => (
            <span
              key={bar}
              className="inline-block w-1 rounded-full bg-white/75 orb-standalone-wave-bar"
              style={{
                height:
                  state === 'speaking'
                    ? `${10 + (bar % 4) * 6}px`
                    : state === 'wake_detected'
                      ? `${14 + (bar % 2) * 8}px`
                      : `${12 + (bar % 3) * 7}px`,
                animationDelay: `${bar * 0.08}s`
              }}
            />
          ))}
        </div>
      ) : null}
      {state === 'thinking' && !reducedMotion ? (
        <div className="pointer-events-none absolute inset-[-6%] rounded-full border border-violet-300/20 orb-standalone-orbit" aria-hidden />
      ) : null}
    </div>
  )

  return (
    <div className="flex flex-col items-center text-center" aria-live="polite" aria-atomic="true">
      {interactive && onOrbActivate ? (
        <button
          type="button"
          onClick={onOrbActivate}
          className="group rounded-full outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-300/80 focus-visible:ring-offset-4 focus-visible:ring-offset-slate-950"
          aria-label={
            state === 'listening' || state === 'continuous_listening'
              ? 'Stop listening'
              : state === 'speaking'
                ? 'Interrupt and listen'
                : 'Tap to speak — start voice input'
          }
        >
          {orbButton}
          <p className="mt-3 text-[11px] font-semibold text-slate-500 opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
            {state === 'listening' || state === 'continuous_listening'
              ? 'Tap again to stop'
              : state === 'speaking'
                ? 'Tap to interrupt'
                : 'Tap to speak'}
          </p>
        </button>
      ) : (
        orbButton
      )}

      <p
        className={`font-black uppercase text-cyan-100/90 ${
          compactLabels ? 'mt-2 text-[10px] tracking-[0.14em]' : 'mt-5 text-sm tracking-[0.2em]'
        }`}
      >
        {statusText}
      </p>
      {mode && !compactLabels ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{mode}</p>
      ) : null}
      {voiceEnabled === false && !compactLabels ? (
        <p className="mt-2 text-xs text-slate-500">Voice replies off — typing always available</p>
      ) : null}
      {state === 'speaking' && !compactLabels ? (
        <p className="mt-2 text-xs text-slate-500">You can interrupt me any time.</p>
      ) : null}
    </div>
  )
}
