'use client'

import { Mic, Trash2 } from 'lucide-react'

import { OrbDictateTranscriptSegmentsEditor } from '@/components/orb-standalone/orb-dictate-station-extras'
import type { OrbDictateParticipant, OrbDictateTranscriptSegment } from '@/lib/orb/dictate/orb-dictate-speaker'
import { SPEAKER_BOUNDARY_COPY } from '@/lib/orb/dictate/orb-dictate-speaker'

export function OrbTranscriptPanel({
  liveTranscript,
  transcript,
  onTranscriptChange,
  segments,
  participants,
  onSegmentsChange,
  recordingActive,
  recordingPaused,
  timerSec,
  formatTimer,
  micStatus,
  onClearTranscript,
  interimText
}: {
  liveTranscript: string
  transcript: string
  onTranscriptChange: (value: string) => void
  segments: OrbDictateTranscriptSegment[]
  participants: OrbDictateParticipant[]
  onSegmentsChange: (segments: OrbDictateTranscriptSegment[]) => void
  recordingActive: boolean
  recordingPaused: boolean
  timerSec: number
  formatTimer: (s: number) => string
  micStatus: string
  onClearTranscript: () => void
  interimText?: string
}) {
  const displayText = liveTranscript || transcript
  const isEmpty = !displayText.trim()

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-orb-transcript-panel>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--orb-line)]/40 px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-[var(--orb-foreground)]">Live Transcript</h3>
          <p className="mt-0.5 text-[11px] text-[var(--orb-muted)]" data-orb-dictate-recording-status>
            {recordingActive ? (recordingPaused ? 'Paused' : 'Recording') : 'Ready to capture'}
            {recordingActive ? ` · ${formatTimer(timerSec)}` : ''}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/45 px-2.5 py-1.5 text-[11px] text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] disabled:opacity-40"
          onClick={onClearTranscript}
          disabled={isEmpty && !recordingActive}
          aria-label="Clear transcript"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">
        {isEmpty && !recordingActive ? (
          <div
            className="mb-3 flex shrink-0 flex-col items-center rounded-xl border border-dashed border-[var(--orb-line)]/45 bg-[var(--orb-surface)]/40 px-6 py-5 text-center"
            data-orb-dictate-transcript-empty
          >
            <Mic className="mb-2 h-7 w-7 text-[var(--orb-primary)]/70" aria-hidden />
            <p className="text-sm font-medium text-[var(--orb-foreground)]">Start with speech or paste</p>
            <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-[var(--orb-muted)]">
              Press Record in the top bar, or paste rough notes in the editor below.
            </p>
          </div>
        ) : null}

        <textarea
          data-orb-dictate-live-transcript
          value={displayText}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Live transcript appears here… Speak or paste rough notes. Edit before finalising."
          className="min-h-[12rem] w-full flex-1 resize-none rounded-xl border border-[var(--orb-line)]/40 bg-[var(--orb-surface)] p-4 text-sm leading-relaxed text-[var(--orb-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--orb-primary)]/35"
        />
        {interimText && recordingActive ? (
          <p className="mt-2 text-xs italic text-[var(--orb-muted)]" data-orb-dictate-interim>
            {interimText}
          </p>
        ) : null}
        {!isEmpty || recordingActive ? (
          <p className="mt-2 text-[11px] text-[var(--orb-muted)]">{micStatus}</p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-[var(--orb-line)]/25 px-4 py-2.5">
        <p className="text-[10px] leading-relaxed text-[var(--orb-muted)]/80" data-orb-dictate-speaker-boundary>
          {SPEAKER_BOUNDARY_COPY}
        </p>
        {segments.length ? (
          <div className="mt-2">
            <OrbDictateTranscriptSegmentsEditor
              segments={segments}
              participants={participants}
              onChange={onSegmentsChange}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
