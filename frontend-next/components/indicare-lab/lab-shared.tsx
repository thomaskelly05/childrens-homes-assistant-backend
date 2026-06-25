import type { Priority, RiskLevel } from '@/lib/indicare-lab/types'

export const RISK_TONE: Record<RiskLevel, string> = {
  critical: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  high: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  medium: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  low: 'text-slate-300 border-white/10 bg-white/5'
}

export const PRIORITY_TONE: Record<Priority, string> = {
  p0: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  p1: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  p2: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  p3: 'text-slate-300 border-white/10 bg-white/5'
}

export const METRIC_TONE: Record<string, string> = {
  cyan: 'from-cyan-500/20 to-transparent',
  violet: 'from-violet-500/20 to-transparent',
  amber: 'from-amber-500/20 to-transparent',
  emerald: 'from-emerald-500/20 to-transparent',
  rose: 'from-rose-500/20 to-transparent'
}

export function RiskBadge({ level, className = '' }: { level: RiskLevel; className?: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${RISK_TONE[level]} ${className}`}
    >
      {level} risk
    </span>
  )
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${PRIORITY_TONE[priority]}`}
    >
      {priority}
    </span>
  )
}
