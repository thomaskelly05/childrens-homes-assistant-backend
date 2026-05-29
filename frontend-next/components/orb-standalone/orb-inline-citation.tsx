'use client'

import { useCallback, useState } from 'react'
import { ExternalLink } from 'lucide-react'

import { citationCardForLabel } from '@/lib/orb/citation-cards'
import type { StandaloneOrbSource } from '@/lib/orb/standalone-local-store'

export type ExtendedOrbSource = StandaloneOrbSource & {
  source_title?: string
  source_type?: string
  source_url?: string
  source_path?: string
  exact_excerpt?: string
  exact_citation?: string
  excerpt?: string
  summary_basis?: string
  why_cited?: string
  regulation_number?: string
  regulation_title?: string
  section_heading?: string
  framework?: string
  confidence?: string
  confidence_level?: string
  retrieval_method?: string
  retrieval_strategy?: string
  vault?: string
  source_pack?: string
  last_updated?: string
  exact_text_available?: boolean
  basis_type?: string
  quote_allowed?: boolean
  official_source?: boolean
}

function exactExcerptFromSource(source: ExtendedOrbSource): string | null {
  const excerpt = String(
    source.exact_excerpt || source.excerpt || source.exact_citation || ''
  ).trim()
  if (!excerpt) return null
  if (source.quote_allowed === false) return null
  if (source.exact_text_available === false) return null
  return excerpt
}

function summaryBasisOnly(source: ExtendedOrbSource): boolean {
  if (source.exact_text_available === true) return false
  if (exactExcerptFromSource(source)) return false
  if (source.basis_type === 'summary') return true
  return true
}

function openSourceHref(source: ExtendedOrbSource): string | null {
  const url = String(source.source_url || '').trim()
  if (url && /^https?:\/\//i.test(url)) return url
  return null
}

export function OrbInlineCitation({ source }: { source: StandaloneOrbSource }) {
  const [open, setOpen] = useState(false)
  const extended = source as ExtendedOrbSource
  const anchor = source.label || 'Source'
  const short = anchor.length > 28 ? `${anchor.slice(0, 26)}…` : anchor
  const card = citationCardForLabel(anchor)
  const exactExcerpt = exactExcerptFromSource(extended)
  const isSummaryOnly = summaryBasisOnly(extended)
  const whyCited =
    extended.why_cited ||
    card?.whyCited ||
    source.basis ||
    'Referenced in this answer as institutional guidance.'
  const sourceTitle =
    extended.source_title ||
    extended.regulation_title ||
    card?.title ||
    anchor.replace(/^\[|\]$/g, '')
  const sourceTypeLabel =
    extended.source_type?.replace(/_/g, ' ') ||
    source.type?.replace(/_/g, ' ') ||
    'institutional guidance'
  const pulledFrom =
    extended.vault ||
    extended.source_pack ||
    card?.sourceHint ||
    source.basis ||
    'ORB Knowledge Spine'
  const href = openSourceHref(extended)
  const confidence =
    extended.confidence || extended.confidence_level
      ? String(extended.confidence || extended.confidence_level).replace(/_/g, ' ')
      : null
  const retrieval =
    extended.retrieval_method || extended.retrieval_strategy
      ? String(extended.retrieval_method || extended.retrieval_strategy).replace(/_/g, ' ')
      : null

  const handleChipClick = useCallback(() => {
    if (href) {
      window.open(href, '_blank', 'noopener,noreferrer')
      return
    }
    setOpen((v) => !v)
  }, [href])

  return (
    <span className="orb-citation-inline relative inline align-baseline leading-none">
      <button
        type="button"
        className="orb-citation-chip-light mx-0.5 inline-flex max-w-full items-center rounded-full border px-[0.45rem] py-[0.125rem] text-[0.75rem] leading-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0284C7]/50"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={handleChipClick}
        aria-expanded={open}
        data-orb-citation-chip
        data-orb-citation-has-url={href ? 'true' : 'false'}
      >
        [{short}]
      </button>
      {open ? (
        <span
          role="tooltip"
          className="orb-citation-card absolute bottom-full left-1/2 z-30 mb-2 w-[min(22rem,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-[#CBD5E1] bg-white p-3.5 text-left shadow-lg"
          data-orb-citation-popover
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
        >
          <p className="text-sm font-semibold text-[#0F172A]" data-orb-citation-title>
            {sourceTitle}
          </p>
          {extended.regulation_number || extended.framework ? (
            <p className="mt-1 text-[10px] font-medium text-[#64748B]">
              {[extended.regulation_number, extended.framework, extended.section_heading]
                .filter(Boolean)
                .join(' · ')}
            </p>
          ) : null}
          <div className="mt-2">
            <p className="orb-citation-section-label text-[9px] font-semibold uppercase tracking-wide">
              Why cited
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-[#475569]" data-orb-citation-why>
              {whyCited}
            </p>
          </div>
          {exactExcerpt ? (
            <div className="mt-2.5 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-2">
              <p className="orb-citation-section-label text-[9px] font-semibold uppercase tracking-wide">
                Exact excerpt
              </p>
              <p className="mt-1 text-[11px] leading-5 text-[#334155]">&ldquo;{exactExcerpt}&rdquo;</p>
            </div>
          ) : isSummaryOnly ? (
            <p className="mt-2 text-[10px] font-medium text-[#64748B]" data-orb-citation-summary-basis>
              Summary basis only — exact wording not available in this source pack.
            </p>
          ) : null}
          {extended.summary_basis && !exactExcerpt ? (
            <div className="mt-2">
              <p className="orb-citation-section-label text-[9px] font-semibold uppercase tracking-wide">
                Summary basis
              </p>
              <p className="mt-0.5 text-[11px] leading-5 text-[#475569]">{extended.summary_basis}</p>
            </div>
          ) : null}
          <div className="mt-2">
            <p className="orb-citation-section-label text-[9px] font-semibold uppercase tracking-wide">
              Pulled from
            </p>
            <p className="mt-0.5 text-[11px] leading-5 text-[#475569]">{pulledFrom}</p>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-[#64748B]">
            <span data-orb-citation-source-type>Source type: {sourceTypeLabel}</span>
            {confidence ? <span>Confidence: {confidence}</span> : null}
            {retrieval ? <span>Retrieval: {retrieval}</span> : null}
            {extended.official_source ? <span>Official source summary</span> : null}
            {extended.last_updated ? <span>Updated: {extended.last_updated}</span> : null}
          </div>
          {card?.practicalApplication ? (
            <div className="mt-2.5">
              <p className="orb-citation-section-label text-[9px] font-semibold uppercase tracking-wide">
                In practice
              </p>
              <p className="mt-0.5 text-[11px] leading-5 text-[#475569]">{card.practicalApplication}</p>
            </div>
          ) : null}
          {source.note && source.note !== source.basis && source.note !== whyCited ? (
            <p className="mt-2 text-[10px] text-[#64748B]">{source.note}</p>
          ) : null}
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2.5 inline-flex items-center gap-1 rounded-lg border border-[#CBD5E1] bg-[#F8FAFC] px-2.5 py-1.5 text-[11px] font-semibold text-[#0369A1] hover:bg-[#E0F2FE]"
              data-orb-citation-open-source
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              Open source
            </a>
          ) : extended.source_path ? (
            <p className="mt-2 text-[10px] text-[#64748B]" data-orb-citation-source-path>
              Source path: {extended.source_path}
            </p>
          ) : null}
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
      basis: 'Summary basis from ORB Knowledge Spine unless an exact excerpt exists.',
      exact_text_available: false,
      basis_type: 'summary'
    }
    return <OrbInlineCitation key={`c-${index}-${label}`} source={source} />
  })
}
