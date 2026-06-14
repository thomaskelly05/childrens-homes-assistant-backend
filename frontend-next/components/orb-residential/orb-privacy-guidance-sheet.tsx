'use client'

import { createPortal } from 'react-dom'
import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, Shield, X } from 'lucide-react'

import {
  ORB_PRIVACY_GUIDANCE_TITLE,
  ORB_PRIVACY_PRINCIPLES,
  ORB_RESIDENTIAL_PRIVACY_GUIDANCE_ITEMS,
  ORB_RESIDENTIAL_PRIVACY_STRIP,
  orbPrivacyCloseLabel,
  type OrbPrivacyReturnOrigin
} from '@/lib/orb/orb-privacy-framework'

/** Icon-only privacy trigger for composer chrome — no extra vertical space. */
export function OrbResidentialPrivacyGuidanceIcon({
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
      className={`inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-full text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)] hover:text-[var(--orb-foreground)] ${className}`.trim()}
      data-orb-privacy-guidance-trigger
      aria-label="Privacy guidance"
      aria-haspopup="dialog"
      title="Privacy & responsibility"
    >
      <Shield className="h-4 w-4 shrink-0 text-[var(--orb-primary)]" aria-hidden />
    </button>
  )
}

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
      Privacy & responsibility
    </button>
  )
}

export function OrbResidentialPrivacyGuidanceSheet({
  open,
  onClose,
  returnOrigin = 'composer'
}: {
  open: boolean
  onClose: () => void
  returnOrigin?: OrbPrivacyReturnOrigin
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const [mounted, setMounted] = useState(false)
  const closeLabel = orbPrivacyCloseLabel(returnOrigin)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    document.body.setAttribute('data-orb-privacy-guidance-open', 'true')
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.removeAttribute('data-orb-privacy-guidance-open')
    }
  }, [onClose, open])

  if (!open || !mounted) return null

  const sheet = (
    <div
      className="fixed inset-0 z-[69] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-label={ORB_PRIVACY_GUIDANCE_TITLE}
      aria-modal="true"
      data-orb-privacy-guidance-sheet
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className="flex max-h-[min(78dvh,32rem)] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] shadow-2xl sm:rounded-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--orb-line)]/60 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[2.75rem] items-center gap-1 rounded-lg px-1 py-1 text-sm font-medium text-[var(--orb-muted)] transition hover:text-[var(--orb-foreground)]"
            data-orb-privacy-guidance-back
            aria-label={closeLabel}
          >
            <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{closeLabel}</span>
          </button>
          <h2 className="flex flex-1 items-center justify-center gap-2 text-sm font-semibold text-[var(--orb-foreground)]">
            <Shield className="h-4 w-4 shrink-0 text-[var(--orb-primary)]" aria-hidden />
            {ORB_PRIVACY_GUIDANCE_TITLE}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--orb-muted)] transition hover:bg-[var(--orb-surface-hover)]"
            aria-label="Close"
            data-orb-privacy-guidance-close
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
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
          <ul className="mt-4 space-y-2 border-t border-[var(--orb-line)]/50 pt-3" data-orb-privacy-guidance-principles>
            {ORB_PRIVACY_PRINCIPLES.slice(0, 4).map((principle) => (
              <li key={principle.id} className="text-xs leading-5 text-[var(--orb-muted)]">
                <span className="font-medium text-[var(--orb-foreground)]">{principle.title}.</span>{' '}
                {principle.copy}
              </li>
            ))}
          </ul>
        </div>

        <div className="shrink-0 border-t border-[var(--orb-line)]/60 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex w-full min-h-[2.75rem] items-center justify-center rounded-2xl bg-[var(--orb-primary,#1677ff)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            data-orb-privacy-guidance-done
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(sheet, document.body)
}
