'use client'

import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'

export type OrbExplainabilityView = {
  active_brains?: string[]
  frameworks_used?: string[]
  evidence_focus?: string[]
  confidence?: string
  human_review_boundaries?: string[]
  reasoning_summary?: string
  operational_context_used?: boolean
  depth_topic?: string
  reasoning_lenses?: string[]
  cognition_mode?: string
  safeguarding_boundaries?: string[]
}

export function OrbExplainabilityPanel({
  explainability,
  cognitionModeLabel
}: {
  explainability?: OrbExplainabilityView
  cognitionModeLabel?: string
}) {
  const [open, setOpen] = useState(false)
  if (!explainability) return null

  const brains = explainability.active_brains ?? []
  const frameworks = explainability.frameworks_used ?? []
  const evidence = explainability.evidence_focus ?? []
  const boundaries = explainability.human_review_boundaries ?? explainability.safeguarding_boundaries ?? []
  const lenses = explainability.reasoning_lenses ?? []

  return (
    <div className="mt-4 border-t border-[var(--orb-line)] pt-2" data-orb-explainability>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg py-1 text-[11px] font-medium text-[var(--orb-muted)] transition hover:text-[var(--orb-foreground)]"
        aria-expanded={open}
      >
        <Sparkles className="h-3.5 w-3.5 text-sky-400/70" aria-hidden />
        Why ORB said this
        <ChevronDown className={`ml-auto h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open ? (
        <div className="orb-explainability-fade mt-2 space-y-3 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-4 py-3.5 text-[11px] leading-5 text-[var(--orb-muted)]">
          {explainability.reasoning_summary ? (
            <p className="text-sm leading-6 text-[var(--orb-foreground)]">{explainability.reasoning_summary}</p>
          ) : null}
          {(cognitionModeLabel || explainability.cognition_mode) && (
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-100">
                {explainability.cognition_mode ?? cognitionModeLabel}
              </span>
              {explainability.depth_topic ? (
                <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-0.5 text-[10px] text-violet-100">
                  {explainability.depth_topic}
                </span>
              ) : null}
            </div>
          )}
          {brains.length ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Active brains</p>
              <p className="mt-1 text-slate-300">{brains.slice(0, 8).join(' · ')}</p>
            </div>
          ) : null}
          {lenses.length ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Reasoning lenses</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4 text-slate-400">
                {lenses.slice(0, 6).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {frameworks.length ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Frameworks</p>
              <p className="mt-1">{frameworks.slice(0, 6).join(' · ')}</p>
            </div>
          ) : null}
          {evidence.length ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Evidence focus</p>
              <ul className="mt-1 list-disc pl-4">
                {evidence.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {explainability.confidence ? (
            <p>
              <span className="font-medium text-slate-500">Confidence · </span>
              {explainability.confidence}
            </p>
          ) : null}
          {boundaries.length ? (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">Safeguarding boundaries</p>
              <ul className="mt-1 list-disc pl-4">
                {boundaries.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-[10px] leading-5 text-amber-200/65">
            Human review remains essential — ORB supports thinking; adults retain professional accountability.
          </p>
        </div>
      ) : null}
    </div>
  )
}
