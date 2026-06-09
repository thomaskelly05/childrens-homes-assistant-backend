'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { ArrowRight, ListChecks } from 'lucide-react'

import type { FounderActionStatus } from '@/lib/founder/actions'
import { getFounderActionSummary } from '@/lib/founder/actions'
import { hasLiveFounderIntelligence } from '@/lib/founder/intelligence-service'
import { FounderActionCard } from '@/components/founder/founder-action-card'

export function FounderActionsPanel() {
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const summary = getFounderActionSummary()
  const hasLive = hasLiveFounderIntelligence()

  if (!hasLive || summary.openCount === 0) {
    return (
      <div className="space-y-5">
        <p className="text-sm leading-7 text-slate-400">
          No live founder actions yet. Actions will appear once live usage, Ofsted readiness, billing or ORB analytics data is connected.
        </p>
        <Link
          href="/founder/actions"
          className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
        >
          <ListChecks className="h-4 w-4" aria-hidden />
          Open Founder Actions
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Open actions</p>
          <p className="mt-2 text-3xl font-black text-white">{summary.openCount}</p>
        </div>
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/5 p-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-rose-300/80">Critical / high</p>
          <p className="mt-2 text-3xl font-black text-rose-200">{summary.criticalHighCount}</p>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Top recommended actions</p>
        {summary.topActions.map((action) => (
          <FounderActionCard
            key={action.id}
            action={action}
            compact
            onStatusChange={(_id: string, _status: FounderActionStatus) => refresh()}
          />
        ))}
      </div>

      <Link
        href="/founder/actions"
        className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
      >
        <ListChecks className="h-4 w-4" aria-hidden />
        Open Founder Actions
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  )
}
