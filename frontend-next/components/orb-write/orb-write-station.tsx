'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'

import { OrbAppModal } from '@/components/orb-standalone/orb-app-modal'
import { OrbWriteAiPanel } from '@/components/orb-write/orb-write-ai-panel'
import { OrbWriteEditor } from '@/components/orb-write/orb-write-editor'
import { copyTextToClipboard } from '@/lib/orb/orb-clipboard'
import { saveOrbDictateNote } from '@/lib/orb/dictate/orb-dictate-client'
import { copyOrbWriteText, exportOrbWritePdf, printOrbWriteDocument } from '@/lib/orb/write/orb-write-export'
import { saveOrbWriteLocalDraft } from '@/lib/orb/write/orb-write-standalone'
import { resolveOrbRecordingRecordType } from '@/lib/orb/recording/orb-recording-framework'
import { orbGuidedDemoSaveStatusMessage, resolveOrbGuidedDemoSaveTitle } from '@/lib/orb/orb-guided-demo'
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
    const title = resolveOrbGuidedDemoSaveTitle(doc.title)
    const plain = doc.body.replace(/<[^>]+>/g, '\n')
    saveOrbWriteLocalDraft({ ...doc, title })
    try {
      await saveOrbDictateNote({
        title,
        note_type: doc.record_type,
        professional_note: plain,
        summary: doc.summary,
        transcript: doc.transcript
      })
      setStatusMessage(orbGuidedDemoSaveStatusMessage('Draft saved to Records & Drafts.'))
      setDoc((prev) => (prev ? { ...prev, is_draft: true, title } : prev))
    } catch {
      setStatusMessage(orbGuidedDemoSaveStatusMessage('Saved locally — backend save unavailable.'))
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

  const recordType = useMemo(
    () =>
      resolveOrbRecordingRecordType({
        recordTypeId: doc?.record_type_id,
        noteType: doc?.record_type
      }),
    [doc?.record_type, doc?.record_type_id]
  )

  const missingSectionChips = useMemo(() => {
    if (!doc) return []
    const plain = doc.body.replace(/<[^>]+>/g, '\n').toLowerCase()
    return recordType.required_sections.filter((section) => {
      const token = section.split('/')[0]?.trim().toLowerCase() ?? ''
      return token.length > 3 && !plain.includes(token.slice(0, 12))
    })
  }, [doc, recordType.required_sections])

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
        <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--orb-line)]/40 pb-2">
          {onBack ? (
            <button type="button" className="rounded-lg p-2 hover:bg-[var(--orb-surface-hover)]" onClick={onBack} aria-label="Back to Dictate">
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <input
              data-orb-write-title-input
              value={doc.title}
              onChange={(e) => setDoc((prev) => (prev ? { ...prev, title: e.target.value } : prev))}
              className="w-full bg-transparent text-lg font-semibold text-[var(--orb-foreground)] focus:outline-none"
            />
          </div>
        </header>

        {recordType.required_sections.length ? (
          <div className="shrink-0 space-y-1.5" data-orb-write-sections>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--orb-muted)]">Document sections</p>
            <div className="flex flex-wrap gap-1.5">
              {recordType.required_sections.map((section) => {
                const isMissing = missingSectionChips.includes(section)
                return (
                  <span
                    key={section}
                    className={`rounded-full border px-2 py-0.5 text-[10px] ${
                      isMissing
                        ? 'border-amber-400/40 bg-amber-500/10 text-amber-100'
                        : 'border-[var(--orb-line)]/40 text-[var(--orb-muted)]'
                    }`}
                    data-orb-write-section-chip={section.toLowerCase().replace(/\s+/g, '-')}
                    data-orb-write-section-missing={isMissing ? 'true' : 'false'}
                  >
                    {section}
                  </span>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_320px]">
          <OrbWriteEditor
            document={doc}
            onChange={updateBody}
            onWordCountChange={setWordCount}
            lastEdited={`Last edited ${lastEdited}`}
            onCopy={() => void handleCopy()}
            onPrint={() => printOrbWriteDocument(doc)}
            onExportPdf={() => void exportOrbWritePdf(doc)}
            onSaveDraft={() => void handleSaveDraft()}
            onApprove={handleApprove}
          />
          <OrbWriteAiPanel document={doc} onApplyRevision={applyRevision} />
        </div>

        <p className="shrink-0 text-[10px] text-[var(--orb-muted)]">{ORB_WRITE_SAFETY_COPY.responsibility}</p>
        {statusMessage ? (
          <p className="text-xs text-[var(--orb-primary)]" role="status">
            {statusMessage}
          </p>
        ) : null}
        <span className="sr-only" data-orb-write-word-count>
          {wordCount} words
        </span>
      </div>
    </OrbAppModal>
  )
}
