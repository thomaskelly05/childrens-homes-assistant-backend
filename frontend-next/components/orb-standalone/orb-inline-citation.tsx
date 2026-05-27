'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

import { citationCardForLabel } from '@/lib/orb/citation-cards'
import type { StandaloneOrbSource } from '@/lib/orb/standalone-local-store'

export function OrbInlineCitation({ source }: { source: StandaloneOrbSource }) {
  const [open, setOpen] = useState(false)
  const anchor = source.label || 'Source'
  const short = anchor.length > 28 ? `${anchor.slice(0, 26)}…` : anchor
  const card = citationCardForLabel(anchor)

  return (
    <span className="relative inline-block align-baseline">
      <button
        type="button"
        className="orb-citation-chip-light mx-0.5 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold transition hover:border-[#00B8FF]/45 hover:bg-[#00B8FF]/12"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        data-orb-citation-chip
      >
        [{short}]
      </button>
      {open ? (
        <span
          role="tooltip"
          className="orb-citation-card absolute bottom-full left-1/2 z-30 mb-2 w-72 -translate-x-1/2 rounded-2xl border border-[var(--orb-line)] bg-[var(--orb-surface-elevated)] p-3.5 text-left shadow-2xl backdrop-blur-xl"
          data-orb-citation-popover
        >
          <p className="text-xs font-semibold text-[var(--orb-foreground)]">{card?.title ?? anchor}</p>
          <p className="mt-2 text-[11px] leading-5 text-[var(--orb-muted)]">
            {card?.whyItMatters ?? source.basis ?? 'Institutional guidance anchor referenced in this response.'}
          </p>
          {card?.practicalApplication ? (
            <div className="mt-2.5">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-sky-300/80">In practice</p>
              <p className="mt-0.5 text-[11px] leading-5 text-slate-300">{card.practicalApplication}</p>
            </div>
          ) : null}
          {card?.inspectionMeaning ? (
            <div className="mt-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-violet-300/80">Inspection lens</p>
              <p className="mt-0.5 text-[11px] leading-5 text-slate-400">{card.inspectionMeaning}</p>
            </div>
          ) : null}
          {card?.evidenceExpectations?.length ? (
            <div className="mt-2">
              <p className="text-[9px] font-semibold uppercase tracking-wide text-emerald-300/70">Evidence expectations</p>
              <ul className="mt-0.5 list-disc pl-4 text-[10px] leading-5 text-slate-400">
                {card.evidenceExpectations.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {source.note && source.note !== source.basis ? (
            <p className="mt-2 text-[10px] text-slate-500">{source.note}</p>
          ) : null}
          <p className="mt-2.5 flex items-center gap-1 text-[9px] uppercase tracking-wide text-slate-600">
            {card?.sourceHint ? (
              <>
                <ExternalLink className="h-3 w-3 opacity-60" aria-hidden />
                {card.sourceHint}
              </>
            ) : (
              source.type?.replace(/_/g, ' ') || 'institutional guidance'
            )}
          </p>
        </span>
      ) : null}
    </span>
  )
}

/** Split answer text and interleave citation chips where [Label] anchors appear. */
export function renderAnswerWithCitations(content: string, sources?: StandaloneOrbSource[]) {
  if (!content.trim()) return null
  const sourceByLabel = new Map<string, StandaloneOrbSource>()
  for (const source of sources ?? []) {
    const key = (source.label || '').trim()
    if (key) sourceByLabel.set(key.toLowerCase(), source)
  }

  const parts = content.split(/(\[[^\]]+\])/g)
  return parts.map((part, index) => {
    const match = part.match(/^\[([^\]]+)\]$/)
    if (!match) {
      return (
        <span key={`t-${index}`} className="whitespace-pre-wrap">
          {part}
        </span>
      )
    }
    const label = match[1]
    const source = sourceByLabel.get(label.toLowerCase()) ?? {
      label,
      type: 'regulatory_framework',
      basis: 'Institutional guidance anchor referenced in this response.'
    }
    return <OrbInlineCitation key={`c-${index}-${label}`} source={source} />
  })
}
