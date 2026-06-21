'use client'

import { Mic, MicOff, Square } from 'lucide-react'

import { OrbVoiceConversationPanel } from '@/components/orb-residential/OrbVoiceConversationPanel'
import { ORB_VOICE_END_AND_SUMMARISE } from '@/lib/orb/voice/orb-voice-reflective-copy'
import {
  ORB_VOICE_PAUSE_CONVERSATION,
  ORB_VOICE_RESET_CONVERSATION,
  ORB_VOICE_STOP_ORB
} from '@/lib/orb/voice/orb-voice-human-conversation'
import type { VoiceTurn } from '@/lib/orb/voice/orb-voice-types'

export type OrbVoiceLivePanelState =
  | 'listening'
  | 'user_speaking'
  | 'thinking'
  | 'speaking'
  | 'preparing'
  | 'connecting'
  | 'paused'

export function orbVoiceLivePanelStatusLabel(
  state: OrbVoiceLivePanelState,
  progressStage?: 'opening_mic' | 'listening_local' | 'connecting_orb' | null
): string {
  if (state === 'preparing' && progressStage === 'connecting_orb') return 'Connecting ORB voice…'
  if (state === 'preparing' && progressStage === 'opening_mic') return 'Opening microphone…'
  if (state === 'connecting') return 'Connecting ORB voice…'
  switch (state) {
    case 'preparing':
      return 'Opening microphone…'
    case 'user_speaking':
      return 'I heard that.'
    case 'thinking':
      return 'Thinking with you…'
    case 'speaking':
      return 'ORB is responding…'
    case 'paused':
      return 'Paused'
    default:
      return 'Listening…'
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
  onPause,
  onReset,
  onStopOrb,
  showStopOrb = false,
  statusLabelOverride,
  listeningSeconds = 0,
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
  onPause?: () => void
  onReset?: () => void
  onStopOrb?: () => void
  showStopOrb?: boolean
  statusLabelOverride?: string | null
  /** Elapsed seconds while listening — shown when &gt; 0 */
  listeningSeconds?: number
  className?: string
}) {
  const dialogue = turns.filter((t) => t.role === 'user' || t.role === 'assistant')
  const stateLabel =
    statusLabelOverride?.trim() || acknowledgement?.trim() || orbVoiceLivePanelStatusLabel(liveState)
  const promptLine =
    livePrompt?.trim() ||
    (pauseHint && liveState === 'listening'
      ? "You can keep going, or end when you're ready for a reviewable summary."
      : null)
  const showConversation = dialogue.length > 0 || Boolean(interimTranscript?.trim())

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

      {(liveState === 'listening' || liveState === 'user_speaking') && listeningSeconds > 0 ? (
        <p className="text-center text-[11px] tabular-nums text-[var(--orb-muted)]" data-orb-voice-listening-timer>
          {Math.floor(listeningSeconds / 60)}:{String(listeningSeconds % 60).padStart(2, '0')}
        </p>
      ) : null}

      {promptLine ? (
        <p className="text-center text-[11px] leading-5 text-[var(--orb-muted)]" data-orb-voice-live-prompt>
          {promptLine}
        </p>
      ) : null}

      {showConversation ? (
        <OrbVoiceConversationPanel turns={turns} interimTranscript={interimTranscript} />
      ) : (
        <div
          className="rounded-2xl border border-[var(--orb-line)]/25 bg-[var(--orb-surface-elevated)]/40 p-3 text-center"
          data-orb-voice-live-empty
        >
          <p className="text-xs text-[var(--orb-muted)]">Start speaking when you&apos;re ready.</p>
          {pauseHint && liveState === 'listening' && !promptLine ? (
            <p className="mt-3 text-[11px] leading-5 text-[var(--orb-muted)]" data-orb-voice-pause-hint>
              Take your time.
            </p>
          ) : null}
        </div>
      )}

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

      <div className="flex flex-wrap items-center justify-center gap-2" data-orb-voice-live-controls>
        {showStopOrb && onStopOrb ? (
          <button
            type="button"
            className="inline-flex min-h-[2.75rem] items-center gap-1.5 rounded-full border border-[var(--orb-line)]/60 px-4 py-2 text-xs font-medium text-[var(--orb-foreground)]"
            data-orb-voice-stop-orb
            aria-label={ORB_VOICE_STOP_ORB}
            onClick={onStopOrb}
          >
            {ORB_VOICE_STOP_ORB}
          </button>
        ) : null}
        {onPause ? (
          <button
            type="button"
            className="inline-flex min-h-[2.75rem] items-center rounded-full border border-[var(--orb-line)]/60 px-4 py-2 text-xs font-medium text-[var(--orb-muted)]"
            data-orb-voice-pause-conversation
            onClick={onPause}
          >
            {ORB_VOICE_PAUSE_CONVERSATION}
          </button>
        ) : null}
        {onReset ? (
          <button
            type="button"
            className="inline-flex min-h-[2.75rem] items-center rounded-full border border-[var(--orb-line)]/60 px-4 py-2 text-xs font-medium text-[var(--orb-muted)]"
            data-orb-voice-reset-conversation
            onClick={onReset}
          >
            {ORB_VOICE_RESET_CONVERSATION}
          </button>
        ) : null}
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
          data-orb-voice-end-and-summarise
          onClick={onEnd}
        >
          <Square className="h-3 w-3 fill-current" aria-hidden />
          {ORB_VOICE_END_AND_SUMMARISE}
        </button>
      </div>
    </div>
  )
}
