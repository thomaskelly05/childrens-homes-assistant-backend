'use client'

import { Save } from 'lucide-react'

export type OrbVoiceTranscriptActionsProps = {
  transcript: string
  onCopy: () => void | Promise<void>
  onSave?: () => void | Promise<void>
  onSendToDictate?: () => void
  onSendToOrb?: () => void | Promise<void>
  saving?: boolean
  layout?: 'stack' | 'inline'
  className?: string
}

/** Shared Voice transcript actions when user-facing text exists. */
export function OrbVoiceTranscriptActions({
  transcript,
  onCopy,
  onSave,
  onSendToDictate,
  onSendToOrb,
  saving = false,
  layout = 'stack',
  className = ''
}: OrbVoiceTranscriptActionsProps) {
  const trimmed = transcript.trim()
  if (!trimmed) return null

  const stack = layout === 'stack'
  const wrap = stack ? 'flex flex-col gap-2' : 'flex flex-wrap items-center justify-center gap-2'
  const btnStack =
    'w-full rounded-full border border-[var(--orb-line)] px-3 py-2 text-sm text-[var(--orb-foreground)]'
  const btnInline = 'rounded-full border border-[var(--orb-line)] px-4 py-2 text-xs text-[var(--orb-foreground)]'

  return (
    <div
      className={`${wrap} ${className}`.trim()}
      data-orb-voice-transcript-actions
      data-orb-voice-transcript-available="true"
    >
      <button
        type="button"
        data-orb-voice-copy-transcript
        className={stack ? btnStack : btnInline}
        onClick={() => void onCopy()}
      >
        Copy transcript
      </button>
      {onSave ? (
        <button
          type="button"
          data-orb-voice-save-to-orb
          disabled={saving}
          className={
            stack
              ? 'inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--orb-line)] bg-[var(--orb-primary-soft)]/50 px-3 py-2 text-sm font-medium text-[var(--orb-primary)] disabled:opacity-50'
              : 'inline-flex items-center gap-1.5 rounded-full border border-[var(--orb-line)] bg-[var(--orb-primary-soft)]/50 px-4 py-2 text-xs font-medium text-[var(--orb-primary)] disabled:opacity-50'
          }
          onClick={() => void onSave()}
        >
          <Save className="h-3.5 w-3.5" aria-hidden />
          {saving ? 'Saving…' : 'Save to ORB'}
        </button>
      ) : null}
      {onSendToDictate ? (
        <button
          type="button"
          data-orb-voice-to-dictate
          className={
            stack
              ? 'w-full rounded-full border border-[var(--orb-line)] bg-[var(--orb-primary-soft)] px-3 py-2 text-sm text-[var(--orb-primary)]'
              : 'rounded-full border border-[var(--orb-line)] bg-[var(--orb-primary-soft)] px-4 py-2 text-xs text-[var(--orb-primary)]'
          }
          onClick={onSendToDictate}
        >
          Send to Dictate
        </button>
      ) : null}
      {onSendToOrb ? (
        <button
          type="button"
          data-orb-voice-send-to-orb
          className={
            stack
              ? 'w-full rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/20'
              : 'rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] px-4 py-2 text-xs font-semibold text-white'
          }
          onClick={() => void onSendToOrb()}
        >
          Send to ORB chat
        </button>
      ) : null}
    </div>
  )
}
