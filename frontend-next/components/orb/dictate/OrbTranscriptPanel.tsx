'use client'

import { Mic, Pause, Play, Square, Trash2 } from 'lucide-react'

import { GlassOrbMark } from '@/components/orb-residential/ui/glass-orb-mark'
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
  captureStarting,
  timerSec,
  formatTimer,
  micStatus,
  orbClass,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onClearTranscript,
  speechStartDisabled,
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
  captureStarting: boolean
  timerSec: number
  formatTimer: (s: number) => string
  micStatus: string
  orbClass: string
  onStartRecording: () => void
  onPauseRecording: () => void
  onResumeRecording: () => void
  onStopRecording: () => void
  onClearTranscript: () => void
  speechStartDisabled?: boolean
  interimText?: string
}) {
  const displayText = liveTranscript || transcript

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-orb-transcript-panel>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--orb-line)]/40 px-3 py-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Live Transcript</h3>
        <div className="flex items-center gap-2 text-[10px] text-[var(--orb-muted)]" data-orb-dictate-timer>
          <span data-orb-dictate-recording-status>{recordingActive ? (recordingPaused ? 'Paused' : 'Recording') : 'Ready'}</span>
          <span>{formatTimer(timerSec)}</span>
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)]/30 px-3 py-2">
        <GlassOrbMark className={orbClass} variant="avatar" />
        <p className="flex-1 text-xs text-[var(--orb-foreground)]">{micStatus}</p>
        <div className="flex gap-1">
          {!recordingActive && !captureStarting ? (
            <button
              type="button"
              data-orb-dictate-record-start
              className="inline-flex items-center gap-1 rounded-full bg-[var(--orb-primary-soft)] px-3 py-1.5 text-xs font-medium text-[var(--orb-foreground)] disabled:opacity-50"
              disabled={speechStartDisabled}
              onClick={onStartRecording}
            >
              <Mic className="h-3.5 w-3.5" /> Record
            </button>
          ) : captureStarting ? (
            <span className="text-xs text-[var(--orb-muted)]">Starting…</span>
          ) : (
            <>
              {recordingPaused ? (
                <button type="button" className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]" onClick={onResumeRecording} aria-label="Resume">
                  <Play className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]" onClick={onPauseRecording} aria-label="Pause">
                  <Pause className="h-4 w-4" />
                </button>
              )}
              <button type="button" className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]" onClick={onStopRecording} aria-label="Stop">
                <Square className="h-4 w-4" />
              </button>
            </>
          )}
          <button type="button" className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]" onClick={onClearTranscript} aria-label="Clear">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <textarea
          data-orb-dictate-live-transcript
          value={displayText}
          onChange={(e) => onTranscriptChange(e.target.value)}
          placeholder="Live transcript appears here… Speak or paste rough notes. Edit before finalising."
          className="h-full min-h-[8rem] w-full resize-none rounded-lg border border-[var(--orb-line)]/40 bg-[var(--orb-surface)] p-3 text-sm text-[var(--orb-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--orb-primary)]/40"
        />
        {interimText && recordingActive ? (
          <p className="mt-1 text-xs italic text-[var(--orb-muted)]" data-orb-dictate-interim>
            {interimText}
          </p>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-[var(--orb-line)]/30 px-3 py-2">
        <p className="text-[10px] text-[var(--orb-muted)]" data-orb-dictate-speaker-boundary>
          {SPEAKER_BOUNDARY_COPY}
        </p>
        <OrbDictateTranscriptSegmentsEditor segments={segments} participants={participants} onChange={onSegmentsChange} />
      </div>
    </div>
  )
}
