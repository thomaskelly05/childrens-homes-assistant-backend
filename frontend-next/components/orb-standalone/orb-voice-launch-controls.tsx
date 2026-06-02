'use client'

import { Square } from 'lucide-react'

import type { OrbVoiceLaunchMode, OrbVoiceLaunchUiState } from '@/lib/orb/voice/orb-voice-launch-mode'
import { orbVoiceLaunchPrimaryLabel } from '@/lib/orb/voice/orb-voice-launch-mode'

export function OrbVoiceLaunchControls({
  launchMode,
  launchUiState,
  pushToTalk = true,
  transcript = '',
  primaryDisabled = false,
  onPrimary,
  onSendToOrb,
  onSendToDictate,
  onCancel,
  onOpenSettings
}: {
  launchMode: OrbVoiceLaunchMode
  launchUiState: OrbVoiceLaunchUiState
  pushToTalk?: boolean
  transcript?: string
  primaryDisabled?: boolean
  onPrimary: () => void
  onSendToOrb?: (text: string) => void
  onSendToDictate?: (text: string) => void
  onCancel?: () => void
  onOpenSettings?: () => void
}) {
  if (launchMode !== 'browser_ptt') return null

  const trimmed = transcript.trim()
  const showSendActions = Boolean(trimmed) && launchUiState === 'ready'

  return (
    <div className="flex w-full max-w-sm flex-col gap-2" data-orb-voice-launch-controls data-orb-voice-launch-mode={launchMode}>
      {showSendActions ? (
        <>
          {onSendToOrb ? (
            <button
              type="button"
              data-orb-voice-send-to-orb
              className="w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20"
              onClick={() => onSendToOrb(trimmed)}
            >
              Send to ORB
            </button>
          ) : null}
          {onSendToDictate ? (
            <button
              type="button"
              data-orb-voice-to-dictate
              className="w-full rounded-full border border-[var(--orb-line)] bg-[var(--orb-primary-soft)]/40 py-2.5 text-sm font-medium text-[var(--orb-primary)]"
              onClick={() => onSendToDictate(trimmed)}
            >
              Send to Dictate
            </button>
          ) : null}
        </>
      ) : null}

      <button
        type="button"
        data-orb-voice-ptt-primary
        disabled={primaryDisabled && launchUiState === 'ready'}
        onClick={onPrimary}
        className="w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {orbVoiceLaunchPrimaryLabel(launchUiState, { pushToTalk, listening: launchUiState === 'listening' })}
      </button>

      {launchUiState === 'listening' || launchUiState === 'transcribing' ? (
        <button
          type="button"
          data-orb-voice-cancel-capture
          onClick={onCancel}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--orb-line)] py-2.5 text-sm text-[var(--orb-muted)]"
        >
          <Square className="h-3.5 w-3.5 fill-current" aria-hidden />
          Stop
        </button>
      ) : null}

      {onOpenSettings ? (
        <button
          type="button"
          data-orb-voice-settings-shortcut
          onClick={onOpenSettings}
          className="w-full rounded-full border border-[var(--orb-line)]/60 py-2 text-xs text-[var(--orb-muted)]"
        >
          Voice settings
        </button>
      ) : null}
    </div>
  )
}
