import { Bot } from 'lucide-react'

import { LabSectionCard } from '@/components/indicare-lab/lab-section-card'
import { RiskBadge } from '@/components/indicare-lab/lab-shared'
import { formatLabDate } from '@/lib/indicare-lab/build-brief'
import type { ReviewBoardAgent, ReviewAgentStatus } from '@/lib/indicare-lab/types'

const STATUS_TONE: Record<ReviewAgentStatus, string> = {
  attention: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  stable: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  reviewing: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  offline: 'text-slate-400 border-white/10 bg-white/5'
}

function StatusBadge({ status }: { status: ReviewAgentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${STATUS_TONE[status]}`}
    >
      {status}
    </span>
  )
}

export function ReviewBoardPanel({ agents }: { agents: ReviewBoardAgent[] }) {
  return (
    <LabSectionCard
      id="review-board"
      eyebrow="Synthetic review"
      title="AI-modelled review board"
      description="Eight synthetic review perspectives — not real human experts. Supports internal evaluation by flagging common issues and recommendations."
      action={
        <div className="flex items-center gap-2 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-200">
          <Bot className="h-4 w-4" aria-hidden />
          AI-modelled perspectives only
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {agents.map((agent) => (
          <article
            key={agent.id}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-indigo-400/20"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-bold text-white">{agent.name}</h3>
              <StatusBadge status={agent.status} />
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black text-cyan-300">{agent.score}</span>
              <span className="text-xs text-slate-500">/ 100</span>
            </div>
            <p className="mt-2 text-[10px] text-slate-500">Last check: {formatLabDate(agent.lastCheck)}</p>
            <div className="mt-3">
              <RiskBadge level={agent.riskLevel} />
            </div>
            <dl className="mt-4 space-y-2 text-xs">
              <div>
                <dt className="font-bold uppercase tracking-[0.12em] text-slate-500">Common issue</dt>
                <dd className="mt-1 text-slate-400">{agent.commonIssue}</dd>
              </div>
              <div>
                <dt className="font-bold uppercase tracking-[0.12em] text-slate-500">Recommendation</dt>
                <dd className="mt-1 text-slate-300">{agent.recommendation}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </LabSectionCard>
  )
}
