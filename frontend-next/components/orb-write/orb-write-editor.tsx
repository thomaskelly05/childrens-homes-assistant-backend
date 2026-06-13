'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { OrbWriteMobileToolbar } from '@/components/orb-write/orb-write-mobile-toolbar'
import { OrbWriteToolbar } from '@/components/orb-write/orb-write-toolbar'
import { useOrbWriteZoomHandlers } from '@/components/orb-write/orb-write-zoom-controls'
import { useOrbResponsiveMode } from '@/components/orb-standalone/use-orb-responsive-mode'
import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'
import { sanitizeOrbWriteHtml } from '@/lib/orb/write/orb-write-sanitize'
import {
  orbWriteBodyLooksLikeMarkdownTemplate,
  orbWriteBodyToMobileNotepadHtml
} from '@/lib/orb/write/orb-write-mobile-body'
import {
  readOrbWriteZoomPreference,
  writeOrbWriteZoomPreference,
  type OrbWriteZoomLevel,
  type OrbWriteZoomMode
} from '@/lib/orb/write/orb-write-zoom'

function orbWriteBodyForEditor(body: string, mobile: boolean): string {
  if (!body.trim()) return ''
  if (body.includes('<')) return body
  if (mobile && orbWriteBodyLooksLikeMarkdownTemplate(body)) {
    return orbWriteBodyToMobileNotepadHtml(body)
  }
  return body.replace(/\n/g, '<br/>')
}

const PDF_FOOTER = 'Generated with ORB Residential, powered by IndiCare Intelligence'

function htmlToPlainText(html: string): string {
  if (typeof document === 'undefined') return html
  const div = document.createElement('div')
  div.innerHTML = html
  return div.innerText || div.textContent || ''
}

export function OrbWriteEditor({
  document: doc,
  onChange,
  onWordCountChange,
  onCopy,
  onPrint,
  onExportPdf,
  onSaveDraft,
  onApprove,
  onAskOrb,
  lastEdited
}: {
  document: OrbWriteDocument
  onChange: (body: string, plainText: string) => void
  onWordCountChange?: (count: number) => void
  onCopy?: () => void
  onPrint?: () => void
  onExportPdf?: () => void
  onSaveDraft?: () => void
  onApprove?: () => void
  onAskOrb?: () => void
  lastEdited?: string
}) {
  const { isMobile } = useOrbResponsiveMode()
  const editorRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const [wordCount, setWordCount] = useState(doc.word_count)
  const [zoomMode, setZoomMode] = useState<OrbWriteZoomMode>('percent')
  const [zoomPercent, setZoomPercent] = useState<OrbWriteZoomLevel>(100)

  useEffect(() => {
    const pref = readOrbWriteZoomPreference()
    setZoomMode(pref.mode)
    setZoomPercent(pref.percent)
  }, [])

  useEffect(() => {
    if (!editorRef.current) return
    const nextHtml = orbWriteBodyForEditor(doc.body, isMobile)
    if (editorRef.current.innerHTML !== nextHtml && !editorRef.current.matches(':focus')) {
      editorRef.current.innerHTML = nextHtml
    }
  }, [doc.body, isMobile])

  const syncContent = useCallback(() => {
    if (!editorRef.current) return
    const raw = editorRef.current.innerHTML
    const html = sanitizeOrbWriteHtml(raw)
    if (html !== raw) editorRef.current.innerHTML = html
    const plain = htmlToPlainText(html)
    const words = plain.trim().split(/\s+/).filter(Boolean).length
    onChange(html, plain)
    setWordCount(words)
    onWordCountChange?.(words)
  }, [onChange, onWordCountChange])

  const runCommand = useCallback(
    (command: string, value?: string) => {
      if (!editorRef.current) return
      editorRef.current.focus()
      if (command === 'insertTable') {
        document.execCommand(
          'insertHTML',
          false,
          '<table border="1" cellpadding="4"><tr><td>Column 1</td><td>Column 2</td></tr><tr><td></td><td></td></tr></table><p></p>'
        )
      } else if (command === 'formatBlock' && value) {
        document.execCommand('formatBlock', false, value === 'blockquote' ? 'blockquote' : value)
      } else if (command === 'insertHorizontalRule') {
        document.execCommand('insertHorizontalRule', false)
      } else {
        document.execCommand(command, false, value)
      }
      syncContent()
      setCanUndo(document.queryCommandEnabled('undo'))
      setCanRedo(document.queryCommandEnabled('redo'))
    },
    [syncContent]
  )

  const persistZoom = useCallback((pref: { mode: OrbWriteZoomMode; percent: OrbWriteZoomLevel }) => {
    writeOrbWriteZoomPreference(pref)
  }, [])

  const zoomHandlers = useOrbWriteZoomHandlers(zoomPercent, zoomMode, setZoomPercent, setZoomMode, persistZoom)

  const dateLine = new Date(doc.updated_at).toLocaleString('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short'
  })

  const scale = zoomMode === 'fit-width' ? undefined : zoomPercent / 100

  const editorBody = (
    <div
      ref={editorRef}
      contentEditable
      suppressContentEditableWarning
      spellCheck
      data-orb-write-body
      className={
        isMobile
          ? 'min-h-[12rem] flex-1 text-[0.9375rem] leading-relaxed text-[var(--orb-foreground)] focus:outline-none [&_.orb-write-section-hint]:pointer-events-none [&_.orb-write-section-hint]:text-[var(--orb-muted)] [&_.orb-write-section-hint]:italic [&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-1 [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:tracking-tight [&_li]:ml-4 [&_ol]:list-decimal [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--orb-line)]/40 [&_td]:p-2 [&_ul]:list-disc'
          : 'min-h-[180mm] text-sm leading-relaxed text-slate-800 focus:outline-none [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_ul]:list-disc'
      }
      onInput={syncContent}
      onBlur={syncContent}
      aria-label="Document body"
    />
  )

  return (
    <div className="orb-write-studio-editor relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]" data-orb-write-editor data-orb-write-mobile={isMobile ? 'true' : 'false'} data-orb-write-notepad={isMobile ? 'true' : 'false'}>
      <div className="hidden md:block">
        <OrbWriteToolbar
          onCommand={runCommand}
          canUndo={canUndo}
          canRedo={canRedo}
          wordCount={wordCount}
          lastEdited={lastEdited}
          zoomMode={zoomMode}
          zoomPercent={zoomPercent}
          onCopy={onCopy}
          onPrint={onPrint}
          onExportPdf={onExportPdf}
          onSaveDraft={onSaveDraft}
          onApprove={onApprove}
          {...zoomHandlers}
        />
      </div>
      {isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden" data-orb-write-notepad-surface>
          <div
            className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--orb-line)]/40 px-3 py-2 text-[10px] text-[var(--orb-muted)]"
            data-orb-write-notepad-meta
          >
            <span
              className="inline-flex rounded-full border border-[var(--orb-line)]/50 px-2 py-0.5 font-medium text-[var(--orb-foreground)]"
              data-orb-write-record-type-badge
            >
              {doc.record_type_label}
            </span>
            {doc.is_finalised ? (
              <span
                className="inline-flex shrink-0 items-center rounded-full border border-emerald-400/40 bg-emerald-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-emerald-800"
                data-orb-write-approved-badge
              >
                Approved
              </span>
            ) : (
              <span
                className="inline-flex shrink-0 items-center rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-0.5 font-semibold uppercase tracking-wide text-amber-900"
                data-orb-write-review-badge
              >
                Review
              </span>
            )}
            <span className="ml-auto" data-orb-write-word-count-display>
              {wordCount} words
            </span>
          </div>
          <div
            className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
            data-orb-write-notepad-body
          >
            {editorBody}
          </div>
        </div>
      ) : (
      <div
        ref={canvasRef}
        className="orb-studio-document-canvas-workspace min-h-0 flex-1 overflow-auto bg-[#e8eaed] p-4 md:p-6"
        data-orb-write-canvas-workspace
      >
        <div
          className="mx-auto origin-top transition-transform duration-150"
          style={{
            width: zoomMode === 'fit-width' ? '100%' : '210mm',
            maxWidth: zoomMode === 'fit-width' ? '210mm' : undefined,
            transform: scale ? `scale(${scale})` : undefined
          }}
          data-orb-write-document-canvas
          data-orb-write-zoom={zoomMode === 'fit-width' ? 'fit-width' : zoomPercent}
        >
          <article
            className="min-h-[297mm] bg-white px-[20mm] py-[18mm] text-[#0f172a] shadow-[0_4px_24px_rgba(15,23,42,0.12)] print:shadow-none"
            data-orb-write-print-page
          >
            <header className="mb-6 border-b border-slate-200 pb-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <h1 className="text-xl font-semibold text-slate-900" data-orb-write-page-title>
                  {doc.title}
                </h1>
                {doc.is_finalised ? (
                  <span
                    className="inline-flex shrink-0 items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800"
                    data-orb-write-approved-badge
                  >
                    Adult approved
                  </span>
                ) : (
                  <span
                    className="inline-flex shrink-0 items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900"
                    data-orb-write-review-badge
                  >
                    Review required
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span
                  className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 font-medium text-sky-800"
                  data-orb-write-record-type-badge
                >
                  {doc.record_type_label}
                </span>
                <time dateTime={doc.updated_at} data-orb-write-datetime>
                  {dateLine}
                </time>
              </div>
            </header>

            {editorBody}

            <footer className="mt-8 border-t border-slate-200 pt-4">
              <p className="text-xs leading-relaxed text-slate-600" data-orb-write-review-notice>
                {doc.review_required_statement}
              </p>
              <p className="mt-3 text-[10px] text-slate-400" data-orb-write-export-footer>
                {PDF_FOOTER}
              </p>
            </footer>
          </article>
        </div>
      </div>
      )}
      {isMobile ? (
        <OrbWriteMobileToolbar
          onCommand={runCommand}
          canUndo={canUndo}
          canRedo={canRedo}
          onCopy={onCopy}
          onPrint={onPrint}
          onExportPdf={onExportPdf}
          onSaveDraft={onSaveDraft}
          onApprove={onApprove}
          onAskOrb={onAskOrb}
        />
      ) : null}
    </div>
  )
}
