'use client'

import type { LiveRecordingReadinessStatus } from '@/lib/record/live-recording-analysis'

function readinessLabel(status: LiveRecordingReadinessStatus): string {
  switch (status) {
    case 'empty':
      return 'Start writing'
    case 'draft_ready':
      return 'Ready to save draft'
    case 'needs_work':
      return 'Needs more detail'
    case 'ready_for_review':
      return 'Ready for review queue'
    case 'manager_review_required':
      return 'Manager review required'
    case 'safeguarding_review_required':
      return 'Safeguarding review required'
    default:
      return 'In progress'
  }
}

function readinessClass(status: LiveRecordingReadinessStatus): string {
  switch (status) {
    case 'ready_for_review':
      return 'bg-emerald-100 text-emerald-900'
    case 'safeguarding_review_required':
      return 'bg-rose-100 text-rose-900'
    case 'manager_review_required':
      return 'bg-amber-100 text-amber-900'
    case 'draft_ready':
      return 'bg-blue-100 text-blue-900'
    case 'needs_work':
      return 'bg-amber-50 text-amber-800'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

export function OrbRecordingReadinessMeter({
  qualityScore,
  readinessStatus
}: {
  qualityScore: number
  readinessStatus: LiveRecordingReadinessStatus
}) {
  const clampedScore = Math.max(0, Math.min(100, qualityScore))

  return (
    <div data-testid="orb-recording-readiness-meter" className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Readiness</p>
        <span
          data-testid="orb-readiness-status"
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${readinessClass(readinessStatus)}`}
        >
          {readinessLabel(readinessStatus)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          data-testid="orb-quality-score-bar"
          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 transition-all duration-300"
          style={{ width: `${clampedScore}%` }}
          role="progressbar"
          aria-valuenow={clampedScore}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Quality score ${clampedScore} percent`}
        />
      </div>
      <p className="text-[10px] font-semibold text-slate-500" data-testid="orb-quality-score-label">
        Quality indicators: {clampedScore}% — guidance only, not a grade
      </p>
    </div>
  )
}
