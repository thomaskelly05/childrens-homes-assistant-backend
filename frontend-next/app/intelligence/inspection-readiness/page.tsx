import Link from 'next/link'

import { InspectionReadinessWorkspace } from '@/components/inspection-readiness/inspection-readiness-workspace'
import { homeOrbHref, homeWorkspaceHref } from '@/lib/navigation/scope-routes'

export default async function InspectionReadinessPage({
  searchParams
}: {
  searchParams: Promise<{ home_id?: string }>
}) {
  const { home_id: homeId } = await searchParams

  return (
    <main
      data-testid="inspection-readiness-page"
      className="mx-auto max-w-5xl space-y-8 px-4 py-10 sm:px-6"
    >
      <header className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-700">
          Intelligence
        </p>
        <h1 className="text-3xl font-black tracking-[-0.04em] text-slate-950">Inspection evidence preparation</h1>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          Evidence snapshot and Quality Standards alignment for managers. Gaps to review are prompts — not
          guaranteed compliance. We do not predict Ofsted grades. Manager judgement remains essential.
        </p>
        <div className="flex flex-wrap gap-2 pt-2">
          <Link
            href={homeId ? homeWorkspaceHref(homeId) : '/select-scope'}
            data-testid="inspection-back-home-workspace"
            className="inline-flex min-h-10 items-center rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-black text-slate-700"
          >
            {homeId ? 'Home workspace' : 'Choose home'}
          </Link>
          <Link
            href={homeId ? homeOrbHref(homeId, 'ofsted_evidence_review') : '/assistant/orb?mode=ofsted_evidence_review'}
            data-testid="inspection-operational-orb-link"
            className="inline-flex min-h-10 items-center rounded-2xl border border-violet-200 bg-violet-50 px-4 py-2.5 text-xs font-black text-violet-950"
          >
            Ask operational ORB
          </Link>
        </div>
      </header>
      <InspectionReadinessWorkspace />
    </main>
  )
}
