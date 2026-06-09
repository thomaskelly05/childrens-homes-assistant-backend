'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { Bot, Play, Zap } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { refreshFounderDashboardData } from '@/lib/founder/intelligence-service'
import { runFounderOperatingLoop, getLastOperatingLoopResult } from '@/lib/founder/operating-loop'
import { getAllStaffAgents, getStaffTeamOverview, runStaffAgent } from '@/lib/founder/team'
import {
  getFounderTelemetrySummary,
  hydrateFounderTelemetryFromLiveData,
  refreshFounderTelemetrySummary
} from '@/lib/founder/telemetry'
import { refreshFounderActions } from '@/lib/founder/actions'

const departmentTone: Record<string, string> = {
  Executive: 'border-violet-400/30 bg-violet-500/10 text-violet-200',
  Product: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
  Engineering: 'border-blue-400/30 bg-blue-500/10 text-blue-200',
  Regulation: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  Growth: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  Brand: 'border-pink-400/30 bg-pink-500/10 text-pink-200',
  Finance: 'border-yellow-400/30 bg-yellow-500/10 text-yellow-200',
  Safety: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  Partnerships: 'border-indigo-400/30 bg-indigo-500/10 text-indigo-200'
}

const statusTone: Record<string, string> = {
  active: 'text-emerald-300',
  monitoring: 'text-cyan-300',
  idle: 'text-slate-400',
  'awaiting-approval': 'text-amber-300'
}

export function FounderTeamPage() {
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const [running, setRunning] = useState(false)
  const [loopMessage, setLoopMessage] = useState<string | null>(null)

  useEffect(() => {
    refreshFounderDashboardData()
      .then(() => hydrateFounderTelemetryFromLiveData())
      .then(() => refreshFounderTelemetrySummary())
      .then(() => refresh())
      .catch(() => undefined)
  }, [refresh])

  const overview = getStaffTeamOverview()
  const telemetry = getFounderTelemetrySummary()
  const agents = getAllStaffAgents()
  const lastLoop = getLastOperatingLoopResult()

  async function handleRunTeam() {
    setRunning(true)
    setLoopMessage(null)
    try {
      await refreshFounderDashboardData()
      hydrateFounderTelemetryFromLiveData()
      const result = await runFounderOperatingLoop()
      refreshFounderActions()
      setLoopMessage(result.summary)
      refresh()
    } finally {
      setRunning(false)
    }
  }

  function handleGenerateActions(agentId: string) {
    runStaffAgent(agentId as Parameters<typeof runStaffAgent>[0])
    refreshFounderActions()
    refresh()
  }

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1600px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Founder Staff Team"
          subtitle="Private operating team for IndiCare Intelligence. All external-facing outputs require your approval before publishing."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: 'Active agents', value: overview.activeAgents },
            { label: 'Pending approvals', value: overview.pendingApprovals },
            { label: 'Open actions', value: overview.openActions },
            { label: 'Telemetry events', value: telemetry.totalEvents > 0 ? telemetry.totalEvents : '—' },
            { label: "Today's priority", value: overview.topPriority.slice(0, 40) + (overview.topPriority.length > 40 ? '…' : '') }
          ].map((item) => (
            <div key={item.label} className="founder-surface rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{item.label}</p>
              <p className="mt-2 text-lg font-bold text-white">{item.value}</p>
            </div>
          ))}
        </div>

        <FounderSectionCard eyebrow="Operating loop" title="Run Founder Staff Team">
          <p className="mb-4 text-sm text-slate-400">
            Manually run the approval-based operating loop. No scheduled automation. No external posting or emails.
          </p>
          <button
            type="button"
            onClick={handleRunTeam}
            disabled={running}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-5 py-3 text-sm font-bold text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/15 disabled:opacity-50"
          >
            <Play className="h-4 w-4" aria-hidden />
            {running ? 'Running team…' : 'Run Founder Staff Team'}
          </button>
          {loopMessage ? <p className="mt-4 text-sm text-emerald-300">{loopMessage}</p> : null}
          {lastLoop ? (
            <p className="mt-2 text-xs text-slate-500">
              Last run: {lastLoop.actionsGenerated} actions, {lastLoop.draftsGenerated} drafts, {lastLoop.approvalsQueued} approvals queued
            </p>
          ) : null}
        </FounderSectionCard>

        <div className="grid gap-6 xl:grid-cols-2">
          {agents.map((agent) => {
            const output = agent.run()
            const deptClass = departmentTone[agent.department] ?? 'border-white/10 bg-white/5 text-slate-300'
            return (
              <article
                key={agent.id}
                className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${deptClass}`}>
                      {agent.department}
                    </span>
                    <h2 className="mt-3 text-xl font-bold text-white">{agent.name}</h2>
                    <p className="text-sm text-slate-400">{agent.roleTitle}</p>
                  </div>
                  <span className={`text-xs font-bold uppercase tracking-[0.12em] ${statusTone[agent.status]}`}>
                    {agent.status.replace(/-/g, ' ')}
                  </span>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Current focus</p>
                    <p className="mt-1 text-slate-300">{output.summary}</p>
                  </div>
                  {output.findings[0] ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Latest finding</p>
                      <p className="mt-1 text-slate-300">{output.findings[0]}</p>
                    </div>
                  ) : null}
                  {output.recommendations[0] ? (
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Recommended action</p>
                      <p className="mt-1 text-cyan-200">{output.recommendations[0]}</p>
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Link
                    href={`/founder/team/${agent.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:bg-cyan-500/15"
                  >
                    Open Role
                  </Link>
                  <Link
                    href={`/founder/orb?agent=${agent.id}&q=${encodeURIComponent(`What should the ${agent.roleTitle} focus on?`)}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-500/15"
                  >
                    <Bot className="h-3.5 w-3.5" aria-hidden />
                    Ask ORB Founder
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleGenerateActions(agent.id)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:bg-emerald-500/15"
                  >
                    <Zap className="h-3.5 w-3.5" aria-hidden />
                    Generate Actions
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </div>
    </div>
  )
}
