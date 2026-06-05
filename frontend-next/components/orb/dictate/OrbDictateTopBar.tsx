'use client'

import { Mic, Pause, Play, PenLine, Shield, Square } from 'lucide-react'

import {
  ORB_DICTATE_STUDIO_TEMPLATES,
  type OrbDictateStudioTemplate
} from '@/lib/orb/dictate/orb-dictate-studio-templates'
import { ORB_WRITE_PRIVACY_NOTICE, ORB_WRITE_SAFETY_COPY } from '@/lib/orb/write/orb-write-types'

export function OrbDictateTopBar({
  selectedTemplateId,
  onTemplateChange,
  recordingActive,
  recordingPaused,
  captureStarting,
  timerSec,
  formatTimer,
  onStartRecording,
  onPauseRecording,
  onResumeRecording,
  onStopRecording,
  onGenerate,
  onFinalise,
  generating,
  canGenerate,
  canFinalise,
  speechStartDisabled
}: {
  selectedTemplateId: string
  onTemplateChange: (template: OrbDictateStudioTemplate) => void
  recordingActive: boolean
  recordingPaused: boolean
  captureStarting: boolean
  timerSec: number
  formatTimer: (s: number) => string
  onStartRecording: () => void
  onPauseRecording: () => void
  onResumeRecording: () => void
  onStopRecording: () => void
  onGenerate: () => void
  onFinalise: () => void
  generating: boolean
  canGenerate: boolean
  canFinalise: boolean
  speechStartDisabled?: boolean
}) {
  const selected = ORB_DICTATE_STUDIO_TEMPLATES.find((t) => t.id === selectedTemplateId)

  return (
    <header className="shrink-0 space-y-2 border-b border-[var(--orb-line)]/40 pb-3" data-orb-dictate-top-bar>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[var(--orb-foreground)]" data-orb-dictate-title>
            ORB Dictate
          </h2>
          {selected ? (
            <p className="text-xs text-[var(--orb-muted)]" data-orb-dictate-selected-template>
              {selected.label}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="flex items-center gap-2 rounded-full border border-[var(--orb-line)]/50 bg-[var(--orb-surface)] px-3 py-1.5 text-xs"
            data-orb-dictate-recording-status
          >
            <Shield className="h-3.5 w-3.5 text-[var(--orb-primary)]" aria-hidden />
            <span data-orb-dictate-timer>{formatTimer(timerSec)}</span>
            <span className="text-[var(--orb-muted)]">
              {recordingActive ? (recordingPaused ? 'Paused' : 'Recording') : 'Ready'}
            </span>
          </div>

          {!recordingActive && !captureStarting ? (
            <button
              type="button"
              data-orb-dictate-top-record
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-sky-500 to-blue-600 px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
              disabled={speechStartDisabled}
              onClick={onStartRecording}
            >
              <Mic className="h-4 w-4" /> Record
            </button>
          ) : captureStarting ? (
            <span className="text-sm text-[var(--orb-muted)]">Starting…</span>
          ) : (
            <div className="flex items-center gap-1">
              {recordingPaused ? (
                <button type="button" className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]" onClick={onResumeRecording} aria-label="Resume">
                  <Play className="h-5 w-5" />
                </button>
              ) : (
                <button type="button" className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]" onClick={onPauseRecording} aria-label="Pause">
                  <Pause className="h-5 w-5" />
                </button>
              )}
              <button type="button" className="rounded-full p-2 hover:bg-[var(--orb-surface-hover)]" onClick={onStopRecording} aria-label="Stop">
                <Square className="h-5 w-5" />
              </button>
            </div>
          )}

          <button
            type="button"
            data-orb-dictate-generate
            disabled={generating || !canGenerate}
            className="rounded-full border border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)] px-4 py-2 text-sm font-medium text-[var(--orb-foreground)] disabled:opacity-50"
            onClick={onGenerate}
          >
            {generating ? 'Generating…' : 'Generate notes'}
          </button>

          <button
            type="button"
            data-orb-dictate-finalise
            disabled={!canFinalise}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--orb-primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            onClick={onFinalise}
          >
            <PenLine className="h-4 w-4" />
            Open in ORB Write
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2" data-orb-dictate-template-selector>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Template</span>
        {ORB_DICTATE_STUDIO_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            data-orb-dictate-template={template.id}
            aria-pressed={selectedTemplateId === template.id}
            className={`rounded-lg border px-2.5 py-1 text-[11px] transition ${
              selectedTemplateId === template.id
                ? 'border-[var(--orb-primary)]/50 bg-[var(--orb-primary-soft)] text-[var(--orb-foreground)]'
                : 'border-[var(--orb-line)]/50 text-[var(--orb-muted)] hover:text-[var(--orb-foreground)]'
            }`}
            onClick={() => onTemplateChange(template)}
          >
            {template.label}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-[var(--orb-line)]/40 bg-[var(--orb-surface)]/60 px-3 py-2 text-[10px] leading-relaxed text-[var(--orb-muted)]" data-orb-dictate-privacy-banner>
        <p data-orb-dictate-privacy-notice>{ORB_WRITE_PRIVACY_NOTICE}</p>
        <p className="mt-1" data-orb-dictate-safety-review>{ORB_WRITE_SAFETY_COPY.review}</p>
        <p data-orb-dictate-safety-judgement>{ORB_WRITE_SAFETY_COPY.judgement}</p>
        <p data-orb-dictate-safety-responsibility>{ORB_WRITE_SAFETY_COPY.responsibility}</p>
      </div>
    </header>
  )
}
