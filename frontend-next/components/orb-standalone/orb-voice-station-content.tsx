'use client'

import type { ReactNode } from 'react'

import { OrbVoiceHeroStage } from '@/components/orb-standalone/orb-voice-hero-stage'
import { OrbVoiceResponsibilityStrip } from '@/components/orb-standalone/orb-voice-responsibility-strip'
import { useOrbMobileViewport } from '@/components/orb-standalone/use-orb-mobile-viewport'
import type { OrbVoiceCompanionState } from '@/components/orb-residential/orb-voice-companion'
import { ORB_VOICE_V2_ONE_SCREEN_WORKSPACE } from '@/lib/orb/voice-v2/orb-voice-v2-one-screen-workspace.ts'
import { ORB_VOICE_V2_IDLE_PROMPT } from '@/lib/orb/voice-v2/orb-voice-v2-copy.ts'
import { ORB_VOICE_V2_TITLE } from '@/lib/orb/orb-residential-ui-copy'

/**
 * Phase 5J — one persistent live Voice workspace.
 * Hero + wave stay mounted; right rail always present on desktop.
 */
export function OrbVoiceStationContent({
  companionState,
  voiceV2State,
  statusLine,
  detailLine,
  children,
  preferenceBadges,
  controls,
  secondaryControls,
  liveRail,
  sessionStarted = false,
  onWaveInterrupt,
  waveInterruptible = false,
  wakePhraseHint,
  className = ''
}: {
  voiceV2State?: string
  companionState: OrbVoiceCompanionState
  statusLine: string
  detailLine: string | null
  children?: ReactNode
  preferenceBadges?: ReactNode
  controls: ReactNode | null
  secondaryControls?: ReactNode
  /** Persistent right rail — always mounted on desktop. */
  liveRail: ReactNode
  sessionStarted?: boolean
  onWaveInterrupt?: () => void
  waveInterruptible?: boolean
  wakePhraseHint?: string
  className?: string
}) {
  const isMobileViewport = useOrbMobileViewport()

  return (
    <div
      className={`orb-voice-station-content orb-voice-one-screen-workspace orb-workspace orb-workspace--voice flex min-h-0 flex-1 flex-col overflow-hidden ${className}`.trim()}
      data-orb-voice-station-content
      data-orb-voice-one-screen-workspace
      data-orb-workspace-voice
      data-orb-voice-workspace-mode={ORB_VOICE_V2_ONE_SCREEN_WORKSPACE}
      data-orb-voice-mobile={isMobileViewport ? true : undefined}
      data-orb-voice-desktop-spacious={!isMobileViewport ? true : undefined}
      data-orb-voice-session-started={sessionStarted ? true : undefined}
      data-orb-voice-idle-hero={!sessionStarted ? true : undefined}
    >
      <div className="orb-voice-station-content__scroll orb-voice-one-screen-workspace__scroll min-h-0 flex-1 overscroll-contain px-4 py-2 md:px-6 md:py-4">
        <div className="orb-voice-one-screen-workspace__grid mx-auto flex w-full max-w-[88rem] flex-col gap-4 md:flex-row md:items-stretch md:gap-8">
          <div className="orb-voice-one-screen-workspace__main flex min-h-0 w-full flex-col items-center md:min-w-0 md:flex-1">
            <div
              className={`orb-voice-station-content__intro mb-1 w-full text-center transition-opacity ${
                sessionStarted ? 'opacity-80' : ''
              }`}
              data-orb-voice-v2-intro
            >
              <h2
                className={`orb-voice-station-content__title font-semibold text-[var(--orb-text,var(--orb-foreground))] ${
                  sessionStarted ? 'text-base' : 'text-sm'
                }`}
                data-orb-voice-v2-title
              >
                {ORB_VOICE_V2_TITLE}
              </h2>
              {!sessionStarted ? (
                <p className="orb-voice-station-content__subtitle mt-0.5 text-xs text-[var(--orb-muted)]" data-orb-voice-v2-subtitle>
                  {ORB_VOICE_V2_IDLE_PROMPT}
                </p>
              ) : null}
            </div>

            <OrbVoiceHeroStage
              companionState={companionState}
              voiceV2State={voiceV2State}
              statusLine={statusLine}
              detailLine={detailLine}
              middleSlot={children}
              cta={isMobileViewport ? undefined : controls}
              heroStageId={isMobileViewport ? 'mobile' : 'desktop'}
              oneScreenWorkspace
              onWaveInterrupt={onWaveInterrupt}
              waveInterruptible={waveInterruptible}
            />

            {preferenceBadges ? (
              <div className="orb-voice-preference-badges mt-3 w-full max-w-lg" data-orb-voice-session-badges>
                {preferenceBadges}
              </div>
            ) : null}
            {wakePhraseHint && sessionStarted ? (
              <p
                className="mt-2 max-w-md text-center text-[10px] leading-relaxed text-[var(--orb-muted)]"
                data-orb-voice-wake-phrase-hint
              >
                {wakePhraseHint}
              </p>
            ) : null}
          </div>

          <div
            className="orb-voice-one-screen-workspace__rail min-h-[12rem] w-full md:w-[min(100%,26.25rem)] md:min-w-[22.5rem] md:max-w-[26.25rem] md:shrink-0"
            data-orb-voice-live-rail-slot
          >
            {liveRail}
          </div>
        </div>
      </div>

      {isMobileViewport && controls ? (
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

      <OrbVoiceResponsibilityStrip className="pb-[max(0.5rem,env(safe-area-inset-bottom))]" />
    </div>
  )
}
