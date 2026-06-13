'use client'

import type { ReactNode } from 'react'

import { OrbVoiceHeroStage } from '@/components/orb-standalone/orb-voice-hero-stage'
import { useOrbMobileViewport } from '@/components/orb-standalone/use-orb-mobile-viewport'
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
  const isMobileViewport = useOrbMobileViewport()

  return (
    <div
      className={`orb-voice-station-content flex min-h-0 flex-1 flex-col overflow-hidden ${className}`.trim()}
      data-orb-voice-station-content
      data-orb-voice-mobile
    >
      <div className="orb-voice-station-content__scroll min-h-0 flex-1 overscroll-contain px-4 py-1 md:px-6 md:py-2">
        <div className="orb-voice-station-content__hero mx-auto flex w-full max-w-lg flex-col items-center">
          <OrbVoiceHeroStage
            companionState={companionState}
            statusLine={statusLine}
            detailLine={detailLine}
            cta={isMobileViewport ? undefined : controls}
            heroStageId={isMobileViewport ? 'mobile' : 'desktop'}
          />
          {children}
        </div>
      </div>

      {isMobileViewport && controls ? (
        <div
          className="orb-voice-station-content__mobile-dock shrink-0 border-t border-[var(--orb-line)]/30 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          data-orb-voice-mobile-action-dock
        >
          <div className="mx-auto w-full max-w-lg space-y-2">{controls}</div>
        </div>
      ) : null}

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
