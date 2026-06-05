'use client'

import { FileEdit, FileText, Mic, Sparkles } from 'lucide-react'

import {
  ORB_RECORDING_RECORD_TYPES,
  orbRecordingCategories,
  orbRecordingChecksSummary
} from '@/lib/orb/recording/orb-recording-framework'
import type { OrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-types'

export type OrbRecordingLibraryAction = 'dictate' | 'write' | 'preview' | 'document'

export function OrbRecordingLibraryCards({
  category,
  search,
  onAction
}: {
  category?: string
  search?: string
  onAction: (action: OrbRecordingLibraryAction, recordType: OrbRecordingRecordType) => void
}) {
  const needle = (search ?? '').trim().toLowerCase()
  const filtered = ORB_RECORDING_RECORD_TYPES.filter((r) => {
    if (category && r.category !== category) return false
    if (!needle) return true
    const hay = `${r.label} ${r.purpose} ${r.when_to_use}`.toLowerCase()
    return hay.includes(needle)
  })

  return (
    <div className="space-y-3" data-orb-recording-library>
      <div className="flex flex-wrap gap-1.5" data-orb-recording-library-categories>
        {orbRecordingCategories().map((cat) => (
          <span key={cat} className="rounded-full border border-[var(--orb-line)]/40 px-2 py-0.5 text-[10px] capitalize text-[var(--orb-muted)]">
            {cat.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-orb-recording-card-grid>
        {filtered.map((recordType) => (
          <li key={recordType.id}>
            <article
              className="flex h-full flex-col rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-4 transition hover:border-[var(--orb-primary)]/30"
              data-orb-recording-card={recordType.id}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-[var(--orb-foreground)]">{recordType.label}</p>
                <span className="shrink-0 rounded-full border border-[var(--orb-line)] px-2 py-0.5 text-[10px] capitalize text-[var(--orb-muted)]">
                  {recordType.category.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="mt-1.5 text-xs text-[var(--orb-muted)]">{recordType.purpose}</p>
              <p className="mt-1 text-[10px] leading-relaxed text-[var(--orb-muted)]">
                <span className="font-medium text-[var(--orb-foreground)]">When to use: </span>
                {recordType.when_to_use}
              </p>
              <p className="mt-2 text-[10px] text-[var(--orb-muted)]" data-orb-recording-orb-checks>
                <span className="font-medium text-[var(--orb-foreground)]">ORB checks: </span>
                {orbRecordingChecksSummary(recordType).slice(0, 3).join(' · ')}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg bg-[var(--orb-primary)] px-2.5 py-1 text-[10px] font-medium text-white"
                  data-orb-recording-start-dictate
                  onClick={() => onAction('dictate', recordType)}
                >
                  <Mic className="h-3 w-3" aria-hidden />
                  Start in Dictate
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)] px-2.5 py-1 text-[10px]"
                  data-orb-recording-open-write
                  onClick={() => onAction('write', recordType)}
                >
                  <FileEdit className="h-3 w-3" aria-hidden />
                  Open in ORB Write
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)] px-2.5 py-1 text-[10px]"
                  data-orb-recording-preview
                  onClick={() => onAction('preview', recordType)}
                >
                  <FileText className="h-3 w-3" aria-hidden />
                  Preview structure
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)] px-2.5 py-1 text-[10px]"
                  data-orb-recording-use-document
                  onClick={() => onAction('document', recordType)}
                >
                  <Sparkles className="h-3 w-3" aria-hidden />
                  Use with Document
                </button>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </div>
  )
}
