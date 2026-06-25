import type { ReactNode } from 'react'

const STATUS_STYLES: Record<string, string> = {
  active: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  live: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  invited: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  onboarding: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  pilot: 'border-violet-400/30 bg-violet-500/10 text-violet-200',
  disabled: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
  suspended: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  deleted: 'border-rose-400/30 bg-rose-500/10 text-rose-300',
  paused: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  offboarding: 'border-orange-400/30 bg-orange-500/10 text-orange-200',
  open: 'border-rose-400/30 bg-rose-500/10 text-rose-200',
  reviewing: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  resolved: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  escalated: 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200',
  investigating: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  dismissed: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
  pending: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  'in-progress': 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  completed: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  new: 'border-cyan-400/30 bg-cyan-500/10 text-cyan-200',
  contacted: 'border-sky-400/30 bg-sky-500/10 text-sky-200',
  'demo-booked': 'border-violet-400/30 bg-violet-500/10 text-violet-200',
  converted: 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200',
  lost: 'border-slate-400/30 bg-slate-500/10 text-slate-400',
  low: 'border-slate-400/30 bg-slate-500/10 text-slate-300',
  medium: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
  high: 'border-orange-400/30 bg-orange-500/10 text-orange-200',
  critical: 'border-rose-400/30 bg-rose-500/10 text-rose-200'
}

export function AdminStatusBadge({
  status,
  children
}: {
  status: string
  children?: ReactNode
}) {
  const normalised = status.toLowerCase().replace(/\s+/g, '-')
  const style = STATUS_STYLES[normalised] ?? 'border-white/10 bg-white/[0.04] text-slate-300'

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${style}`}
    >
      {children ?? status}
    </span>
  )
}
