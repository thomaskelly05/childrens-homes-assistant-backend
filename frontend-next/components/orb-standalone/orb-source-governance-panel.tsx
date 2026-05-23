'use client'

import { AlertTriangle, CheckCircle2, FileWarning, Shield } from 'lucide-react'

import type { OrbKnowledgeCitationHealth, OrbKnowledgeSource } from '@/lib/orb/standalone-client'

export function OrbSourceGovernanceBadges({ source }: { source: OrbKnowledgeSource }) {
  const integrity = source.source_integrity
  return (
  <div className="flex flex-wrap items-center gap-1">
    {source.official_source ? (
      <span
        data-orb-official-source
        className="rounded-full bg-cyan-500/15 px-1.5 py-0.5 text-[9px] font-medium text-cyan-100"
      >
        Official
      </span>
    ) : null}
    {integrity === 'full_document' ? (
      <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-200">
        Full document
      </span>
    ) : null}
    {integrity === 'summary_only' ? (
      <span
        data-orb-summary-only-warning
        className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] text-amber-200"
      >
        Summary only
      </span>
    ) : null}
    {integrity === 'user_pasted' ? (
      <span className="rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[9px] text-slate-400">
        Pasted
      </span>
    ) : null}
    {source.governance_status ? (
      <span className="text-[9px] uppercase text-slate-600">{source.governance_status.replace(/_/g, ' ')}</span>
    ) : null}
  </div>
  )
}

export function OrbCitationHealthSummary({
  health
}: {
  health: OrbKnowledgeCitationHealth | null
}) {
  if (!health) return null
  return (
    <div
      data-orb-citation-health
      className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2 text-[10px] text-slate-400"
    >
      <p className="font-medium text-slate-300">
        Citation health: <span className="text-cyan-200/90">{health.health_status}</span>
      </p>
      <p className="mt-0.5">
        {health.chunk_count} chunks · {health.chunks_with_heading} with headings ·{' '}
        {health.chunks_with_section} with sections
        {health.chunks_with_page ? ` · ${health.chunks_with_page} with page` : ''}
      </p>
      {health.warnings?.length ? (
        <ul className="mt-1 space-y-0.5 text-amber-200/80">
          {health.warnings.map((w) => (
            <li key={w} className="flex items-start gap-1">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
              {w}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}

export function OrbSourceGovernanceActions({
  sourceId,
  onApprove,
  onNeedsReview,
  onArchive,
  onRebuild,
  busy
}: {
  sourceId: string
  onApprove: (id: string) => void
  onNeedsReview: (id: string) => void
  onArchive: (id: string) => void
  onRebuild: (id: string) => void
  busy?: boolean
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => onApprove(sourceId)}
        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] text-emerald-200 hover:bg-white/[0.06] disabled:opacity-50"
      >
        <CheckCircle2 className="h-3 w-3" aria-hidden />
        Approve
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onNeedsReview(sourceId)}
        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] text-amber-200 hover:bg-white/[0.06] disabled:opacity-50"
      >
        <FileWarning className="h-3 w-3" aria-hidden />
        Needs review
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onArchive(sourceId)}
        className="rounded px-1.5 py-0.5 text-[9px] text-slate-400 hover:bg-white/[0.06] disabled:opacity-50"
      >
        Archive
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => onRebuild(sourceId)}
        className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] text-cyan-200 hover:bg-white/[0.06] disabled:opacity-50"
      >
        <Shield className="h-3 w-3" aria-hidden />
        Rebuild citations
      </button>
    </div>
  )
}
