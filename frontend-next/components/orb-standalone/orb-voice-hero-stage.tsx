'use client'

import type { ReactNode } from 'react'

import {
  ORB_VOICE_COMPANION_HEADLINES,
  ORB_VOICE_COMPANION_SUBLINES,
  OrbVoiceCompanion,
  type OrbVoiceCompanionState
} from '@/components/orb-residential/orb-voice-companion'
import { useOrbResponsiveMode } from '@/components/orb-standalone/use-orb-responsive-mode'
import { OrbPrivacyNotice } from '@/components/orb/privacy/orb-privacy-notice'
import { getOrbDataClassificationNotice } from '@/lib/orb/privacy/orb-data-classification'
import { ORB_RESIDENTIAL_VOICE_SAFETY_STRIP } from '@/lib/orb/orb-residential-copy'
import { OrbVoiceStudioWaveform } from '@/components/orb-standalone/orb-voice-studio-layout'

/** Shared hero column — living head, headline, waveform, CTA, and status for Voice stations. */
export function OrbVoiceHeroStage({
  companionState,
  statusLine,
  detailLine,
  cta,
  className = '',
  heroStageId = 'desktop'
}: {
  companionState: OrbVoiceCompanionState
  statusLine?: string
  detailLine?: string | null
  /** Primary voice action — anchored directly below the waveform. */
  cta?: ReactNode
  className?: string
  /** `desktop` uses data-orb-voice-hero-stage; `mobile` uses data-orb-voice-mobile-hero-stage */
  heroStageId?: 'desktop' | 'mobile'
}) {
  const { isMobile } = useOrbResponsiveMode()
  const stageAttr =
    heroStageId === 'mobile'
      ? ({ 'data-orb-voice-mobile-hero-stage': true, 'data-orb-voice-hero-stage': true } as const)
      : ({ 'data-orb-voice-hero-stage': true } as const)

  const subline = ORB_VOICE_COMPANION_SUBLINES[companionState]
  const micStatus = detailLine ?? statusLine

  return (
    <div
      className={`orb-voice-hero-stage flex shrink-0 flex-col items-center text-center ${className}`.trim()}
      {...stageAttr}
    >
      <OrbVoiceCompanion state={companionState} size="hero" className="shrink-0" />

      <p
        className="orb-voice-hero-stage__headline text-center text-sm font-medium text-[var(--orb-text,var(--orb-foreground))]"
        data-orb-voice-status-label
      >
        {ORB_VOICE_COMPANION_HEADLINES[companionState]}
      </p>
      {subline ? (
        <p className="orb-voice-hero-stage__subline text-center text-xs text-[var(--orb-muted)]" data-orb-voice-status-subline>
          {subline}
        </p>
      ) : null}

      <OrbVoiceStudioWaveform state={companionState} className="orb-voice-hero-stage__waveform" />

      {cta ? (
        <div className="orb-voice-hero-stage__cta w-full max-w-sm" data-orb-voice-hero-cta>
          {cta}
        </div>
      ) : null}

      {micStatus ? (
        <p className="orb-voice-hero-stage__mic-status text-center text-xs text-[var(--orb-muted)]" data-orb-voice-mic-status>
          {micStatus}
        </p>
      ) : null}

      <div
        className="orb-voice-station__privacy orb-voice-hero-stage__privacy w-full max-w-sm space-y-2"
        data-orb-voice-privacy
      >
        {isMobile ? (
          <details className="text-left" data-orb-voice-safety-disclosure>
            <summary className="cursor-pointer text-[11px] leading-4 text-[var(--orb-muted)]">
              Not for emergencies. Follow local safeguarding procedures.
            </summary>
            <p className="mt-2 text-[11px] leading-4 text-[var(--orb-muted)]" data-orb-voice-privacy-note>
              {ORB_RESIDENTIAL_VOICE_SAFETY_STRIP}
            </p>
          </details>
        ) : (
          <>
            <p className="text-[11px] leading-4 text-[var(--orb-muted)]" data-orb-voice-privacy-note>
              {getOrbDataClassificationNotice('voice')}
            </p>
            <OrbPrivacyNotice surface="voice" className="text-left" />
          </>
        )}
      </div>
    </div>
  )
}
