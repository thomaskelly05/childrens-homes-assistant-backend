'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { InspectionOrbSupport } from '@/components/inspection evidence preparation/inspection-orb-support'
import { InspectionPackActions } from '@/components/inspection evidence preparation/inspection-pack-actions'
import { InspectionPackHistory } from '@/components/inspection evidence preparation/inspection-pack-history'
import { InspectionPackSelector } from '@/components/inspection evidence preparation/inspection-pack-selector'
import { InspectionPackViewer } from '@/components/inspection evidence preparation/inspection-pack-viewer'
import { InspectionReadinessSummary } from '@/components/inspection evidence preparation/inspection evidence preparation-summary'
import { InspectionSourceNote } from '@/components/inspection evidence preparation/inspection-source-note'
import { InspectionGapCard } from '@/components/inspection evidence preparation/inspection-gap-card'
import {
  generateInspectionPack,
  getInspectionReadinessDashboard,
  type InspectionEvidencePack,
  type InspectionPackType,
  type InspectionReadinessDashboard
} from '@/lib/os-api/inspection evidence preparation'

export function InspectionReadinessWorkspace() {
  const [dashboard, setDashboard] = useState<InspectionReadinessDashboard | null>(null)
  const [packType, setPackType] = useState<InspectionPackType>('reg44')
  const [periodStart, setPeriodStart] = useState('')
  const [periodEnd, setPeriodEnd] = useState('')
  const [pack, setPack] = useState<InspectionEvidencePack | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshDashboard = useCallback(() => {
    void getInspectionReadinessDashboard().then((r) => {
      if (r.ok) setDashboard(r.data)
    })
  }, [])

  useEffect(() => {
    refreshDashboard()
  }, [refreshDashboard])

  async function handleGenerate() {
    setLoading(true)
    const result = await generateInspectionPack(packType, {
      period_start: periodStart || undefined,
      period_end: periodEnd || undefined
    })
    setLoading(false)
    if (result.ok && result.data) setPack(result.data as InspectionEvidencePack)
  }

  return (
    <div data-testid="inspection evidence preparation-workspace" className="space-y-10">
      <p
        data-testid="inspection-safety-note"
        className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs font-semibold leading-6 text-blue-950"
      >
        <span className="font-black">Inspection evidence preparation</span> — evidence snapshot and Quality Standards alignment for
        managers to review. Gaps to review are prompts, not guaranteed compliance. We do not claim Ofsted grades or
        guaranteed outcomes. Manager judgement and statutory duties remain required.
      </p>

      <section data-testid="inspection-evidence-snapshot" className="space-y-2">
        <h2 className="text-lg font-black text-slate-950">Evidence snapshot</h2>
        <p className="text-xs font-semibold text-slate-600" data-testid="inspection-manager-judgement-required">
          Manager judgement required — summaries support preparation; they do not guarantee compliance or predict grades.
        </p>
        <InspectionReadinessSummary dashboard={dashboard} />
      </section>

      {dashboard?.key_gaps?.length ? (
        <section data-testid="inspection-key-gaps" className="space-y-3">
          <h2 className="text-lg font-black text-slate-950" data-testid="inspection-gaps-heading">
            Gaps to review
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.key_gaps.slice(0, 6).map((gap) => (
              <InspectionGapCard key={gap.id} gap={gap} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href="/intelligence/sccif"
          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase text-violet-800"
        >
          Open SCCIF alignment
        </Link>
        <Link
          href="/intelligence/reg45"
          data-testid="inspection-open-reg45-builder"
          className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase text-indigo-800"
        >
          Open Reg 45 review builder
        </Link>
      </div>

      {packType === 'reg45' ? (
        <p
          data-testid="inspection-reg45-workflow-note"
          className="rounded-2xl border border-indigo-100 bg-indigo-50/50 px-4 py-3 text-xs font-semibold leading-6 text-indigo-950"
        >
          Reg 45 evidence support packs can feed the structured Quality of Care Review workflow. Generate a pack,
          then open the review builder — use pack_id only when saving; no raw evidence in URLs.
        </p>
      ) : null}

      <InspectionPackSelector
        selected={packType}
        onSelect={setPackType}
        periodStart={periodStart}
        periodEnd={periodEnd}
        onPeriodStart={setPeriodStart}
        onPeriodEnd={setPeriodEnd}
      />

      <button
        type="button"
        data-testid="inspection-generate-pack"
        disabled={loading}
        onClick={() => void handleGenerate()}
        className="rounded-2xl border border-blue-200 bg-blue-600 px-6 py-3 text-sm font-black text-white disabled:opacity-50"
      >
        Generate pack
      </button>

      <InspectionPackActions pack={pack} packType={packType} onSaved={refreshDashboard} />
      <InspectionPackViewer pack={pack} loading={loading} />
      <InspectionOrbSupport pack={pack} />
      <InspectionSourceNote />
      <InspectionPackHistory onOpenPack={setPack} />
    </div>
  )
}
