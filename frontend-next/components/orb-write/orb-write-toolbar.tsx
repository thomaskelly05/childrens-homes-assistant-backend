'use client'

import {
  Bold,
  Check,
  ClipboardCopy,
  Download,
  Heading1,
  Italic,
  List,
  ListOrdered,
  Printer,
  Redo2,
  Save,
  Table,
  Undo2
} from 'lucide-react'

import { OrbWriteZoomControls } from '@/components/orb-write/orb-write-zoom-controls'
import type { OrbWriteZoomLevel, OrbWriteZoomMode } from '@/lib/orb/write/orb-write-zoom'

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
    'rounded-lg border border-[var(--orb-line)]/50 p-1.5 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] disabled:opacity-40'

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b border-[var(--orb-line)]/40 px-2 py-1.5"
      data-orb-write-toolbar
      role="toolbar"
      aria-label="Document formatting and actions"
    >
      <button type="button" className={btn} disabled={!canUndo} data-orb-write-undo onClick={() => onCommand('undo')} aria-label="Undo">
        <Undo2 className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} disabled={!canRedo} data-orb-write-redo onClick={() => onCommand('redo')} aria-label="Redo">
        <Redo2 className="h-3.5 w-3.5" />
      </button>
      <span className="mx-0.5 h-5 w-px bg-[var(--orb-line)]/40" />
      <button type="button" className={btn} data-orb-write-h1 onClick={() => onCommand('formatBlock', 'h1')} aria-label="Heading">
        <Heading1 className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} data-orb-write-bold onClick={() => onCommand('bold')} aria-label="Bold">
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} data-orb-write-italic onClick={() => onCommand('italic')} aria-label="Italic">
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} data-orb-write-bullet onClick={() => onCommand('insertUnorderedList')} aria-label="Bullet list">
        <List className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} data-orb-write-numbered onClick={() => onCommand('insertOrderedList')} aria-label="Numbered list">
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} data-orb-write-table onClick={() => onCommand('insertTable')} aria-label="Insert table">
        <Table className="h-3.5 w-3.5" />
      </button>

      <span className="mx-0.5 hidden h-5 w-px bg-[var(--orb-line)]/40 sm:block" />

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

      <div className="ml-auto flex flex-wrap items-center gap-1">
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
            <ClipboardCopy className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onPrint ? (
          <button type="button" data-orb-write-print className={btn} onClick={onPrint} aria-label="Print">
            <Printer className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onExportPdf ? (
          <button type="button" data-orb-write-export-pdf className={btn} onClick={onExportPdf} aria-label="Export PDF">
            <Download className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onSaveDraft ? (
          <button type="button" data-orb-write-save-draft className={btn} onClick={onSaveDraft} aria-label="Save draft">
            <Save className="h-3.5 w-3.5" />
          </button>
        ) : null}
        {onApprove ? (
          <button
            type="button"
            data-orb-write-approve
            className="inline-flex items-center gap-1 rounded-lg bg-[var(--orb-primary)] px-2 py-1.5 text-[10px] font-medium text-white"
            onClick={onApprove}
          >
            <Check className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Approve</span>
          </button>
        ) : null}
      </div>
    </div>
  )
}
