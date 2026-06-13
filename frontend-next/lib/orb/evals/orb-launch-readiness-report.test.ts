import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  countDocumentScenarios,
  countMeetingIntelligenceScenarios,
  countSafetyScenarios,
  formatLaunchReadinessReportJson,
  formatLaunchReadinessReportMarkdown,
  generateOrbLaunchReadinessReport,
  ORB_REMAINING_MANUAL_LIVE_QA
} from './orb-launch-readiness-report.ts'
import { ORB_RESIDENTIAL_LAUNCH_FIXTURES } from './orb-residential-launch-fixtures.ts'

describe('ORB launch readiness report', () => {
  it('generates report with fixture and mode coverage', async () => {
    const report = await generateOrbLaunchReadinessReport()
    assert.equal(report.fixtureCount, ORB_RESIDENTIAL_LAUNCH_FIXTURES.length)
    assert.ok(report.modesCovered.includes('chat'))
    assert.ok(report.modesCovered.includes('voice'))
    assert.ok(report.recordTypesCovered.length >= 8)
    assert.equal(report.deterministicPass, true)
    assert.equal(report.liveLlmEvalRequired, true)
  })

  it('counts safety and meeting scenarios', () => {
    assert.ok(countSafetyScenarios() >= 3)
    assert.ok(countMeetingIntelligenceScenarios() >= 4)
    assert.ok(countDocumentScenarios() >= 1)
  })

  it('lists remaining manual QA honestly', () => {
    assert.ok(ORB_REMAINING_MANUAL_LIVE_QA.length >= 10)
    assert.ok(ORB_REMAINING_MANUAL_LIVE_QA.some((q) => q.includes('Safari')))
    assert.ok(ORB_REMAINING_MANUAL_LIVE_QA.some((q) => q.includes('Stripe')))
    const combined = ORB_REMAINING_MANUAL_LIVE_QA.join(' ')
    assert.match(combined, /perception|diarisation provider|Stripe/i)
  })

  it('formats markdown and JSON artefacts', async () => {
    const report = await generateOrbLaunchReadinessReport()
    const md = formatLaunchReadinessReportMarkdown(report)
    assert.match(md, /# ORB Residential Launch Readiness Report/)
    assert.match(md, /Remaining manual/)
    const json = formatLaunchReadinessReportJson(report)
    const parsed = JSON.parse(json)
    assert.equal(parsed.fixtureCount, report.fixtureCount)
    assert.ok(parsed.remainingManualQa.length > 0)
  })

  it('summary states automated QA does not replace live testing', async () => {
    const report = await generateOrbLaunchReadinessReport()
    assert.match(report.summary, /does not replace final live testing/i)
  })
})
