'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'

import { Reg45GapCard } from '@/components/reg45/reg45-gap-card'
import { Reg45OrbSupport } from '@/components/reg45/reg45-orb-support'
import { Reg45ReviewActions } from '@/components/reg45/reg45-review-actions'
import { Reg45ReviewDashboardSummary } from '@/components/reg45/reg45-review-dashboard'
import { Reg45ReviewGenerator } from '@/components/reg45/reg45-review-generator'
import { Reg45ReviewHistory } from '@/components/reg45/reg45-review-history'
import { Reg45ReviewSectionCard } from '@/components/reg45/reg45-review-section'
import { Reg45SourceNote } from '@/components/reg45/reg45-source-note'
import {
  getReg45Dashboard,
  getReg45Review,
  listReg45Reviews,
  type Reg45QualityReview,
  type Reg45ReviewDashboard
} from '@/lib/os-api/reg45-quality-review'

export function Reg45ReviewWorkspace() {
  const searchParams = useSearchParams()
  const packId = searchParams.get('pack_id') || undefined
  const reviewIdParam = searchParams.get('review_id') || undefined
  const homeId = searchParams.get('home_id')?.trim() || undefined
  const homeQuery = homeId ? `&home_id=${encodeURIComponent(homeId)}` : ''

  const [dashboard, setDashboard] = useState<Reg45ReviewDashboard | null>(null)
  const [review, setReview] = useState<Reg45QualityReview | null>(null)
  const [history, setHistory] = useState<Array<Record<string, unknown>>>([])

  const refresh = useCallback(() => {
    void getReg45Dashboard().then((r) => {
      if (r.ok) setDashboard(r.data)
    })
    void listReg45Reviews().then((r) => {
      if (r.ok && r.data?.reviews) setHistory(r.data.reviews)
    })
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (reviewIdParam) {
      void getReg45Review(reviewIdParam).then((r) => {
        if (r.ok && r.data?.id) setReview(r.data)
      })
    }
  }, [reviewIdParam])

  return (
    <div data-testid="reg45-review-workspace" className="space-y-10">
      <p
        data-testid="reg45-safety-note"
        className="rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-xs font-semibold leading-6 text-indigo-950"
      >
        Reg 45 quality-of-care review — evidence snapshot and Quality Standards alignment support. Gaps to review are
        prompts for managers, not guaranteed compliance or predicted grades. Professional judgement remains required.
      </p>

      <Reg45ReviewDashboardSummary dashboard={dashboard} />

      {dashboard?.key_gaps?.length ? (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-950" data-testid="reg45-gaps-heading">
            Gaps to review
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {dashboard.key_gaps.slice(0, 4).map((gap) => (
              <Reg45GapCard key={gap.id} gap={gap} />
            ))}
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/intelligence/inspection evidence preparation?pack=reg45${homeQuery}`}
          data-testid="reg45-link-inspection evidence preparation"
          className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-[10px] font-black uppercase text-blue-800"
        >
          Open Inspection evidence preparation
        </Link>
        <Link
          href={homeId ? `/intelligence/sccif?home_id=${encodeURIComponent(homeId)}` : '/intelligence/sccif'}
          data-testid="reg45-link-sccif"
          className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-[10px] font-black uppercase text-violet-800"
        >
          Open SCCIF alignment
        </Link>
      </div>

      <Reg45ReviewGenerator packId={packId} onGenerated={(r) => { setReview(r); refresh() }} />
      <Reg45ReviewActions review={review} onUpdated={(r) => { setReview(r); refresh() }} />

      {review ? (
        <div className="space-y-6">
          <header>
            <p className="text-[10px] font-black uppercase text-slate-400">Draft review</p>
            <h2 className="text-2xl font-black text-slate-950">{review.title}</h2>
            <p className="mt-2 text-sm font-semibold text-slate-600">{review.summary}</p>
            <p className="mt-1 text-xs text-slate-500">
              {review.evidence_count} evidence · {review.gap_count} gaps · {review.improvement_action_count}{' '}
              improvement drafts
            </p>
          </header>
          {review.sections.map((section) => (
            <Reg45ReviewSectionCard key={section.id} section={section} />
          ))}
          <Reg45OrbSupport review={review} />
        </div>
      ) : null}

      <Reg45SourceNote />
      <Reg45ReviewHistory
        reviews={history}
        onSelect={(id) => {
          void getReg45Review(id).then((r) => {
            if (r.ok) setReview(r.data)
          })
        }}
      />
    </div>
  )
}
