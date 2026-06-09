import Link from 'next/link'
import { Bot, Circle } from 'lucide-react'

import type { FounderAgent } from '@/lib/founder/mock-data'

const statusTone: Record<FounderAgent['status'], string> = {
  active: 'text-emerald-400',
  monitoring: 'text-cyan-400',
  idle: 'text-slate-500'
}

const statusLabel: Record<FounderAgent['status'], string> = {
  active: 'Active',
  monitoring: 'Monitoring',
  idle: 'Idle'
}

export function FounderAgentCard({ agent }: { agent: FounderAgent }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-white/10 bg-black/25 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
            <Bot className="h-5 w-5 text-cyan-300" aria-hidden />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">{agent.name}</h3>
            <div className={`mt-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.12em] ${statusTone[agent.status]}`}>
              <Circle className="h-2 w-2 fill-current" aria-hidden />
              {statusLabel[agent.status]}
            </div>
          </div>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-400">{agent.purpose}</p>
      <div className="mt-4 rounded-xl border border-white/8 bg-white/[0.03] p-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Latest insight</p>
        <p className="mt-2 text-sm leading-6 text-slate-200">{agent.latestInsight}</p>
      </div>
      <Link
        href={`/founder/agents/${agent.id}`}
        className="mt-auto pt-5 text-sm font-bold text-cyan-300 transition hover:text-cyan-200"
        data-founder-agent={agent.id}
      >
        Open Agent →
      </Link>
    </article>
  )
}
