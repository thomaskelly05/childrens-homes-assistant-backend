'use client'

import { FileEdit, FileText, FolderOpen, PenLine, Sparkles } from 'lucide-react'

import {
  OrbStudioActionRail,
  OrbStudioComposerCard,
  OrbStudioHero,
  OrbStudioPrimaryAction
} from '@/components/orb/premium'
import { ORB_RECORDING_RECORD_TYPES } from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'
import { ORB_WRITE_SAFETY_COPY } from '@/lib/orb/write/orb-write-types'

const FEATURED_RECORD_TYPE_IDS = new Set([
  'general_dictation',
  'daily_record',
  'incident_report',
  'handover',
  'key_work_session',
  'chronology_entry',
  'safeguarding_concern',
  'behaviour_reflection',
  'supervision_preparation',
  'manager_summary',
  'reg_44_evidence_summary',
  'reg_45_reflection',
  'action_plan'
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
      <OrbStudioHero
        title="ORB Write"
        subtitle="Create, review and finalise professional residential records."
        icon={<FileEdit className="h-5 w-5" />}
        compact
      />

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" data-orb-write-start-options>
        <button
          type="button"
          className="orb-studio-source-card rounded-xl border border-[var(--orb-v2-glass-border,var(--orb-line))]/45 bg-[var(--orb-v2-glass-surface,rgba(255,255,255,0.82))] p-3 text-left transition hover:border-[var(--orb-v2-glass-border-strong,rgba(22,119,255,0.22))]"
          onClick={() => document.querySelector<HTMLTextAreaElement>('[data-orb-write-rough-input]')?.focus()}
          data-orb-write-option-paste
        >
          <span className="flex items-center gap-2 text-xs font-medium text-[var(--orb-foreground)]">
            <FileEdit className="h-4 w-4 text-[var(--orb-primary)]" aria-hidden />
            Paste rough record
          </span>
        </button>
        {onStartFromTemplate ? (
          <button
            type="button"
            className="orb-studio-source-card rounded-xl border border-[var(--orb-v2-glass-border,var(--orb-line))]/45 bg-[var(--orb-v2-glass-surface,rgba(255,255,255,0.82))] p-3 text-left transition hover:border-[var(--orb-v2-glass-border-strong,rgba(22,119,255,0.22))]"
            onClick={onStartFromTemplate}
            data-orb-write-option-template
          >
            <span className="flex items-center gap-2 text-xs font-medium text-[var(--orb-foreground)]">
              <FileText className="h-4 w-4 text-[var(--orb-primary)]" aria-hidden />
              Start from template
            </span>
          </button>
        ) : null}
        {onOpenSavedDraft ? (
          <button
            type="button"
            className="orb-studio-source-card rounded-xl border border-[var(--orb-v2-glass-border,var(--orb-line))]/45 bg-[var(--orb-v2-glass-surface,rgba(255,255,255,0.82))] p-3 text-left transition hover:border-[var(--orb-v2-glass-border-strong,rgba(22,119,255,0.22))] disabled:opacity-50"
            onClick={onOpenSavedDraft}
            disabled={!hasLocalDraft}
            data-orb-write-option-saved-draft
          >
            <span className="flex items-center gap-2 text-xs font-medium text-[var(--orb-foreground)]">
              <FolderOpen className="h-4 w-4 text-[var(--orb-primary)]" aria-hidden />
              Open saved draft
            </span>
          </button>
        ) : null}
        {onContinueFromDictate ? (
          <button
            type="button"
            className="orb-studio-source-card rounded-xl border border-[var(--orb-v2-glass-border,var(--orb-line))]/45 bg-[var(--orb-v2-glass-surface,rgba(255,255,255,0.82))] p-3 text-left transition hover:border-[var(--orb-v2-glass-border-strong,rgba(22,119,255,0.22))]"
            onClick={onContinueFromDictate}
            data-orb-write-option-dictate
          >
            <span className="flex items-center gap-2 text-xs font-medium text-[var(--orb-foreground)]">
              <PenLine className="h-4 w-4 text-[var(--orb-primary)]" aria-hidden />
              Continue from Dictate
            </span>
          </button>
        ) : null}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_280px]">
        <OrbStudioComposerCard label="Rough record">
          <div className="mb-3">
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
              Record type
            </label>
            <select
              value={selectedRecordTypeId}
              onChange={(e) => onRecordTypeChange(e.target.value)}
              className="w-full rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface)] px-3 py-2 text-sm text-[var(--orb-foreground)] focus:border-[var(--orb-primary)]/40 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              data-orb-write-record-type-selector
            >
              {recordTypes.map((rt) => (
                <option key={rt.id} value={rt.id}>
                  {rt.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={roughText}
            onChange={(e) => onRoughTextChange(e.target.value)}
            rows={12}
            placeholder="Paste your rough notes, transcript or draft record here…"
            className="min-h-[14rem] w-full resize-y rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface)] px-4 py-3 text-sm leading-relaxed text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)] focus:border-[var(--orb-primary)]/40 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            data-orb-write-rough-input
          />
        </OrbStudioComposerCard>

        <div className="hidden lg:block" aria-hidden />
      </div>

      <OrbStudioActionRail
        helperText={!hasText ? 'Add rough notes or choose a start option above.' : hasAnalysis ? 'Analysis ready — generate your draft.' : undefined}
        disabled={!hasText}
      >
        <button
          type="button"
          disabled={!hasText || analysing}
          onClick={onAnalyse}
          className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--orb-primary)]/40 bg-[var(--orb-primary-soft)] px-4 py-2 text-xs font-medium text-[var(--orb-foreground)] disabled:opacity-50"
          data-orb-write-analyse
        >
          <Sparkles className="h-3.5 w-3.5" />
          {analysing ? 'Reviewing…' : 'Review with ORB'}
        </button>
        <OrbStudioPrimaryAction
          disabled={!hasText || generating}
          onClick={onGenerate}
          working={generating}
          data-orb-write-generate
        >
          {generating ? 'Creating…' : 'Create draft record'}
        </OrbStudioPrimaryAction>
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
      </OrbStudioActionRail>

      <p className="shrink-0 text-[10px] text-[var(--orb-muted)]">{ORB_WRITE_SAFETY_COPY.review}</p>
      {statusMessage ? (
        <p className="text-xs text-[var(--orb-primary)]" role="status">
          {statusMessage}
        </p>
      ) : null}
    </div>
  )
}
