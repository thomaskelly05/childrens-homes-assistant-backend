'use client'

import type { OrbDictateQualityChecks, OrbDictateQualityStatus } from '@/lib/orb/dictate/orb-dictate-types'
import type { OrbDictateEditMode } from '@/lib/orb/dictate/orb-dictate-studio-actions'

type QualityKey = keyof OrbDictateQualityChecks

const QUALITY_ITEMS: Array<{
  key: QualityKey
  label: string
  improveMode?: OrbDictateEditMode
}> = [
  { key: 'child_voice', label: 'Child voice', improveMode: 'child_voice' },
  { key: 'safeguarding', label: 'Safeguarding', improveMode: 'safeguarding_lens' },
  { key: 'manager_oversight', label: 'Manager oversight', improveMode: 'manager_oversight' },
  { key: 'impact', label: 'Impact / outcome', improveMode: 'evidence_of_impact' },
  { key: 'professional_curiosity', label: 'Professional curiosity', improveMode: 'professional_curiosity' },
  { key: 'chronology_relevance', label: 'Chronology relevance', improveMode: 'chronology_conversion' },
  { key: 'plan_risk_review', label: 'Plan / risk review', improveMode: 'missing_information' },
  { key: 'recording_tone', label: 'Tone', improveMode: 'therapeutic_rewrite' },
  { key: 'non_judgemental_language', label: 'Non-judgemental language', improveMode: 'less_judgemental' },
  { key: 'evidence_of_action', label: 'Evidence of action', improveMode: 'action_plan' },
  { key: 'follow_up_review_date', label: 'Follow-up / review date', improveMode: 'missing_information' },
  { key: 'factual_clarity', label: 'Factual clarity', improveMode: 'factual_tone' },
  { key: 'staff_response', label: 'Staff response', improveMode: 'professional_language' },
  { key: 'recording_quality', label: 'Recording quality', improveMode: 'recording_quality_review' }
]

function statusLabel(status: OrbDictateQualityStatus | 'good' | 'needs_review' | undefined): string {
  if (!status) return 'Needs review'
  if (status === 'present' || status === 'good') return 'Strong'
  if (status === 'weak') return 'Weak'
  if (status === 'missing') return 'Missing'
  if (status === 'review' || status === 'needs_review') return 'Needs review'
  return String(status)
}

function statusClass(status: OrbDictateQualityStatus | 'good' | 'needs_review' | undefined): string {
  if (status === 'present' || status === 'good') return 'text-emerald-300'
  if (status === 'weak') return 'text-amber-300'
  if (status === 'missing') return 'text-rose-300'
  return 'text-sky-300'
}

export function OrbDictateStudioQuality({
  checks,
  onImprove,
  onAskOrb
}: {
  checks: OrbDictateQualityChecks
  onImprove: (mode: OrbDictateEditMode, instruction: string) => void
  onAskOrb: (prompt: string) => void
}) {
  return (
    <div className="space-y-2" data-orb-dictate-studio-quality>
      {QUALITY_ITEMS.map((item) => {
        const status = checks[item.key] as OrbDictateQualityStatus | 'good' | 'needs_review' | undefined
        const needsWork = status !== 'present' && status !== 'good'
        return (
          <div
            key={item.key}
            className="rounded-lg border border-[var(--orb-line)]/40 bg-white/[0.02] p-2"
            data-orb-dictate-quality-item={item.key}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-slate-200">{item.label}</span>
              <span className={`text-[10px] font-semibold uppercase ${statusClass(status)}`}>
                {statusLabel(status)}
              </span>
            </div>
            {needsWork ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {item.improveMode ? (
                  <button
                    type="button"
                    className="rounded-md border border-sky-400/30 px-2 py-0.5 text-[10px] text-sky-200 hover:bg-sky-500/10"
                    data-orb-dictate-quality-improve={item.key}
                    onClick={() => onImprove(item.improveMode!, `Improve ${item.label.toLowerCase()}`)}
                  >
                    Improve this
                  </button>
                ) : null}
                <button
                  type="button"
                  className="rounded-md border border-[var(--orb-line)]/50 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-white/5"
                  onClick={() => onAskOrb(`What is missing for ${item.label.toLowerCase()}?`)}
                >
                  Ask ORB
                </button>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
