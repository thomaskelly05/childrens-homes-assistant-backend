'use client'

import {
  ORB_VOICE_COMPANION_HEADLINES,
  ORB_VOICE_COMPANION_SUBLINES,
  OrbVoiceCompanion,
  type OrbVoiceCompanionState
} from '@/components/orb-residential/orb-voice-companion'
import { OrbVoiceStudioWaveform } from '@/components/orb-standalone/orb-voice-studio-layout'

/** Shared hero column — living head, headline, waveform, and status for Voice stations. */
export function OrbVoiceHeroStage({
  companionState,
  statusLine,
  detailLine,
  className = '',
  heroStageId = 'desktop'
}: {
  companionState: OrbVoiceCompanionState
  statusLine?: string
  detailLine?: string | null
  className?: string
  /** `desktop` uses data-orb-voice-hero-stage; `mobile` uses data-orb-voice-mobile-hero-stage */
  heroStageId?: 'desktop' | 'mobile'
}) {
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
        className="mt-4 text-center text-sm font-medium text-[var(--orb-text,var(--orb-foreground))]"
        data-orb-voice-status-label
      >
        {ORB_VOICE_COMPANION_HEADLINES[companionState]}
      </p>
      {subline ? (
        <p className="mt-1 text-center text-xs text-[var(--orb-muted)]" data-orb-voice-status-subline>
          {subline}
        </p>
      ) : null}

      <OrbVoiceStudioWaveform state={companionState} className="mt-3" />

      {micStatus ? (
        <p className="mt-2 text-center text-xs text-[var(--orb-muted)]" data-orb-voice-mic-status>
          {micStatus}
        </p>
      ) : null}

      <p className="orb-voice-station__privacy mt-2 text-[11px] leading-4 text-[var(--orb-muted)]" data-orb-voice-privacy-note>
        Hands-free when your microphone is allowed. Voice stays within your ORB account.
      </p>
    </div>
  )
}
