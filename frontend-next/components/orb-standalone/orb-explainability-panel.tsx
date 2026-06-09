'use client'

import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'

import { userHasFounderAccess } from '@/lib/founder/access'
import { ORB_USER_EXPLAINABILITY_CONSIDERATIONS } from '@/lib/orb/orb-residential-copy'

export type OrbExplainabilityView = {
  active_brains?: string[]
  active_engines?: string[]
  how_orb_thought?: string
  intelligence_layers?: Record<string, string>
  standalone_only_reasoning?: boolean
  isn_reasoning_only?: boolean
  frameworks_used?: string[]
  evidence_focus?: string[]
  confidence?: string
  human_review_boundaries?: string[]
  reasoning_summary?: string
  operational_context_used?: boolean
  depth_topic?: string
  reasoning_lenses?: string[]
  cognition_mode?: string
  cognition_display_labels?: string[]
  vault_domains?: string[]
  safeguarding_boundaries?: string[]
  public_considerations?: string[]
}

export function OrbExplainabilityPanel({
  explainability,
  cognitionModeLabel,
  residentialSurface = false,
  userRole
}: {
  explainability?: OrbExplainabilityView
  cognitionModeLabel?: string
  residentialSurface?: boolean
  userRole?: string | null
}) {
  const [open, setOpen] = useState(false)
  if (!explainability) return null

  const showInternal = userHasFounderAccess(userRole) && !residentialSurface
  const publicConsiderations =
    explainability.public_considerations?.length
      ? explainability.public_considerations
      : ORB_USER_EXPLAINABILITY_CONSIDERATIONS

  const brains = explainability.active_brains ?? []
  const frameworks = explainability.frameworks_used ?? []
  const evidence = explainability.evidence_focus ?? []
  const boundaries = explainability.human_review_boundaries ?? explainability.safeguarding_boundaries ?? []
  const lenses = explainability.reasoning_lenses ?? []

  const summary =
    explainability.how_orb_thought ||
    explainability.reasoning_summary ||
    (residentialSurface
      ? 'ORB shaped this answer using residential practice guidance and your question — not live IndiCare OS records unless you connected them.'
      : '')

  const title = residentialSurface ? 'Why ORB answered this way' : 'Why ORB said this'

  return (
    <div className="mt-4 border-t border-[var(--orb-line)] pt-2" data-orb-explainability>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-lg py-1 text-[11px] font-medium text-[var(--orb-muted)] transition hover:text-[var(--orb-foreground)]"
        aria-expanded={open}
      >
        <Sparkles className="h-3.5 w-3.5 text-sky-400/70" aria-hidden />
        {title}
        <ChevronDown className={`ml-auto h-3.5 w-3.5 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open ? (
        <div className="orb-explainability-fade mt-2 space-y-3 rounded-xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] px-4 py-3.5 text-[11px] leading-5 text-[var(--orb-muted)]">
          {summary ? (
            <p className="text-sm leading-6 text-[var(--orb-foreground)]">{summary}</p>
          ) : null}
          {explainability.standalone_only_reasoning ? (
            <p className="text-[10px] text-amber-400/90">
              Standalone guidance only — no live IndiCare OS records were used.
            </p>
          ) : null}

          {residentialSurface || !showInternal ? (
            <div data-orb-explainability-user-facing>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                This response considered
              </p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[var(--orb-foreground)]/90">
                {publicConsiderations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}

          {showInternal ? (
            <>
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
                <div data-orb-explainability-internal>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                    Active brains
                  </p>
                  <p className="mt-1">{brains.slice(0, 8).join(' · ')}</p>
                </div>
              ) : null}
              {lenses.length ? (
                <div data-orb-explainability-internal>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                    Reasoning lenses
                  </p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {lenses.slice(0, 6).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {frameworks.length ? (
                <div data-orb-explainability-internal>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                    Frameworks
                  </p>
                  <p className="mt-1">{frameworks.slice(0, 6).join(' · ')}</p>
                </div>
              ) : null}
              {evidence.length ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                    Evidence focus
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {evidence.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {explainability.confidence ? (
                <p>
                  <span className="font-medium text-[var(--orb-muted)]">Confidence · </span>
                  {explainability.confidence}
                </p>
              ) : null}
              {boundaries.length ? (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--orb-muted)]">
                    Safeguarding boundaries
                  </p>
                  <ul className="mt-1 list-disc pl-4">
                    {boundaries.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
