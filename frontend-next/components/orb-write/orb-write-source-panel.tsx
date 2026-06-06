'use client'

import { FileText, FolderOpen, Mic, PenLine } from 'lucide-react'

import { OrbStudioComposerCard, OrbStudioSidebarPanel } from '@/components/orb/premium'
import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'

export function OrbWriteSourcePanel({
  document: doc,
  roughText,
  onRoughTextChange,
  onContinueFromDictate,
  onChooseTemplate,
  onOpenTemplates,
  onOpenSavedDraft,
  hasLocalDraft
}: {
  document: OrbWriteDocument
  roughText?: string
  onRoughTextChange?: (value: string) => void
  onContinueFromDictate?: () => void
  onChooseTemplate?: () => void
  onOpenTemplates?: () => void
  onOpenSavedDraft?: () => void
  hasLocalDraft?: boolean
}) {
  const sourceLabel = doc.transcript.trim()
    ? 'From Dictate'
    : doc.template_id && doc.template_id !== 'general'
      ? 'From template'
      : doc.versions.some((v) => v.event === 'restored')
        ? 'Saved draft'
        : 'Rough notes'

  return (
    <OrbStudioSidebarPanel
      title="Source"
      subtitle="Original notes and context for this record"
      position="left"
      className="orb-write-studio-source-panel lg:w-[260px] xl:w-[280px]"
    >
      <div className="space-y-3" data-orb-write-source-panel>
        <OrbStudioComposerCard label="Record source">
          <p className="text-xs font-medium text-[var(--orb-foreground)]">{sourceLabel}</p>
          <p className="mt-1 text-[10px] text-[var(--orb-muted)]">
            {doc.record_type_label} · {doc.title}
          </p>
        </OrbStudioComposerCard>

        {doc.transcript ? (
          <OrbStudioComposerCard label="Original transcript">
            <p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-[var(--orb-muted)]">
              {doc.transcript.slice(0, 1200)}
              {doc.transcript.length > 1200 ? '…' : ''}
            </p>
          </OrbStudioComposerCard>
        ) : null}

        {onRoughTextChange !== undefined ? (
          <OrbStudioComposerCard label="Rough notes">
            <textarea
              value={roughText ?? ''}
              onChange={(e) => onRoughTextChange(e.target.value)}
              rows={6}
              spellCheck
              placeholder="Paste or type rough notes…"
              className="w-full resize-none rounded-xl border border-[var(--orb-line)]/60 bg-[var(--orb-surface)] px-3 py-2 text-xs text-[var(--orb-foreground)] placeholder:text-[var(--orb-muted)] focus:border-[var(--orb-primary)]/40 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
              data-orb-write-source-rough-text
            />
          </OrbStudioComposerCard>
        ) : null}

        <div className="flex flex-col gap-1.5" data-orb-write-source-actions>
          {onContinueFromDictate ? (
            <button
              type="button"
              onClick={onContinueFromDictate}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
              data-orb-write-source-dictate
            >
              <Mic className="h-3.5 w-3.5" aria-hidden />
              Continue from Dictate
            </button>
          ) : null}
          {onChooseTemplate ? (
            <button
              type="button"
              onClick={onChooseTemplate}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold text-[var(--orb-foreground)] hover:bg-[var(--orb-surface-hover)]"
              data-orb-write-choose-template
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Choose template
            </button>
          ) : null}
          {onOpenTemplates ? (
            <button
              type="button"
              onClick={onOpenTemplates}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
              data-orb-write-source-template
            >
              <FileText className="h-3.5 w-3.5" aria-hidden />
              Browse all templates
            </button>
          ) : null}
          {hasLocalDraft && onOpenSavedDraft ? (
            <button
              type="button"
              onClick={onOpenSavedDraft}
              className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
              data-orb-write-source-draft
            >
              <FolderOpen className="h-3.5 w-3.5" aria-hidden />
              Open saved draft
            </button>
          ) : null}
          {doc.summary ? (
            <OrbStudioComposerCard label="Summary">
              <p className="text-xs leading-relaxed text-[var(--orb-muted)]">{doc.summary}</p>
            </OrbStudioComposerCard>
          ) : (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-[var(--orb-line)]/40 px-3 py-2 text-[10px] text-[var(--orb-muted)]">
              <PenLine className="h-3 w-3 shrink-0" aria-hidden />
              Edit the document canvas — ORB guidance is on the right.
            </div>
          )}
        </div>
      </div>
    </OrbStudioSidebarPanel>
  )
}
