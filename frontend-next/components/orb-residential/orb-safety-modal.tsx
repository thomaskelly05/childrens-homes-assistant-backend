'use client'

import { useState } from 'react'

import { OrbButton } from '@/components/orb-residential/ui/orb-button'
import { ORB_SAFETY_VERSION, acceptOrbSafety } from '@/lib/orb/orb-billing-client'

const SAFETY_TEXT =
  'ORB supports professional judgement. It does not replace safeguarding procedures, managers, emergency services, local protocols or legal advice. If there is immediate risk of harm, follow your organisation\'s procedures and contact emergency services where required.'

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
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#0a1228] p-6 shadow-2xl">
        <h2 id="orb-safety-title" className="text-lg font-semibold text-white">
          Before using ORB
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-300">{SAFETY_TEXT}</p>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        <OrbButton className="mt-6 w-full" onClick={() => void handleAccept()} disabled={submitting}>
          {submitting ? 'Saving…' : 'I understand'}
        </OrbButton>
      </div>
    </div>
  )
}
