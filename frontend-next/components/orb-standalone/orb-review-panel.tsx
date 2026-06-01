'use client'

import { useState } from 'react'
import { OrbStandalonePanelShell } from '@/components/orb-standalone/orb-standalone-panel-shell'

const REVIEW_USES = [
  'Incidents and safeguarding records',
  'Daily records and handovers',
  'Supervision notes',
  'Risk assessment wording',
  'Inspection readiness review'
] as const

const REVIEW_OUTPUTS = [
  'Quality score and missing information',
  'Safeguarding concerns and escalation prompts',
  'Child voice and chronology gaps',
  'Ofsted readiness indicators',
  'Suggested improved wording',
  'Manager oversight prompts'
] as const

export function OrbReviewPanel({
  open,
  onClose,
  onRunReview,
  initialText = ''
}: {
  open: boolean
  onClose: () => void
  onRunReview: (text: string) => void
  initialText?: string
}) {
  const [text, setText] = useState(initialText)

  return (
    <OrbStandalonePanelShell
      open={open}
      onClose={onClose}
      title="Review"
      subtitle="Quality-review written practice — incidents, records, handovers and inspection readiness."
      panelId="review"
    >
      <div className="space-y-5 p-4 sm:p-5" data-orb-review-panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--orb-muted)]">Use for</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--orb-foreground)]">
              {REVIEW_USES.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-emerald-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h3 className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--orb-muted)]">ORB outputs</h3>
            <ul className="mt-2 space-y-1.5 text-sm text-[var(--orb-muted)]">
              {REVIEW_OUTPUTS.map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-sky-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>
        <p className="text-xs leading-5 text-[var(--orb-muted)]">
          Review supports professional judgement. For uploaded policies or PDFs, use Documents instead.
        </p>
        <label className="block">
          <span className="text-xs font-medium text-[var(--orb-muted)]">Paste text to review</span>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Paste an incident, daily record, handover or supervision note…"
            className="mt-2 w-full rounded-xl border border-[var(--orb-line)]/60 bg-black/20 px-3 py-2 text-sm text-[var(--orb-foreground)] outline-none placeholder:text-[var(--orb-muted)]"
            data-orb-review-input
          />
        </label>
        <button
          type="button"
          disabled={!text.trim()}
          className="w-full rounded-xl bg-gradient-to-r from-emerald-500/90 to-teal-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          data-orb-review-run
          onClick={() => {
            onRunReview(text.trim())
            onClose()
          }}
        >
          Run quality review
        </button>
      </div>
    </OrbStandalonePanelShell>
  )
}
