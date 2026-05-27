'use client'

import { findJudgementalPhrases } from '@/lib/record/recording-quality-coach'

export function RecordingLanguageSuggestions({ body, title = '' }: { body: string; title?: string }) {
  const combined = `${title}\n${body}`.trim()
  const matches = findJudgementalPhrases(combined)

  if (!matches.length) {
    return (
      <section data-testid="recording-language-suggestions" className="rounded-2xl border border-slate-100 bg-white p-4 text-sm font-semibold text-slate-600">
        <p className="font-black text-slate-800">Child-centred language</p>
        <p className="mt-1">No flagged wording detected. Keep language factual and respectful.</p>
      </section>
    )
  }

  return (
    <section data-testid="recording-language-suggestions" className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-900">Child-centred language</p>
      <ul className="mt-3 space-y-3">
        {matches.map((match) => (
          <li key={match.label} className="text-sm font-semibold leading-6 text-amber-950">
            <span className="font-black">“{match.label}”</span>
            <span className="text-amber-800"> → </span>
            <span>“{match.suggestion}”</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs font-semibold leading-5 text-amber-900">
        Choose wording that is accurate and true to what happened.
      </p>
    </section>
  )
}
