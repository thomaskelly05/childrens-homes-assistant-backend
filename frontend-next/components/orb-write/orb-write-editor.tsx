'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { OrbWriteMobileToolbar } from '@/components/orb-write/orb-write-mobile-toolbar'
import { OrbWriteToolbar } from '@/components/orb-write/orb-write-toolbar'
import { useOrbWriteZoomHandlers } from '@/components/orb-write/orb-write-zoom-controls'
import { useOrbResponsiveMode } from '@/components/orb-standalone/use-orb-responsive-mode'
import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'
import { sanitizeOrbWriteHtml } from '@/lib/orb/write/orb-write-sanitize'
import {
  readOrbWriteZoomPreference,
  writeOrbWriteZoomPreference,
  type OrbWriteZoomLevel,
  type OrbWriteZoomMode
} from '@/lib/orb/write/orb-write-zoom'

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
    if (editorRef.current.innerHTML !== doc.body && !editorRef.current.matches(':focus')) {
      editorRef.current.innerHTML = doc.body.includes('<') ? doc.body : doc.body.replace(/\n/g, '<br/>')
    }
  }, [doc.body])

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

  return (
    <div className="orb-write-studio-editor relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]" data-orb-write-editor data-orb-write-mobile={isMobile ? 'true' : 'false'}>
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
              <h1 className="text-xl font-semibold text-slate-900" data-orb-write-page-title>
                {doc.title}
              </h1>
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

            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              spellCheck
              data-orb-write-body
              className="min-h-[180mm] text-sm leading-relaxed text-slate-800 focus:outline-none [&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_ul]:list-disc"
              onInput={syncContent}
              onBlur={syncContent}
              aria-label="Document body"
            />

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
