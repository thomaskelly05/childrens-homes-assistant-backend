'use client'

import { OrbIcon } from '@/components/orb-residential/ui/orb-icon'
import { OrbWriteZoomControls } from '@/components/orb-write/orb-write-zoom-controls'
import type { OrbWriteZoomLevel, OrbWriteZoomMode } from '@/lib/orb/write/orb-write-zoom'

const BLOCK_OPTIONS = [
  { value: 'p', label: 'Paragraph' },
  { value: 'h1', label: 'Heading 1' },
  { value: 'h2', label: 'Heading 2' },
  { value: 'h3', label: 'Heading 3' }
] as const

export function OrbWriteToolbar({
  onCommand,
  canUndo,
  canRedo,
  wordCount,
  lastEdited,
  zoomMode,
  zoomPercent,
  onZoomIn,
  onZoomOut,
  onFitWidth,
  onResetZoom,
  onCopy,
  onPrint,
  onExportPdf,
  onSaveDraft,
  onApprove
}: {
  onCommand: (command: string, value?: string) => void
  canUndo: boolean
  canRedo: boolean
  wordCount?: number
  lastEdited?: string
  zoomMode: OrbWriteZoomMode
  zoomPercent: OrbWriteZoomLevel
  onZoomIn: () => void
  onZoomOut: () => void
  onFitWidth: () => void
  onResetZoom: () => void
  onCopy?: () => void
  onPrint?: () => void
  onExportPdf?: () => void
  onSaveDraft?: () => void
  onApprove?: () => void
}) {
  const btn =
    'inline-flex items-center justify-center rounded-lg border border-[var(--orb-line)]/50 p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] disabled:opacity-40'

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b border-[var(--orb-line)]/40 px-2 py-1.5 orb-write-toolbar"
      data-orb-write-toolbar
      role="toolbar"
      aria-label="Document formatting and actions"
    >
      <div className="flex flex-wrap items-center gap-1" data-orb-write-toolbar-group="structure">
      <span className="hidden px-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--orb-muted)] sm:inline">Structure</span>
      <label className="sr-only" htmlFor="orb-write-block-style">
        Paragraph style
      </label>
      <select
        id="orb-write-block-style"
        className="max-w-[7rem] rounded-lg border border-[var(--orb-line)]/50 bg-[var(--orb-surface)] px-1.5 py-1 text-[10px] text-[var(--orb-foreground)]"
        data-orb-write-block-style
        defaultValue="p"
        onChange={(e) => onCommand('formatBlock', e.target.value)}
        aria-label="Paragraph style"
      >
        {BLOCK_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <button type="button" className={btn} data-orb-write-h1 onClick={() => onCommand('formatBlock', 'h1')} aria-label="Heading 1">
        <OrbIcon name="heading1" size="sm" />
      </button>
      <button type="button" className={btn} data-orb-write-h2 onClick={() => onCommand('formatBlock', 'h2')} aria-label="Heading 2">
        <OrbIcon name="heading2" size="sm" />
      </button>
      </div>

      <span className="mx-0.5 hidden h-5 w-px bg-[var(--orb-line)]/40 sm:block" aria-hidden />

      <div className="flex flex-wrap items-center gap-1" data-orb-write-toolbar-group="format">
      <span className="hidden px-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--orb-muted)] sm:inline">Format</span>
      <button type="button" className={btn} disabled={!canUndo} data-orb-write-undo onClick={() => onCommand('undo')} aria-label="Undo">
        <OrbIcon name="undo" size="sm" />
      </button>
      <button type="button" className={btn} disabled={!canRedo} data-orb-write-redo onClick={() => onCommand('redo')} aria-label="Redo">
        <OrbIcon name="redo" size="sm" />
      </button>
      <span className="mx-0.5 h-5 w-px bg-[var(--orb-line)]/40" aria-hidden />
      <button type="button" className={btn} data-orb-write-bold onClick={() => onCommand('bold')} aria-label="Bold">
        <OrbIcon name="bold" size="sm" />
      </button>
      <button type="button" className={btn} data-orb-write-italic onClick={() => onCommand('italic')} aria-label="Italic">
        <OrbIcon name="italic" size="sm" />
      </button>
      <button type="button" className={btn} data-orb-write-underline onClick={() => onCommand('underline')} aria-label="Underline">
        <OrbIcon name="underline" size="sm" />
      </button>
      <button type="button" className={btn} data-orb-write-bullet onClick={() => onCommand('insertUnorderedList')} aria-label="Bullet list">
        <OrbIcon name="list" size="sm" />
      </button>
      <button type="button" className={btn} data-orb-write-numbered onClick={() => onCommand('insertOrderedList')} aria-label="Numbered list">
        <OrbIcon name="list_ordered" size="sm" />
      </button>
      <button type="button" className={btn} data-orb-write-quote onClick={() => onCommand('formatBlock', 'blockquote')} aria-label="Quote">
        <OrbIcon name="quote" size="sm" />
      </button>
      <button type="button" className={btn} data-orb-write-divider onClick={() => onCommand('insertHorizontalRule')} aria-label="Divider">
        <OrbIcon name="divider" size="sm" />
      </button>
      <button type="button" className={btn} data-orb-write-table onClick={() => onCommand('insertTable')} aria-label="Insert table">
        <OrbIcon name="table" size="sm" />
      </button>
      <button type="button" className={btn} data-orb-write-align-left onClick={() => onCommand('justifyLeft')} aria-label="Align left">
        <OrbIcon name="align_left" size="sm" />
      </button>
      <button type="button" className={btn} data-orb-write-clear-format onClick={() => onCommand('removeFormat')} aria-label="Clear formatting">
        <OrbIcon name="clear_format" size="sm" />
      </button>
      </div>

      <span className="mx-0.5 hidden h-5 w-px bg-[var(--orb-line)]/40 sm:block" aria-hidden />

      <div className="flex flex-wrap items-center gap-1" data-orb-write-toolbar-group="review">
        <span className="hidden px-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--orb-muted)] sm:inline">Review</span>
        {typeof wordCount === 'number' ? (
          <span className="hidden px-1 text-[10px] text-[var(--orb-muted)] sm:inline" data-orb-write-word-count>
            {wordCount} words
          </span>
        ) : null}
        {lastEdited ? (
          <span className="hidden px-1 text-[10px] text-[var(--orb-muted)] lg:inline" data-orb-write-last-edited>
            {lastEdited}
          </span>
        ) : null}
        {onApprove ? (
          <button
            type="button"
            data-orb-write-approve
            data-orb-write-finalise
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--orb-primary)] px-2.5 py-1.5 text-[10px] font-semibold text-white shadow-sm shadow-sky-500/15"
            onClick={onApprove}
          >
            <OrbIcon name="check" size="sm" className="text-white" />
            <span className="hidden sm:inline">Approve</span>
          </button>
        ) : null}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-1" data-orb-write-toolbar-group="export">
      <span className="hidden px-1 text-[9px] font-semibold uppercase tracking-wide text-[var(--orb-muted)] sm:inline">Export</span>
        <OrbWriteZoomControls
          zoomMode={zoomMode}
          zoomPercent={zoomPercent}
          onZoomIn={onZoomIn}
          onZoomOut={onZoomOut}
          onFitWidth={onFitWidth}
          onResetZoom={onResetZoom}
        />
        {onCopy ? (
          <button type="button" data-orb-write-copy className={btn} onClick={onCopy} aria-label="Copy">
            <OrbIcon name="copy" size="sm" />
          </button>
        ) : null}
        {onPrint ? (
          <button type="button" data-orb-write-print className={btn} onClick={onPrint} aria-label="Print">
            <OrbIcon name="print" size="sm" />
          </button>
        ) : null}
        {onExportPdf ? (
          <button type="button" data-orb-write-export-pdf className={btn} onClick={onExportPdf} aria-label="Export PDF">
            <OrbIcon name="download" size="sm" />
          </button>
        ) : null}
        {onSaveDraft ? (
          <button type="button" data-orb-write-save-draft className={btn} onClick={onSaveDraft} aria-label="Save draft">
            <OrbIcon name="save" size="sm" />
          </button>
        ) : null}
      </div>
    </div>
  )
}
