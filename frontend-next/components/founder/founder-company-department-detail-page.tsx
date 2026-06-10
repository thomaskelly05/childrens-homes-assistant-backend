'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { Bot, Play, Plus } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import { FounderCompanyKpiCard } from '@/components/founder/founder-company-kpi-card'
import { SaveToFounderMemoryButton } from '@/components/founder/save-to-founder-memory-button'
import { addFounderAction } from '@/lib/founder/actions/founder-action-store'
import { getCompanyDepartment } from '@/lib/founder/company/company-service'
import { isValidCompanyDepartmentId } from '@/lib/founder/company/company-departments'
import { runStaffAgent } from '@/lib/founder/team'

type Props = { departmentId: string }

export function FounderCompanyDepartmentDetailPage({ departmentId }: Props) {
  const valid = isValidCompanyDepartmentId(departmentId)
  const dept = useMemo(() => (valid ? getCompanyDepartment(departmentId) : undefined), [departmentId, valid])
  const agentOutput = useMemo(() => {
    if (!dept) return null
    try {
      return runStaffAgent(dept.agentId as Parameters<typeof runStaffAgent>[0])
    } catch {
      return null
    }
  }, [dept])

  if (!valid || !dept) {
    return (
      <div className="founder-dashboard min-h-screen p-8 text-white">
        <p>Department not found.</p>
        <Link href="/founder/company/departments" className="mt-4 text-cyan-300">Back to departments</Link>
      </div>
    )
  }

  function handleCreateAction() {
    addFounderAction({
      title: `Department action: ${dept!.name}`,
      detail: dept!.recommendedDecisions?.[0] ?? dept!.currentPriorities[0] ?? 'Review department KPIs',
      source: 'Founder Company Operating Model',
      priority: 'high',
      category: 'operations'
    })
  }

  const memoryContent = [
    `Department: ${dept.name}`,
    `Score: ${dept.score ?? 'unavailable'}/100`,
    `Priority: ${dept.currentPriorities[0] ?? 'none'}`,
    `Decision: ${dept.recommendedDecisions?.[0] ?? 'none'}`
  ].join('\n')

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />
      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title={dept.name}
          subtitle={dept.purpose}
          showBack
          backHref="/founder/company/departments"
        />

        <div className="flex flex-wrap gap-2">
          <Link href={`/founder/orb?dept=${dept.id}`} className="inline-flex items-center gap-2 rounded-xl border border-violet-400/40 bg-violet-500/15 px-4 py-2 text-sm font-bold text-violet-200">
            <Bot className="h-4 w-4" /> Ask ORB Founder about this department
          </Link>
          <button type="button" onClick={handleCreateAction} className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-200">
            <Plus className="h-4 w-4" /> Create Action
          </button>
          <Link href="/founder/intelligence/briefings" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-200">
            Generate Department Briefing
          </Link>
          <SaveToFounderMemoryButton
            title={`${dept.name} decision`}
            content={memoryContent}
            type="decision"
            source="Founder Company Operating Model"
            className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-200"
          />
          <Link href="/founder/operating-loop" className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-4 py-2 text-sm font-bold text-slate-200">
            <Play className="h-4 w-4" /> Run Operating Loop
          </Link>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FounderSectionCard title="Ownership">
            <p className="text-sm text-slate-300">Executive: {dept.executiveOwner}</p>
            <p className="mt-1 text-sm text-slate-300">AI agent: {dept.aiAgentOwner}</p>
            <p className="mt-3 text-sm text-slate-400">Score {dept.score ?? '—'}/100 · Confidence {dept.confidence ?? '—'}% · Status: {dept.status}</p>
          </FounderSectionCard>
          <FounderSectionCard title="Responsibilities">
            <ul className="space-y-1 text-sm text-slate-300">
              {dept.responsibilities.map((r) => <li key={r}>· {r}</li>)}
            </ul>
          </FounderSectionCard>
        </div>

        <FounderSectionCard title="Live KPIs">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dept.liveKpis.map((kpi) => (
              <FounderCompanyKpiCard key={kpi.id} kpi={kpi} />
            ))}
          </div>
        </FounderSectionCard>

        {agentOutput?.departmentOwnership ? (
          <FounderSectionCard title="Agent department ownership">
            <p className="text-sm text-slate-300">{agentOutput.summary}</p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">KPI interpretation</p>
                <ul className="mt-2 space-y-1 text-sm text-slate-300">
                  {agentOutput.departmentOwnership.kpiInterpretation.map((k) => <li key={k}>· {k}</li>)}
                </ul>
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-slate-500">Thomas needs to decide</p>
                <ul className="mt-2 space-y-1 text-sm text-amber-200/90">
                  {agentOutput.departmentOwnership.thomasDecisions.map((d) => <li key={d}>· {d}</li>)}
                </ul>
              </div>
            </div>
          </FounderSectionCard>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <FounderSectionCard title="Current priorities">
            <ul className="space-y-1 text-sm text-slate-300">{dept.currentPriorities.map((p) => <li key={p}>· {p}</li>)}</ul>
          </FounderSectionCard>
          <FounderSectionCard title="Open actions">
            <ul className="space-y-1 text-sm text-slate-300">
              {dept.openActions.length > 0 ? dept.openActions.map((a) => <li key={a}>· {a}</li>) : <li>No open actions.</li>}
            </ul>
          </FounderSectionCard>
          <FounderSectionCard title="Risks">
            <ul className="space-y-1 text-sm text-rose-200/90">{dept.openRisks.map((r) => <li key={r}>· {r}</li>)}</ul>
          </FounderSectionCard>
          <FounderSectionCard title="Opportunities">
            <ul className="space-y-1 text-sm text-emerald-200/90">
              {(dept.opportunities ?? []).length > 0 ? dept.opportunities!.map((o) => <li key={o}>· {o}</li>) : <li>None from connected data.</li>}
            </ul>
          </FounderSectionCard>
        </div>

        {dept.recommendedDecisions && dept.recommendedDecisions.length > 0 ? (
          <FounderSectionCard title="Recommended decisions">
            <ul className="space-y-1 text-sm text-slate-300">{dept.recommendedDecisions.map((d) => <li key={d}>· {d}</li>)}</ul>
          </FounderSectionCard>
        ) : null}
      </div>
    </div>
  )
}
