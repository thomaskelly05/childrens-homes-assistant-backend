'use client'

import Link from 'next/link'
import { Bot, CheckCircle2, Play, X } from 'lucide-react'

import type { FounderAction, FounderActionStatus } from '@/lib/founder/actions'
import { updateFounderActionStatus } from '@/lib/founder/actions'

const priorityTone: Record<FounderAction['priority'], string> = {
  critical: 'border-rose-400/40 bg-rose-500/10 text-rose-200',
  high: 'border-amber-400/40 bg-amber-500/10 text-amber-200',
  medium: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
  low: 'border-white/10 bg-white/5 text-slate-300'
}

const categoryLabel: Record<FounderAction['category'], string> = {
  product: 'Product',
  growth: 'Growth',
  ofsted: 'Ofsted',
  'customer-success': 'Customer Success',
  'ai-cost': 'AI Cost',
  'sector-intelligence': 'Sector Intelligence',
  'founder-story': 'Founder Story',
  operations: 'Operations'
}

const statusTone: Record<FounderActionStatus, string> = {
  new: 'text-violet-300',
  'in-progress': 'text-cyan-300',
  done: 'text-emerald-300',
  dismissed: 'text-slate-500'
}

const statusLabel: Record<FounderActionStatus, string> = {
  new: 'New',
  'in-progress': 'In progress',
  done: 'Done',
  dismissed: 'Dismissed'
}

type FounderActionCardProps = {
  action: FounderAction
  onStatusChange?: (id: string, status: FounderActionStatus) => void
  compact?: boolean
}

export function FounderActionCard({ action, onStatusChange, compact = false }: FounderActionCardProps) {
  const isClosed = action.status === 'done' || action.status === 'dismissed'

  function handleStatus(status: FounderActionStatus) {
    updateFounderActionStatus(action.id, status)
    onStatusChange?.(action.id, status)
  }

  return (
    <article
      className={`rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.05] to-transparent p-5 ${isClosed ? 'opacity-70' : ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] ${priorityTone[action.priority]}`}>
            {action.priority}
          </span>
          <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {categoryLabel[action.category]}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${statusTone[action.status]}`}>
            {statusLabel[action.status]}
          </span>
        </div>
        <span className="text-xs text-slate-500">{action.dueLabel}</span>
      </div>

      <h3 className="mt-4 text-base font-bold text-white">{action.title}</h3>
      {!compact ? <p className="mt-2 text-sm leading-6 text-slate-400">{action.description}</p> : null}

      <div className="mt-4 space-y-2 rounded-xl border border-white/8 bg-black/20 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Recommended next step</p>
        <p className="text-sm leading-6 text-slate-200">{action.recommendedNextStep}</p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
        <span>Source: {action.source}</span>
        {action.linkedAgent ? (
          <Link
            href={`/founder/agents/${action.linkedAgent}`}
            className="inline-flex items-center gap-1 font-semibold text-violet-300 transition hover:text-violet-200"
          >
            <Bot className="h-3 w-3" aria-hidden />
            {action.linkedAgent.replace(/-/g, ' ')}
          </Link>
        ) : null}
      </div>

      {!isClosed ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleStatus('in-progress')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 transition hover:border-cyan-400/50 hover:bg-cyan-500/15"
          >
            <Play className="h-3.5 w-3.5" aria-hidden />
            Start
          </button>
          <button
            type="button"
            onClick={() => handleStatus('done')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-xs font-bold text-emerald-200 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
          >
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            Done
          </button>
          <button
            type="button"
            onClick={() => handleStatus('dismissed')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-400 transition hover:border-white/20 hover:text-slate-300"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
            Dismiss
          </button>
        </div>
      ) : null}
    </article>
  )
}
