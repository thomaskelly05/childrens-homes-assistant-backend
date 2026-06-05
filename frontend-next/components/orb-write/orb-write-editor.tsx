'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import { OrbWriteToolbar } from '@/components/orb-write/orb-write-toolbar'
import type { OrbWriteDocument } from '@/lib/orb/write/orb-write-types'

function htmlToPlainText(html: string): string {
  if (typeof document === 'undefined') return html
  const div = document.createElement('div')
  div.innerHTML = html
  return div.innerText || div.textContent || ''
}

export function OrbWriteEditor({
  document: doc,
  onChange,
  onWordCountChange
}: {
  document: OrbWriteDocument
  onChange: (body: string, plainText: string) => void
  onWordCountChange?: (count: number) => void
}) {
  const editorRef = useRef<HTMLDivElement>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  useEffect(() => {
    if (!editorRef.current) return
    if (editorRef.current.innerHTML !== doc.body && !editorRef.current.matches(':focus')) {
      editorRef.current.innerHTML = doc.body.includes('<') ? doc.body : doc.body.replace(/\n/g, '<br/>')
    }
  }, [doc.body])

  const syncContent = useCallback(() => {
    if (!editorRef.current) return
    const html = editorRef.current.innerHTML
    const plain = htmlToPlainText(html)
    const words = plain.trim().split(/\s+/).filter(Boolean).length
    onChange(html, plain)
    onWordCountChange?.(words)
  }, [onChange, onWordCountChange])

  const runCommand = useCallback(
    (command: string, value?: string) => {
      if (!editorRef.current) return
      editorRef.current.focus()
      if (command === 'insertTable') {
        document.execCommand('insertHTML', false, '<table border="1" cellpadding="4"><tr><td>Column 1</td><td>Column 2</td></tr><tr><td></td><td></td></tr></table><p></p>')
      } else if (command === 'formatBlock' && value) {
        document.execCommand('formatBlock', false, value)
      } else {
        document.execCommand(command, false, value)
      }
      syncContent()
      setCanUndo(document.queryCommandEnabled('undo'))
      setCanRedo(document.queryCommandEnabled('redo'))
    },
    [syncContent]
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--orb-line)]/50 bg-[var(--orb-surface-elevated)]" data-orb-write-editor>
      <OrbWriteToolbar onCommand={runCommand} canUndo={canUndo} canRedo={canRedo} />
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        spellCheck
        data-orb-write-body
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3 text-sm leading-relaxed text-[var(--orb-foreground)] focus:outline-none [&_h1]:mb-2 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-[var(--orb-line)]/40 [&_td]:p-2 [&_ul]:list-disc"
        onInput={syncContent}
        onBlur={syncContent}
        aria-label="Document body"
      />
    </div>
  )
}
