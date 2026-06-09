'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ListChecks } from 'lucide-react'

import type { FounderAction, FounderActionStatus } from '@/lib/founder/actions'
import {
  getActionsByCategory,
  getActionsByPriority,
  getCompletedFounderActions,
  getFounderActions,
  getOpenFounderActions,
  resetFounderActionStore
} from '@/lib/founder/actions'
import { FounderActionCard } from '@/components/founder/founder-action-card'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { hasLiveFounderIntelligence, refreshFounderDashboardData } from '@/lib/founder/intelligence-service'

function ActionSection({
  title,
  actions,
  onStatusChange
}: {
  title: string
  actions: FounderAction[]
  onStatusChange: (id: string, status: FounderActionStatus) => void
}) {
  if (actions.length === 0) return null

  return (
    <FounderSectionCard eyebrow="Actions" title={title}>
      <div className="grid gap-4 xl:grid-cols-2">
        {actions.map((action) => (
          <FounderActionCard key={action.id} action={action} onStatusChange={onStatusChange} />
        ))}
      </div>
    </FounderSectionCard>
  )
}

export function FounderActionsPage() {
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const [hasLive, setHasLive] = useState(() => hasLiveFounderIntelligence())

  useEffect(() => {
    let active = true
    resetFounderActionStore()
    refreshFounderDashboardData()
      .then(() => {
        if (active) {
          resetFounderActionStore()
          setHasLive(hasLiveFounderIntelligence())
          refresh()
        }
      })
      .catch(() => undefined)
    return () => {
      active = false
    }
  }, [refresh])

  const handleStatusChange = useCallback(
    (_id: string, _status: FounderActionStatus) => {
      refresh()
    },
    [refresh]
  )

  const openActions = getOpenFounderActions()
  const byPriority = getActionsByPriority()
  const byCategory = getActionsByCategory()
  const completed = getCompletedFounderActions()
  const thisWeekActions = openActions.filter((a) => a.dueLabel === 'This week' || a.dueLabel === 'Today')

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <Link
          href="/founder"
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Command Centre
        </Link>

        <header className="founder-surface rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-start justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-cyan-200">
                <ListChecks className="h-3.5 w-3.5" aria-hidden />
                Founder Action Layer
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">Founder Actions</h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-400">
                Strategic work generated from live IndiCare Intelligence only.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Open actions</p>
              <p className="mt-1 text-3xl font-black text-white">{openActions.length}</p>
              <p className="text-xs text-slate-500">{byPriority.critical.length + byPriority.high.length} critical / high</p>
            </div>
          </div>
        </header>

        {!hasLive || getFounderActions().length === 0 ? (
          <FounderSectionCard
            eyebrow="Actions"
            title="No live founder actions yet"
            description="Actions will appear once live usage, Ofsted readiness, billing or ORB analytics data is connected."
          >
            <p className="text-sm leading-7 text-slate-400">
              Connect live data sources on the founder dashboard. Founder actions are generated only from connected live intelligence — never from mock or estimated figures.
            </p>
          </FounderSectionCard>
        ) : (
          <>
            <ActionSection
              title="Critical / High Priority"
              actions={[...byPriority.critical, ...byPriority.high]}
              onStatusChange={handleStatusChange}
            />

            <ActionSection title="This Week" actions={thisWeekActions} onStatusChange={handleStatusChange} />

            <ActionSection title="Product" actions={byCategory.product} onStatusChange={handleStatusChange} />

            <ActionSection title="Ofsted" actions={byCategory.ofsted} onStatusChange={handleStatusChange} />

            <ActionSection title="Growth" actions={byCategory.growth} onStatusChange={handleStatusChange} />

            <ActionSection title="AI Cost" actions={byCategory['ai-cost']} onStatusChange={handleStatusChange} />

            <ActionSection title="Completed" actions={completed} onStatusChange={handleStatusChange} />
          </>
        )}
      </div>
    </div>
  )
}
