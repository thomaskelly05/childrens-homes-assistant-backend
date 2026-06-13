/**
 * Optional live LLM eval harness — CI deterministic by default; staging live when env present.
 */

import type { OrbResidentialLaunchFixture } from './orb-residential-launch-fixtures.ts'
import {
  mockLaunchFixtureOutput,
  ORB_RESIDENTIAL_LAUNCH_FIXTURES
} from './orb-residential-launch-fixtures.ts'
import {
  allAssertionsPassed,
  flattenAssertionFailures,
  runLaunchFixtureAssertions
} from './orb-residential-quality-assertions.ts'
import { buildOrbIntelligenceTrace } from '../orb-intelligence-trace.ts'

export type OrbLiveEvalMode = 'deterministic' | 'live'

export type OrbLiveEvalScoreDimension =
  | 'child_centredness'
  | 'therapeutic_language'
  | 'missing_information'
  | 'safeguarding_prompt_accuracy'
  | 'hallucination_risk'
  | 'action_point_accuracy'
  | 'source_reference_accuracy'
  | 'record_type_suitability'
  | 'orb_write_readiness'

export type OrbLiveEvalFixtureResult = {
  fixtureId: string
  mode: OrbLiveEvalMode
  passed: boolean
  requiresManualReview: boolean
  scores: Partial<Record<OrbLiveEvalScoreDimension, 'pass' | 'fail' | 'manual_review'>>
  failures: string[]
  traceSummary?: Record<string, unknown>
}

export type OrbLiveEvalRunResult = {
  mode: OrbLiveEvalMode
  ranAt: string
  fixtureCount: number
  passed: number
  failed: number
  manualReview: number
  results: OrbLiveEvalFixtureResult[]
  liveEvalRequired: boolean
  liveEvalRan: boolean
}

export const LIVE_LLM_EVAL_ENV_VARS = ['ORB_LIVE_LLM_EVAL', 'OPENAI_API_KEY'] as const

export function resolveOrbLiveEvalMode(): OrbLiveEvalMode {
  const enabled = process.env.ORB_LIVE_LLM_EVAL === '1' || process.env.ORB_LIVE_LLM_EVAL === 'true'
  const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim())
  return enabled && hasKey ? 'live' : 'deterministic'
}

export function isLiveLlmEvalAvailable(): boolean {
  return resolveOrbLiveEvalMode() === 'live'
}

/** Deterministic eval — uses mock output and assertion helpers; no API key required. */
export function evaluateFixtureDeterministic(fixture: OrbResidentialLaunchFixture): OrbLiveEvalFixtureResult {
  const output = mockLaunchFixtureOutput(fixture)
  const assertionResults = runLaunchFixtureAssertions(fixture, output)
  const failures = flattenAssertionFailures(assertionResults.filter((r) => !r.passed))
  const passed = allAssertionsPassed(assertionResults)

  const trace = buildOrbIntelligenceTrace({
    sourceMode: fixture.sourceMode,
    sourceSummary: fixture.label,
    selectedRecordTypeId: fixture.recordTypeId,
    missingInformation: fixture.expectedMissingInformation,
    safeguardingPrompts: fixture.expectedSafetyPrompts
  })

  const scores: OrbLiveEvalFixtureResult['scores'] = {
    child_centredness: assertionResults.find((r) => r.category === 'child_centred')?.passed ? 'pass' : 'fail',
    therapeutic_language: assertionResults.find((r) => r.category === 'therapeutic')?.passed ? 'pass' : 'fail',
    missing_information: /\bnot clear\b/i.test(output) ? 'pass' : 'fail',
    safeguarding_prompt_accuracy:
      fixture.expectedSafetyPrompts.length === 0 || /\b(escalat|DSL|safeguarding)\b/i.test(output)
        ? 'pass'
        : 'fail',
    hallucination_risk: assertionResults.find((r) => r.category === 'recording_quality')?.passed ? 'pass' : 'fail',
    action_point_accuracy: fixture.expectedActionPoints.every((a) => output.toLowerCase().includes(a.toLowerCase()))
      ? 'pass'
      : 'fail',
    source_reference_accuracy: fixture.expectedSourceReferences ? 'manual_review' : 'pass',
    record_type_suitability: fixture.recordTypeId ? 'pass' : 'fail',
    orb_write_readiness: assertionResults.find((r) => r.category === 'orb_write')?.passed ? 'pass' : 'fail'
  }

  return {
    fixtureId: fixture.id,
    mode: 'deterministic',
    passed,
    requiresManualReview: false,
    scores,
    failures,
    traceSummary: {
      traceId: trace.traceId,
      sourceMode: trace.sourceMode,
      adultReviewRequired: trace.adultReviewRequired,
      recordingFrameworkVersion: trace.recordingFrameworkVersion
    }
  }
}

/**
 * Live LLM eval placeholder — opt-in only.
 * Does not call external APIs in CI; marks results for manual review when live mode requested.
 */
export async function evaluateFixtureLive(
  fixture: OrbResidentialLaunchFixture
): Promise<OrbLiveEvalFixtureResult> {
  if (!isLiveLlmEvalAvailable()) {
    return {
      fixtureId: fixture.id,
      mode: 'live',
      passed: false,
      requiresManualReview: true,
      scores: {
        child_centredness: 'manual_review',
        therapeutic_language: 'manual_review',
        missing_information: 'manual_review',
        safeguarding_prompt_accuracy: 'manual_review',
        hallucination_risk: 'manual_review',
        action_point_accuracy: 'manual_review',
        source_reference_accuracy: 'manual_review',
        record_type_suitability: 'manual_review',
        orb_write_readiness: 'manual_review'
      },
      failures: ['Live LLM eval not configured — set ORB_LIVE_LLM_EVAL=1 and OPENAI_API_KEY for staging runs']
    }
  }

  // Staging hook: actual model calls belong server-side; frontend harness records manual review requirement.
  return {
    fixtureId: fixture.id,
    mode: 'live',
    passed: false,
    requiresManualReview: true,
    scores: {
      child_centredness: 'manual_review',
      therapeutic_language: 'manual_review',
      missing_information: 'manual_review',
      safeguarding_prompt_accuracy: 'manual_review',
      hallucination_risk: 'manual_review',
      action_point_accuracy: 'manual_review',
      source_reference_accuracy: 'manual_review',
      record_type_suitability: 'manual_review',
      orb_write_readiness: 'manual_review'
    },
    failures: [
      'Live LLM eval stub — run staging eval against backend brain endpoints with fixtures; never use real child data'
    ]
  }
}

export async function runOrbLiveLlmEval(
  fixtures: OrbResidentialLaunchFixture[] = ORB_RESIDENTIAL_LAUNCH_FIXTURES
): Promise<OrbLiveEvalRunResult> {
  const mode = resolveOrbLiveEvalMode()
  const results: OrbLiveEvalFixtureResult[] = []

  for (const fixture of fixtures) {
    if (mode === 'live') {
      results.push(await evaluateFixtureLive(fixture))
    } else {
      results.push(evaluateFixtureDeterministic(fixture))
    }
  }

  const passed = results.filter((r) => r.passed).length
  const failed = results.filter((r) => !r.passed && !r.requiresManualReview).length
  const manualReview = results.filter((r) => r.requiresManualReview).length

  return {
    mode,
    ranAt: new Date().toISOString(),
    fixtureCount: fixtures.length,
    passed,
    failed,
    manualReview,
    results,
    liveEvalRequired: true,
    liveEvalRan: mode === 'live'
  }
}

export const LIVE_LLM_EVAL_GUIDANCE =
  'CI uses deterministic fixture mocks. Staging live eval requires ORB_LIVE_LLM_EVAL=1 and OPENAI_API_KEY. Never use real child data in live eval.'
