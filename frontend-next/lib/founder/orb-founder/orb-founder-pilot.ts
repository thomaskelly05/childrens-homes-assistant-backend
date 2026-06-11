import { getQualityRuns } from '@/lib/founder/quality-lab'
import {
  assessOrbPilotPrivacyStatus,
  buildOrbPilotSummary,
  computeOrbPilotReadinessGate,
  ORB_PILOT_EARLY_SIGNAL_MESSAGE
} from '@/lib/orb/pilot'
import type { FounderOrbAnswer } from './orb-founder-engine'

export function matchesPilotQuestion(question: string): boolean {
  return /closed pilot|pilot ready|pilot feedback|pilot readiness|blocking pilot|helped the child/i.test(question)
}

export function answerPilotQuestion(
  question: string,
  options?: { whistleblowingCovered?: boolean; feedbackItems?: Parameters<typeof buildOrbPilotSummary>[0] }
): FounderOrbAnswer | null {
  const q = question.trim().toLowerCase()
  const privacy = assessOrbPilotPrivacyStatus()
  const gate = computeOrbPilotReadinessGate({
    runs: getQualityRuns(),
    whistleblowingCovered: options?.whistleblowingCovered ?? false,
    privacyUxCompleted: privacy.privacyUxCompleted,
    privacyNoticeAvailable: privacy.privacyNoticeAvailable,
    buildPassing: true
  })
  const summary = buildOrbPilotSummary(options?.feedbackItems ?? [])

  if (/ready for closed pilot|closed pilot ready|is orb ready/i.test(q)) {
    return {
      answer: `ORB closed-pilot readiness: ${gate.recommendation}. ${
        gate.blockers.length
          ? `Blockers: ${gate.blockers.join('; ')}.`
          : 'Core gates are met, but review warnings before inviting homes.'
      }`,
      usedSources: ['ORB Pilot Readiness Gate', 'Quality Lab', 'Privacy UX'],
      suggestedFollowUps: [
        'What is blocking pilot readiness?',
        'What pilot feedback do we have?',
        'What helped the child?'
      ],
      confidence: gate.recommendation === 'closed-pilot-ready' ? 'high' : 'medium'
    }
  }

  if (/blocking pilot|what is blocking/i.test(q)) {
    const items = [...gate.blockers, ...gate.warnings]
    return {
      answer: items.length
        ? `Pilot readiness blockers and warnings: ${items.join('; ')}.`
        : 'No blockers recorded in the current readiness gate.',
      usedSources: ['ORB Pilot Readiness Gate'],
      suggestedFollowUps: ['Is ORB ready for closed pilot?', 'What pilot feedback do we have?'],
      confidence: 'high'
    }
  }

  if (/pilot feedback|what feedback/i.test(q)) {
    const early =
      summary.evidenceLabel === 'early-signal-only' ? ` ${ORB_PILOT_EARLY_SIGNAL_MESSAGE}` : ''
    return {
      answer: `Pilot feedback count: ${summary.feedbackCount}.${early} ${
        summary.feedbackCount > 0
          ? `Average time saved: ${summary.averageTimeSavedMinutes ?? 'unavailable'} minutes. Would use again: ${
              summary.wouldUseAgainPercent !== undefined ? `${summary.wouldUseAgainPercent}%` : 'unavailable'
            }.`
          : 'No manual feedback submitted yet — metrics unavailable.'
      }`,
      usedSources: ['ORB Pilot Feedback (manual)'],
      suggestedFollowUps: ['What helped the child?', 'What is blocking pilot readiness?'],
      confidence: summary.feedbackCount >= 5 ? 'medium' : 'low'
    }
  }

  if (/helped the child|child voice/i.test(q)) {
    const themes = summary.childHelpThemes
    return {
      answer: themes.length
        ? `Safe themes from manual feedback: ${themes.join('; ')}. Not suitable for external evidence without manager review.`
        : 'No safe "what helped the child" themes in pilot feedback yet.',
      usedSources: ['ORB Pilot Feedback (manual, redacted)'],
      suggestedFollowUps: ['What pilot feedback do we have?', 'Is ORB ready for closed pilot?'],
      confidence: themes.length > 0 ? 'medium' : 'low'
    }
  }

  return null
}
