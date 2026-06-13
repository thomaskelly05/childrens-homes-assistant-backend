'use client'

import { useEffect, useRef } from 'react'
import { AudioLines, FileText, Mic, PenLine, Shield, X } from 'lucide-react'

import type { OrbComposerPlusAction } from '@/components/orb-standalone/orb-composer-plus-menu'

const MOBILE_TOOL_ITEMS: Array<{
  id: OrbComposerPlusAction
  label: string
  description: string
  icon: typeof Mic
}> = [
  {
    id: 'orb_dictate',
    label: 'Dictate',
    description: 'Turn speech into a record',
    icon: Mic
  },
  {
    id: 'orb_voice',
    label: 'Voice',
    description: 'Talk hands-free',
    icon: AudioLines
  },
  {
    id: 'orb_write',
    label: 'ORB Write',
    description: 'Create or finalise a document',
    icon: PenLine
  },
  {
    id: 'use_template',
    label: 'Record type',
    description: 'Choose a recording template',
    icon: FileText
  },
  {
    id: 'privacy_guidance',
    label: 'Privacy guidance',
    description: 'Safety and data boundaries',
    icon: Shield
  }
]

/** ChatGPT-style composer tools sheet — mobile ORB Residential home only. */
export function OrbResidentialComposerToolsSheet({
  open,
  onClose,
  onSelect
}: {
  open: boolean
  onClose: () => void
  onSelect: (action: OrbComposerPlusAction) => void
}) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[68] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-label="Composer tools"
      aria-modal="true"
      data-orb-composer-tools-sheet
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="max-h-[min(70dvh,28rem)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-3 shadow-2xl sm:rounded-2xl">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--orb-foreground)]">Tools</h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <ul className="space-y-1" data-orb-composer-tools-list>
          {MOBILE_TOOL_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full min-h-[2.75rem] items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-[var(--orb-surface-hover)]"
                  data-orb-composer-tools-item={item.id}
                  onClick={() => {
                    onClose()
                    onSelect(item.id)
                  }}
                >
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--orb-primary-soft)] text-[var(--orb-primary)]">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[var(--orb-foreground)]">{item.label}</span>
                    <span className="block text-xs text-[var(--orb-muted)]">{item.description}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
