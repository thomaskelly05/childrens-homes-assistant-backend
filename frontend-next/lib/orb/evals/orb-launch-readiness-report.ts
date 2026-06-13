/**
 * ORB Residential launch readiness report — evidence summary for QA harness pass.
 */

import {
  ORB_LAUNCH_FIXTURE_MODES,
  ORB_LAUNCH_FIXTURE_RECORD_TYPES,
  ORB_RESIDENTIAL_LAUNCH_FIXTURES
} from './orb-residential-launch-fixtures.ts'
import { runOrbLiveLlmEval, type OrbLiveEvalRunResult } from './orb-live-llm-eval.ts'

export type OrbLaunchReadinessReport = {
  generatedAt: string
  fixtureCount: number
  modesCovered: string[]
  recordTypesCovered: string[]
  safetyScenarioCount: number
  meetingIntelligenceScenarioCount: number
  documentScenarioCount: number
  deterministicPass: boolean
  deterministicPassed: number
  deterministicFailed: number
  liveLlmEvalRequired: boolean
  liveLlmEvalRan: boolean
  liveLlmManualReviewCount: number
  remainingManualQa: string[]
  summary: string
  evalRun?: OrbLiveEvalRunResult
}

/** Areas that cannot be replaced by automated CI — honest launch evidence. */
export const ORB_REMAINING_MANUAL_LIVE_QA = [
  'iPhone Safari microphone permissions',
  'Real WebRTC latency',
  'Barge-in / interruption feel in live voice',
  'Mobile speaker labelling keyboard behaviour',
  'Actual diarisation provider accuracy on real audio',
  'Noisy-room capture quality',
  'Stripe checkout and customer portal flows',
  'OAuth provider login (Google/Microsoft) end-to-end',
  'Safari browser chrome and safe-area layout',
  'Real human perception of voice companion quality',
  'External professional review of output quality in live settings'
] as const

export function countSafetyScenarios(): number {
  return ORB_RESIDENTIAL_LAUNCH_FIXTURES.filter(
    (f) =>
      f.recordTypeId === 'safeguarding_concern' ||
      f.expectedSafetyPrompts.length > 0 ||
      f.managementOversightExpected
  ).length
}

export function countMeetingIntelligenceScenarios(): number {
  return ORB_RESIDENTIAL_LAUNCH_FIXTURES.filter((f) => f.speakerRoles?.length).length
}

export function countDocumentScenarios(): number {
  return ORB_RESIDENTIAL_LAUNCH_FIXTURES.filter((f) => f.sourceMode === 'document').length
}

export async function generateOrbLaunchReadinessReport(): Promise<OrbLaunchReadinessReport> {
  const evalRun = await runOrbLiveLlmEval()
  const deterministicPass = evalRun.mode === 'deterministic' && evalRun.failed === 0

  const report: OrbLaunchReadinessReport = {
    generatedAt: new Date().toISOString(),
    fixtureCount: ORB_RESIDENTIAL_LAUNCH_FIXTURES.length,
    modesCovered: ORB_LAUNCH_FIXTURE_MODES,
    recordTypesCovered: ORB_LAUNCH_FIXTURE_RECORD_TYPES,
    safetyScenarioCount: countSafetyScenarios(),
    meetingIntelligenceScenarioCount: countMeetingIntelligenceScenarios(),
    documentScenarioCount: countDocumentScenarios(),
    deterministicPass,
    deterministicPassed: evalRun.passed,
    deterministicFailed: evalRun.failed,
    liveLlmEvalRequired: true,
    liveLlmEvalRan: evalRun.liveEvalRan,
    liveLlmManualReviewCount: evalRun.manualReview,
    remainingManualQa: [...ORB_REMAINING_MANUAL_LIVE_QA],
    summary: '',
    evalRun
  }

  report.summary = [
    `ORB Residential launch evidence: ${report.fixtureCount} fixtures across ${report.modesCovered.length} modes.`,
    `Record types: ${report.recordTypesCovered.length}. Safety scenarios: ${report.safetyScenarioCount}.`,
    `Deterministic CI: ${deterministicPass ? 'PASS' : 'FAIL'} (${evalRun.passed}/${evalRun.fixtureCount}).`,
    `Live LLM eval: ${evalRun.liveEvalRan ? 'ran (manual review items may remain)' : 'not run — opt-in for staging'}.`,
    'Automated QA reduces risk but does not replace final live testing.'
  ].join(' ')

  return report
}

export function formatLaunchReadinessReportMarkdown(report: OrbLaunchReadinessReport): string {
  const lines = [
    '# ORB Residential Launch Readiness Report',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Coverage',
    `- Fixtures: ${report.fixtureCount}`,
    `- Modes: ${report.modesCovered.join(', ')}`,
    `- Record types: ${report.recordTypesCovered.length}`,
    `- Safety scenarios: ${report.safetyScenarioCount}`,
    `- Meeting intelligence: ${report.meetingIntelligenceScenarioCount}`,
    `- Document scenarios: ${report.documentScenarioCount}`,
    '',
    '## Deterministic CI',
    `- Result: **${report.deterministicPass ? 'PASS' : 'FAIL'}**`,
    `- Passed: ${report.deterministicPassed} / Failed: ${report.deterministicFailed}`,
    '',
    '## Live LLM Eval',
    `- Required for full launch confidence: yes`,
    `- Ran this pass: ${report.liveLlmEvalRan ? 'yes' : 'no'}`,
    `- Manual review items: ${report.liveLlmManualReviewCount}`,
    '',
    '## Remaining manual / live QA',
    ...report.remainingManualQa.map((item) => `- ${item}`),
    '',
    '## Summary',
    report.summary,
    ''
  ]
  return lines.join('\n')
}

export function formatLaunchReadinessReportJson(report: OrbLaunchReadinessReport): string {
  const { evalRun, ...rest } = report
  return JSON.stringify(
    {
      ...rest,
      evalSummary: evalRun
        ? {
            mode: evalRun.mode,
            passed: evalRun.passed,
            failed: evalRun.failed,
            manualReview: evalRun.manualReview
          }
        : undefined
    },
    null,
    2
  )
}
