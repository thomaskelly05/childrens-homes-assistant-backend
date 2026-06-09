'use client'

import Link from 'next/link'
import { useCallback, useState } from 'react'
import { Beaker, Bot, FileText, Hammer, Linkedin } from 'lucide-react'

import { FounderNavHeader } from '@/components/founder/founder-nav-header'
import { FounderSectionCard } from '@/components/founder/founder-section-card'
import {
  generateInvestorUpdateDraft,
  generateLinkedInDraft,
  generateProviderMessageDraft
} from '@/lib/founder/content'
import { generateBuildBriefFromCto } from '@/lib/founder/build-briefs'
import { refreshFounderActions } from '@/lib/founder/actions'
import {
  getStaffAgent,
  getStaffExecutionLogs,
  runStaffAgent,
  type FounderStaffAgentId
} from '@/lib/founder/team'

type FounderTeamRolePageProps = {
  roleId: FounderStaffAgentId
}

export function FounderTeamRolePage({ roleId }: FounderTeamRolePageProps) {
  const [, setTick] = useState(0)
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  const agent = getStaffAgent(roleId)
  const output = agent.run()
  const logs = getStaffExecutionLogs(roleId)

  function handleGenerateBriefing() {
    runStaffAgent(roleId)
    refresh()
  }

  function handleCreateActions() {
    runStaffAgent(roleId)
    refreshFounderActions()
    refresh()
  }

  function handleCursorBrief() {
    generateBuildBriefFromCto()
    refresh()
  }

  function handleLinkedInDraft() {
    generateLinkedInDraft('weekly-progress')
    refresh()
  }

  function handleInvestorDraft() {
    generateInvestorUpdateDraft()
    refresh()
  }

  function handleProviderDraft() {
    generateProviderMessageDraft()
    refresh()
  }

  const showCursorBrief = ['cto', 'lead-developer', 'product-director', 'orb-quality'].includes(roleId)
  const showQualityLab = roleId === 'orb-quality'
  const showLinkedIn = roleId === 'brand-ambassador'
  const showInvestor = roleId === 'investor-relations'
  const showProvider = roleId === 'partnerships'

  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <FounderNavHeader
          title={agent.name}
          subtitle={agent.purpose}
          showBack
          backHref="/founder/team"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <FounderSectionCard eyebrow="Role" title={agent.roleTitle}>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Department</dt>
                <dd className="mt-1 text-white">{agent.department}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Status</dt>
                <dd className="mt-1 capitalize text-cyan-200">{agent.status.replace(/-/g, ' ')}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Responsibilities</dt>
                <dd className="mt-2">
                  <ul className="list-inside list-disc space-y-1 text-slate-300">
                    {agent.responsibilities.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </dd>
              </div>
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Data sources</dt>
                <dd className="mt-1 text-slate-300">{agent.dataSources.join(', ')}</dd>
              </div>
            </dl>
          </FounderSectionCard>

          <FounderSectionCard eyebrow="Permissions" title="Access and limits">
            <ul className="space-y-2 text-sm">
              {Object.entries(agent.permissions).map(([key, allowed]) => (
                <li key={key} className="flex items-center justify-between rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                  <span className="text-slate-300">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className={allowed ? 'text-emerald-300' : 'text-slate-500'}>{allowed ? 'Yes' : 'No'}</span>
                </li>
              ))}
            </ul>
            {output.requiresApproval ? (
              <p className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                External outputs from this role require Thomas approval before publishing.
              </p>
            ) : null}
          </FounderSectionCard>
        </div>

        <FounderSectionCard eyebrow="Latest briefing" title="Current intelligence">
          <p className="text-sm leading-7 text-slate-300">{output.summary}</p>
          {output.findings.length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Findings</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-300">
                {output.findings.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {output.recommendations.length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Recommendations</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-cyan-200">
                {output.recommendations.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {output.risks.length > 0 ? (
            <div className="mt-4">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Risks</p>
              <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-rose-300">
                {output.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </FounderSectionCard>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleGenerateBriefing}
            className="rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/15"
          >
            Generate Briefing
          </button>
          <button
            type="button"
            onClick={handleCreateActions}
            className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-200 transition hover:bg-emerald-500/15"
          >
            Create Actions
          </button>
          <Link
            href={`/founder/orb?q=${encodeURIComponent(`What should the ${agent.roleTitle} focus on?`)}`}
            className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-200 transition hover:bg-violet-500/15"
          >
            <Bot className="h-4 w-4" aria-hidden />
            Ask ORB Founder
          </Link>
          {showQualityLab ? (
            <Link
              href="/founder/quality-lab"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-200 transition hover:bg-cyan-500/15"
            >
              <Beaker className="h-4 w-4" aria-hidden />
              Open Quality Lab
            </Link>
          ) : null}
          {showCursorBrief ? (
            <button
              type="button"
              onClick={handleCursorBrief}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-400/30 bg-blue-500/10 px-4 py-2.5 text-sm font-bold text-blue-200 transition hover:bg-blue-500/15"
            >
              <Hammer className="h-4 w-4" aria-hidden />
              Create Cursor Brief
            </button>
          ) : null}
          {showLinkedIn ? (
            <button
              type="button"
              onClick={handleLinkedInDraft}
              className="inline-flex items-center gap-2 rounded-xl border border-pink-400/30 bg-pink-500/10 px-4 py-2.5 text-sm font-bold text-pink-200 transition hover:bg-pink-500/15"
            >
              <Linkedin className="h-4 w-4" aria-hidden />
              Draft LinkedIn Post
            </button>
          ) : null}
          {showInvestor ? (
            <button
              type="button"
              onClick={handleInvestorDraft}
              className="inline-flex items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-500/10 px-4 py-2.5 text-sm font-bold text-yellow-200 transition hover:bg-yellow-500/15"
            >
              <FileText className="h-4 w-4" aria-hidden />
              Draft Investor Update
            </button>
          ) : null}
          {showProvider ? (
            <button
              type="button"
              onClick={handleProviderDraft}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-400/30 bg-indigo-500/10 px-4 py-2.5 text-sm font-bold text-indigo-200 transition hover:bg-indigo-500/15"
            >
              Draft Provider Message
            </button>
          ) : null}
        </div>

        {logs.length > 0 ? (
          <FounderSectionCard eyebrow="Execution log" title="Recent activity">
            <div className="space-y-2">
              {logs.slice(0, 10).map((log) => (
                <div key={log.id} className="rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-sm">
                  <span className="text-xs text-slate-500">{new Date(log.timestamp).toLocaleString('en-GB')}</span>
                  <p className="mt-1 text-slate-300">{log.message}</p>
                </div>
              ))}
            </div>
          </FounderSectionCard>
        ) : null}
      </div>
    </div>
  )
}
