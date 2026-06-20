'use client'

import type { OrbDictateBrainAnalysis } from '@/lib/orb/dictate/orb-dictate-brain-analysis'
import type { OrbDictateQualityStatus } from '@/lib/orb/dictate/orb-dictate-types'
import {
  ORB_DICTATE_REVIEW_CHECKLIST_ITEMS,
  ORB_DICTATE_REVIEW_STATUS_MAY_MISSING,
  ORB_DICTATE_REVIEW_STATUS_NEEDS_DECISION,
  ORB_DICTATE_REVIEW_STATUS_PRESENT
} from '@/lib/orb/dictate/orb-dictate-capture-copy'

export type OrbDictateReviewCheckStatus = 'present' | 'may_missing' | 'needs_decision' | 'unchecked'

function statusLabel(status: OrbDictateReviewCheckStatus): string {
  if (status === 'present') return ORB_DICTATE_REVIEW_STATUS_PRESENT
  if (status === 'may_missing') return ORB_DICTATE_REVIEW_STATUS_MAY_MISSING
  return ORB_DICTATE_REVIEW_STATUS_NEEDS_DECISION
}

function statusClass(status: OrbDictateReviewCheckStatus): string {
  if (status === 'present') return 'orb-dictate-review-status--present'
  if (status === 'may_missing') return 'orb-dictate-review-status--missing'
  return 'orb-dictate-review-status--decision'
}

function qualityToStatus(value: OrbDictateQualityStatus | undefined): OrbDictateReviewCheckStatus {
  if (!value || value === 'missing' || value === 'weak') return 'may_missing'
  if (value === 'review' || value === 'needs_review') return 'needs_decision'
  if (value === 'present' || value === 'good') return 'present'
  return 'needs_decision'
}

function inferChecklistStatus(
  item: string,
  analysis: OrbDictateBrainAnalysis | null,
  hasTranscript: boolean
): OrbDictateReviewCheckStatus {
  if (!hasTranscript) return 'unchecked'
  if (!analysis) return 'needs_decision'

  const lower = item.toLowerCase()
  const missing = analysis.missing_information.map((m) => m.toLowerCase())
  const checks = analysis.quality_checks

  if (lower.includes('child') && lower.includes('communicate')) {
    return qualityToStatus(checks.child_voice)
  }
  if (lower.includes('manager oversight')) {
    return qualityToStatus(checks.manager_oversight)
  }
  if (lower.includes('outcome') || lower.includes('follow-up')) {
    return qualityToStatus(checks.impact)
  }
  if (lower.includes('observe') || lower.includes('support') || lower.includes('de-escalate')) {
    return qualityToStatus(checks.staff_response ?? checks.factual_clarity)
  }
  if (lower.includes('factual') || lower.includes('child-centred')) {
    return qualityToStatus(checks.non_judgemental_language ?? checks.recording_tone)
  }
  if (lower.includes('what happened') || lower.includes('who was present')) {
    if (missing.some((m) => m.includes('factual') || m.includes('sequence') || m.includes('time'))) {
      return 'may_missing'
    }
    return analysis.recording_quality_score === 'good' ? 'present' : 'needs_decision'
  }

  if (missing.some((m) => lower.split(' ').some((word) => word.length > 4 && m.includes(word)))) {
    return 'may_missing'
  }

  return 'needs_decision'
}

export function OrbDictateReviewChecklist({
  analysis,
  hasTranscript,
  loading
}: {
  analysis: OrbDictateBrainAnalysis | null
  hasTranscript: boolean
  loading?: boolean
}) {
  return (
    <ul className="orb-dictate-review-checklist space-y-2" data-orb-dictate-review-checklist>
      {ORB_DICTATE_REVIEW_CHECKLIST_ITEMS.map((item) => {
        const status = loading ? 'needs_decision' : inferChecklistStatus(item, analysis, hasTranscript)
        const showStatus = hasTranscript && status !== 'unchecked'
        return (
          <li
            key={item}
            className="orb-dictate-review-checklist-item flex items-start justify-between gap-3 rounded-xl border border-[var(--orb-line)]/20 bg-[var(--orb-surface)]/60 px-3 py-2.5"
            data-orb-dictate-review-checklist-item={item}
          >
            <span className="text-xs leading-relaxed text-[var(--orb-foreground)]">{item}</span>
            {showStatus ? (
              <span
                className={`orb-dictate-review-status shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClass(status)}`}
                data-orb-dictate-review-status={statusLabel(status)}
              >
                {statusLabel(status)}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
