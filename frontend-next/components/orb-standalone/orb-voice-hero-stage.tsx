'use client'

import type { ReactNode } from 'react'

import {
  ORB_VOICE_COMPANION_HEADLINES,
  ORB_VOICE_COMPANION_SUBLINES,
  OrbVoiceCompanion,
  type OrbVoiceCompanionState
} from '@/components/orb-residential/orb-voice-companion'
import { useOrbResponsiveMode } from '@/components/orb-standalone/use-orb-responsive-mode'
import {
  OrbVoiceShowstopperWave,
  mapVoiceStateToShowstopperWave
} from '@/components/orb-standalone/orb-voice-showstopper-wave'

/** Shared hero column — living head, headline, waveform, CTA, and status for Voice stations. */
export function OrbVoiceHeroStage({
  companionState,
  voiceV2State,
  statusLine,
  detailLine,
  middleSlot,
  cta,
  onWaveInterrupt,
  waveInterruptible = false,
  className = '',
  heroStageId = 'desktop',
  oneScreenWorkspace = false
}: {
  companionState: OrbVoiceCompanionState
  /** Raw Voice v2 state for premium showstopper waveform (includes interrupted). */
  voiceV2State?: string
  statusLine?: string
  detailLine?: string | null
  /** Idle-mode controls shown between the ORB waveform and primary action. */
  middleSlot?: ReactNode
  /** Primary voice action — anchored directly below the waveform. */
  cta?: ReactNode
  /** Phase 5L — tap wave to interrupt while ORB is speaking. */
  onWaveInterrupt?: () => void
  waveInterruptible?: boolean
  className?: string
  /** `desktop` uses data-orb-voice-hero-stage; `mobile` uses data-orb-voice-mobile-hero-stage */
  heroStageId?: 'desktop' | 'mobile'
  /** Phase 5J/5K — wave-only hero without duplicate companion orb. */
  oneScreenWorkspace?: boolean
}) {
  const { isMobile } = useOrbResponsiveMode()
  const stageAttr =
    heroStageId === 'mobile'
      ? ({ 'data-orb-voice-mobile-hero-stage': true, 'data-orb-voice-hero-stage': true } as const)
      : ({ 'data-orb-voice-hero-stage': true } as const)

  const subline = detailLine ?? ORB_VOICE_COMPANION_SUBLINES[companionState]
  const headline = statusLine ?? ORB_VOICE_COMPANION_HEADLINES[companionState]
  const showSubline = Boolean(subline) && (isMobile || companionState !== 'paused')

  const wave = (
    <div
      className={`orb-voice-hero-stage__waveform-wrap ${waveInterruptible ? 'orb-voice-hero-stage__waveform-wrap--interruptible' : ''}`.trim()}
      data-orb-voice-wave-interruptible={waveInterruptible ? true : undefined}
      onClick={waveInterruptible ? onWaveInterrupt : undefined}
      onKeyDown={
        waveInterruptible
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onWaveInterrupt?.()
              }
            }
          : undefined
      }
      role={waveInterruptible ? 'button' : undefined}
      tabIndex={waveInterruptible ? 0 : undefined}
      aria-label={waveInterruptible ? 'Interrupt ORB' : undefined}
    >
      <OrbVoiceShowstopperWave
        state={mapVoiceStateToShowstopperWave(voiceV2State ?? companionState)}
        className={`orb-voice-hero-stage__waveform ${oneScreenWorkspace ? 'orb-voice-hero-stage__waveform--dominant' : ''}`.trim()}
      />
    </div>
  )

  return (
    <div
      className={`orb-voice-hero-stage relative flex shrink-0 flex-col items-center text-center ${oneScreenWorkspace ? 'orb-voice-hero-stage--dominant' : ''} ${className}`.trim()}
      {...stageAttr}
      data-orb-voice-hero-dominant={oneScreenWorkspace ? true : undefined}
    >
      <div className="orb-voice-hero-aura pointer-events-none absolute inset-x-0 top-0 -z-10 h-[min(28rem,70%)]" aria-hidden />
      {oneScreenWorkspace ? (
        wave
      ) : (
        <>
          <OrbVoiceCompanion state={companionState} size="hero" className="orb-voice-hero-stage__orb shrink-0" />
          {wave}
        </>
      )}

      <p
        className={`orb-voice-hero-stage__headline text-center font-medium text-[var(--orb-text,var(--orb-foreground))] ${
          oneScreenWorkspace ? 'mt-3 text-xs' : 'text-sm'
        }`}
        data-orb-voice-status-label
      >
        {headline}
      </p>
      {showSubline ? (
        <p
          className={`orb-voice-hero-stage__subline text-center ${
            oneScreenWorkspace ? 'mt-1 text-sm font-medium' : 'text-xs'
          } ${
            subline === detailLine && subline?.includes('Browser speech recognition is optional')
              ? 'text-[var(--orb-muted)] opacity-90'
              : oneScreenWorkspace
                ? 'text-[var(--orb-foreground)]'
                : 'text-[var(--orb-muted)]'
          }`}
          data-orb-voice-status-subline
          data-orb-voice-progress-line={oneScreenWorkspace && subline === detailLine ? true : undefined}
          data-orb-voice-speech-notice={subline?.includes('Browser speech recognition is optional') ? 'true' : undefined}
        >
          {subline}
        </p>
      ) : null}

      {middleSlot ? (
        <div className="orb-voice-controls orb-voice-hero-stage__modes w-full" data-orb-voice-main-mode-controls data-orb-voice-controls>
          {middleSlot}
        </div>
      ) : null}

      {cta ? (
        <div className="orb-voice-controls orb-voice-hero-stage__cta w-full max-w-sm" data-orb-voice-hero-cta data-orb-voice-controls>
          {cta}
        </div>
      ) : null}
    </div>
  )
}
