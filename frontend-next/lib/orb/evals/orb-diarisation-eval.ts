/**
 * Diarisation evaluation fixtures — mocked provider output for ORB consumption checks.
 */

import {
  mapDiarisationToOrbTranscriptSegments,
  type DiarisationProviderResult
} from '../dictate/orb-dictate-diarisation.ts'

export type DiarisationEvalFixture = {
  id: string
  label: string
  providerResult: DiarisationProviderResult
  expectWarnings: string[]
  expectLowConfidenceWarning: boolean
  expectAdultConfirmationRequired: boolean
  expectNoRealNameGuessing: boolean
  prohibitedOutputPatterns: RegExp[]
}

export const ORB_DIARISATION_EVAL_FIXTURES: DiarisationEvalFixture[] = [
  {
    id: 'two_speakers',
    label: 'Two speakers — provider diarisation',
    providerResult: {
      provider: 'mock',
      diarisation_enabled: true,
      segments: [
        { speaker: 'Speaker 1', text: 'Night shift was quiet.', confidence: 0.92, start: 0, end: 3 },
        { speaker: 'Speaker 2', text: 'Medication given at eight.', confidence: 0.88, start: 4, end: 8 }
      ]
    },
    expectWarnings: [],
    expectLowConfidenceWarning: false,
    expectAdultConfirmationRequired: true,
    expectNoRealNameGuessing: true,
    prohibitedOutputPatterns: [/\bAlex\b/, /\bconfirmed as\b/i]
  },
  {
    id: 'three_speakers',
    label: 'Three speakers — multi-agency',
    providerResult: {
      provider: 'mock',
      diarisation_enabled: true,
      segments: [
        { speaker: 'Speaker 1', text: 'Education report overdue.', confidence: 0.9, start: 0, end: 4 },
        { speaker: 'Speaker 2', text: 'Social worker joined by phone.', confidence: 0.85, start: 5, end: 9 },
        { speaker: 'Speaker 3', text: 'Action: chase by Wednesday.', confidence: 0.87, start: 10, end: 14 }
      ]
    },
    expectWarnings: [],
    expectLowConfidenceWarning: false,
    expectAdultConfirmationRequired: true,
    expectNoRealNameGuessing: true,
    prohibitedOutputPatterns: [/\bRegistered Manager Smith\b/]
  },
  {
    id: 'low_confidence_turn',
    label: 'Low confidence speaker turn',
    providerResult: {
      provider: 'mock',
      diarisation_enabled: true,
      segments: [
        { speaker: 'Speaker 1', text: 'Unclear segment from noisy room.', confidence: 0.42, start: 0, end: 3 },
        { speaker: 'Speaker 2', text: 'Follow-up action noted.', confidence: 0.91, start: 4, end: 7 }
      ]
    },
    expectWarnings: ['Low confidence'],
    expectLowConfidenceWarning: true,
    expectAdultConfirmationRequired: true,
    expectNoRealNameGuessing: true,
    prohibitedOutputPatterns: []
  },
  {
    id: 'overlapping_unclear',
    label: 'Overlapping / unclear segment',
    providerResult: {
      provider: 'mock',
      diarisation_enabled: true,
      segments: [
        { speaker: 'Speaker 1', text: '[overlapping speech]', confidence: 0.55, start: 0, end: 2 },
        { speaker: 'Speaker 1', text: 'Partial transcript only.', confidence: 0.58, start: 2, end: 5 }
      ]
    },
    expectWarnings: ['Low confidence'],
    expectLowConfidenceWarning: true,
    expectAdultConfirmationRequired: true,
    expectNoRealNameGuessing: true,
    prohibitedOutputPatterns: [/\bconfirmed speaker\b/i]
  },
  {
    id: 'unconfirmed_speaker_label',
    label: 'Unconfirmed speaker label — generic only',
    providerResult: {
      provider: 'mock',
      diarisation_enabled: true,
      segments: [
        { speaker: 'spk_0', text: 'Generic speaker id from provider.', confidence: 0.8, start: 0, end: 4 }
      ]
    },
    expectWarnings: [],
    expectLowConfidenceWarning: false,
    expectAdultConfirmationRequired: true,
    expectNoRealNameGuessing: true,
    prohibitedOutputPatterns: [/\b(Jordan|Casey|Alex)\b/]
  },
  {
    id: 'confirmed_speaker_role',
    label: 'Adult-confirmed speaker role mapping',
    providerResult: {
      provider: 'mock',
      diarisation_enabled: true,
      segments: [
        { speaker: 'Speaker 1', text: 'Manager confirmed handover actions.', confidence: 0.93, start: 0, end: 5 }
      ]
    },
    expectWarnings: [],
    expectLowConfidenceWarning: false,
    expectAdultConfirmationRequired: false,
    expectNoRealNameGuessing: true,
    prohibitedOutputPatterns: []
  }
]

export type DiarisationEvalResult = {
  fixtureId: string
  passed: boolean
  failures: string[]
  mappingWarnings: string[]
  segmentCount: number
  hasProviderDiarisation: boolean
}

export function evaluateDiarisationFixture(fixture: DiarisationEvalFixture): DiarisationEvalResult {
  const failures: string[] = []
  const mapped = mapDiarisationToOrbTranscriptSegments(fixture.providerResult)

  if (!mapped.hasProviderDiarisation && fixture.providerResult.segments.length > 1) {
    failures.push('ORB did not consume provider diarisation')
  }

  for (const expected of fixture.expectWarnings) {
    const found = mapped.warnings.some((w) => w.includes(expected))
    if (!found) {
      failures.push(`Expected warning containing: ${expected}`)
    }
  }

  if (fixture.expectLowConfidenceWarning) {
    const hasLow = mapped.segments.some((s) => s.needs_review) || mapped.warnings.some((w) => w.includes('Low confidence'))
    if (!hasLow) {
      failures.push('Expected low confidence warning')
    }
  }

  if (fixture.expectAdultConfirmationRequired) {
    const hasUnconfirmedLabel = mapped.segments.some(
      (s) => /^Speaker \d+$/i.test(s.speaker_label) || /^spk_/i.test(s.speaker_label)
    )
    if (!hasUnconfirmedLabel && mapped.segments.length) {
      failures.push('Expected generic speaker labels pending adult confirmation')
    }
  }

  // Source references should not fabricate timestamps
  for (const seg of mapped.segments) {
    if (seg.started_at && fixture.providerResult.segments[0]?.start === undefined) {
      failures.push('Fabricated timestamp without provider start time')
    }
  }

  const combined = mapped.segments.map((s) => s.text).join(' ')
  for (const pattern of fixture.prohibitedOutputPatterns) {
    if (pattern.test(combined)) {
      failures.push(`Prohibited pattern in mapped output: ${pattern}`)
    }
  }

  return {
    fixtureId: fixture.id,
    passed: failures.length === 0,
    failures,
    mappingWarnings: mapped.warnings,
    segmentCount: mapped.segments.length,
    hasProviderDiarisation: mapped.hasProviderDiarisation
  }
}

export function runAllDiarisationEvals(): DiarisationEvalResult[] {
  return ORB_DIARISATION_EVAL_FIXTURES.map(evaluateDiarisationFixture)
}
