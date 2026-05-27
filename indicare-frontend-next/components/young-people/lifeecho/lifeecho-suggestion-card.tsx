'use client'

import { useState } from 'react'

export function LifeEchoSuggestionCard({
  suggestion,
  onApprove,
  onReject
}: {
  suggestion: Record<string, unknown>
  onApprove?: (id: string) => Promise<void>
  onReject?: (id: string) => Promise<void>
}) {
  const [busy, setBusy] = useState(false)
  const id = String(suggestion.id || '')

  return (
    <article data-testid="lifeecho-suggestion-card" className="rounded-[24px] border border-amber-200 bg-amber-50/50 p-5">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-800">Suggested memory · review required</p>
      <h3 className="mt-2 text-lg font-black text-slate-950">{String(suggestion.title || 'Suggestion')}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-700">{String(suggestion.safe_summary || '')}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || !onApprove}
          onClick={async () => {
            if (!onApprove) return
            setBusy(true)
            try {
              await onApprove(id)
            } finally {
              setBusy(false)
            }
          }}
          className="rounded-xl bg-violet-700 px-4 py-2 text-xs font-black text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          disabled={busy || !onReject}
          onClick={async () => {
            if (!onReject) return
            setBusy(true)
            try {
              await onReject(id)
            } finally {
              setBusy(false)
            }
          }}
          className="rounded-xl border border-slate-300 px-4 py-2 text-xs font-black text-slate-700 disabled:opacity-50"
        >
          Reject
        </button>
      </div>
    </article>
  )
}
