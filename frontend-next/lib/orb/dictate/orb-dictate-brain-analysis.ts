import type { OrbDictateQualityChecks, OrbDictateNoteType } from '@/lib/orb/dictate/orb-dictate-types'
import { ORB_DICTATE_NOTE_TYPE_LABELS } from '@/lib/orb/dictate/orb-dictate-types'

export type OrbDictateBrainSuggestion = {
  id: string
  category: 'wording' | 'safeguarding' | 'missing' | 'action' | 'oversight' | 'evidence'
  label: string
  detail: string
  status: 'suggested' | 'accepted' | 'rejected' | 'applied'
}

export type OrbDictateBrainAnalysis = {
  detected_record_type: string
  safeguarding_concerns: string[]
  missing_information: string[]
  professional_wording_suggestions: OrbDictateBrainSuggestion[]
  recommended_next_actions: string[]
  possible_outputs: string[]
  recording_quality_score: 'good' | 'needs_review'
  child_voice_check: string
  ofsted_evidence_check: string | null
  manager_oversight_note: string | null
  quality_checks: OrbDictateQualityChecks
}

const QUALITY_LABELS: Record<string, string> = {
  child_voice: 'Child voice',
  safeguarding: 'Safeguarding',
  manager_oversight: 'Manager oversight',
  impact: 'Impact and outcome',
  factual_clarity: 'Factual clarity',
  staff_response: 'Staff response',
  professional_curiosity: 'Professional curiosity',
  chronology_relevance: 'Chronology relevance',
  plan_risk_review: 'Plan and risk review',
  recording_tone: 'Recording tone',
  non_judgemental_language: 'Non-judgemental language',
  evidence_of_action: 'Evidence of action',
  follow_up_review_date: 'Follow-up review date'
}

export function buildBrainAnalysisFromGenerate(opts: {
  noteType: OrbDictateNoteType
  qualityChecks: OrbDictateQualityChecks
  summary: string
  actions: string[]
  ofstedLens?: string | null
}): OrbDictateBrainAnalysis {
  const { noteType, qualityChecks, summary, actions, ofstedLens } = opts
  const missing: string[] = []
  const safeguarding: string[] = []
  const suggestions: OrbDictateBrainSuggestion[] = []

  for (const [key, value] of Object.entries(qualityChecks)) {
    if (key === 'recording_quality') continue
    const label = QUALITY_LABELS[key] ?? key.replace(/_/g, ' ')
    if (value === 'missing' || value === 'weak') {
      missing.push(`${label} — add detail before finalising`)
      suggestions.push({
        id: `suggest_${key}`,
        category: key === 'safeguarding' ? 'safeguarding' : key === 'child_voice' ? 'wording' : 'missing',
        label: `Strengthen ${label.toLowerCase()}`,
        detail: `Consider adding ${label.toLowerCase()} based on what you observed.`,
        status: 'suggested'
      })
    } else if (value === 'review' || value === 'needs_review') {
      suggestions.push({
        id: `review_${key}`,
        category: 'wording',
        label: `Review ${label.toLowerCase()}`,
        detail: `${label} may need refinement — check accuracy before finalising.`,
        status: 'suggested'
      })
    }
  }

  if (qualityChecks.safeguarding === 'present' || qualityChecks.safeguarding === 'good') {
    safeguarding.push('Safeguarding themes detected — ensure escalation and notifications are documented.')
  }

  const childVoiceCheck =
    qualityChecks.child_voice === 'present' || qualityChecks.child_voice === 'good'
      ? 'Child voice appears present — verify direct quotes are accurate.'
      : 'Child voice not clearly present — consider adding what the young person said or communicated.'

  return {
    detected_record_type: ORB_DICTATE_NOTE_TYPE_LABELS[noteType],
    safeguarding_concerns: safeguarding,
    missing_information: missing,
    professional_wording_suggestions: suggestions,
    recommended_next_actions: actions.length ? actions : ['Review transcript', 'Confirm facts and times', 'Finalise in ORB Write'],
    possible_outputs: Object.values(ORB_DICTATE_NOTE_TYPE_LABELS).slice(0, 8),
    recording_quality_score: qualityChecks.recording_quality,
    child_voice_check: childVoiceCheck,
    ofsted_evidence_check: ofstedLens ?? null,
    manager_oversight_note:
      qualityChecks.manager_oversight === 'missing'
        ? 'Manager oversight not documented — add notification or review if required.'
        : null,
    quality_checks: qualityChecks
  }
}

export function applyAcceptedSuggestionsToDraft(
  draft: string,
  suggestions: OrbDictateBrainSuggestion[]
): string {
  const accepted = suggestions.filter((s) => s.status === 'accepted' || s.status === 'applied')
  if (!accepted.length) return draft
  const appendix = accepted
    .map((s) => `- ${s.label}: ${s.detail}`)
    .join('\n')
  return `${draft}\n\n## Accepted suggestions (review before use)\n\n${appendix}`
}
