'use client'

import Link from 'next/link'
import { ArrowRight, ClipboardList, Clock3, FileText, Search, ShieldCheck } from 'lucide-react'

import { LiveDataStatus } from '@/components/indicare/live-data-status'
import { Card, PageHeader, RiskBadge, StatusBadge } from '@/components/indicare/ui'
import { useActiveChild } from '@/lib/context/active-child-context'
import type { ChildSelectorCard } from '@/lib/child-journey/data'
import type { OsApiResult } from '@/lib/os-api/types'

export function ChildSelectorHome({
  cards,
  source,
  error
}: {
  cards: ChildSelectorCard[]
  source: 'live' | 'unavailable'
  error?: string
}) {
  const result: OsApiResult<ChildSelectorCard[]> = { data: cards, source, error }
  const { activeChild, recentChildren, selectChild } = useActiveChild()

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

      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <div className="flex items-start gap-3">
            <Clock3 className="mt-1 h-5 w-5 text-blue-700" aria-hidden />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Shift summary</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Start calm, then enter one journey.</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Detailed chronology, actions and reports stay hidden until a child is selected.</p>
              <Link href="/shifts/current" className="mt-4 inline-flex text-sm font-black text-blue-700">Open shift context</Link>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <ClipboardList className="mt-1 h-5 w-5 text-emerald-700" aria-hidden />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-700">Personal tasks</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">Role-safe reminders</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Personal reminders appear when the backend returns tasks for your role.</p>
              <Link href="/actions" className="mt-4 inline-flex text-sm font-black text-emerald-700">Open after selecting child</Link>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-start gap-3">
            <FileText className="mt-1 h-5 w-5 text-purple-700" aria-hidden />
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-purple-700">Continue draft</p>
              <h2 className="mt-2 text-xl font-black text-slate-950">{activeChild ? `Continue ${activeChild.preferredName || activeChild.displayName}'s journey` : 'No child draft open'}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">Drafts are restored only inside the child journey they belong to.</p>
              {activeChild ? <Link href={`/young-people/${encodeURIComponent(activeChild.id)}/journey`} className="mt-4 inline-flex text-sm font-black text-purple-700">Continue safely</Link> : null}
            </div>
          </div>
        </Card>
      </section>

      {recentChildren.length ? (
        <section className="rounded-[28px] border border-white/80 bg-white p-5 shadow-[0_16px_46px_rgba(15,23,42,0.06)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Recent children</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Return to a recent journey</h2>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {recentChildren.map((child) => (
              <Link
                key={child.id}
                href={`/young-people/${encodeURIComponent(child.id)}/journey`}
                onClick={() => selectChild(child, 'manual')}
                className="rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-black text-blue-800"
              >
                {child.preferredName || child.displayName}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <section className="grid gap-4 sm:gap-5 lg:grid-cols-2 2xl:grid-cols-3" aria-label="Young person selector" data-testid="child-selector">
        {cards.map((child) => (
          <Link
            key={child.id}
            href={`/young-people/${encodeURIComponent(child.id)}/journey`}
            onClick={() => selectChild({
              id: child.id,
              displayName: child.displayName,
              preferredName: child.preferredName
            }, 'manual')}
            aria-label={`Enter ${child.preferredName || child.displayName}'s journey`}
            data-testid={`child-card-${child.id}`}
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
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-500">Age {child.age || 'not recorded'} · {child.keyWorkerName}</p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <StatusBadge value={child.placementStatus || child.status || 'Active'} />
                <RiskBadge value={(child.riskLevel || 'medium') as any} />
              </div>

              <div className="mt-5 rounded-[24px] border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 text-blue-700" aria-hidden />
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-700">Context locked on entry</p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">Chronology, actions, reports, safeguarding and Orb retrieval open only for this child after selection.</p>
                  </div>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <span className="inline-flex items-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-lg shadow-slate-950/20" data-testid={`enter-journey-button-${child.id}`}>
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
