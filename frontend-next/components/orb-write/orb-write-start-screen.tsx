'use client'

import { FileEdit, FileText, FolderOpen, PenLine, Sparkles } from 'lucide-react'

import { ORB_RECORDING_RECORD_TYPES } from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'
import { ORB_WRITE_SAFETY_COPY } from '@/lib/orb/write/orb-write-types'

const FEATURED_RECORD_TYPE_IDS = new Set([
  'general_dictation',
  'daily_record',
  'incident_report',
  'missing_from_home_record',
  'safeguarding_concern',
  'physical_intervention',
  'key_work_session',
  'manager_summary',
  'chronology_entry'
])

export function orbWriteRecordTypeOptions(): OrbRecordingRecordType[] {
  const featured = ORB_RECORDING_RECORD_TYPES.filter((r) => FEATURED_RECORD_TYPE_IDS.has(r.id))
  const rest = ORB_RECORDING_RECORD_TYPES.filter(
    (r) => !FEATURED_RECORD_TYPE_IDS.has(r.id) && r.studio_template_id
  )
  return [...featured, ...rest]
}

export function OrbWriteStartScreen({
  roughText,
  onRoughTextChange,
  selectedRecordTypeId,
  onRecordTypeChange,
  onAnalyse,
  onGenerate,
  onOpenDocument,
  onStartFromTemplate,
  onOpenSavedDraft,
  onContinueFromDictate,
  analysing,
  generating,
  hasAnalysis,
  hasDraft,
  hasLocalDraft,
  statusMessage
}: {
  roughText: string
  onRoughTextChange: (value: string) => void
  selectedRecordTypeId: string
  onRecordTypeChange: (id: string) => void
  onAnalyse: () => void
  onGenerate: () => void
  onOpenDocument?: () => void
  onStartFromTemplate?: () => void
  onOpenSavedDraft?: () => void
  onContinueFromDictate?: () => void
  analysing?: boolean
  generating?: boolean
  hasAnalysis?: boolean
  hasDraft?: boolean
  hasLocalDraft?: boolean
  statusMessage?: string | null
}) {
  const hasText = roughText.trim().length > 0
  const recordTypes = orbWriteRecordTypeOptions()

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto" data-orb-write-start-screen>
      <header className="shrink-0 space-y-1 text-center">
        <h2 className="text-xl font-semibold text-[var(--orb-foreground)]" data-orb-write-title>
          ORB Write
        </h2>
        <p className="text-sm text-[var(--orb-muted)]" data-orb-write-subtitle>
          Create, review and finalise professional residential records.
        </p>
      </header>

      <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:grid-cols-4" data-orb-write-start-options>
        <button
          type="button"
          className="flex items-center gap-2 rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-3 py-2.5 text-left text-xs hover:border-[var(--orb-primary)]/40"
          onClick={() => document.querySelector<HTMLTextAreaElement>('[data-orb-write-rough-input]')?.focus()}
          data-orb-write-option-paste
        >
          <FileEdit className="h-4 w-4 shrink-0 text-[var(--orb-primary)]" />
          <span>Paste rough record</span>
        </button>
        {onStartFromTemplate ? (
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-3 py-2.5 text-left text-xs hover:border-[var(--orb-primary)]/40"
            onClick={onStartFromTemplate}
            data-orb-write-option-template
          >
            <FileText className="h-4 w-4 shrink-0 text-[var(--orb-primary)]" />
            <span>Start from template</span>
          </button>
        ) : null}
        {onOpenSavedDraft ? (
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-3 py-2.5 text-left text-xs hover:border-[var(--orb-primary)]/40 disabled:opacity-50"
            onClick={onOpenSavedDraft}
            disabled={!hasLocalDraft}
            data-orb-write-option-saved-draft
          >
            <FolderOpen className="h-4 w-4 shrink-0 text-[var(--orb-primary)]" />
            <span>Open saved draft</span>
          </button>
        ) : null}
        {onContinueFromDictate ? (
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-3 py-2.5 text-left text-xs hover:border-[var(--orb-primary)]/40"
            onClick={onContinueFromDictate}
            data-orb-write-option-dictate
          >
            <PenLine className="h-4 w-4 shrink-0 text-[var(--orb-primary)]" />
            <span>Continue from Dictate</span>
          </button>
        ) : null}
      </div>

      <div className="shrink-0 space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
          Record type
        </label>
        <select
          value={selectedRecordTypeId}
          onChange={(e) => onRecordTypeChange(e.target.value)}
          className="w-full rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-3 py-2 text-sm text-[var(--orb-foreground)]"
          data-orb-write-record-type-selector
        >
          {recordTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>
              {rt.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-h-0 flex-1 space-y-2">
        <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
          Rough record
        </label>
        <textarea
          value={roughText}
          onChange={(e) => onRoughTextChange(e.target.value)}
          rows={10}
          placeholder="Paste your rough notes, transcript or draft record here…"
          className="min-h-[12rem] w-full resize-y rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] px-4 py-3 text-sm leading-relaxed text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--orb-primary)]/30"
          data-orb-write-rough-input
        />
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <button
          type="button"
          disabled={!hasText || analysing}
          onClick={onAnalyse}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)] px-4 py-2 text-xs font-medium text-[var(--orb-foreground)] disabled:opacity-50"
          data-orb-write-analyse
        >
          <Sparkles className="h-3.5 w-3.5" />
          {analysing ? 'Analysing…' : 'Analyse with ORB'}
        </button>
        <button
          type="button"
          disabled={!hasText || generating}
          onClick={onGenerate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--orb-primary)] px-4 py-2 text-xs font-medium text-white disabled:opacity-50"
          data-orb-write-generate
        >
          {generating ? 'Generating…' : hasAnalysis ? 'Generate Draft' : 'Generate Draft'}
        </button>
        {hasDraft && onOpenDocument ? (
          <button
            type="button"
            onClick={onOpenDocument}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-line)]/50 px-4 py-2 text-xs"
            data-orb-write-open-document
          >
            Open as Document
          </button>
        ) : null}
      </div>

      <p className="shrink-0 text-[10px] text-[var(--orb-muted)]">{ORB_WRITE_SAFETY_COPY.review}</p>
      {statusMessage ? (
        <p className="text-xs text-[var(--orb-primary)]" role="status">
          {statusMessage}
        </p>
      ) : null}
    </div>
  )
}
