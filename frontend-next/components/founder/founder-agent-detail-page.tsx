'use client'

import Link from 'next/link'
import { ArrowLeft, Bot, Circle, MessageSquare, Terminal } from 'lucide-react'

import type { AgentDetail } from '@/lib/founder/agents'

const statusTone: Record<AgentDetail['latestRun']['status'], string> = {
  active: 'text-emerald-400',
  monitoring: 'text-cyan-400',
  idle: 'text-slate-500'
}

const statusLabel: Record<AgentDetail['latestRun']['status'], string> = {
  active: 'Active',
  monitoring: 'Monitoring',
  idle: 'Idle'
}

const logLevelTone: Record<AgentDetail['executionLogs'][number]['level'], string> = {
  info: 'text-slate-400',
  warn: 'text-amber-300',
  success: 'text-emerald-300'
}

function formatLastRun(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function FounderAgentDetailPage({ agent }: { agent: AgentDetail }) {
  return (
    <div className="founder-dashboard min-h-screen">
      <div className="founder-dashboard-bg pointer-events-none fixed inset-0 -z-10" aria-hidden />

      <div className="mx-auto max-w-[1200px] space-y-8 px-4 py-8 pb-16 md:px-8">
        <Link
          href="/founder"
          className="inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Command Centre
        </Link>

        <header className="founder-surface rounded-[32px] border border-white/10 bg-white/[0.04] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="flex flex-wrap items-start gap-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04]">
              <Bot className="h-8 w-8 text-cyan-300" aria-hidden />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Founder Agent</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-white md:text-4xl">{agent.name}</h1>
              <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] ${statusTone[agent.latestRun.status]}`}>
                <Circle className="h-2 w-2 fill-current" aria-hidden />
                {statusLabel[agent.latestRun.status]}
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <Link
                href={`/founder/orb?agent=${agent.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-violet-400/30 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-500/15"
              >
                <MessageSquare className="h-4 w-4" aria-hidden />
                Ask ORB Founder about this agent
              </Link>
              <div className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-right">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Last run</p>
                <p className="mt-1 text-sm font-bold text-white">{formatLastRun(agent.lastRunAt)}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Purpose</p>
          <p className="mt-3 text-base leading-7 text-slate-300">{agent.purpose}</p>
        </section>

        <section className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Latest insight</p>
          <h2 className="mt-3 text-xl font-bold text-white">{agent.latestRun.title}</h2>
          <p className="mt-3 text-sm leading-7 text-slate-300">{agent.latestRun.summary}</p>
        </section>

        <section className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Recommendations</p>
          <ul className="mt-4 space-y-3">
            {agent.latestRun.recommendations.map((rec, index) => (
              <li key={rec} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-black/20 px-4 py-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-xs font-black text-cyan-200">
                  {index + 1}
                </span>
                <p className="text-sm leading-6 text-slate-200">{rec}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="founder-surface rounded-[28px] border border-white/10 bg-white/[0.04] p-6 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-slate-500" aria-hidden />
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">Execution logs</p>
          </div>
          <div className="mt-4 space-y-2 rounded-2xl border border-white/8 bg-[#0a0f18] p-4 font-mono text-xs">
            {agent.executionLogs.map((log) => (
              <div key={log.id} className="flex flex-wrap gap-x-3 gap-y-1">
                <span className="text-slate-600">
                  {new Date(log.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
                <span className={`font-bold uppercase ${logLevelTone[log.level]}`}>[{log.level}]</span>
                <span className="text-slate-300">{log.message}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
