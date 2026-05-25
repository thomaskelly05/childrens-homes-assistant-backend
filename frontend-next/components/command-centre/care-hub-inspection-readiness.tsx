'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

import {
  getInspectionReadinessDashboard,
  inspectionReadinessOrbHref
} from '@/lib/os-api/inspection-readiness'
import { getReg45Dashboard } from '@/lib/os-api/reg45-quality-review'
import { sccifAlignmentOrbHref, getSccifAlignmentDashboard } from '@/lib/os-api/sccif-alignment'
import { fetchWithOsCache, osRequestDedupeKey } from '@/lib/os-request-cache'

export function CareHubInspectionReadiness() {
  const [evidenceCount, setEvidenceCount] = useState<number | null>(null)
  const [gapCount, setGapCount] = useState<number | null>(null)
  const [helpedCount, setHelpedCount] = useState<number | null>(null)
  const [leadershipCount, setLeadershipCount] = useState<number | null>(null)
  const [inspectionGaps, setInspectionGaps] = useState<number | null>(null)
  const [reg45ReviewCount, setReg45ReviewCount] = useState<number | null>(null)

  useEffect(() => {
    void fetchWithOsCache(
      osRequestDedupeKey('/intelligence/sccif/dashboard'),
      () => getSccifAlignmentDashboard({ limit: 50 }),
      30000
    ).then((result) => {
      if (!result.ok || !result.data) return
      setEvidenceCount(result.data.evidence_items.length)
      setGapCount(result.data.evidence_gaps.length)
      const meta = result.data.metadata || {}
      setHelpedCount(Number(meta.helped_and_protected_count ?? 0))
      setLeadershipCount(Number(meta.leadership_count ?? 0))
    })
    void fetchWithOsCache(
      osRequestDedupeKey('/intelligence/inspection-readiness/dashboard'),
      () => getInspectionReadinessDashboard(),
      30000
    ).then((result) => {
      if (!result.ok || !result.data) return
      const meta = result.data.metadata || {}
      setInspectionGaps(
        Number(meta.reg44_gaps ?? 0) + Number(meta.reg45_gaps ?? 0) || result.data.key_gaps.length
      )
    })
    void fetchWithOsCache(
      osRequestDedupeKey('/intelligence/reg45/dashboard'),
      () => getReg45Dashboard(),
      30000
    ).then((result) => {
      if (!result.ok || !result.data) return
      setReg45ReviewCount(
        (result.data.draft_review_count || 0) +
          (result.data.ready_for_manager_count || 0) +
          (result.data.ri_review_required_count || 0)
      )
    })
  }, [])

  return (
    <section
      data-testid="care-hub-inspection-readiness"
      className="rounded-[28px] border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-6 shadow-sm"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">Inspection readiness</p>
          <h2 className="mt-1 text-xl font-black tracking-[-0.04em] text-slate-950">
            Reg 44, Reg 45 and SCCIF evidence support
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
            Safe evidence packs for managers — not inspection grades. Professional judgement remains required.
          </p>
        </div>
        <Link
          href="/intelligence/inspection-readiness"
          data-testid="care-hub-open-inspection-readiness"
          className="inline-flex min-h-10 items-center rounded-2xl border border-blue-200 bg-blue-600 px-4 py-2.5 text-xs font-black text-white"
        >
          Open inspection readiness
        </Link>
      </div>

      <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
          <dt className="text-[10px] font-black uppercase text-slate-400">Evidence items</dt>
          <dd className="text-2xl font-black text-slate-950">{evidenceCount ?? '—'}</dd>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50/60 px-3 py-2">
          <dt className="text-[10px] font-black uppercase text-amber-700">Potential gaps</dt>
          <dd className="text-2xl font-black text-amber-950">{gapCount ?? '—'}</dd>
        </div>
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-3 py-2">
          <dt className="text-[10px] font-black uppercase text-indigo-700">Pack gaps</dt>
          <dd className="text-2xl font-black text-indigo-950">{inspectionGaps ?? '—'}</dd>
        </div>
        <div className="rounded-2xl border border-violet-100 bg-violet-50/60 px-3 py-2">
          <dt className="text-[10px] font-black uppercase text-violet-700">Helped / protected</dt>
          <dd className="text-2xl font-black text-violet-950">{helpedCount ?? '—'}</dd>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
          <dt className="text-[10px] font-black uppercase text-emerald-700">Leadership oversight</dt>
          <dd className="text-2xl font-black text-emerald-950">{leadershipCount ?? '—'}</dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href="/intelligence/inspection-readiness?pack=reg44"
          data-testid="care-hub-generate-reg44"
          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-blue-800"
        >
          Generate Reg 44 pack
        </Link>
        <Link
          href="/intelligence/inspection-readiness?pack=reg45"
          data-testid="care-hub-generate-reg45"
          className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-indigo-800"
        >
          Generate Reg 45 pack
        </Link>
        <Link
          href="/intelligence/reg45"
          data-testid="care-hub-open-reg45-review"
          className="rounded-full border border-indigo-300 bg-indigo-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white"
        >
          Open Reg 45 review{reg45ReviewCount != null ? ` (${reg45ReviewCount})` : ''}
        </Link>
        <Link
          href="/intelligence/reg45"
          data-testid="care-hub-draft-reg45-review"
          className="rounded-full border border-indigo-200 bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-indigo-800"
        >
          Draft Reg 45 review
        </Link>
        <Link
          href="/intelligence/sccif"
          data-testid="care-hub-open-sccif-alignment"
          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-violet-800"
        >
          Open SCCIF alignment
        </Link>
        <Link
          href={inspectionReadinessOrbHref(
            'ofsted_evidence_review',
            'What evidence may need manager review before inspection preparation?'
          )}
          data-testid="care-hub-ask-orb-inspection"
          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-violet-800"
        >
          Ask OS ORB
        </Link>
        <Link
          href={sccifAlignmentOrbHref(
            'ofsted_evidence_review',
            'What SCCIF alignment gaps may need review?'
          )}
          data-testid="care-hub-ask-orb-sccif"
          className="sr-only"
        >
          Ask OS ORB SCCIF
        </Link>
      </div>
    </section>
  )
}
