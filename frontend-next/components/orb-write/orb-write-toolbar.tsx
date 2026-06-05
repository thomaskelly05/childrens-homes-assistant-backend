'use client'

import {
  Bold,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  Redo2,
  Table,
  Underline,
  Undo2
} from 'lucide-react'

export function OrbWriteToolbar({
  onCommand,
  canUndo,
  canRedo
}: {
  onCommand: (command: string, value?: string) => void
  canUndo: boolean
  canRedo: boolean
}) {
  const btn =
    'rounded-lg border border-[var(--orb-line)]/50 p-2 text-[var(--orb-muted)] hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] disabled:opacity-40'

  return (
    <div
      className="flex flex-wrap items-center gap-1 border-b border-[var(--orb-line)]/40 px-2 py-1.5"
      data-orb-write-toolbar
      role="toolbar"
      aria-label="Document formatting"
    >
      <button type="button" className={btn} disabled={!canUndo} data-orb-write-undo onClick={() => onCommand('undo')} aria-label="Undo">
        <Undo2 className="h-4 w-4" />
      </button>
      <button type="button" className={btn} disabled={!canRedo} data-orb-write-redo onClick={() => onCommand('redo')} aria-label="Redo">
        <Redo2 className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-[var(--orb-line)]/40" />
      <button type="button" className={btn} data-orb-write-bold onClick={() => onCommand('bold')} aria-label="Bold">
        <Bold className="h-4 w-4" />
      </button>
      <button type="button" className={btn} data-orb-write-italic onClick={() => onCommand('italic')} aria-label="Italic">
        <Italic className="h-4 w-4" />
      </button>
      <button type="button" className={btn} data-orb-write-underline onClick={() => onCommand('underline')} aria-label="Underline">
        <Underline className="h-4 w-4" />
      </button>
      <span className="mx-1 h-5 w-px bg-[var(--orb-line)]/40" />
      <button type="button" className={btn} data-orb-write-h1 onClick={() => onCommand('formatBlock', 'h1')} aria-label="Heading 1">
        <Heading1 className="h-4 w-4" />
      </button>
      <button type="button" className={btn} data-orb-write-h2 onClick={() => onCommand('formatBlock', 'h2')} aria-label="Heading 2">
        <Heading2 className="h-4 w-4" />
      </button>
      <button type="button" className={btn} data-orb-write-bullet onClick={() => onCommand('insertUnorderedList')} aria-label="Bullet list">
        <List className="h-4 w-4" />
      </button>
      <button type="button" className={btn} data-orb-write-numbered onClick={() => onCommand('insertOrderedList')} aria-label="Numbered list">
        <ListOrdered className="h-4 w-4" />
      </button>
      <button type="button" className={btn} data-orb-write-table onClick={() => onCommand('insertTable')} aria-label="Insert table">
        <Table className="h-4 w-4" />
      </button>
    </div>
  )
}
