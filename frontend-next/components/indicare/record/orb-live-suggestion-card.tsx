'use client'

import { Check, Copy, X } from 'lucide-react'

import type { LiveRecordingHint } from '@/lib/record/live-recording-analysis'

export function OrbLiveSuggestionCard({
  hint,
  onAccept,
  onCopy,
  onDismiss
}: {
  hint: LiveRecordingHint
  onAccept?: (hint: LiveRecordingHint) => void
  onCopy?: (hint: LiveRecordingHint) => void
  onDismiss?: (hint: LiveRecordingHint) => void
}) {
  const severityClass =
    hint.severity === 'review'
      ? 'border-rose-200 bg-rose-50/80'
      : hint.severity === 'attention'
        ? 'border-amber-200 bg-amber-50/70'
        : 'border-slate-100 bg-slate-50/80'

  return (
    <li
      data-testid="orb-live-suggestion-card"
      data-hint-id={hint.id}
      data-hint-category={hint.category}
      className={`rounded-xl border px-3 py-2 ${severityClass}`}
    >
      <p className="text-xs font-semibold leading-5 text-slate-800">{hint.message}</p>
      {hint.suggestion ? (
        <p className="mt-1 text-xs font-black text-slate-700">Suggestion: “{hint.suggestion}”</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {hint.suggestion && onAccept ? (
          <button
            type="button"
            data-testid="orb-suggestion-accept"
            onClick={() => onAccept(hint)}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2 py-1 text-[10px] font-black text-white"
          >
            <Check className="h-3 w-3" aria-hidden />
            Accept
          </button>
        ) : null}
        {onCopy ? (
          <button
            type="button"
            data-testid="orb-suggestion-copy"
            onClick={() => onCopy(hint)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-700"
          >
            <Copy className="h-3 w-3" aria-hidden />
            Copy
          </button>
        ) : null}
        {onDismiss ? (
          <button
            type="button"
            data-testid="orb-suggestion-dismiss"
            onClick={() => onDismiss(hint)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-black text-slate-500"
          >
            <X className="h-3 w-3" aria-hidden />
            Dismiss
          </button>
        ) : null}
      </div>
    </li>
  )
}
