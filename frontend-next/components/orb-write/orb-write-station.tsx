'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ClipboardCopy,
  Download,
  Printer,
  Save
} from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { OrbWriteAiPanel } from '@/components/orb-write/orb-write-ai-panel'
import { OrbWriteEditor } from '@/components/orb-write/orb-write-editor'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'
import { saveOrbDictateNote } from '@/lib/orb/dictate/orb-dictate-client'
import { copyOrbWriteText, exportOrbWritePdf, printOrbWriteDocument } from '@/lib/orb/write/orb-write-export'
import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'
import { ORB_WRITE_SAFETY_COPY } from '@/lib/orb/write/orb-write-types'

export function OrbWriteStation({
  open,
  onClose,
  onBack,
  initialDocument
}: {
  open: boolean
  onClose: () => void
  onBack?: () => void
  initialDocument: OrbWriteDocument | null
}) {
  const [doc, setDoc] = useState<OrbWriteDocument | null>(initialDocument)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [wordCount, setWordCount] = useState(initialDocument?.word_count ?? 0)

  useEffect(() => {
    if (initialDocument) {
      setDoc(initialDocument)
      setWordCount(initialDocument.word_count)
    }
  }, [initialDocument])

  const lastEdited = useMemo(() => {
    if (!doc) return ''
    return new Date(doc.updated_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
  }, [doc?.updated_at])

  const updateBody = useCallback((body: string, _plain: string) => {
    setDoc((prev) => {
      if (!prev) return prev
      return { ...prev, body, updated_at: new Date().toISOString() }
    })
  }, [])

  const applyRevision = useCallback((revised: string, label: string) => {
    setDoc((prev) => {
      if (!prev) return prev
      const version = {
        id: `v_${Date.now()}`,
        label,
        body: revised,
        created_at: new Date().toISOString(),
        event: 'ai_suggestion' as const
      }
      return {
        ...prev,
        body: revised,
        versions: [...prev.versions, version],
        updated_at: new Date().toISOString()
      }
    })
    setStatusMessage('Suggestion applied — review before finalising.')
  }, [])

  async function handleSaveDraft() {
    if (!doc) return
    const plain = doc.body.replace(/<[^>]+>/g, '\n')
    try {
      await saveOrbDictateNote({
        title: doc.title,
        note_type: doc.record_type,
        professional_note: plain,
        summary: doc.summary,
        transcript: doc.transcript
      })
      setStatusMessage('Draft saved to ORB Saved Outputs.')
      setDoc((prev) => (prev ? { ...prev, is_draft: true } : prev))
    } catch {
      setStatusMessage('Save unavailable — use copy or export.')
    }
  }

  async function handleCopy() {
    if (!doc) return
    const ok = await copyTextToClipboard(copyOrbWriteText(doc))
    setStatusMessage(ok ? 'Copied to clipboard.' : 'Copy failed.')
  }

  function handleApprove() {
    setDoc((prev) => (prev ? { ...prev, is_finalised: true, is_draft: false } : prev))
    setStatusMessage('Marked as approved locally. Export or save to keep your record.')
  }

  if (!doc) return null

  return (
    <OrbAppModal
      open={open}
      title="ORB Write"
      subtitle="Review, edit and export your document"
      onClose={onClose}
      panelId="orb-write"
      size="xlarge"
      ariaLabel="ORB Write document editor"
      presentation="workspace"
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3" data-orb-write-station>
        <header className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-[var(--orb-line)]/40 pb-3">
          <div className="flex items-center gap-2">
            {onBack ? (
              <button type="button" className="rounded-lg p-2 hover:bg-[var(--orb-surface-hover)]" onClick={onBack} aria-label="Back to Dictate">
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : null}
            <div>
              <input
                data-orb-write-title
                value={doc.title}
                onChange={(e) => setDoc((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
                className="bg-transparent text-lg font-semibold text-[var(--orb-foreground)] focus:outline-none"
              />
              <p className="text-xs text-[var(--orb-muted)]" data-orb-write-record-type>
                {doc.record_type_label}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[10px] text-[var(--orb-muted)]">
            <span data-orb-write-word-count>{wordCount} words</span>
            <span data-orb-write-last-edited>Last edited {lastEdited}</span>
          </div>
        </header>

        <p className="shrink-0 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[10px] text-[var(--orb-muted)]" data-orb-write-review-notice>
          {doc.review_required_statement}
        </p>

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_320px]">
          <OrbWriteEditor document={doc} onChange={updateBody} onWordCountChange={setWordCount} />
          <OrbWriteAiPanel document={doc} onApplyRevision={applyRevision} />
        </div>

        <footer className="flex shrink-0 flex-wrap items-center gap-2 border-t border-[var(--orb-line)]/40 pt-3">
          <button type="button" data-orb-write-copy className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-3 py-1.5 text-xs" onClick={() => void handleCopy()}>
            <ClipboardCopy className="h-3.5 w-3.5" /> Copy
          </button>
          <button type="button" data-orb-write-print className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-3 py-1.5 text-xs" onClick={() => printOrbWriteDocument(doc)}>
            <Printer className="h-3.5 w-3.5" /> Print
          </button>
          <button type="button" data-orb-write-export-pdf className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-3 py-1.5 text-xs" onClick={() => void exportOrbWritePdf(doc)}>
            <Download className="h-3.5 w-3.5" /> Export PDF
          </button>
          <button type="button" data-orb-write-save-draft className="inline-flex items-center gap-1 rounded-lg border border-[var(--orb-line)]/50 px-3 py-1.5 text-xs" onClick={() => void handleSaveDraft()}>
            <Save className="h-3.5 w-3.5" /> Save draft
          </button>
          <button type="button" data-orb-write-approve className="inline-flex items-center gap-1 rounded-lg bg-[var(--orb-primary)] px-3 py-1.5 text-xs font-medium text-white" onClick={handleApprove}>
            <Check className="h-3.5 w-3.5" /> Approve / finalise
          </button>
        </footer>

        <p className="text-[10px] text-[var(--orb-muted)]">{ORB_WRITE_SAFETY_COPY.responsibility}</p>
        {statusMessage ? (
          <p className="text-xs text-[var(--orb-primary)]" role="status">
            {statusMessage}
          </p>
        ) : null}
      </div>
    </OrbAppModal>
  )
}
