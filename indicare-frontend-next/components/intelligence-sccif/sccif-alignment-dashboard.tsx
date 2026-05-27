'use client'

import { useEffect, useState } from 'react'

import { SccifEvidenceList } from '@/components/intelligence-sccif/sccif-evidence-list'
import { SccifGapList } from '@/components/intelligence-sccif/sccif-gap-list'
import { SccifJudgementCard } from '@/components/intelligence-sccif/sccif-judgement-card'
import { SccifOrbSupport } from '@/components/intelligence-sccif/sccif-orb-support'
import { SccifQualityStandardCard } from '@/components/intelligence-sccif/sccif-quality-standard-card'
import { SccifSourceNote } from '@/components/intelligence-sccif/sccif-source-note'
import {
  getSccifAlignmentDashboard,
  type SccifAlignmentDashboard,
  type SccifAlignmentFilters
} from '@/lib/os-api/sccif-alignment'
import { QUALITY_STANDARD_LABELS, SCCIF_JUDGEMENT_LABELS } from '@/components/intelligence-sccif/sccif-labels'

type Props = {
  filters?: SccifAlignmentFilters
}

export function SccifAlignmentDashboard({ filters }: Props) {
  const [dashboard, setDashboard] = useState<SccifAlignmentDashboard | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    void getSccifAlignmentDashboard(filters).then((result) => {
      if (!result.ok || !result.data) {
        setError(result.error || 'Unable to load SCCIF alignment.')
        setDashboard(null)
      } else {
        setDashboard(result.data)
        setError(null)
      }
      setLoading(false)
    })
  }, [filters?.child_id, filters?.staff_id, filters?.home_id])

  if (loading) {
    return (
      <p className="text-sm font-semibold text-slate-600" data-testid="sccif-alignment-loading">
        Loading SCCIF and Quality Standards alignment…
      </p>
    )
  }

  if (error || !dashboard) {
    return (
      <p className="text-sm font-semibold text-rose-700" data-testid="sccif-alignment-error">
        {error || 'Alignment unavailable.'}
      </p>
    )
  }

  return (
    <div data-testid="sccif-alignment-dashboard" className="space-y-10">
      <p
        data-testid="sccif-alignment-safety-note"
        className="rounded-2xl border border-violet-100 bg-violet-50/60 px-4 py-3 text-xs font-semibold leading-6 text-violet-950"
      >
        Alignment is evidence support only. Manager judgement and statutory responsibilities remain required.
        This does not predict inspection outcomes.
      </p>

      <p className="text-sm font-semibold text-slate-700">{dashboard.summary}</p>

      <section data-testid="sccif-judgement-cards" className="space-y-4">
        <h2 className="text-lg font-black text-slate-950">SCCIF judgement areas</h2>
        <p className="sr-only" data-testid="sccif-judgement-labels-reference">
          {SCCIF_JUDGEMENT_LABELS.join(' · ')}
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {dashboard.judgement_summary.map((summary) => (
            <SccifJudgementCard key={summary.area} summary={summary} />
          ))}
        </div>
      </section>

      <section data-testid="sccif-quality-standard-cards" className="space-y-4">
        <h2 className="text-lg font-black text-slate-950">Quality Standards</h2>
        <p className="sr-only" data-testid="sccif-quality-labels-reference">
          {QUALITY_STANDARD_LABELS.join(' · ')}
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {dashboard.quality_standard_summary.map((summary) => (
            <SccifQualityStandardCard key={summary.area} summary={summary} />
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-black text-slate-950">Evidence items</h2>
        <SccifEvidenceList items={dashboard.evidence_items} />
      </section>

      <SccifGapList gaps={dashboard.evidence_gaps} />

      {dashboard.recommendations.length ? (
        <section data-testid="sccif-recommendations" className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <h2 className="text-sm font-black text-slate-950">Recommendations</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs font-semibold text-slate-700">
            {dashboard.recommendations.map((rec) => (
              <li key={rec}>{rec}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <SccifSourceNote sources={dashboard.official_sources} />

      <SccifOrbSupport prompts={dashboard.orb_prompts} />

      {dashboard.limitations.length ? (
        <section data-testid="sccif-limitations" className="text-xs font-semibold text-slate-500">
          <p className="font-black text-slate-700">Limitations</p>
          <ul className="mt-1 list-disc pl-5">
            {dashboard.limitations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <p className="text-xs font-semibold text-slate-500">{dashboard.privacy_notice}</p>
    </div>
  )
}
