'use client'

import { Maximize2, Mic, Minimize2, Pause, PenLine, Play, Sparkles, Square } from 'lucide-react'

import { OrbDictatePanelLayoutControl } from '@/components/orb/dictate/OrbDictatePanelLayoutControl'
import { OrbDictateTemplateSelector } from '@/components/orb/dictate/OrbDictateTemplateSelector'
import type { OrbDictatePanelLayout } from '@/lib/orb/dictate/orb-dictate-panel-layout'
import type { OrbDictateStudioTemplate } from '@/lib/orb/dictate/orb-dictate-studio-templates'

export type OrbDictatePrimaryAction = 'analyse' | 'generate' | 'disabled'

function primaryActionLabel(action: OrbDictatePrimaryAction, generating: boolean): string {
  if (generating) return 'Working…'
  if (action === 'analyse') return 'Review with ORB'
  if (action === 'generate') return 'Create draft record'
  return 'Review with ORB'
}

function primaryActionHint(action: OrbDictatePrimaryAction, hasTranscript: boolean): string {
  if (!hasTranscript) return 'Add speech or notes to activate ORB review'
  if (action === 'analyse') return 'Check what may be missing before drafting'
  if (action === 'generate') return 'Prepare a safer record from your notes and review'
  return 'Add speech or notes to activate ORB review'
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
  hasDraft,
  primaryAction,
  speechStartDisabled,
  focusMode,
  onToggleFocusMode,
  panelLayout,
  onPanelLayoutChange
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
  hasAnalysis?: boolean
  hasDraft: boolean
  primaryAction: OrbDictatePrimaryAction
  speechStartDisabled?: boolean
  focusMode?: boolean
  onToggleFocusMode?: () => void
  panelLayout?: OrbDictatePanelLayout
  onPanelLayoutChange?: (layout: OrbDictatePanelLayout) => void
}) {
  const recordingLabel = recordingActive ? (recordingPaused ? 'Paused' : 'Recording') : 'Ready'
  const primaryDisabled = generating || primaryAction === 'disabled'
  const primaryLabel = primaryActionLabel(primaryAction, generating)
  const writeDisabled = !hasDraft

  return (
    <header
      className="orb-dictate-top-bar orb-dictate-recorder-bar sticky top-0 z-10 shrink-0 border-b border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)]/95 py-1.5 backdrop-blur-sm"
      data-orb-dictate-top-bar
      data-orb-dictate-recorder-bar
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 items-start gap-2">
          <h2
            className="hidden shrink-0 pt-1 text-sm font-semibold tracking-tight text-[var(--orb-foreground)] sm:block"
            data-orb-dictate-title
          >
            ORB Dictate
          </h2>
          <OrbDictateTemplateSelector
            selectedTemplateId={selectedTemplateId}
            onTemplateChange={onTemplateChange}
            variant="compact"
          />
        </div>

        <div
          className="flex items-center gap-1.5 rounded-full border border-[var(--orb-line)]/45 bg-[var(--orb-surface)] px-2.5 py-0.5 text-[11px]"
          data-orb-dictate-recording-status
        >
          <span
            className={`inline-flex h-1.5 w-1.5 rounded-full ${
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

        <div className="flex flex-wrap items-center gap-1.5 sm:ml-auto">
          {!recordingActive && !captureStarting ? (
            <button
              type="button"
              data-orb-dictate-top-record
              className="orb-dictate-hero-record inline-flex h-9 items-center gap-1.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 px-3.5 text-xs font-bold text-slate-950 shadow-md shadow-sky-500/15 transition hover:brightness-105 disabled:opacity-50"
              disabled={speechStartDisabled}
              onClick={onStartRecording}
            >
              <Mic className="h-4 w-4" aria-hidden />
              Record
            </button>
          ) : captureStarting ? (
            <div
              className="inline-flex h-9 items-center rounded-xl border border-[var(--orb-line)]/50 px-3 text-xs text-[var(--orb-muted)]"
              data-orb-dictate-top-record
            >
              Starting…
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                type="button"
                data-orb-dictate-top-record
                className="orb-dictate-hero-record orb-dictate-hero-record--active inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-400/50 bg-red-500/15 px-3 text-xs font-bold text-red-100"
                onClick={onStopRecording}
              >
                <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-red-400" aria-hidden />
                {formatTimer(timerSec)}
              </button>
              {recordingPaused ? (
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--orb-line)]/50 hover:bg-[var(--orb-surface-hover)]"
                  onClick={onResumeRecording}
                  aria-label="Resume recording"
                >
                  <Play className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--orb-line)]/50 hover:bg-[var(--orb-surface-hover)]"
                  onClick={onPauseRecording}
                  aria-label="Pause recording"
                >
                  <Pause className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--orb-line)]/50 hover:bg-[var(--orb-surface-hover)]"
                onClick={onStopRecording}
                aria-label="Stop recording"
              >
                <Square className="h-4 w-4" />
              </button>
            </div>
          )}

          <button
            type="button"
            data-orb-dictate-generate
            data-orb-dictate-primary-action={primaryAction}
            disabled={primaryDisabled}
            title={primaryActionHint(primaryAction, hasTranscript)}
            className="inline-flex h-9 items-center gap-1 rounded-xl border border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)] px-3 text-xs font-semibold text-[var(--orb-foreground)] disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onPrimaryAction}
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{primaryLabel}</span>
            <span className="sm:hidden">Review</span>
          </button>

          <button
            type="button"
            data-orb-dictate-finalise
            disabled={writeDisabled}
            title={writeButtonHint(hasDraft)}
            className="inline-flex h-9 items-center gap-1 rounded-xl bg-[var(--orb-primary)] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onFinalise}
          >
            <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="hidden md:inline">Open in ORB Write</span>
            <span className="md:hidden">Write</span>
          </button>

          {onToggleFocusMode ? (
            <button
              type="button"
              data-orb-dictate-focus-mode
              aria-pressed={focusMode}
              title={focusMode ? 'Exit focus mode' : 'Focus mode'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--orb-line)]/45 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)]"
              onClick={onToggleFocusMode}
            >
              {focusMode ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </button>
          ) : null}

          {panelLayout && onPanelLayoutChange ? (
            <OrbDictatePanelLayoutControl layout={panelLayout} onLayoutChange={onPanelLayoutChange} />
          ) : null}
        </div>
      </div>
    </header>
  )
}
