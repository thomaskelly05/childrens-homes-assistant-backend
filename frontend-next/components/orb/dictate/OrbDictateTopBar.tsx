'use client'

import { Maximize2, Mic, Minimize2, Pause, PenLine, Play, Sparkles, Square } from 'lucide-react'

import { OrbDictatePrivacyStrip } from '@/components/orb/dictate/OrbDictatePrivacyStrip'
import { OrbDictateTemplateSelector } from '@/components/orb/dictate/OrbDictateTemplateSelector'
import {
  templateById,
  type OrbDictateStudioTemplate
} from '@/lib/orb/dictate/orb-dictate-studio-templates'

export type OrbDictatePrimaryAction = 'analyse' | 'generate' | 'disabled'

function primaryActionLabel(action: OrbDictatePrimaryAction, generating: boolean): string {
  if (generating) return 'Working…'
  if (action === 'analyse') return 'Analyse with ORB'
  if (action === 'generate') return 'Generate draft'
  return 'Analyse with ORB'
}

function primaryActionHint(action: OrbDictatePrimaryAction, hasTranscript: boolean): string {
  if (!hasTranscript) return 'Record or paste a transcript first'
  if (action === 'analyse') return 'Review transcript quality and safeguarding before drafting'
  if (action === 'generate') return 'Create a draft record from your transcript and analysis'
  return 'Add a transcript to continue'
}

function writeButtonHint(hasDraft: boolean): string {
  if (hasDraft) return 'Open your draft in ORB Write for final review and export'
  return 'Generate a draft first — ORB Write opens once a draft is ready'
}

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
  onPrimaryAction,
  onFinalise,
  generating,
  hasTranscript,
  hasAnalysis,
  hasDraft,
  primaryAction,
  speechStartDisabled,
  focusMode,
  onToggleFocusMode
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
  onPrimaryAction: () => void
  onFinalise: () => void
  generating: boolean
  hasTranscript: boolean
  hasAnalysis: boolean
  hasDraft: boolean
  primaryAction: OrbDictatePrimaryAction
  speechStartDisabled?: boolean
  focusMode?: boolean
  onToggleFocusMode?: () => void
}) {
  const selected = templateById(selectedTemplateId)
  const recordingLabel = recordingActive ? (recordingPaused ? 'Paused' : 'Recording') : 'Ready'
  const primaryDisabled = generating || primaryAction === 'disabled'
  const primaryLabel = primaryActionLabel(primaryAction, generating)
  const writeDisabled = !hasDraft

  return (
    <header
      className="orb-dictate-top-bar sticky top-0 z-10 shrink-0 space-y-2 border-b border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/95 pb-2 pt-0 backdrop-blur-sm"
      data-orb-dictate-top-bar
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold tracking-tight text-[var(--orb-foreground)]" data-orb-dictate-title>
            ORB Dictate
          </h2>
          {selected ? (
            <p className="truncate text-xs text-[var(--orb-muted)]" data-orb-dictate-selected-template>
              {selected.label}
            </p>
          ) : null}
        </div>

        <div
          className="flex items-center gap-2 rounded-full border border-[var(--orb-line)]/45 bg-[var(--orb-surface)] px-3 py-1 text-xs"
          data-orb-dictate-recording-status
        >
          <span
            className={`inline-flex h-2 w-2 rounded-full ${
              recordingActive && !recordingPaused
                ? 'animate-pulse bg-red-400'
                : recordingPaused
                  ? 'bg-amber-400'
                  : 'bg-emerald-400/80'
            }`}
            aria-hidden
          />
          <span className="font-medium text-[var(--orb-foreground)]">{recordingLabel}</span>
          <span className="tabular-nums text-[var(--orb-muted)]" data-orb-dictate-timer>
            {formatTimer(timerSec)}
          </span>
        </div>

        {onToggleFocusMode ? (
          <button
            type="button"
            data-orb-dictate-focus-mode
            aria-pressed={focusMode}
            title={focusMode ? 'Exit focus mode' : 'Focus mode — maximise workspace'}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--orb-line)]/45 text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
            onClick={onToggleFocusMode}
          >
            {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {!recordingActive && !captureStarting ? (
            <button
              type="button"
              data-orb-dictate-top-record
              className="orb-dictate-hero-record inline-flex min-h-[2.75rem] flex-1 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-sky-500 to-blue-600 px-5 py-2.5 text-sm font-bold text-slate-950 shadow-lg shadow-sky-500/20 transition hover:brightness-105 disabled:opacity-50 sm:max-w-[14rem] sm:flex-none"
              disabled={speechStartDisabled}
              onClick={onStartRecording}
            >
              <Mic className="h-5 w-5" aria-hidden />
              Record
            </button>
          ) : captureStarting ? (
            <div
              className="inline-flex min-h-[2.75rem] flex-1 items-center justify-center rounded-2xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface)] px-5 text-sm text-[var(--orb-muted)] sm:max-w-[14rem] sm:flex-none"
              data-orb-dictate-top-record
            >
              Starting microphone…
            </div>
          ) : (
            <div className="flex flex-1 items-center gap-2 sm:max-w-[14rem] sm:flex-none">
              <button
                type="button"
                data-orb-dictate-top-record
                className="orb-dictate-hero-record orb-dictate-hero-record--active inline-flex min-h-[2.75rem] flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-red-400/60 bg-red-500/15 px-4 py-2 text-sm font-bold text-red-100"
                onClick={onStopRecording}
              >
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-red-400" aria-hidden />
                {formatTimer(timerSec)}
              </button>
              {recordingPaused ? (
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--orb-line)]/50 hover:bg-[var(--orb-surface-hover)]"
                  onClick={onResumeRecording}
                  aria-label="Resume recording"
                >
                  <Play className="h-5 w-5" />
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--orb-line)]/50 hover:bg-[var(--orb-surface-hover)]"
                  onClick={onPauseRecording}
                  aria-label="Pause recording"
                >
                  <Pause className="h-5 w-5" />
                </button>
              )}
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--orb-line)]/50 hover:bg-[var(--orb-surface-hover)]"
                onClick={onStopRecording}
                aria-label="Stop recording"
              >
                <Square className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <button
            type="button"
            data-orb-dictate-generate
            data-orb-dictate-primary-action={primaryAction}
            disabled={primaryDisabled}
            title={primaryActionHint(primaryAction, hasTranscript)}
            className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl border border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)] px-4 py-2 text-sm font-semibold text-[var(--orb-foreground)] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onPrimaryAction}
          >
            <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
            {primaryLabel}
          </button>

          <button
            type="button"
            data-orb-dictate-finalise
            disabled={writeDisabled}
            title={writeButtonHint(hasDraft)}
            className="inline-flex min-h-[2.5rem] items-center gap-1.5 rounded-xl bg-[var(--orb-primary)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onFinalise}
          >
            <PenLine className="h-4 w-4 shrink-0" aria-hidden />
            Open in ORB Write
          </button>
        </div>
      </div>

      {!hasTranscript ? (
        <p className="text-[11px] text-[var(--orb-muted)]" data-orb-dictate-action-hint>
          Record or paste a transcript to enable Analyse and Generate.
        </p>
      ) : !hasDraft ? (
        <p className="text-[11px] text-[var(--orb-muted)]" data-orb-dictate-action-hint>
          {hasAnalysis
            ? 'Analysis ready — generate a draft, then open in ORB Write.'
            : 'Analyse your transcript, then generate a draft for ORB Write.'}
        </p>
      ) : null}

      <OrbDictateTemplateSelector selectedTemplateId={selectedTemplateId} onTemplateChange={onTemplateChange} />
      <OrbDictatePrivacyStrip />
    </header>
  )
}
