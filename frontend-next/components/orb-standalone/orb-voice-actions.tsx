'use client'

import { emitOrbClientDebug } from '@/lib/orb/orb-client-debug'
import type { OrbVoiceUiState } from '@/lib/orb/voice/orb-voice-ui-state'
import { orbVoiceUiPrimaryLabel } from '@/lib/orb/voice/orb-voice-ui-state'

export type OrbVoiceActionsProps = {
  uiState: OrbVoiceUiState
  primaryDisabled?: boolean
  onPrimary: () => void
  onSignIn?: () => void
  onTypeInstead?: () => void
  onUseDictate?: () => void
  onTryAgain?: () => void
  layout?: 'stack' | 'inline'
  className?: string
}

/**
 * Single source of voice fallback controls — at most one primary and two secondaries.
 */
export function OrbVoiceActions({
  uiState,
  primaryDisabled = false,
  onPrimary,
  onSignIn,
  onTypeInstead,
  onUseDictate,
  onTryAgain,
  layout = 'stack',
  className = ''
}: OrbVoiceActionsProps) {
  const stack = layout === 'stack'
  const wrap = stack ? 'flex flex-col gap-2' : 'flex flex-wrap items-center justify-center gap-2'

  const primaryLabel = orbVoiceUiPrimaryLabel(uiState)
  const isStartVoice = primaryLabel === 'Start voice'

  const showTypeInstead =
    uiState === 'unauthenticated' ||
    uiState === 'ready' ||
    uiState === 'provider_unavailable' ||
    uiState === 'webrtc_failed' ||
    uiState === 'ended'

  const showUseDictate =
    (uiState === 'ready' || uiState === 'provider_unavailable' || uiState === 'webrtc_failed') &&
    Boolean(onUseDictate)

  const handlePrimary = () => {
    emitOrbClientDebug({ area: 'voice', event: 'voice_start_click_received', detail: { uiState } })
    emitOrbClientDebug({ area: 'voice', event: 'voice_start_handle_primary_called', detail: { uiState } })
    if (uiState === 'unauthenticated') {
      onSignIn?.()
      return
    }
    if (uiState === 'provider_unavailable' || uiState === 'webrtc_failed') {
      onTryAgain?.()
      return
    }
    onPrimary()
  }

  return (
    <div
      className={`${wrap} ${className}`.trim()}
      data-orb-voice-actions
      data-orb-voice-ui-state={uiState}
      data-orb-voice-action-surface="primary"
    >
      <button
        type="button"
        data-orb-voice-primary-action={isStartVoice ? 'start' : undefined}
        disabled={primaryDisabled && uiState !== 'unauthenticated'}
        onClick={handlePrimary}
        className={
          stack
            ? 'w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50'
            : 'rounded-full bg-gradient-to-r from-[#168bff] to-[#0d5fcc] px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 disabled:cursor-not-allowed disabled:opacity-50'
        }
      >
        {primaryLabel}
      </button>

      {showTypeInstead && onTypeInstead ? (
        <button
          type="button"
          data-orb-voice-type-instead
          onClick={onTypeInstead}
          className={
            stack
              ? 'w-full rounded-full border border-[var(--orb-line)] py-2.5 text-sm text-[var(--orb-muted)]'
              : 'rounded-full px-4 py-2 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
          }
        >
          Type instead
        </button>
      ) : null}

      {showUseDictate ? (
        <button
          type="button"
          data-orb-voice-use-dictate
          onClick={onUseDictate}
          className={
            stack
              ? 'w-full rounded-full border border-[var(--orb-line)]/60 py-2.5 text-sm text-[var(--orb-muted)]'
              : 'rounded-full border border-[var(--orb-line)] px-4 py-2 text-xs font-medium text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
          }
        >
          Use Dictate
        </button>
      ) : null}
    </div>
  )
}
