import type { OrbPilotFeedback, OrbPilotSummary } from './orb-pilot-types'
import { sanitiseOrbPilotFeedbackForDisplay } from './orb-pilot-sanitize'

const EARLY_SIGNAL_THRESHOLD = 5

export type OrbPilotSummaryEngineResult = OrbPilotSummary & {
  safetyConcernCount: number
  frictionThemes: string[]
  childHelpThemes: string[]
  evidenceLabel: 'unavailable' | 'early-signal-only' | 'manual-feedback'
  wouldUseAgainCount?: number
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function extractThemes(entries: string[], limit = 5): string[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const sanitised = sanitiseOrbPilotFeedbackForDisplay(entry)
    if (!sanitised || sanitised.startsWith('[redacted')) continue
    const key = sanitised.toLowerCase().slice(0, 120)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([theme]) => theme)
}

export function buildOrbPilotSummary(feedback: OrbPilotFeedback[]): OrbPilotSummaryEngineResult {
  const feedbackCount = feedback.length

  if (feedbackCount === 0) {
    return {
      feedbackCount: 0,
      themes: [],
      limitations: ['No pilot feedback submitted yet. Metrics unavailable.'],
      safetyConcernCount: 0,
      frictionThemes: [],
      childHelpThemes: [],
      evidenceLabel: 'unavailable'
    }
  }

  const timeSaved = feedback
    .map((item) => item.timeSavedMinutes)
    .filter((value): value is number => typeof value === 'number' && value >= 0)
  const recordQuality = feedback
    .map((item) => item.recordQualityRating)
    .filter((value): value is number => typeof value === 'number' && value >= 1 && value <= 5)
  const childVoice = feedback
    .map((item) => item.childVoiceRating)
    .filter((value): value is number => typeof value === 'number' && value >= 1 && value <= 5)
  const therapeutic = feedback
    .map((item) => item.therapeuticLanguageRating)
    .filter((value): value is number => typeof value === 'number' && value >= 1 && value <= 5)
  const confidence = feedback
    .map((item) => item.staffConfidenceRating)
    .filter((value): value is number => typeof value === 'number' && value >= 1 && value <= 5)

  const wouldUseAgainResponses = feedback.filter((item) => typeof item.wouldUseAgain === 'boolean')
  const wouldUseAgainYes = wouldUseAgainResponses.filter((item) => item.wouldUseAgain).length
  const wouldUseAgainPercent =
    wouldUseAgainResponses.length > 0
      ? Math.round((wouldUseAgainYes / wouldUseAgainResponses.length) * 100)
      : undefined

  const childHelpThemes = extractThemes(
    feedback.map((item) => item.whatHelpedTheChild ?? '').filter(Boolean)
  )
  const frictionThemes = extractThemes(
    feedback
      .flatMap((item) => [item.whatFeltUnsafeOrUnhelpful, item.bugOrFriction, item.improvementSuggestion])
      .filter((value): value is string => Boolean(value))
  )
  const positiveThemes = extractThemes(
    feedback.map((item) => item.whatWorkedWell ?? '').filter(Boolean)
  )

  const safetyConcernCount = feedback.filter((item) => Boolean(item.whatFeltUnsafeOrUnhelpful?.trim())).length

  const limitations: string[] = ['Manual staff feedback — not verified external evidence.']
  let evidenceLabel: OrbPilotSummaryEngineResult['evidenceLabel'] = 'manual-feedback'

  if (feedbackCount < EARLY_SIGNAL_THRESHOLD) {
    limitations.unshift('Early signal only — not enough responses for reliable evidence.')
    evidenceLabel = 'early-signal-only'
  }

  return {
    feedbackCount,
    averageTimeSavedMinutes: average(timeSaved),
    averageRecordQualityRating: average(recordQuality),
    averageChildVoiceRating: average(childVoice),
    averageTherapeuticLanguageRating: average(therapeutic),
    averageStaffConfidenceRating: average(confidence),
    wouldUseAgainPercent,
    wouldUseAgainCount: wouldUseAgainYes,
    themes: positiveThemes,
    limitations,
    safetyConcernCount,
    frictionThemes,
    childHelpThemes,
    evidenceLabel
  }
}

export const ORB_PILOT_EARLY_SIGNAL_MESSAGE =
  'Early signal only — not enough responses for reliable evidence.'
