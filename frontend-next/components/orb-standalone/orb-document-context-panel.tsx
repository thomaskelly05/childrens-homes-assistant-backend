'use client'

import { Copy, FileText, MessageSquare } from 'lucide-react'

import type { OrbDocumentIntelligenceResult } from '@/lib/orb/document-intelligence'
import {
  documentIntelligenceDisplayTitle,
  exportDocumentIntelligenceMarkdown,
  ORB_DOCUMENT_BOUNDARY_LINES
} from '@/lib/orb/document-intelligence'

export function OrbDocumentContextPanel({
  result,
  documentTitle,
  lensLabel,
  onAskOrb,
  onCopy,
  onExport
}: {
  result: OrbDocumentIntelligenceResult
  documentTitle: string
  lensLabel: string
  onAskOrb?: () => void
  onCopy?: () => void
  onExport?: () => void
}) {
  const displayTitle = documentIntelligenceDisplayTitle(
    result.lens,
    documentTitle || result.source_document_title || result.title
  )
  const preview = result.summary.trim().slice(0, 480)

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden"
      data-orb-context-kind="documents"
      data-orb-document-context-panel
    >
      <div className="shrink-0 border-b border-[var(--orb-line)]/60 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--orb-muted)]">
          Document output
        </p>
        <h2 className="mt-1 text-sm font-semibold leading-snug text-[var(--orb-foreground)]">
          {displayTitle}
        </h2>
        <p className="mt-1 text-[11px] text-[var(--orb-muted)]">
          Lens: <span className="font-medium text-[var(--orb-foreground)]">{lensLabel}</span>
        </p>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface)]/60 p-3">
        <p className="whitespace-pre-wrap text-xs leading-5 text-[var(--orb-foreground)]">{preview}</p>
        {result.risks_or_gaps?.length ? (
          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-200/90">
              Risks / gaps
            </p>
            <ul className="mt-1 list-disc pl-4 text-[11px] text-[var(--orb-muted)]">
              {result.risks_or_gaps.slice(0, 4).map((gap) => (
                <li key={gap}>{gap}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <ul className="shrink-0 space-y-1 text-[10px] leading-4 text-[var(--orb-muted)]" data-orb-document-boundary>
        {ORB_DOCUMENT_BOUNDARY_LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <div className="flex shrink-0 flex-wrap gap-2">
        {onAskOrb ? (
          <button
            type="button"
            onClick={onAskOrb}
            className="orb-doc-primary-btn inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white"
            data-orb-ask-orb-document
          >
            <MessageSquare className="h-3.5 w-3.5" aria-hidden />
            Ask ORB about this
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(exportDocumentIntelligenceMarkdown(result, displayTitle))
            onCopy?.()
          }}
          className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold"
          data-orb-copy-document-output
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy
        </button>
        <button
          type="button"
          onClick={() => {
            const blob = new Blob([exportDocumentIntelligenceMarkdown(result, displayTitle)], {
              type: 'text/markdown;charset=utf-8'
            })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = `${displayTitle.replace(/[^\w\s-]/g, '').slice(0, 48) || 'document'}.md`
            anchor.click()
            URL.revokeObjectURL(url)
            onExport?.()
          }}
          className="orb-doc-secondary-btn inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-semibold"
          data-orb-export-document-output
        >
          <FileText className="h-3.5 w-3.5" aria-hidden />
          Export
        </button>
      </div>
    </div>
  )
}
