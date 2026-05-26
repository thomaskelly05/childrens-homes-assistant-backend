import {
  analyseRecordingQuality,
  detectPrivacyIdentifiers,
  detectSafeguardingReviewTerms,
  findJudgementalPhrases,
  type QualityCoachSeverity
} from '@/lib/record/recording-quality-coach'
import { recordingFormById } from '@/lib/record/recording-form-registry'
import type { RecordingFormRecordMetadata } from '@/lib/record/recording-form-metadata'
import {
  FACTUAL_ACCURACY_WARNING,
  guidanceForForm,
  THERAPEUTIC_LANGUAGE_SUBSTITUTIONS,
  type RecordingFormGuidance
} from '@/lib/record/recording-form-guidance'
import type { RecordingWorkspaceType } from '@/lib/record/recording-types'

export type LiveRecordingHint = {
  id: string
  category:
    | 'spelling_grammar'
    | 'clarity'
    | 'therapeutic_language'
    | 'missing_information'
    | 'child_voice'
    | 'adult_response'
    | 'follow_up'
    | 'plan_impact'
    | 'review'
    | 'safeguarding'
    | 'privacy'
  message: string
  severity: QualityCoachSeverity
  suggestion?: string
  phrase?: string
}

export type LiveRecordingReadinessStatus =
  | 'empty'
  | 'draft_ready'
  | 'needs_work'
  | 'ready_for_review'
  | 'manager_review_required'
  | 'safeguarding_review_required'

export type LiveRecordingAnalysis = {
  spellingGrammarHints: LiveRecordingHint[]
  clarityHints: LiveRecordingHint[]
  therapeuticLanguageHints: LiveRecordingHint[]
  missingInformationHints: LiveRecordingHint[]
  childVoiceHints: LiveRecordingHint[]
  adultResponseHints: LiveRecordingHint[]
  followUpHints: LiveRecordingHint[]
  planImpactHints: LiveRecordingHint[]
  reviewFlags: LiveRecordingHint[]
  safeguardingFlags: LiveRecordingHint[]
  privacyFlags: LiveRecordingHint[]
  qualityScore: number
  readinessStatus: LiveRecordingReadinessStatus
  signOffRecommendation: string
  factualAccuracyWarning: string
}

export type LiveRecordingAnalysisInput = {
  formId: string
  title: string
  body: string
  structuredData?: Record<string, unknown>
  eventDate?: string
  childId?: string
  homeId?: string
  recordingType?: RecordingWorkspaceType
  metadata?: RecordingFormRecordMetadata
  structuredRequiredMissing?: string[]
  planImpactChecked?: boolean
}

const CHILD_VOICE_MARKERS = /\b(said|told|shared|communicated|expressed|voice|wish|feeling|felt|wanted)\b/i
const ADULT_RESPONSE_MARKERS = /\b(adult|staff|responded|de-escalat|supported|co-regulat|intervened|followed|procedure)\b/i
const FOLLOW_UP_MARKERS = /\b(follow[\s-]?up|next step|action|notify|informed|escalat|debrief|repair)\b/i
const PLAN_IMPACT_MARKERS = /\b(plan|risk assessment|PEP|EHCP|contact plan|behaviour support|pathway)\b/i
const CLARITY_MARKERS = /\b(approximately|at|time|location|observed|seen|heard|presented)\b/i
const PLAN_IMPACT_FORM_CATEGORIES = new Set([
  'health_medication',
  'education_family',
  'safeguarding_incident',
  'missing_return',
  'planning_review'
])

function hint(
  id: string,
  category: LiveRecordingHint['category'],
  message: string,
  severity: QualityCoachSeverity = 'attention',
  extra?: Partial<LiveRecordingHint>
): LiveRecordingHint {
  return { id, category, message, severity, ...extra }
}

function scoreFromAnalysis(checksPassed: number, total: number, penalties: number): number {
  if (total === 0) return 0
  const base = Math.round((checksPassed / total) * 100)
  return Math.max(0, Math.min(100, base - penalties * 5))
}

function resolveGuidance(input: LiveRecordingAnalysisInput): RecordingFormGuidance {
  const form = recordingFormById(input.formId)
  return guidanceForForm(input.formId, form?.category)
}

function hasStructuredContent(structuredData?: Record<string, unknown>): boolean {
  if (!structuredData) return false
  return Object.values(structuredData).some((v) => {
    if (v == null || v === '') return false
    if (typeof v === 'boolean') return v
    return String(v).trim().length > 0
  })
}

export function analyseLiveRecording(input: LiveRecordingAnalysisInput): LiveRecordingAnalysis {
  const combined = `${input.title}\n${input.body}`.trim()
  const wordCount = combined ? combined.split(/\s+/).filter(Boolean).length : 0
  const guidance = resolveGuidance(input)
  const form = recordingFormById(input.formId)
  const quality = analyseRecordingQuality(input.body, input.title, input.recordingType)
  const judgemental = findJudgementalPhrases(combined)
  const safeguardingTerms = detectSafeguardingReviewTerms(combined)
  const privacyHits = detectPrivacyIdentifiers(combined)
  const hasStructured = hasStructuredContent(input.structuredData)

  const spellingGrammarHints: LiveRecordingHint[] = []
  const clarityHints: LiveRecordingHint[] = []
  const therapeuticLanguageHints: LiveRecordingHint[] = []
  const missingInformationHints: LiveRecordingHint[] = []
  const childVoiceHints: LiveRecordingHint[] = []
  const adultResponseHints: LiveRecordingHint[] = []
  const followUpHints: LiveRecordingHint[] = []
  const planImpactHints: LiveRecordingHint[] = []
  const reviewFlags: LiveRecordingHint[] = []
  const safeguardingFlags: LiveRecordingHint[] = []
  const privacyFlags: LiveRecordingHint[] = []

  for (const sub of THERAPEUTIC_LANGUAGE_SUBSTITUTIONS) {
    if (sub.pattern.test(combined)) {
      therapeuticLanguageHints.push(
        hint(`therapeutic-${sub.label}`, 'therapeutic_language', `Consider: “${sub.suggestion}” instead of “${sub.label}”.`, 'attention', {
          suggestion: sub.suggestion,
          phrase: sub.label
        })
      )
    }
  }

  for (const entry of judgemental) {
    if (!therapeuticLanguageHints.some((h) => h.phrase === entry.label)) {
      therapeuticLanguageHints.push(
        hint(`judgemental-${entry.label}`, 'therapeutic_language', `“${entry.label}” may read as judgemental.`, 'review', {
          suggestion: entry.suggestion,
          phrase: entry.label
        })
      )
    }
  }

  if (wordCount > 15 && !CLARITY_MARKERS.test(combined)) {
    clarityHints.push(
      hint('clarity-sequence', 'clarity', 'Add when/where and what was observed to improve clarity.', 'attention')
    )
  }

  if (wordCount > 0 && wordCount < 25 && !hasStructured) {
    missingInformationHints.push(
      hint('missing-length', 'missing_information', 'Add a little more factual detail for a useful record.', 'attention')
    )
  }

  for (const section of guidance.adultGuidanceSections) {
    if (section.requiredForReview && wordCount < 40 && !hasStructured) {
      missingInformationHints.push(
        hint(`missing-section-${section.heading}`, 'missing_information', section.guidance, 'review')
      )
    }
  }

  if (input.structuredRequiredMissing?.length) {
    missingInformationHints.push(
      hint(
        'structured-missing',
        'missing_information',
        `${input.structuredRequiredMissing.length} required structured field(s) still missing.`,
        'review'
      )
    )
  }

  if (!CHILD_VOICE_MARKERS.test(combined) && wordCount > 10) {
    childVoiceHints.push(
      hint('child-voice', 'child_voice', guidance.childVoiceGuidance, form?.safeguardingSensitive ? 'review' : 'attention')
    )
  }

  if (!ADULT_RESPONSE_MARKERS.test(combined) && wordCount > 10) {
    adultResponseHints.push(
      hint('adult-response', 'adult_response', guidance.adultResponseGuidance, 'attention')
    )
  }

  if (!FOLLOW_UP_MARKERS.test(combined) && wordCount > 20) {
    followUpHints.push(hint('follow-up', 'follow_up', guidance.followUpGuidance, 'attention'))
  }

  const needsPlanImpact =
    PLAN_IMPACT_FORM_CATEGORIES.has(form?.category || '') ||
    form?.requiresManagerReview ||
    form?.safeguardingSensitive
  if (needsPlanImpact && !input.planImpactChecked && !PLAN_IMPACT_MARKERS.test(combined) && wordCount > 15) {
    planImpactHints.push(hint('plan-impact', 'plan_impact', guidance.planImpactGuidance, 'attention'))
  }

  if (form?.requiresManagerReview) {
    reviewFlags.push(
      hint('manager-review-type', 'review', guidance.reviewGuidance, 'review')
    )
  }

  if (judgemental.length && form?.requiresManagerReview) {
    reviewFlags.push(
      hint('loaded-language', 'review', 'Loaded language detected — consider revision before manager review.', 'review')
    )
  }

  if (missingInformationHints.some((h) => h.severity === 'review')) {
    reviewFlags.push(hint('missing-key-details', 'review', 'Key details may be missing for this form type.', 'review'))
  }

  for (const term of safeguardingTerms) {
    safeguardingFlags.push(
      hint(`safeguarding-${term}`, 'safeguarding', `Safeguarding term “${term}” detected — ensure manager/safeguarding review.`, 'review')
    )
  }

  if (form?.safeguardingSensitive && !safeguardingTerms.length && wordCount > 20 && !/\b(informed|notified|escalat)\b/i.test(combined)) {
    safeguardingFlags.push(
      hint('safeguarding-escalation', 'safeguarding', 'Record who was informed and immediate safety actions.', 'review')
    )
  }

  for (const hit of privacyHits) {
    privacyFlags.push(
      hint(`privacy-${hit.id}`, 'privacy', `Possible unnecessary identifier: ${hit.label}.`, 'attention')
    )
  }

  if (wordCount > 30) {
    spellingGrammarHints.push(
      hint('spellcheck-browser', 'spelling_grammar', 'Browser spellcheck is enabled — review spelling and grammar.', 'ok')
    )
  }

  const checksPassed = quality.checks.filter((c) => c.passed).length
  const penalties = therapeuticLanguageHints.filter((h) => h.severity === 'review').length
  const qualityScore = scoreFromAnalysis(checksPassed, quality.checks.length, penalties)

  let readinessStatus: LiveRecordingReadinessStatus = 'empty'
  const hasContent = wordCount > 0 || hasStructured
  const hasContext = Boolean(input.childId || input.homeId)
  const hasEventDate = Boolean(input.eventDate?.trim())

  if (!hasContent) {
    readinessStatus = 'empty'
  } else if (safeguardingFlags.length || form?.safeguardingSensitive) {
    readinessStatus = 'safeguarding_review_required'
  } else if (form?.requiresManagerReview || reviewFlags.some((f) => f.severity === 'review')) {
    readinessStatus = 'manager_review_required'
  } else if (hasContent && hasEventDate && hasContext && quality.overall === 'ok') {
    readinessStatus = 'ready_for_review'
  } else if (hasContent && hasEventDate) {
    readinessStatus = 'draft_ready'
  } else {
    readinessStatus = 'needs_work'
  }

  let signOffRecommendation = 'Needs changes'
  if (readinessStatus === 'ready_for_review') {
    signOffRecommendation = 'Ready for manager review'
  } else if (readinessStatus === 'safeguarding_review_required') {
    signOffRecommendation = 'Safeguarding review required'
  } else if (readinessStatus === 'manager_review_required') {
    signOffRecommendation = 'Ready for manager review'
  } else if (readinessStatus === 'draft_ready') {
    signOffRecommendation = 'Save draft — complete sections before sign-off'
  } else if (form?.formalRouteClassification === 'NEEDS_FORMAL_BACKEND' || form?.formalRouteClassification === 'ROUTE_HINT_ONLY') {
    signOffRecommendation = 'Formal route not wired'
  }

  return {
    spellingGrammarHints,
    clarityHints,
    therapeuticLanguageHints,
    missingInformationHints,
    childVoiceHints,
    adultResponseHints,
    followUpHints,
    planImpactHints,
    reviewFlags,
    safeguardingFlags,
    privacyFlags,
    qualityScore,
    readinessStatus,
    signOffRecommendation,
    factualAccuracyWarning: FACTUAL_ACCURACY_WARNING
  }
}

export function debounce<T extends (...args: never[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  return ((...args: Parameters<T>) => {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => fn(...args), ms)
  }) as T
}

export function allLiveHints(analysis: LiveRecordingAnalysis): LiveRecordingHint[] {
  return [
    ...analysis.missingInformationHints,
    ...analysis.therapeuticLanguageHints,
    ...analysis.childVoiceHints,
    ...analysis.adultResponseHints,
    ...analysis.followUpHints,
    ...analysis.planImpactHints,
    ...analysis.reviewFlags,
    ...analysis.safeguardingFlags,
    ...analysis.spellingGrammarHints,
    ...analysis.clarityHints,
    ...analysis.privacyFlags
  ]
}
