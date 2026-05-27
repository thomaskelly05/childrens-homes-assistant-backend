'use client'

import { Copy } from 'lucide-react'

import type { OrbDocumentAction } from '@/lib/orb/standalone-client'

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-200 border-red-400/30',
  high: 'bg-amber-500/15 text-amber-100 border-amber-400/30',
  medium: 'bg-cyan-500/10 text-cyan-100 border-cyan-400/25',
  low: 'bg-slate-500/10 text-slate-300 border-white/10'
}

export function OrbActionPlanDisplay({
  summary,
  actions,
  reviewNote,
  onCopy
}: {
  summary?: string | null
  actions: OrbDocumentAction[]
  reviewNote?: string | null
  onCopy?: () => void
}) {
  if (!actions.length && !summary) return null

  function copyAll() {
    const lines = [
      summary || '',
      '',
      ...actions.map(
        (a) =>
          `[${(a.priority || 'medium').toUpperCase()}] ${a.action}\nWhy: ${a.why_it_matters || '—'}\nOwner: ${a.suggested_owner_label || 'team'}\nTimescale: ${a.timescale || 'TBC'}`
      ),
      reviewNote ? `\n${reviewNote}` : ''
    ]
    void navigator.clipboard.writeText(lines.join('\n'))
    onCopy?.()
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Draft action plan</h3>
        <button
          type="button"
          onClick={copyAll}
          className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/[0.06]"
        >
          <Copy className="h-3.5 w-3.5" aria-hidden />
          Copy plan
        </button>
      </div>
      {summary ? <p className="text-sm text-slate-300">{summary}</p> : null}
      <ul className="space-y-2">
        {actions.map((action, index) => {
          const priority = action.priority || 'medium'
          return (
            <li
              key={`${action.action}-${index}`}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${PRIORITY_STYLES[priority] || PRIORITY_STYLES.medium}`}
                >
                  {priority}
                </span>
                {action.review_needed ? (
                  <span className="text-[10px] text-amber-200/80">Review needed</span>
                ) : null}
              </div>
              <p className="mt-2 text-sm font-medium text-white">{action.action}</p>
              {action.why_it_matters ? (
                <p className="mt-1 text-xs text-slate-400">
                  <span className="text-slate-500">Why it matters:</span> {action.why_it_matters}
                </p>
              ) : null}
              <div className="mt-2 flex flex-wrap gap-3 text-[11px] text-slate-500">
                {action.suggested_owner_label ? <span>Owner: {action.suggested_owner_label}</span> : null}
                {action.timescale ? <span>Timescale: {action.timescale}</span> : null}
                {action.source_basis ? <span>Basis: {action.source_basis}</span> : null}
              </div>
            </li>
          )
        })}
      </ul>
      {reviewNote ? (
        <p className="rounded-lg border border-amber-400/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90">
          {reviewNote}
        </p>
      ) : null}
      <p className="text-[10px] text-slate-500">
        Draft only — not written to IndiCare OS action tables. Review locally before implementation.
      </p>
    </div>
  )
}
