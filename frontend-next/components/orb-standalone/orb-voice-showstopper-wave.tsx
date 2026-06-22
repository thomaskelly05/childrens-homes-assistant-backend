'use client'

import { useEffect, useState, type CSSProperties } from 'react'

import {
  mapVoiceStateToShowstopperWave,
  type OrbVoiceShowstopperWaveState
} from '@/lib/orb/voice-v2/orb-voice-v2-showstopper.ts'

export type { OrbVoiceShowstopperWaveState }
export { mapVoiceStateToShowstopperWave }

/** Premium Siri-style luminous waveform — state-driven motion with reduced-motion fallback. */
export function OrbVoiceShowstopperWave({
  state,
  className = ''
}: {
  state: OrbVoiceShowstopperWaveState
  className?: string
}) {
  const [reducedMotion, setReducedMotion] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const barCount = 11
  return (
    <div
      className={`orb-voice-showstopper-wave ${className}`.trim()}
      data-orb-voice-showstopper-wave
      data-orb-voice-wave-state={state}
      data-orb-voice-reduced-motion={reducedMotion ? true : undefined}
      aria-hidden
    >
      <div className="orb-voice-showstopper-wave__glow" />
      {Array.from({ length: barCount }, (_, index) => (
        <span
          key={index}
          className="orb-voice-showstopper-wave__bar"
          style={{ '--orb-wave-index': index, '--orb-wave-total': barCount } as CSSProperties}
        />
      ))}
    </div>
  )
}
