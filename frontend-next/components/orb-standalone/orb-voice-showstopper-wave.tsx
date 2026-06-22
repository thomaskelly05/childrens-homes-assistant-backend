'use client'

import { useEffect, useState, type CSSProperties } from 'react'

import {
  mapVoiceStateToShowstopperWave,
  type OrbVoiceShowstopperWaveState
} from '@/lib/orb/voice-v2/orb-voice-v2-showstopper.ts'

export type { OrbVoiceShowstopperWaveState }
export { mapVoiceStateToShowstopperWave }

/** Premium Siri-style luminous waveform — central orb + horizontal bars. */
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
  const barCount = 15
  const half = Math.floor(barCount / 2)
  return (
    <div
      className={`orb-voice-showstopper-wave orb-voice-showstopper-wave--siri ${className}`.trim()}
      data-orb-voice-showstopper-wave
      data-orb-voice-wave-state={state}
      data-orb-voice-reduced-motion={reducedMotion ? true : undefined}
      aria-hidden
    >
      <div className="orb-voice-showstopper-wave__glow" />
      <div className="orb-voice-showstopper-wave__sweep" />
      <div className="orb-voice-showstopper-wave__bars">
        {Array.from({ length: half }, (_, index) => (
          <span
            key={`l-${index}`}
            className="orb-voice-showstopper-wave__bar orb-voice-showstopper-wave__bar--left"
            style={{ '--orb-wave-index': index, '--orb-wave-total': half } as CSSProperties}
          />
        ))}
        <span className="orb-voice-showstopper-wave__core" data-orb-voice-wave-core />
        {Array.from({ length: barCount - half }, (_, index) => (
          <span
            key={`r-${index}`}
            className="orb-voice-showstopper-wave__bar orb-voice-showstopper-wave__bar--right"
            style={{ '--orb-wave-index': index, '--orb-wave-total': barCount - half } as CSSProperties}
          />
        ))}
      </div>
    </div>
  )
}
