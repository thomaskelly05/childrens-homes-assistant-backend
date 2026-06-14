'use client'

import { createPortal } from 'react-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { ChevronLeft, X } from 'lucide-react'

import { orbPrivacyCloseLabel } from '@/lib/orb/orb-privacy-framework'

/** Short detail sheet for Privacy & Data settings rows — back returns to settings. */
export function OrbPrivacyDetailSheet({
  open,
  title,
  onClose,
  children,
  returnOrigin = 'settings'
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  returnOrigin?: 'settings' | 'account'
}) {
  const [mounted, setMounted] = useState(false)
  const closeLabel = orbPrivacyCloseLabel(returnOrigin)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])

  if (!open || !mounted) return null

  const sheet = (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-label={title}
      aria-modal="true"
      data-orb-privacy-detail-sheet
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="orb-liquid-panel flex max-h-[min(78dvh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--orb-line)]/60 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-[var(--orb-muted)] transition hover:text-[var(--orb-foreground)]"
            data-orb-privacy-detail-back
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            {closeLabel}
          </button>
          <h2 className="flex-1 text-center text-sm font-semibold text-[var(--orb-foreground)]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)]"
            aria-label="Close"
            data-orb-privacy-detail-close
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-sm leading-6 text-[var(--orb-foreground)]">{children}</div>
      </div>
    </div>
  )

  return createPortal(sheet, document.body)
}
