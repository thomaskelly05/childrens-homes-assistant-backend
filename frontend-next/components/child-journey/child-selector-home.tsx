import Link from 'next/link'
import { AlertTriangle, ArrowRight, ClipboardList, HeartPulse, Search } from 'lucide-react'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, PageHeader, RiskBadge, StatusBadge } from '@/components/indicare/ui'
import type { ChildSelectorCard } from '@/lib/child-journey/data'
import type { OsApiResult } from '@/lib/os-api/types'

export function ChildSelectorHome({
  cards,
  source,
  error
}: {
  cards: ChildSelectorCard[]
  source: 'live' | 'fallback'
  error?: string
}) {
  const result: OsApiResult<ChildSelectorCard[]> = { data: cards, source, error }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Home"
        title="Choose a young person"
        description="Start here after sign-in. Pick the child you are supporting, enter their journey, then add the right record without selecting them again."
        action={
          <Link href="/shifts/current" className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50">
            Current shift
          </Link>
        }
      />
      <LiveDataStatus result={result} />

      <section className="grid gap-4 sm:gap-5 lg:grid-cols-2 2xl:grid-cols-3" aria-label="Young person selector">
        {cards.map((child) => (
          <Link
            key={child.id}
            href={`/young-people/${encodeURIComponent(child.id)}/journey`}
            className="group block rounded-[28px] border border-white/80 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-blue-100 hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-blue-100 sm:rounded-[32px] sm:p-5"
          >
            <article>
              <div className="flex items-start gap-4">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-700 to-slate-950 text-xl font-black text-white shadow-lg shadow-blue-950/20">
                  {child.avatarLabel}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-black tracking-[-0.04em] text-slate-950">{child.preferredName || child.displayName}</h2>
                    {child.importantAlert ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-amber-800">
                        <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                        {child.importantAlert}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-500">Age {child.age || 'not recorded'} · {child.keyWorkerName}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <StatusBadge value={child.placementStatus || child.status || 'Active'} />
                <RiskBadge value={(child.riskLevel || 'medium') as any} />
              </div>

              <div className="mt-5 grid gap-3 min-[420px]:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <HeartPulse className="h-4 w-4 text-blue-700" aria-hidden />
                  <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Mood / status</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{child.currentMood}</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <AlertTriangle className="h-4 w-4 text-amber-600" aria-hidden />
                  <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Risks</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{child.activeRisksCount} active</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <ClipboardList className="h-4 w-4 text-emerald-700" aria-hidden />
                  <p className="mt-2 text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Actions</p>
                  <p className="mt-1 text-sm font-black text-slate-800">{child.actionsDue} due</p>
                </div>
              </div>

              <div className="mt-5 rounded-[24px] border border-blue-100 bg-blue-50/70 p-4">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Last recorded note</p>
                <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-700">{child.lastRecordedNote}</p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20">
                  Enter Journey
                  <ArrowRight className="ml-2 h-4 w-4 transition group-hover:translate-x-1" aria-hidden />
                </span>
                <span className="inline-flex items-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
                  <Search className="mr-2 h-4 w-4" aria-hidden />
                  Open record
                </span>
              </div>
            </article>
          </Link>
        ))}
      </section>

      {!cards.length ? (
        <Card>
          <div className="text-center">
            <h2 className="text-2xl font-black text-slate-950">No young people are available</h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">Check your home access or ask a manager to assign the correct children to your account.</p>
          </div>
        </Card>
      ) : null}
    </div>
  )
}
