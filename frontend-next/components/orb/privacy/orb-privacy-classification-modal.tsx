'use client'

import { useEffect, useRef } from 'react'

import { getOrbDataClassificationGuidance } from '@/lib/orb/privacy/orb-data-classification'

export function OrbPrivacyClassificationModal({
  open,
  onClose
}: {
  open: boolean
  onClose: () => void
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const guidance = getOrbDataClassificationGuidance()

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="orb-privacy-classification-modal w-[min(32rem,calc(100vw-2rem))] max-h-[85vh] overflow-y-auto rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface)] p-0 text-[var(--orb-foreground)] shadow-xl backdrop:bg-black/40"
      data-orb-privacy-classification-modal
      onClose={onClose}
    >
      <div className="border-b border-[var(--orb-line)]/40 px-4 py-3">
        <h2 className="text-sm font-bold">What information can I enter?</h2>
        <p className="mt-1 text-xs text-[var(--orb-muted)]">
          Guidance only — not perfect automated detection. Follow your organisation’s policies.
        </p>
      </div>
      <div className="space-y-4 px-4 py-4 text-xs leading-5">
        <section data-orb-classification-green>
          <h3 className="font-semibold text-emerald-700">{guidance.green.label}</h3>
          <p className="mt-1 text-[var(--orb-muted)]">{guidance.green.summary}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--orb-muted)]">
            {guidance.green.examples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section data-orb-classification-amber>
          <h3 className="font-semibold text-amber-700">{guidance.amber.label}</h3>
          <p className="mt-1 text-[var(--orb-muted)]">{guidance.amber.summary}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--orb-muted)]">
            {guidance.amber.examples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <section data-orb-classification-red>
          <h3 className="font-semibold text-rose-700">{guidance.red.label}</h3>
          <p className="mt-1 text-[var(--orb-muted)]">{guidance.red.summary}</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--orb-muted)]">
            {guidance.red.examples.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
        <p className="text-[var(--orb-muted)]" data-orb-behaviour-is-communication>
          {guidance.behaviourIsCommunication}
        </p>
        <p className="text-[var(--orb-muted)]" data-orb-child-voice-central>
          {guidance.childVoiceCentral}
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--orb-line)]/40 px-4 py-3">
        <a
          href="/orb/privacy"
          className="text-xs font-semibold text-[var(--orb-primary,#1677ff)] hover:underline"
          data-orb-privacy-full-link
        >
          Full privacy notice
        </a>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border border-[var(--orb-line)] px-3 py-1.5 text-xs font-semibold"
        >
          Close
        </button>
      </div>
    </dialog>
  )
}
