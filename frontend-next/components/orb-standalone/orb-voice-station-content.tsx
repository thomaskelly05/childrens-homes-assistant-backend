'use client'

import type { ReactNode } from 'react'

import { OrbVoiceHeroStage } from '@/components/orb-standalone/orb-voice-hero-stage'
import { OrbVoiceResponsibilityStrip } from '@/components/orb-standalone/orb-voice-responsibility-strip'
import { useOrbMobileViewport } from '@/components/orb-standalone/use-orb-mobile-viewport'
import type { OrbVoiceCompanionState } from '@/components/orb-residential/orb-voice-companion'
import {
  ORB_VOICE_STATUS_CARD_COPY,
  ORB_VOICE_V2_PROMPT,
  ORB_VOICE_V2_SUPPORTING,
  ORB_VOICE_V2_TITLE
} from '@/lib/orb/orb-residential-ui-copy'

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
  sidePanel,
  workspaceMode = 'idle',
  className = ''
}: {
  companionState: OrbVoiceCompanionState
  statusLine: string
  detailLine: string | null
  children?: ReactNode
  /** Primary CTA — rendered in the hero stack below the waveform. */
  controls: ReactNode | null
  /** Optional secondary actions below the hero (transcript tools, etc.). */
  secondaryControls?: ReactNode
  /** Desktop transcript / summary column when live or after call. */
  sidePanel?: ReactNode
  workspaceMode?: 'idle' | 'live' | 'after_call' | 'no_transcript'
  className?: string
}) {
  const isMobileViewport = useOrbMobileViewport()
  const showDesktopSplit = !isMobileViewport && Boolean(sidePanel) && workspaceMode !== 'idle'

  return (
    <div
      className={`orb-voice-station-content orb-workspace orb-workspace--voice flex min-h-0 flex-1 flex-col overflow-hidden ${className}`.trim()}
      data-orb-voice-station-content
      data-orb-workspace-voice
      data-orb-voice-mobile={isMobileViewport ? true : undefined}
      data-orb-voice-desktop-spacious={!isMobileViewport ? true : undefined}
      data-orb-voice-workspace-mode={workspaceMode}
    >
      <div
        className={`orb-voice-station-content__scroll min-h-0 flex-1 overscroll-contain px-4 py-2 md:px-6 md:py-6 ${
          showDesktopSplit ? 'orb-voice-station-content__scroll--split' : ''
        }`}
      >
        <div
          className={`mx-auto flex w-full max-w-lg flex-col items-center ${
            showDesktopSplit ? 'orb-voice-station-content__split md:max-w-none md:flex-row md:items-start md:gap-6' : ''
          }`}
        >
          <div className={`orb-voice-station-content__hero flex w-full flex-col items-center ${showDesktopSplit ? 'md:max-w-sm md:flex-1' : ''}`}>
            {workspaceMode === 'idle' ? (
              <div className="orb-voice-station-content__intro mb-3 text-center" data-orb-voice-v2-intro>
                <h2
                  className="orb-voice-station-content__title text-base font-semibold text-[var(--orb-text,var(--orb-foreground))]"
                  data-orb-voice-v2-title
                >
                  {ORB_VOICE_V2_TITLE}
                </h2>
                <p
                  className="orb-voice-station-content__prompt mt-1 text-sm text-[var(--orb-muted)]"
                  data-orb-voice-v2-prompt
                  data-orb-voice-hero-line
                >
                  {ORB_VOICE_V2_PROMPT}
                </p>
                <p
                  className="orb-voice-station-content__supporting mt-2 text-xs leading-relaxed text-[var(--orb-muted)]"
                  data-orb-voice-v2-supporting
                >
                  {ORB_VOICE_V2_SUPPORTING}
                </p>
              </div>
            ) : null}
            <OrbVoiceHeroStage
              companionState={companionState}
              statusLine={statusLine}
              detailLine={detailLine}
              middleSlot={workspaceMode === 'idle' ? children : undefined}
              cta={isMobileViewport && workspaceMode === 'idle' ? undefined : controls}
              heroStageId={isMobileViewport ? 'mobile' : 'desktop'}
            />
            {isMobileViewport && workspaceMode !== 'idle' ? children : null}
            {workspaceMode === 'idle' ? (
              <p
                className="orb-workspace-voice-status"
                role="status"
                data-orb-voice-status-card
                data-orb-voice-status
                data-orb-voice-safety-note
              >
                {ORB_VOICE_STATUS_CARD_COPY}
              </p>
            ) : null}
          </div>
          {showDesktopSplit ? (
            <aside
              className="orb-voice-station-content__side min-h-0 w-full min-w-0 md:max-w-md md:flex-1"
              data-orb-voice-desktop-side-panel
            >
              {sidePanel}
            </aside>
          ) : null}
        </div>
      </div>

      {isMobileViewport && controls && workspaceMode !== 'after_call' ? (
        <div
          className="orb-voice-controls orb-voice-station-content__mobile-dock shrink-0 border-t border-[var(--orb-line)]/30 px-4 py-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          data-orb-voice-mobile-action-dock
          data-orb-voice-controls
        >
          <div className="mx-auto w-full max-w-lg space-y-2">{controls}</div>
        </div>
      ) : null}

      {secondaryControls ? (
        <div
          className="orb-voice-station-content__controls shrink-0 space-y-2 px-4 py-2 md:px-6"
          data-orb-voice-station-controls
        >
          <div className="mx-auto w-full max-w-lg">{secondaryControls}</div>
        </div>
      ) : null}

      {workspaceMode !== 'idle' ? (
        <OrbVoiceResponsibilityStrip className="pb-[max(0.5rem,env(safe-area-inset-bottom))]" />
      ) : null}
    </div>
  )
}
