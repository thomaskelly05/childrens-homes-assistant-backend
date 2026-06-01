import type { OrbDictateQualityChecks } from '@/lib/orb/dictate/orb-dictate-types'

export type OrbDictateReadinessLabel = 'not_ready' | 'needs_review' | 'good_draft' | 'strong_draft'

export type OrbDictateReadinessResult = {
  label: OrbDictateReadinessLabel
  title: string
  reasons: string[]
  improvements: string[]
}

const READINESS_COPY =
  'Readiness is a drafting aid. Adults must review and approve the record.'

export function orbDictateReadinessDisclaimer(): string {
  return READINESS_COPY
}

export function calculateOrbDictateReadiness(
  documentText: string,
  quality: Partial<OrbDictateQualityChecks>
): OrbDictateReadinessResult {
  const text = documentText.trim()
  const reasons: string[] = []
  const improvements: string[] = []
  let score = 0
  let gaps = 0

  if (text.length > 120) {
    score++
  } else {
    gaps++
    reasons.push('Key facts are thin or missing.')
    improvements.push('Add who, what, when and immediate actions.')
  }

  if (quality.child_voice === 'present' || quality.child_voice === 'good' || /child(?:'s)? voice|young person said/i.test(text)) {
    score++
  } else {
    gaps++
    reasons.push('Child voice is missing or not justified.')
    improvements.push('Include the young person’s words or explain why voice could not be captured.')
  }

  if (quality.safeguarding === 'present' || quality.safeguarding === 'good' || /safeguard/i.test(text)) {
    score++
  } else {
    gaps++
    reasons.push('Safeguarding considerations are not clear.')
    improvements.push('State whether safeguarding was considered and any escalation.')
  }

  if (quality.manager_oversight === 'present' || /manager|oversight|RI\b/i.test(text)) {
    score++
  } else {
    gaps++
    reasons.push('Manager oversight is not evident.')
    improvements.push('Record who was informed and any follow-up oversight.')
  }

  if (quality.impact === 'present' || quality.impact === 'good' || /outcome|impact|follow-?up/i.test(text)) {
    score++
  } else {
    gaps++
    reasons.push('Outcome or impact is weak.')
    improvements.push('Describe impact on the child and planned follow-up.')
  }

  if (!/blame|always never|should have known/i.test(text)) {
    score++
  } else {
    gaps++
    reasons.push('Tone may sound judgemental in places.')
    improvements.push('Use factual, non-judgemental language.')
  }

  let label: OrbDictateReadinessLabel
  let title: string
  if (gaps >= 3 || text.length < 80) {
    label = 'not_ready'
    title = 'Not ready'
  } else if (gaps >= 1 || score < 5) {
    label = 'needs_review'
    title = 'Needs review'
  } else if (score >= 6) {
    label = 'strong_draft'
    title = 'Strong draft'
  } else {
    label = 'good_draft'
    title = 'Good draft'
  }

  if (!reasons.length && label === 'strong_draft') {
    reasons.push('Core recording elements are present.')
  }
  if (!improvements.length && label !== 'strong_draft') {
    improvements.push('Run quality checks and add any missing sections.')
  }

  return { label, title, reasons, improvements }
}
