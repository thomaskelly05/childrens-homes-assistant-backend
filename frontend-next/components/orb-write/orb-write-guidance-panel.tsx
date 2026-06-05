'use client'

import { useState } from 'react'
import { BookOpen, X } from 'lucide-react'

import { OrbKnowledgeOfficialGuidanceSection } from '@/components/orb-standalone/knowledge-library/orb-knowledge-official-guidance-section'
import { OrbKnowledgeHomeDocumentsSection } from '@/components/orb-standalone/knowledge-library/orb-knowledge-home-documents-section'
import type { OrbOfficialGuidanceEntry } from '@/lib/orb/knowledge/orb-knowledge-library-types'
import type { OrbKnowledgeLibraryItem } from '@/lib/orb/knowledge/orb-knowledge-library-types'
import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'

export type OrbWriteSelectedGuidance =
  | { kind: 'official'; entry: OrbOfficialGuidanceEntry }
  | { kind: 'home'; item: OrbKnowledgeLibraryItem }

export function OrbWriteGuidancePanel({
  document: doc,
  selected,
  onSelect,
  onClear,
  onCheckDraft
}: {
  document: OrbWriteDocument
  selected: OrbWriteSelectedGuidance | null
  onSelect: (source: OrbWriteSelectedGuidance) => void
  onClear: () => void
  onCheckDraft?: (source: OrbWriteSelectedGuidance) => void
}) {
  const [tab, setTab] = useState<'official' | 'home'>('official')

  return (
    <div
      className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]"
      data-orb-write-guidance-panel
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-[var(--orb-line)]/40 px-3 py-2">
        <BookOpen className="h-4 w-4 text-[var(--orb-primary)]" aria-hidden />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--orb-muted)]">
          Use guidance
        </h3>
      </header>
      {selected ? (
        <div
          className="mx-3 mt-2 flex items-center gap-2 rounded-lg border border-[var(--orb-primary)]/30 bg-[var(--orb-primary)]/10 px-2 py-1.5 text-[10px]"
          data-orb-write-guidance-chip
        >
          <span className="min-w-0 flex-1 truncate font-medium text-[var(--orb-foreground)]">
            {selected.kind === 'official' ? selected.entry.title : selected.item.title}
            {' · '}
            {selected.kind === 'official'
              ? selected.entry.approval_status
              : selected.item.approval_status}
          </span>
          <button type="button" onClick={onClear} aria-label="Clear guidance" className="shrink-0 p-0.5">
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : null}
      <div className="flex gap-1 border-b border-[var(--orb-line)]/40 px-2 py-1" role="tablist">
        {(
          [
            { id: 'official' as const, label: 'Official' },
            { id: 'home' as const, label: 'Home docs' }
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2 py-1 text-[10px] font-semibold ${
              tab === t.id ? 'bg-[var(--orb-surface-hover)]' : 'text-[var(--orb-muted)]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {tab === 'official' ? (
          <OrbKnowledgeOfficialGuidanceSection
            recordTypeFilter={doc.record_type_id}
            onUseWithOrb={(entry) => onSelect({ kind: 'official', entry })}
          />
        ) : (
          <OrbKnowledgeHomeDocumentsSection
            initialRecordTypeId={doc.record_type_id}
            onUseInOrb={(item) => onSelect({ kind: 'home', item })}
          />
        )}
      </div>
      {selected && onCheckDraft ? (
        <footer className="shrink-0 border-t border-[var(--orb-line)]/40 p-2">
          <button
            type="button"
            className="w-full rounded-lg bg-[var(--orb-primary)] px-3 py-2 text-xs font-semibold text-white"
            data-orb-write-check-against-guidance
            onClick={() => onCheckDraft(selected)}
          >
            Check draft against selected guidance
          </button>
          <p className="mt-1 text-[9px] text-[var(--orb-muted)]">
            ORB will not insert policy text automatically — review suggestions before applying.
          </p>
        </footer>
      ) : null}
    </div>
  )
}
