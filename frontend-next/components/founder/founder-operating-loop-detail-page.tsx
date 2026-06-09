'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { fetchOperatingLoopRun, type FounderOperatingLoopRun } from '@/lib/founder/operating-loop'

const STATUS_TONE: Record<string, string> = {
  completed: 'text-emerald-300',
  completed_with_warnings: 'text-amber-300',
  failed: 'text-rose-300',
  running: 'text-cyan-300',
  queued: 'text-slate-400'
}

export function FounderOperatingLoopDetailPage({ runId }: { runId: string }) {
  const [run, setRun] = useState<FounderOperatingLoopRun | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchOperatingLoopRun(runId)
      .then((loaded) => {
        if (!loaded) setError('Run not found')
        else setRun(loaded)
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load run'))
  }, [runId])

  if (error) {
    return (
      <div className="founder-dashboard min-h-screen px-4 py-8 md:px-8">
        <p className="text-rose-300">{error}</p>
        <Link href="/founder/operating-loop" className="mt-4 inline-flex text-cyan-300">
          Back to Operating Loop
        </Link>
      </div>
    )
  }

  if (!run) {
    return <div className="founder-dashboard min-h-screen px-4 py-8 text-slate-400 md:px-8">Loading run…</div>
  }

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title="Operating Loop Run"
          subtitle={run.id}
          showBack
          backHref="/founder/operating-loop"
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Status" value={run.status} className={STATUS_TONE[run.status]} />
          <InfoCard label="Started" value={new Date(run.startedAt).toLocaleString('en-GB')} />
          <InfoCard label="Completed" value={run.completedAt ? new Date(run.completedAt).toLocaleString('en-GB') : '—'} />
          <InfoCard label="Triggered by" value={run.triggeredBy} />
        </div>

        <FounderSectionCard eyebrow="Data basis" title="Data Basis">
          <p className="text-sm text-slate-300">{run.dataBasis}</p>
          <p className="mt-3 text-sm text-slate-400">Telemetry: {run.telemetrySummary}</p>
          <p className="mt-2 text-sm text-slate-400">Quality Lab: {run.qualityLabSummary}</p>
        </FounderSectionCard>

        <FounderSectionCard eyebrow="Agents" title="Agents Run">
          <ul className="space-y-2 text-sm">
            {run.staffAgentsRun.map((agent) => (
              <li key={`${agent.agentId}-${agent.completedAt}`} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
                <span className="font-semibold text-white">{agent.label}</span>
                <span className={agent.status === 'complete' ? 'text-emerald-300' : 'text-rose-300'}>{agent.status}</span>
              </li>
            ))}
          </ul>
        </FounderSectionCard>

        <div className="grid gap-6 xl:grid-cols-2">
          <OutputList title="Actions Created" items={run.actionsCreated} empty="No actions created." />
          <OutputList title="Approvals Created" items={run.approvalsCreated} empty="No approvals created." />
          <OutputList title="Drafts Created" items={run.draftsCreated} empty="No drafts created." />
          <OutputList title="Build Briefs Created" items={run.buildBriefsCreated} empty="No build briefs created." />
        </div>

        {run.risksIdentified.length > 0 ? (
          <FounderSectionCard eyebrow="Risks" title="Risks Identified">
            <ul className="space-y-2 text-sm text-amber-200">
              {run.risksIdentified.map((risk) => (
                <li key={risk}>{risk}</li>
              ))}
            </ul>
          </FounderSectionCard>
        ) : null}

        {run.recommendedFounderDecisions.length > 0 ? (
          <FounderSectionCard eyebrow="Decisions" title="Recommended Founder Decisions">
            <ul className="space-y-2 text-sm text-slate-300">
              {run.recommendedFounderDecisions.map((decision) => (
                <li key={decision}>{decision}</li>
              ))}
            </ul>
          </FounderSectionCard>
        ) : null}

        {run.errors.length > 0 ? (
          <FounderSectionCard eyebrow="Warnings" title="Safe Errors / Warnings">
            <div className="flex items-start gap-3 text-sm text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <ul className="space-y-1">
                {run.errors.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </FounderSectionCard>
        ) : null}

        {run.auditLogIds.length > 0 ? (
          <FounderSectionCard eyebrow="Audit" title="Audit Log Links">
            <ul className="space-y-2 text-sm">
              {run.auditLogIds.map((auditId) => (
                <li key={auditId}>
                  <Link href={`/founder/audit?entity=${auditId}`} className="text-cyan-300 hover:text-cyan-200">
                    {auditId}
                  </Link>
                </li>
              ))}
            </ul>
          </FounderSectionCard>
        ) : null}
      </div>
    </div>
  )
}

function InfoCard({ label, value, className = 'text-white' }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className={`mt-2 text-sm font-bold ${className}`}>{value}</p>
    </div>
  )
}

function OutputList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <FounderSectionCard eyebrow="Output" title={title}>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{empty}</p>
      ) : (
        <ul className="space-y-2 text-sm text-slate-300">
          {items.map((item) => (
            <li key={item} className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 font-mono text-xs">
              {item}
            </li>
          ))}
        </ul>
      )}
    </FounderSectionCard>
  )
}
