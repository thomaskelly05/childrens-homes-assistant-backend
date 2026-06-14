'use client'

import { useEffect, useRef, useState } from 'react'
import {
  BookOpen,
  FileText,
  FolderOpen,
  Mic,
  PenLine,
  Plus,
  Save,
  Sparkles,
  Upload
} from 'lucide-react'

export type OrbComposerPlusAction =
  | 'upload_document'
  | 'photo_library'
  | 'take_photo'
  | 'choose_files'
  | 'attach_image'
  | 'attach_photo'
  | 'review_text'
  | 'use_template'
  | 'knowledge'
  | 'orb_voice'
  | 'orb_dictate'
  | 'orb_write'
  | 'privacy_guidance'
  | 'learning_session'
  | 'saved_outputs'

const ITEMS: Array<{
  id: OrbComposerPlusAction
  label: string
  icon: typeof Plus
}> = [
  { id: 'upload_document', label: 'Upload document', icon: Upload },
  { id: 'review_text', label: 'Review text', icon: FileText },
  { id: 'use_template', label: 'Use template', icon: FileText },
  { id: 'knowledge', label: 'Open Knowledge Centre', icon: BookOpen },
  { id: 'orb_voice', label: 'Start ORB Voice', icon: Mic },
  { id: 'orb_dictate', label: 'ORB Dictate', icon: PenLine },
  { id: 'learning_session', label: 'Create learning session', icon: Sparkles },
  { id: 'saved_outputs', label: 'Saved Outputs', icon: Save }
]

export function OrbComposerPlusMenu({
  onSelect,
  onAttachFiles
}: {
  onSelect: (action: OrbComposerPlusAction) => void
  onAttachFiles?: () => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <div className="relative" ref={rootRef} data-orb-composer-plus-menu>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)]"
        aria-label="More actions"
        aria-expanded={open}
        data-orb-composer-plus-trigger
      >
        <Plus className="h-4 w-4" aria-hidden />
      </button>
      {open ? (
        <div
          className="orb-composer-plus-dropdown absolute bottom-full left-0 z-50 mb-2 min-w-[13.5rem] rounded-xl border border-[var(--orb-line)]/60 bg-[rgba(12,16,28,0.98)] py-1 shadow-xl backdrop-blur-xl"
          role="menu"
          data-orb-composer-plus-dropdown
        >
          {ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-[var(--orb-foreground)] transition hover:bg-[var(--orb-surface-hover)]"
                data-orb-composer-plus-item={item.id}
                onClick={() => {
                  setOpen(false)
                  if (item.id === 'upload_document') {
                    onAttachFiles?.()
                  } else {
                    onSelect(item.id)
                  }
                }}
              >
                <Icon className="h-4 w-4 shrink-0 text-[#5ec8ff]" aria-hidden />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
