'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'

import { citationCardForLabel } from '@/lib/orb/citation-cards'
import type { StandaloneOrbSource } from '@/lib/orb/standalone-local-store'

type ExtendedSource = StandaloneOrbSource & {
  exact_citation?: string
  excerpt?: string
  quote_allowed?: boolean
  confidence_level?: string
  official_source?: boolean
}

function exactExcerptFromSource(source: ExtendedSource): string | null {
  const excerpt = String(source.excerpt || source.exact_citation || '').trim()
  if (!excerpt) return null
  if (source.quote_allowed === false) return null
  return excerpt
}

export function OrbInlineCitation({ source }: { source: StandaloneOrbSource }) {
  const [open, setOpen] = useState(false)
  const extended = source as ExtendedSource
  const anchor = source.label || 'Source'
  const short = anchor.length > 28 ? `${anchor.slice(0, 26)}…` : anchor
  const card = citationCardForLabel(anchor)
  const exactExcerpt = exactExcerptFromSource(extended)
  const whyCited =
    (extended as { why_cited?: string }).why_cited ||
    card?.whyCited ||
    source.basis ||
    'Referenced in this answer as institutional guidance.'
  const basisLine = exactExcerpt
    ? null
    : source.basis || card?.whyItMatters || 'Summary basis from ORB Knowledge Spine unless an exact excerpt is shown.'

  return (
    <span className="orb-citation-inline relative inline align-baseline leading-none">
      <button
        type="button"
        className="orb-citation-chip-light mx-0.5 inline-flex max-w-full items-center rounded-full border px-[0.45rem] py-[0.125rem] text-[0.75rem] leading-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0284C7]/50"
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
          className="orb-citation-card absolute bottom-full left-1/2 z-30 mb-2 w-80 max-w-[min(20rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-[#CBD5E1] bg-white p-3.5 text-left shadow-lg"
          data-orb-citation-popover
        >
          <p className="text-sm font-semibold text-[#0F172A]">{card?.title ?? anchor}</p>
          <div className="mt-2">
            <p className="orb-citation-section-label text-[9px] font-semibold uppercase tracking-wide">Why cited</p>
            <p className="mt-0.5 text-[11px] leading-5 text-[#475569]">{whyCited}</p>
          </div>
          {exactExcerpt ? (
            <div className="mt-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
              <p className="orb-citation-section-label text-[9px] font-semibold uppercase tracking-wide">Exact excerpt</p>
              <p className="mt-1 text-[11px] leading-5 text-[#334155]">&ldquo;{exactExcerpt}&rdquo;</p>
            </div>
          ) : (
            <p className="mt-2 text-[10px] font-medium text-[#64748B]" data-orb-citation-summary-basis>
              Summary basis only — not an exact regulation quote.
            </p>
          )}
          {basisLine && !exactExcerpt ? (
            <div className="mt-2">
              <p className="orb-citation-section-label text-[9px] font-semibold uppercase tracking-wide">Source basis</p>
              <p className="mt-0.5 text-[11px] leading-5 text-[#475569]">{basisLine}</p>
            </div>
          ) : null}
          {card?.practicalApplication ? (
            <div className="mt-2.5">
              <p className="orb-citation-section-label text-[9px] font-semibold uppercase tracking-wide">In practice</p>
              <p className="mt-0.5 text-[11px] leading-5 text-[#475569]">{card.practicalApplication}</p>
            </div>
          ) : null}
          {extended.confidence_level ? (
            <p className="mt-2 text-[10px] text-[#64748B]">
              Confidence: {String(extended.confidence_level).replace(/_/g, ' ')}
              {extended.official_source ? ' · Official source summary' : ''}
            </p>
          ) : null}
          {source.note && source.note !== source.basis && source.note !== whyCited ? (
            <p className="mt-2 text-[10px] text-[#64748B]">{source.note}</p>
          ) : null}
          <p className="mt-2.5 flex items-center gap-1 text-[9px] uppercase tracking-wide text-[#94A3B8]">
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
      basis: 'Summary basis from ORB Knowledge Spine unless an exact excerpt exists.'
    }
    return <OrbInlineCitation key={`c-${index}-${label}`} source={source} />
  })
}
