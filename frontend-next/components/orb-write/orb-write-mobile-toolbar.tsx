'use client'

import { useState } from 'react'
import {
  AlignLeft,
  Bold,
  Check,
  ClipboardCopy,
  Download,
  Eraser,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  MessageCircle,
  Minus,
  MoreHorizontal,
  Printer,
  Quote,
  Redo2,
  Save,
  Sparkles,
  Table,
  Underline,
  Undo2,
  X
} from 'lucide-react'

type MobileSheet = 'review' | 'format' | 'insert' | 'more' | null

export function OrbWriteMobileToolbar({
  onCommand,
  canUndo,
  canRedo,
  onCopy,
  onPrint,
  onExportPdf,
  onSaveDraft,
  onApprove,
  onAskOrb,
  onOpenSource,
  onOpenGuidance,
  onOpenTemplatePicker
}: {
  onCommand: (command: string, value?: string) => void
  canUndo: boolean
  canRedo: boolean
  onCopy?: () => void
  onPrint?: () => void
  onExportPdf?: () => void
  onSaveDraft?: () => void
  onApprove?: () => void
  onAskOrb?: () => void
  onOpenSource?: () => void
  onOpenGuidance?: () => void
  onOpenTemplatePicker?: () => void
}) {
  const [sheet, setSheet] = useState<MobileSheet>(null)

  const btn =
    'inline-flex min-h-[2.75rem] min-w-[2.75rem] items-center justify-center rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface)] px-3 text-xs font-medium text-[var(--orb-foreground)]'

  function closeSheet() {
    setSheet(null)
  }

  function run(command: string, value?: string) {
    onCommand(command, value)
    closeSheet()
  }

  return (
    <>
      <div
        className="orb-write-mobile-toolbar flex shrink-0 items-stretch gap-1 border-t border-[var(--orb-line)]/40 bg-[var(--orb-surface-elevated)] p-2 md:hidden"
        data-orb-write-mobile-toolbar
        role="toolbar"
        aria-label="Document tools"
      >
        <button
          type="button"
          className={`${btn} flex-1 gap-1.5`}
          data-orb-write-mobile-tab="review"
          aria-expanded={sheet === 'review'}
          onClick={() => setSheet((current) => (current === 'review' ? null : 'review'))}
        >
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
          Review
        </button>
        {onApprove ? (
          <button
            type="button"
            className={`${btn} flex-1 gap-1.5 border-emerald-400/40 bg-emerald-500/10 text-emerald-800`}
            data-orb-write-approve
            onClick={onApprove}
          >
            <Check className="h-4 w-4 shrink-0" aria-hidden />
            Approve
          </button>
        ) : null}
        <button
          type="button"
          className={`${btn} flex-1`}
          data-orb-write-mobile-tab="more"
          aria-expanded={sheet === 'more' || sheet === 'format' || sheet === 'insert'}
          onClick={() => setSheet((current) => (current === 'more' ? null : 'more'))}
        >
          More
        </button>
      </div>

      {sheet ? (
        <div
          className="orb-write-mobile-sheet fixed inset-x-0 bottom-0 z-[70] rounded-t-2xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)] shadow-2xl md:hidden"
          data-orb-write-mobile-sheet={sheet}
          role="dialog"
          aria-label={`${sheet} tools`}
        >
          <div className="flex items-center justify-between border-b border-[var(--orb-line)]/40 px-4 py-3">
            <p className="text-sm font-semibold capitalize text-[var(--orb-foreground)]">
              {sheet === 'review' ? 'Review & export' : sheet === 'format' ? 'Format' : sheet === 'insert' ? 'Insert' : 'More'}
            </p>
            <button
              type="button"
              onClick={closeSheet}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--orb-muted)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex max-h-[min(42dvh,20rem)] flex-wrap gap-2 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            {sheet === 'review' ? (
              <>
                {onSaveDraft ? (
                  <button type="button" className={btn} onClick={() => { onSaveDraft(); closeSheet() }} data-orb-write-save-draft>
                    <Save className="h-4 w-4" />
                    Save draft
                  </button>
                ) : null}
                {onCopy ? (
                  <button type="button" className={btn} onClick={() => { onCopy(); closeSheet() }} data-orb-write-copy>
                    <ClipboardCopy className="h-4 w-4" />
                    Copy
                  </button>
                ) : null}
                {onPrint ? (
                  <button type="button" className={btn} onClick={() => { onPrint(); closeSheet() }} data-orb-write-print>
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                ) : null}
                {onExportPdf ? (
                  <button type="button" className={btn} onClick={() => { onExportPdf(); closeSheet() }} data-orb-write-export-pdf>
                    <Download className="h-4 w-4" />
                    Export PDF
                  </button>
                ) : null}
                {onAskOrb ? (
                  <button
                    type="button"
                    className={`${btn} w-full justify-center gap-2`}
                    onClick={() => { onAskOrb(); closeSheet() }}
                    data-orb-write-ask-orb
                  >
                    <MessageCircle className="h-4 w-4" />
                    Ask ORB
                  </button>
                ) : null}
              </>
            ) : null}
            {sheet === 'more' ? (
              <>
                {onOpenSource ? (
                  <button
                    type="button"
                    className={btn}
                    onClick={() => {
                      onOpenSource()
                      closeSheet()
                    }}
                    data-orb-write-mobile-source-entry
                  >
                    Source
                  </button>
                ) : null}
                {onOpenGuidance ? (
                  <button
                    type="button"
                    className={btn}
                    onClick={() => {
                      onOpenGuidance()
                      closeSheet()
                    }}
                    data-orb-write-mobile-guidance-entry
                  >
                    Guidance
                  </button>
                ) : null}
                {onOpenTemplatePicker ? (
                  <button
                    type="button"
                    className={btn}
                    onClick={() => {
                      onOpenTemplatePicker()
                      closeSheet()
                    }}
                    data-orb-write-mobile-record-type-entry
                  >
                    Record type
                  </button>
                ) : null}
                <button type="button" className={btn} onClick={() => setSheet('format')} data-orb-write-mobile-format-entry>
                  Format
                </button>
                <button type="button" className={btn} onClick={() => setSheet('insert')} data-orb-write-mobile-insert-entry>
                  Insert
                </button>
                {onAskOrb ? (
                  <button
                    type="button"
                    className={`${btn} w-full justify-center gap-2`}
                    onClick={() => { onAskOrb(); closeSheet() }}
                    data-orb-write-ask-orb
                  >
                    <MessageCircle className="h-4 w-4" />
                    Ask ORB
                  </button>
                ) : null}
              </>
            ) : null}
            {sheet === 'format' ? (
              <>
                <button type="button" className={btn} disabled={!canUndo} onClick={() => run('undo')} aria-label="Undo">
                  <Undo2 className="h-4 w-4" />
                </button>
                <button type="button" className={btn} disabled={!canRedo} onClick={() => run('redo')} aria-label="Redo">
                  <Redo2 className="h-4 w-4" />
                </button>
                <button type="button" className={btn} onClick={() => run('bold')} aria-label="Bold">
                  <Bold className="h-4 w-4" />
                </button>
                <button type="button" className={btn} onClick={() => run('italic')} aria-label="Italic">
                  <Italic className="h-4 w-4" />
                </button>
                <button type="button" className={btn} onClick={() => run('underline')} aria-label="Underline">
                  <Underline className="h-4 w-4" />
                </button>
                <button type="button" className={btn} onClick={() => run('formatBlock', 'h1')} aria-label="Heading 1">
                  <Heading1 className="h-4 w-4" />
                </button>
                <button type="button" className={btn} onClick={() => run('formatBlock', 'h2')} aria-label="Heading 2">
                  <Heading2 className="h-4 w-4" />
                </button>
                <button type="button" className={btn} onClick={() => run('justifyLeft')} aria-label="Align left">
                  <AlignLeft className="h-4 w-4" />
                </button>
                <button type="button" className={btn} onClick={() => run('removeFormat')} aria-label="Clear formatting">
                  <Eraser className="h-4 w-4" />
                </button>
              </>
            ) : null}
            {sheet === 'insert' ? (
              <>
                <button type="button" className={btn} onClick={() => run('insertUnorderedList')} aria-label="Bullet list">
                  <List className="h-4 w-4" />
                </button>
                <button type="button" className={btn} onClick={() => run('insertOrderedList')} aria-label="Numbered list">
                  <ListOrdered className="h-4 w-4" />
                </button>
                <button type="button" className={btn} onClick={() => run('formatBlock', 'blockquote')} aria-label="Quote">
                  <Quote className="h-4 w-4" />
                </button>
                <button type="button" className={btn} onClick={() => run('insertHorizontalRule')} aria-label="Divider">
                  <Minus className="h-4 w-4" />
                </button>
                <button type="button" className={btn} onClick={() => run('insertTable')} aria-label="Table">
                  <Table className="h-4 w-4" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  )
}
