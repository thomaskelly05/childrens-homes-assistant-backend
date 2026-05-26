import { recordingFormByWorkspaceType, type RecordingWorkspaceType } from '@/lib/record/recording-form-registry'

export type QualityCoachSeverity = 'ok' | 'attention' | 'review'

export type QualityCoachCheck = {
  id: string
  label: string
  passed: boolean
  severity: QualityCoachSeverity
  suggestion?: string
}

export type QualityCoachResult = {
  checks: QualityCoachCheck[]
  flaggedPhrases: string[]
  overall: QualityCoachSeverity
  suggestions: string[]
}

export const JUDGEMENTAL_PHRASES: Array<{ pattern: RegExp; label: string; suggestion: string }> = [
  {
    pattern: /\battention[\s-]?seeking\b/i,
    label: 'attention seeking',
    suggestion: 'seeking connection / communicating a need'
  },
  {
    pattern: /\bmanipulative\b/i,
    label: 'manipulative',
    suggestion: 'trying to meet an unmet need in the moment'
  },
  { pattern: /\bnaughty\b/i, label: 'naughty', suggestion: 'describing observable behaviour without judgement' },
  {
    pattern: /\baggressive\b/i,
    label: 'aggressive',
    suggestion: 'presented as distressed and physically unsafe…'
  },
  {
    pattern: /\brefused\b/i,
    label: 'refused',
    suggestion: 'was not able to engage with…'
  },
  { pattern: /\bkicked off\b/i, label: 'kicked off', suggestion: 'became distressed / dysregulated' },
  {
    pattern: /\bbad behaviour\b/i,
    label: 'bad behaviour',
    suggestion: 'describing what was seen or heard'
  },
  { pattern: /\bdeliberately\b/i, label: 'deliberately', suggestion: 'describing actions and context factually' },
  {
    pattern: /\bnon[\s-]?compliant\b/i,
    label: 'non-compliant',
    suggestion: 'was unable to follow the request at that time…'
  },
  {
    pattern: /\bchose to behave\b/i,
    label: 'chose to behave',
    suggestion: 'describing what happened and what may have been communicated'
  }
]

export const SAFEGUARDING_REVIEW_TERMS = [
  'allegation',
  'disclosure',
  'injury',
  'restraint',
  'missing',
  'self-harm',
  'self harm',
  'suicide',
  'medication error',
  'abscond',
  'police',
  'hospital',
  'exploitation',
  'abuse',
  'body map'
] as const

export const PRIVACY_IDENTIFIER_CHECKS: Array<{ id: string; pattern: RegExp; label: string }> = [
  { id: 'dob', pattern: /\b\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}\b/, label: 'date that may be a date of birth' },
  { id: 'phone', pattern: /\b0\d{10,11}\b/, label: 'phone number' },
  {
    id: 'email',
    pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
    label: 'email address'
  },
  { id: 'nhs', pattern: /\b\d{3}\s?\d{3}\s?\d{4}\b/, label: 'number that may be an NHS number' },
  {
    id: 'postcode',
    pattern: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i,
    label: 'postcode or address fragment'
  },
  { id: 'school', pattern: /\bschool\b/i, label: 'school reference (check if necessary)' }
]

const CHILD_VOICE_MARKERS = /\b(said|told|shared|communicated|expressed|voice|wish|feeling|felt)\b/i
const ADULT_RESPONSE_MARKERS = /\b(adult|staff|responded|de-escalat|supported|co-regulat|intervened|followed|procedure)\b/i
const REPAIR_MARKERS = /\b(repair|follow[\s-]?up|check[\s-]?in|debrief|restor|next step|action)\b/i
const FACT_MARKERS = /\b(observed|seen|heard|at approximately|time|location|presented)\b/i
const INTERPRETATION_MARKERS = /\b(manipulative|deliberately|chose to|clearly wanted|obviously)\b/i
const EMOTIONALLY_LOADED = /\b(awful|terrible|disgusting|hateful|useless|pathetic|nightmare)\b/i

function severityFromPassed(passed: boolean, important = false): QualityCoachSeverity {
  if (passed) return 'ok'
  return important ? 'review' : 'attention'
}

export function findJudgementalPhrases(text: string): Array<{ label: string; suggestion: string }> {
  const found: Array<{ label: string; suggestion: string }> = []
  for (const entry of JUDGEMENTAL_PHRASES) {
    if (entry.pattern.test(text)) {
      found.push({ label: entry.label, suggestion: entry.suggestion })
    }
  }
  return found
}

export function detectSafeguardingReviewTerms(text: string): string[] {
  const lower = text.toLowerCase()
  return SAFEGUARDING_REVIEW_TERMS.filter((term) => lower.includes(term))
}

export function detectPrivacyIdentifiers(text: string): Array<{ id: string; label: string }> {
  return PRIVACY_IDENTIFIER_CHECKS.filter((check) => check.pattern.test(text)).map((check) => ({
    id: check.id,
    label: check.label
  }))
}

const DE_ESCALATION_MARKERS = /\b(de[\s-]?escalat|calm|space|choice|reassur|co[\s-]?regulat)\b/i
const MEDICATION_MARKERS = /\b(medication|dose|administer|refus|missed|pharmacy|GP|NHS)\b/i
const GOVERNANCE_MARKERS = /\b(evidence|decision|action|owner|timescale|review date|oversight)\b/i
const INFORMED_MARKERS = /\b(informed|notified|contacted|escalat|manager|safeguarding lead|police|social worker)\b/i

function formRequiresManagerReview(type?: RecordingWorkspaceType): boolean {
  if (!type) return false
  return recordingFormByWorkspaceType(type)?.requiresManagerReview ?? false
}

function formIsSafeguardingSensitive(type?: RecordingWorkspaceType): boolean {
  if (!type) return false
  return recordingFormByWorkspaceType(type)?.safeguardingSensitive ?? false
}

export function analyseRecordingQuality(
  body: string,
  title = '',
  recordingType?: RecordingWorkspaceType
): QualityCoachResult {
  const combined = `${title}\n${body}`.trim()
  const wordCount = combined ? combined.split(/\s+/).filter(Boolean).length : 0
  const judgemental = findJudgementalPhrases(combined)
  const suggestions: string[] = []
  const safeguardingTerms = detectSafeguardingReviewTerms(combined)
  const managerReviewRequired = formRequiresManagerReview(recordingType)
  const safeguardingForm = formIsSafeguardingSensitive(recordingType)

  const checks: QualityCoachCheck[] = [
    {
      id: 'child-voice',
      label: 'Includes child voice where appropriate',
      passed: CHILD_VOICE_MARKERS.test(combined),
      severity: severityFromPassed(CHILD_VOICE_MARKERS.test(combined)),
      suggestion: 'Include the child’s voice where appropriate.'
    },
    {
      id: 'adult-response',
      label: 'Describes adult response',
      passed: ADULT_RESPONSE_MARKERS.test(combined),
      severity: severityFromPassed(ADULT_RESPONSE_MARKERS.test(combined)),
      suggestion: 'Add how adults supported regulation or responded.'
    },
    {
      id: 'judgemental-language',
      label: 'Avoids blame/judgement language',
      passed: judgemental.length === 0,
      severity: severityFromPassed(judgemental.length === 0, true),
      suggestion: 'Describe what was seen or heard.'
    },
    {
      id: 'repair-followup',
      label: 'Includes repair or follow-up',
      passed: REPAIR_MARKERS.test(combined),
      severity: severityFromPassed(REPAIR_MARKERS.test(combined)),
      suggestion: 'Add any repair or follow-up.'
    },
    {
      id: 'facts-vs-interpretation',
      label: 'Distinguishes facts from interpretation',
      passed: FACT_MARKERS.test(combined) && !INTERPRETATION_MARKERS.test(combined),
      severity: severityFromPassed(FACT_MARKERS.test(combined) && !INTERPRETATION_MARKERS.test(combined)),
      suggestion: 'Separate what was observed from adult interpretation.'
    },
    {
      id: 'safeguarding-considered',
      label: safeguardingForm
        ? 'Safeguarding concern and escalation considered'
        : 'Safeguarding/manager review considered where relevant',
      passed:
        safeguardingTerms.length > 0 ||
        INFORMED_MARKERS.test(combined) ||
        (!safeguardingForm && !managerReviewRequired && wordCount < 40),
      severity: safeguardingForm
        ? safeguardingTerms.length > 0 && INFORMED_MARKERS.test(combined)
          ? 'ok'
          : 'review'
        : 'ok',
      suggestion: safeguardingForm
        ? 'Record who was informed and immediate safety actions.'
        : 'Consider whether manager or safeguarding review is needed.'
    },
    {
      id: 'manager-review-required',
      label: managerReviewRequired ? 'Manager review required for this record type' : 'Manager review if threshold met',
      passed: managerReviewRequired
        ? /\b(manager|review|oversight|sign[\s-]?off|escalat)\b/i.test(combined)
        : true,
      severity: managerReviewRequired
        ? /\b(manager|review|oversight|sign[\s-]?off|escalat)\b/i.test(combined)
          ? 'ok'
          : 'review'
        : 'ok',
      suggestion: managerReviewRequired ? 'Note manager review, safeguarding lead or sign-off.' : undefined
    },
    {
      id: 'length',
      label: 'Enough detail for a useful record',
      passed: wordCount >= 25,
      severity: severityFromPassed(wordCount >= 25),
      suggestion: 'Add a little more factual detail.'
    },
    {
      id: 'emotionally-loaded',
      label: 'Avoids unnecessarily loaded language',
      passed: !EMOTIONALLY_LOADED.test(combined),
      severity: severityFromPassed(!EMOTIONALLY_LOADED.test(combined)),
      suggestion: 'Use calm, professional wording.'
    }
  ]

  if (!CHILD_VOICE_MARKERS.test(combined)) {
    suggestions.push('Include the child’s voice where appropriate.')
  }
  if (!ADULT_RESPONSE_MARKERS.test(combined)) {
    suggestions.push('Add how adults supported regulation.')
  }
  if (judgemental.length) {
    suggestions.push('Describe what was seen or heard.')
    suggestions.push('Consider what the young person may have been communicating.')
  }
  if (!REPAIR_MARKERS.test(combined)) {
    suggestions.push('Add any repair or follow-up.')
  }

  if (recordingType === 'physical-intervention' && !DE_ESCALATION_MARKERS.test(combined)) {
    suggestions.push('Record de-escalation attempted before intervention.')
  }
  if (recordingType === 'missing' || recordingType === 'return-conversation') {
    if (!CHILD_VOICE_MARKERS.test(combined)) {
      suggestions.push('Include the young person’s voice on return where possible.')
    }
    if (!INFORMED_MARKERS.test(combined)) {
      suggestions.push('Record who was informed (manager, police, social worker as needed).')
    }
  }
  if (recordingType === 'medication-note-error' || recordingType === 'health-medication') {
    suggestions.push('Do not rely on AI for medication decisions — follow policy and seek advice.')
    if (!MEDICATION_MARKERS.test(combined)) {
      suggestions.push('Add factual medication or health detail.')
    }
  }
  if (recordingType === 'manager-review' || recordingType === 'reg44-evidence' || recordingType === 'reg45-evidence') {
    if (!GOVERNANCE_MARKERS.test(combined)) {
      suggestions.push('Add evidence basis, action owner and timescale.')
    }
  }
  if (managerReviewRequired && !/\b(manager|review|oversight)\b/i.test(combined)) {
    suggestions.push('This record type usually needs manager review — note oversight.')
  }

  const severities = checks.map((check) => check.severity)
  let overall: QualityCoachSeverity = 'ok'
  if (severities.includes('review')) overall = 'review'
  else if (severities.includes('attention')) overall = 'attention'

  return {
    checks,
    flaggedPhrases: judgemental.map((item) => item.label),
    overall,
    suggestions: [...new Set(suggestions)]
  }
}

export type ReviewChecklistItem = {
  id: string
  label: string
  status: QualityCoachSeverity
}

export function buildReviewChecklist(
  body: string,
  title = '',
  recordingType?: RecordingWorkspaceType
): ReviewChecklistItem[] {
  const combined = `${title}\n${body}`.trim()
  const quality = analyseRecordingQuality(body, title, recordingType)
  const privacyHits = detectPrivacyIdentifiers(combined)
  const safeguarding = detectSafeguardingReviewTerms(combined)
  const form = recordingType ? recordingFormByWorkspaceType(recordingType) : undefined
  const managerRequired = form?.requiresManagerReview ?? false

  const byId = Object.fromEntries(quality.checks.map((check) => [check.id, check]))

  const formChecklistItems: ReviewChecklistItem[] =
    form?.qualityChecklist.map((label, index) => ({
      id: `form-check-${index}`,
      label,
      status: combined.length > 30 ? 'ok' : 'attention'
    })) ?? []

  return [
    {
      id: 'factual',
      label: 'Factual and clear',
      status: byId['facts-vs-interpretation']?.passed && byId['length']?.passed ? 'ok' : 'attention'
    },
    {
      id: 'child-centred',
      label: 'Child-centred language',
      status: byId['judgemental-language']?.passed ? 'ok' : 'review'
    },
    {
      id: 'child-voice-checklist',
      label: 'Child voice included where possible',
      status: byId['child-voice']?.passed ? 'ok' : 'attention'
    },
    {
      id: 'adult-response-checklist',
      label: 'Adult response recorded',
      status: byId['adult-response']?.passed ? 'ok' : 'attention'
    },
    {
      id: 'repair-checklist',
      label: 'Repair/follow-up recorded',
      status: byId['repair-followup']?.passed ? 'ok' : 'attention'
    },
    {
      id: 'safeguarding-checklist',
      label: 'Safeguarding concerns considered',
      status: safeguarding.length ? 'review' : 'ok'
    },
    {
      id: 'manager-checklist',
      label: managerRequired ? 'Manager review required' : 'Manager review considered',
      status: managerRequired || safeguarding.length ? 'review' : 'ok'
    },
    {
      id: 'identifiers',
      label: 'No unnecessary personal identifiers',
      status: privacyHits.length ? 'attention' : 'ok'
    },
    {
      id: 'spelling',
      label: 'Spelling/grammar reviewed',
      status: combined.length > 20 ? 'ok' : 'attention'
    },
    ...formChecklistItems.slice(0, 4)
  ]
}

export function reviewChecklistOverall(items: ReviewChecklistItem[]): QualityCoachSeverity {
  if (items.some((item) => item.status === 'review')) return 'review'
  if (items.some((item) => item.status === 'attention')) return 'attention'
  return 'ok'
}

export const RECORDING_ORB_COPY_PROMPT =
  'Please help me review this draft record for child-centred, factual and therapeutic language. I will paste the draft myself.'

export const RECORDING_OS_ORB_HREF = '/assistant/orb?mode=record_quality_review'
/** Wording help without loading OS record bodies — still IndiCare OS assistant, not standalone /orb. */
export const RECORDING_STANDALONE_ORB_HREF = '/assistant/orb?mode=general_operational_question'
