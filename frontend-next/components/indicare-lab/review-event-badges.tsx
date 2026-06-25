import type { ReviewRiskLevel, ReviewStatus } from '@/lib/indicare-lab/review-events/types'

export const REVIEW_RISK_TONE: Record<ReviewRiskLevel, string> = {
  critical: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  high: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  medium: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10',
  low: 'text-slate-300 border-white/10 bg-white/5'
}

export const REVIEW_STATUS_TONE: Record<ReviewStatus, string> = {
  pass: 'text-emerald-300 border-emerald-400/30 bg-emerald-500/10',
  rewrite: 'text-amber-300 border-amber-400/30 bg-amber-500/10',
  blocked: 'text-rose-300 border-rose-400/30 bg-rose-500/10',
  'needs-founder-review': 'text-violet-300 border-violet-400/30 bg-violet-500/10',
  reviewed: 'text-cyan-300 border-cyan-400/30 bg-cyan-500/10'
}

export function ReviewRiskBadge({ level }: { level: ReviewRiskLevel }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${REVIEW_RISK_TONE[level]}`}
    >
      {level} risk
    </span>
  )
}

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  const label =
    status === 'pass'
      ? 'Passed'
      : status === 'rewrite'
        ? 'Rewrite'
        : status === 'blocked'
          ? 'Blocked'
          : status === 'needs-founder-review'
            ? 'Founder review'
            : 'Reviewed'

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] ${REVIEW_STATUS_TONE[status]}`}
    >
      {label}
    </span>
  )
}
