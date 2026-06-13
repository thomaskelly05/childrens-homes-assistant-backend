'use client'

import { useEffect, useRef } from 'react'
import { Shield, X } from 'lucide-react'

import { ORB_RESIDENTIAL_PRIVACY_GUIDANCE_ITEMS, ORB_RESIDENTIAL_PRIVACY_STRIP } from '@/lib/orb/orb-residential-copy'

/** Compact privacy link + bottom sheet for ORB Residential mobile home. */
export function OrbResidentialPrivacyGuidanceLink({
  onOpen,
  className = ''
}: {
  onOpen: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`inline-flex min-h-[2.75rem] items-center gap-1.5 text-xs font-medium text-[var(--orb-muted)] underline-offset-4 transition hover:text-[var(--orb-foreground)] hover:underline ${className}`.trim()}
      data-orb-privacy-guidance-link
      aria-haspopup="dialog"
    >
      <Shield className="h-3.5 w-3.5 shrink-0 text-[var(--orb-primary)]" aria-hidden />
      Privacy guidance
    </button>
  )
}

export function OrbResidentialPrivacyGuidanceSheet({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
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
      aria-label="Privacy guidance"
      aria-modal="true"
      data-orb-privacy-guidance-sheet
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="max-h-[min(70dvh,28rem)] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-4 shadow-2xl sm:rounded-2xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--orb-foreground)]">
            <Shield className="h-4 w-4 shrink-0 text-[var(--orb-primary)]" aria-hidden />
            Privacy guidance
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)]"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="text-xs leading-5 text-[var(--orb-muted)]" data-orb-privacy-guidance-intro>
          {ORB_RESIDENTIAL_PRIVACY_STRIP}
        </p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--orb-foreground)]" data-orb-privacy-guidance-list>
          {ORB_RESIDENTIAL_PRIVACY_GUIDANCE_ITEMS.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-[var(--orb-primary)]" aria-hidden>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
