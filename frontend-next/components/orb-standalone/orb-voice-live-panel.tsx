'use client'

import { Mic, MicOff, Square } from 'lucide-react'

import type { VoiceTurn } from '@/lib/orb/voice/orb-voice-types'

export type OrbVoiceLivePanelState =
  | 'listening'
  | 'user_speaking'
  | 'thinking'
  | 'speaking'
  | 'preparing'
  | 'connecting'
  | 'paused'

export function orbVoiceLivePanelStatusLabel(state: OrbVoiceLivePanelState): string {
  switch (state) {
    case 'preparing':
      return 'Preparing voice…'
    case 'connecting':
      return 'Reconnecting…'
    case 'user_speaking':
      return 'I heard that.'
    case 'thinking':
      return 'Give me a moment.'
    case 'speaking':
      return 'ORB is responding.'
    case 'paused':
      return 'Paused'
    default:
      return "I'm listening."
  }
}

export function OrbVoiceLivePanel({
  turns,
  interimTranscript,
  liveState,
  muted = false,
  pauseHint = false,
  acknowledgement,
  livePrompt,
  suggestedQuestion,
  safetyPrompt,
  bargeInFallback,
  showTurnIntoRecord = false,
  onToggleMute,
  onEnd,
  onTurnIntoRecord,
  className = ''
}: {
  turns: VoiceTurn[]
  interimTranscript?: string
  liveState: OrbVoiceLivePanelState
  muted?: boolean
  /** Shown after a long pause — encourages the adult without ending the session. */
  pauseHint?: boolean
  acknowledgement?: string | null
  livePrompt?: string | null
  suggestedQuestion?: string | null
  safetyPrompt?: string | null
  /** Browser fallback when realtime barge-in is unavailable. */
  bargeInFallback?: string | null
  showTurnIntoRecord?: boolean
  onToggleMute?: () => void
  onEnd: () => void
  onTurnIntoRecord?: () => void
  className?: string
}) {
  const dialogue = turns.filter((t) => t.role === 'user' || t.role === 'assistant')
  const stateLabel = acknowledgement?.trim() || orbVoiceLivePanelStatusLabel(liveState)
  const promptLine =
    livePrompt?.trim() ||
    (pauseHint && liveState === 'listening'
      ? "You can keep going, or I can help turn what you've said into a record."
      : null)

  return (
    <div
      className={`orb-voice-live-panel w-full space-y-3 ${className}`.trim()}
      data-orb-voice-live-panel
      data-orb-voice-mode="live"
      data-orb-voice-live-state={liveState}
    >
      <p className="text-center text-xs font-medium text-[var(--orb-muted)]" data-orb-voice-live-status>
        {stateLabel}
      </p>

      {promptLine ? (
        <p className="text-center text-[11px] leading-5 text-[var(--orb-muted)]" data-orb-voice-live-prompt>
          {promptLine}
        </p>
      ) : null}

      {safetyPrompt ? (
        <p
          className="rounded-xl border border-amber-400/25 bg-amber-500/8 px-3 py-2 text-[10px] leading-5 text-amber-900 dark:text-amber-100"
          data-orb-voice-live-safety
        >
          {safetyPrompt}
        </p>
      ) : null}

      {suggestedQuestion ? (
        <p className="text-center text-[11px] leading-5 text-[var(--orb-foreground)]/90" data-orb-voice-suggested-question>
          {suggestedQuestion}
        </p>
      ) : null}

      {bargeInFallback && liveState === 'speaking' ? (
        <p className="text-center text-[10px] text-[var(--orb-muted)]" data-orb-voice-barge-in-fallback>
          {bargeInFallback}
        </p>
      ) : null}

      <div
        className="max-h-[min(36dvh,18rem)] overflow-y-auto rounded-2xl border border-[var(--orb-line)]/25 bg-[var(--orb-surface-elevated)]/40 p-3 backdrop-blur-sm"
        data-orb-voice-live-transcript
      >
        {dialogue.length ? (
          <div className="space-y-2">
            {dialogue.map((line) => (
              <div
                key={line.id}
                className={`rounded-xl px-3 py-2 text-xs leading-5 ${
                  line.role === 'user'
                    ? 'ml-4 bg-[var(--orb-primary-soft)]/35 text-[var(--orb-foreground)]'
                    : 'mr-4 bg-[var(--orb-surface)]/80 text-[var(--orb-foreground)]'
                }`}
                data-orb-voice-transcript-turn={line.role}
              >
                <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                  {line.role === 'user' ? 'Adult' : 'ORB'}
                </span>
                <p className="mt-0.5 whitespace-pre-wrap">{line.text}</p>
              </div>
            ))}
          </div>
        ) : interimTranscript?.trim() ? (
          <p className="text-xs leading-5 text-[var(--orb-foreground)]">{interimTranscript}</p>
        ) : (
          <p className="text-xs text-[var(--orb-muted)]" data-orb-voice-live-empty>
            Start speaking when you&apos;re ready.
          </p>
        )}
        {interimTranscript?.trim() && dialogue.length ? (
          <p className="mt-2 text-[10px] italic text-[var(--orb-muted)]" data-orb-voice-interim>
            {interimTranscript}
          </p>
        ) : null}
        {pauseHint && liveState === 'listening' && !promptLine ? (
          <p className="mt-3 text-[11px] leading-5 text-[var(--orb-muted)]" data-orb-voice-pause-hint>
            Take your time.
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2" data-orb-voice-live-controls>
        {onToggleMute ? (
          <button
            type="button"
            className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full border border-[var(--orb-line)]/60 px-4 py-2 text-xs font-medium text-[var(--orb-foreground)]"
            data-orb-voice-mute-toggle
            aria-pressed={muted}
            onClick={onToggleMute}
          >
            {muted ? <MicOff className="h-3.5 w-3.5" aria-hidden /> : <Mic className="h-3.5 w-3.5" aria-hidden />}
            {muted ? 'Unmute' : 'Mute'}
          </button>
        ) : null}
        {showTurnIntoRecord && onTurnIntoRecord ? (
          <button
            type="button"
            className="inline-flex min-h-[2.75rem] items-center rounded-full border border-[var(--orb-line)]/60 px-4 py-2 text-xs font-medium text-[var(--orb-muted)]"
            data-orb-voice-live-to-record
            onClick={onTurnIntoRecord}
          >
            Turn into record
          </button>
        ) : null}
        <button
          type="button"
          className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full bg-gradient-to-r from-[var(--orb-primary-blue,#168bff)] to-[var(--orb-primary-blue-2,#0d5fcc)] px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-sky-500/20"
          data-orb-voice-end
          onClick={onEnd}
        >
          <Square className="h-3 w-3 fill-current" aria-hidden />
          End
        </button>
      </div>
    </div>
  )
}
