import Link from 'next/link'
import { Suspense } from 'react'

import { Reg45ReviewWorkspace } from '@/components/reg45/reg45-review-workspace'
import { homeInspectionReadinessHref, homeOrbHref, homeWorkspaceHref } from '@/lib/navigation/scope-routes'

export default async function Reg45QualityReviewPage({
  searchParams
}: {
  searchParams: Promise<{ home_id?: string }>
}) {
  const { home_id: homeId } = await searchParams

  return (
    <main data-testid="reg45-quality-review-page" className="mx-auto max-w-6xl space-y-6 px-4 py-8 pb-24">
      <header className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-indigo-700">
          Regulation 45 · review support
        </p>
        <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">Reg 45 Quality of Care Review</h1>
        <p className="max-w-3xl text-sm leading-7 text-slate-600">
          Evidence snapshot for leadership review — manager judgement required. This does not determine compliance or
          predict inspection grades.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href={homeId ? homeWorkspaceHref(homeId) : '/select-scope'}
            data-testid="reg45-back-home-workspace"
            className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
          >
            {homeId ? 'Home workspace' : 'Choose home'}
          </Link>
          <Link
            href={homeId ? homeInspectionReadinessHref(homeId) : '/intelligence/inspection-readiness'}
            className="inline-flex min-h-10 items-center rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-black text-blue-950"
          >
            Inspection evidence preparation
          </Link>
          <Link
            href={homeId ? homeOrbHref(homeId, 'ofsted_evidence_review') : '/assistant/orb?mode=ofsted_evidence_review'}
            data-testid="reg45-operational-orb-link"
            className="inline-flex min-h-10 items-center rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-black text-violet-950"
          >
            Ask operational ORB
          </Link>
        </div>
      </header>
      <Suspense fallback={<p className="text-sm text-slate-500">Loading review workspace…</p>}>
        <Reg45ReviewWorkspace />
      </Suspense>
    </main>
  )
}
