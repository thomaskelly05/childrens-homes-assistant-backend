'use client'

import type { ReactNode } from 'react'

import { OrbVoiceHeroStage } from '@/components/orb-standalone/orb-voice-hero-stage'
import type { OrbVoiceCompanionState } from '@/components/orb-residential/orb-voice-companion'

/**
 * Canonical Voice station body — shared hero column for desktop and mobile.
 * Uses standard ORB workspace chrome from OrbWorkspaceFrame; no duplicate titles.
 */
export function OrbVoiceStationContent({
  companionState,
  statusLine,
  detailLine,
  children,
  controls,
  secondaryControls,
  className = ''
}: {
  companionState: OrbVoiceCompanionState
  statusLine: string
  detailLine: string | null
  children?: ReactNode
  /** Primary CTA — rendered in the hero stack below the waveform. */
  controls: ReactNode
  /** Optional secondary actions below the hero (transcript tools, etc.). */
  secondaryControls?: ReactNode
  className?: string
}) {
  return (
    <div
      className={`orb-voice-station-content flex min-h-0 flex-1 flex-col overflow-hidden ${className}`.trim()}
      data-orb-voice-station-content
      data-orb-voice-mobile
    >
      <div className="orb-voice-station-content__scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-2 md:px-6 md:pt-8">
        <div className="mx-auto flex w-full max-w-lg flex-col items-center">
          <OrbVoiceHeroStage
            companionState={companionState}
            statusLine={statusLine}
            detailLine={detailLine}
            cta={controls}
            heroStageId="desktop"
          />
          {children}
        </div>
      </div>

      {secondaryControls ? (
        <div
          className="orb-voice-station-content__controls shrink-0 space-y-2 border-t border-[var(--orb-line)]/30 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-6"
          data-orb-voice-station-controls
        >
          <div className="mx-auto w-full max-w-lg">{secondaryControls}</div>
        </div>
      ) : null}
    </div>
  )
}
