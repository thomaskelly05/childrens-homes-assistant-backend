'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export type OrbExplainabilityView = {
  active_brains?: string[]
  frameworks_used?: string[]
  evidence_focus?: string[]
  confidence?: string
  human_review_boundaries?: string[]
  reasoning_summary?: string
  operational_context_used?: boolean
}

export function OrbExplainabilityPanel({ explainability }: { explainability?: OrbExplainabilityView }) {
  const [open, setOpen] = useState(false)
  if (!explainability) return null

  const brains = explainability.active_brains ?? []
  const frameworks = explainability.frameworks_used ?? []
  const evidence = explainability.evidence_focus ?? []
  const boundaries = explainability.human_review_boundaries ?? []

  return (
    <div className="mt-3 border-t border-white/[0.04] pt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-1.5 text-[11px] font-medium text-slate-500 transition hover:text-slate-400"
        aria-expanded={open}
      >
        <ChevronDown className={`h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
        Why ORB said this
      </button>
      {open ? (
        <div className="orb-explainability-fade mt-2 space-y-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-3 text-[11px] leading-5 text-slate-400">
          {explainability.reasoning_summary ? (
            <p className="text-slate-300">{explainability.reasoning_summary}</p>
          ) : null}
          {brains.length ? (
            <div>
              <p className="font-medium text-slate-500">Active cognition</p>
              <p className="mt-0.5 text-slate-400">{brains.slice(0, 8).join(' · ')}</p>
            </div>
          ) : null}
          {frameworks.length ? (
            <div>
              <p className="font-medium text-slate-500">Frameworks referenced</p>
              <p className="mt-0.5">{frameworks.slice(0, 6).join(' · ')}</p>
            </div>
          ) : null}
          {evidence.length ? (
            <div>
              <p className="font-medium text-slate-500">Evidence logic</p>
              <ul className="mt-0.5 list-disc pl-4">
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
              <p className="font-medium text-slate-500">Professional boundaries</p>
              <ul className="mt-0.5 list-disc pl-4">
                {boundaries.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-[10px] text-amber-200/70">
            Human review remains essential — ORB supports thinking; adults retain professional accountability.
          </p>
        </div>
      ) : null}
    </div>
  )
}
