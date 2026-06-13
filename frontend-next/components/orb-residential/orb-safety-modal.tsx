'use client'

import { useState } from 'react'

import { OrbButton } from '@/components/orb-residential/ui/orb-button'
import { ORB_SAFETY_MODAL_POINTS } from '@/lib/orb/orb-residential-safety-copy'
import { ORB_SAFETY_VERSION, acceptOrbSafety } from '@/lib/orb/orb-billing-client'

export function OrbSafetyModal({ onAccepted }: { onAccepted: () => void }) {
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAccept() {
    setSubmitting(true)
    setError(null)
    try {
      await acceptOrbSafety(ORB_SAFETY_VERSION)
      onAccepted()
    } catch {
      setError('Could not save your acknowledgement. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="orb-safety-title"
      data-orb-safety-modal
    >
      <div
        className="max-h-[min(92dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-2rem))] w-full max-w-md overflow-y-auto rounded-3xl border border-white/10 bg-[#0a1228] p-6 shadow-2xl"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <h2 id="orb-safety-title" className="text-lg font-semibold text-white">
          Before using ORB
        </h2>
        <p
          className="mt-3 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-4 py-3 text-sm leading-relaxed text-sky-100"
          data-orb-safety-subscription-note
        >
          Your subscription or trial is active. This one-time step is required before you can use ORB — it is not a
          payment problem.
        </p>
        <ul className="mt-4 space-y-2 text-base leading-relaxed text-slate-300" data-orb-safety-copy>
          {ORB_SAFETY_MODAL_POINTS.map((point) => (
            <li key={point} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" aria-hidden />
              <span>{point}</span>
            </li>
          ))}
        </ul>
        {error ? (
          <p className="mt-3 text-base text-red-400" data-orb-safety-save-error role="alert">
            {error}
          </p>
        ) : null}
        <OrbButton
          className="mt-6 min-h-[3rem] w-full text-base md:min-h-[3.5rem]"
          onClick={() => void handleAccept()}
          disabled={submitting}
          data-orb-safety-accept
        >
          {submitting ? 'Saving…' : 'I understand'}
        </OrbButton>
      </div>
    </div>
  )
}
