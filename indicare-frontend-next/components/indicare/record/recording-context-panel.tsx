'use client'

import {
  detectPrivacyIdentifiers,
  detectSafeguardingReviewTerms
} from '@/lib/record/recording-quality-coach'

export function RecordingContextPanel({ body, title = '' }: { body: string; title?: string }) {
  const combined = `${title}\n${body}`.trim()
  const safeguarding = detectSafeguardingReviewTerms(combined)
  const identifiers = detectPrivacyIdentifiers(combined)

  return (
    <div className="space-y-3" data-testid="recording-context-panel">
      <section className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 text-sm font-semibold leading-6 text-slate-700">
        <p className="font-black text-slate-900">Privacy</p>
        <p className="mt-1">Only include necessary personal information. Avoid unnecessary third-party details.</p>
      </section>

      {identifiers.length ? (
        <section
          data-testid="recording-privacy-identifiers"
          className="rounded-2xl border border-amber-100 bg-amber-50/80 p-4 text-sm font-semibold leading-6 text-amber-950"
        >
          <p className="font-black">Identifier check</p>
          <p className="mt-1">Check whether this identifier is necessary before saving.</p>
          <ul className="mt-2 list-disc pl-5 text-xs">
            {identifiers.map((hit) => (
              <li key={hit.id}>Possible {hit.label}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {safeguarding.length ? (
        <section
          data-testid="recording-safeguarding-prompt"
          className="rounded-2xl border border-rose-100 bg-rose-50/90 p-4 text-sm font-semibold leading-6 text-rose-950"
        >
          <p className="font-black">Manager / safeguarding review</p>
          <p className="mt-1">
            This may need manager or safeguarding review. Follow your home&apos;s procedures.
          </p>
          <p className="mt-2 text-xs text-rose-800">Flagged terms: {safeguarding.join(', ')}</p>
        </section>
      ) : null}
    </div>
  )
}
