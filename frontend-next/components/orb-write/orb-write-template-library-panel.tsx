'use client'

import { useCallback, useEffect, useState } from 'react'
import { FileText, Loader2, Search, X } from 'lucide-react'

import { useOrbResponsiveMode } from '@/components/orb-standalone/use-orb-responsive-mode'
import { searchWorkingDocumentTemplates } from '@/lib/orb/template/orb-template-working-document-client'
import type { OrbTemplateWorkingDocument } from '@/lib/orb/template/orb-template-working-document-types'
import { openWorkingDocument } from '@/lib/orb/template/orb-template-working-document-client'

export function OrbWriteTemplateLibraryPanel({
  open,
  onClose,
  onOpenDocument
}: {
  open: boolean
  onClose: () => void
  onOpenDocument: (document: OrbTemplateWorkingDocument) => void
}) {
  const { isMobile } = useOrbResponsiveMode()
  const [search, setSearch] = useState('')
  const [templates, setTemplates] = useState<Array<Record<string, unknown>>>([])
  const [loading, setLoading] = useState(false)
  const [opening, setOpening] = useState<string | null>(null)

  const loadTemplates = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const result = await searchWorkingDocumentTemplates(query, { station: 'write' })
      setTemplates((result.templates ?? []) as Array<Record<string, unknown>>)
    } catch {
      setTemplates([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => void loadTemplates(search), 200)
    return () => window.clearTimeout(timer)
  }, [open, search, loadTemplates])

  async function handleOpen(templateId: string) {
    setOpening(templateId)
    try {
      const doc = await openWorkingDocument(templateId, { source_station: 'write' })
      onOpenDocument(doc)
      onClose()
    } finally {
      setOpening(null)
    }
  }

  if (!open) return null

  return (
    <div
      className={`fixed inset-0 z-[85] flex bg-black/40 ${
        isMobile ? 'items-end' : 'items-center justify-center p-4'
      }`}
      role="dialog"
      aria-modal
      aria-label="Template library"
      data-orb-write-template-library
    >
      <div
        className={`flex w-full flex-col overflow-hidden border border-[var(--orb-line)] bg-[var(--orb-surface)] shadow-xl ${
          isMobile ? 'max-h-[92dvh] rounded-t-2xl' : 'max-h-[85vh] max-w-xl rounded-2xl'
        }`}
      >
        <header className="flex items-center justify-between border-b border-[var(--orb-line)]/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-[var(--orb-primary)]" aria-hidden />
            <h2 className="text-sm font-semibold">Template library</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-[var(--orb-muted)]" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="border-b border-[var(--orb-line)]/40 px-4 py-2">
          <label className="flex items-center gap-2 rounded-lg border border-[var(--orb-line)] px-3 py-2">
            <Search className="h-3.5 w-3.5 text-[var(--orb-muted)]" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates…"
              className="min-w-0 flex-1 bg-transparent text-xs focus:outline-none"
              data-orb-write-template-library-search
            />
          </label>
        </div>

        <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4" data-orb-write-template-library-list>
          {loading ? (
            <li className="flex items-center gap-2 text-xs text-[var(--orb-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Searching…
            </li>
          ) : null}
          {!loading && templates.length === 0 ? (
            <li className="text-xs text-[var(--orb-muted)]">No templates found.</li>
          ) : null}
          {templates.map((row) => {
            const templateId = String(row.template_id ?? '')
            const title = String(row.title ?? templateId)
            return (
              <li key={templateId}>
                <div className="flex items-start justify-between gap-2 rounded-xl border border-[var(--orb-line)] px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[var(--orb-foreground)]">{title}</p>
                    <p className="mt-0.5 text-[10px] text-[var(--orb-muted)]">
                      {String(row.lifecycle_group ?? '')} · {String(row.lifecycle_family ?? '')}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={opening === templateId}
                    onClick={() => void handleOpen(templateId)}
                    className="shrink-0 rounded-lg bg-[var(--orb-primary)] px-2.5 py-1 text-[10px] font-semibold text-white disabled:opacity-50"
                    data-orb-write-template-open={templateId}
                  >
                    {opening === templateId ? 'Opening…' : 'Open'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
