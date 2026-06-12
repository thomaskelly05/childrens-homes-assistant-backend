import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'

import {
  addFounderAgentEvent,
  addFounderAgentRecommendation,
  clearFounderAgentEventStore,
  getFounderAgentEvents,
  getFounderAgentRecommendations
} from './founder-agent-event-store.ts'
import { routeEventToAgents } from './founder-agent-router.ts'
import {
  contentRecommendationCannotAutoPublish,
  generateRecommendationForAgent,
  relationshipRecommendationCannotAutoSend
} from './founder-agent-recommendation-engine.ts'
import type { FounderAgentEvent } from './founder-agent-event-types.ts'

function makeEvent(overrides: Partial<FounderAgentEvent> = {}): Omit<FounderAgentEvent, 'id' | 'processed' | 'processedAt'> {
  return {
    type: 'critical_failure_detected',
    source: 'orb_evaluation',
    createdAt: new Date().toISOString(),
    severity: 'critical',
    title: 'Critical failures detected',
    summary: '2 critical failure(s) in syn-scenario-001.',
    relatedRunId: 'eval-run-test-1',
    relatedScenarioIds: ['syn-scenario-001'],
    affectedAgents: routeEventToAgents('critical_failure_detected'),
    payload: { criticalFailures: 2 },
    requiresReview: true,
    ...overrides
  }
}

beforeEach(() => {
  clearFounderAgentEventStore()
})

describe('Founder Agent Event Engine', () => {
  it('evaluation_run_completed event type is routable and storable', () => {
    const event = addFounderAgentEvent(makeEvent({ type: 'evaluation_run_completed', severity: 'info' }))
    assert.equal(event.type, 'evaluation_run_completed')
    assert.ok(getFounderAgentEvents().some((e) => e.type === 'evaluation_run_completed'))
  })

  it('critical_failure_detected routes to Quality, Safeguarding and Chief of Staff', () => {
    const routed = routeEventToAgents('critical_failure_detected')
    assert.ok(routed.includes('orb-quality-agent'))
    assert.ok(routed.includes('safeguarding-agent'))
    assert.ok(routed.includes('founder-chief-of-staff'))
    const event = addFounderAgentEvent(makeEvent())
    assert.ok(event.affectedAgents.includes('orb-quality-agent'))
    assert.ok(event.affectedAgents.includes('safeguarding-agent'))
  })

  it('provider_error_detected routes to Technical Agent', () => {
    const routed = routeEventToAgents('provider_error_detected')
    assert.ok(routed.includes('technical-agent'))
    const rec = generateRecommendationForAgent(
      addFounderAgentEvent(
        makeEvent({
          type: 'provider_error_detected',
          source: 'telemetry',
          severity: 'high',
          title: 'Provider error 502',
          summary: 'Bad gateway'
        })
      ),
      'technical-agent'
    )
    assert.ok(rec)
    assert.equal(rec?.proposedAction, 'create_technical_fix_brief')
  })

  it('privacy_review_missing routes to Governance Agent', () => {
    const routed = routeEventToAgents('privacy_review_missing')
    assert.ok(routed.includes('governance-agent'))
    const rec = generateRecommendationForAgent(
      addFounderAgentEvent(
        makeEvent({
          type: 'privacy_review_missing',
          source: 'governance',
          title: 'Privacy review missing'
        })
      ),
      'governance-agent'
    )
    assert.ok(rec)
    assert.equal(rec?.proposedAction, 'prepare_privacy_review_prompt')
  })

  it('weak coverage creates scenario recommendation', () => {
    const event = addFounderAgentEvent(
      makeEvent({
        type: 'scenario_generation_recommended',
        source: 'quality_lab',
        severity: 'low',
        title: 'Scenario generation recommended',
        payload: { weakArea: 'whistleblowing' }
      })
    )
    const rec = generateRecommendationForAgent(event, 'orb-quality-agent')
    assert.ok(rec)
    assert.equal(rec?.proposedAction, 'generate_synthetic_scenarios')
    assert.equal(rec?.approvalRequired, true)
  })

  it('recommendation records approval requirement for actionable items', () => {
    const event = addFounderAgentEvent(makeEvent())
    const draft = generateRecommendationForAgent(event, 'orb-quality-agent')
    assert.ok(draft)
    const rec = addFounderAgentRecommendation({
      eventId: event.id,
      agentId: 'orb-quality-agent',
      createdAt: new Date().toISOString(),
      recommendation: draft!.recommendation,
      rationale: draft!.rationale,
      riskLevel: draft!.riskLevel,
      proposedAction: draft!.proposedAction,
      approvalRequired: draft!.approvalRequired
    })
    assert.equal(rec.approvalRequired, true)
    assert.ok(getFounderAgentRecommendations().length > 0)
  })

  it('approval queue requires Tom approval (contract in actions module)', async () => {
    const { readFileSync } = await import('node:fs')
    const { dirname, join } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
    const actionsSource = readFileSync(join(root, 'lib/founder/agents/autonomous/founder-agent-actions.ts'), 'utf8')
    const engineSource = readFileSync(join(root, 'lib/founder/agents/autonomous/founder-agent-event-engine.ts'), 'utf8')
    assert.match(actionsSource, /queueApprovalFromRecommendation/)
    assert.match(actionsSource, /approvalRequired: true/)
    assert.match(engineSource, /Tom remains the approval gate/)
  })

  it('autoRunAfterDeploy does not run by default', async () => {
    const { readFileSync } = await import('node:fs')
    const { dirname, join } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
    const source = readFileSync(join(root, 'lib/founder/agents/autonomous/founder-autonomous-loop.ts'), 'utf8')
    assert.match(source, /autoRunAfterDeploy: false/)
    assert.match(source, /triggerAllowed/)
    assert.match(source, /handleAutonomyEvent/)
  })

  it('autoCreateDraftPR does not merge PR', async () => {
    const { readFileSync } = await import('node:fs')
    const { dirname, join } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
    const source = readFileSync(join(root, 'lib/founder/agents/autonomous/founder-agent-event-engine.ts'), 'utf8')
    assert.match(source, /no auto-merge/)
    assert.match(source, /autoCreateDraftPR/)
  })

  it('content recommendation cannot auto-publish', () => {
    assert.equal(contentRecommendationCannotAutoPublish('draft_linkedin_post'), true)
    assert.equal(contentRecommendationCannotAutoPublish('analyse_latest_run'), false)
  })

  it('external relationship recommendation cannot auto-send', () => {
    assert.equal(relationshipRecommendationCannotAutoSend('draft_partner_follow_up'), true)
    assert.equal(relationshipRecommendationCannotAutoSend('draft_provider_email'), true)
    assert.equal(relationshipRecommendationCannotAutoSend('create_audit_note'), false)
  })

  it('audit trail records events (contract in engine module)', async () => {
    const { readFileSync } = await import('node:fs')
    const { dirname, join } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
    const source = readFileSync(join(root, 'lib/founder/agents/autonomous/founder-agent-event-engine.ts'), 'utf8')
    assert.match(source, /Event received/)
    assert.match(source, /Recommendation created/)
    assert.match(source, /recordAgentAuditEntry/)
  })

  it('Chief of Staff uses live events for priorities', async () => {
    const { readFileSync } = await import('node:fs')
    const { dirname, join } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
    const source = readFileSync(join(root, 'lib/founder/agents/autonomous/founder-chief-of-staff.ts'), 'utf8')
    assert.match(source, /getFounderAgentEvents/)
    assert.match(source, /liveEventPriorities/)
    assert.match(source, /prioritise\(priorityCandidates, 5\)/)
  })

  it('Quality Lab hooks agent event engine on run completion', async () => {
    const { readFileSync } = await import('node:fs')
    const { dirname, join } = await import('node:path')
    const { fileURLToPath } = await import('node:url')
    const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..')
    const evalSource = readFileSync(join(root, 'lib/orb/evaluation/orb-evaluation-run-service.ts'), 'utf8')
    const qlSource = readFileSync(join(root, 'lib/founder/quality-lab/quality-run-store.ts'), 'utf8')
    assert.match(evalSource, /onEvaluationRunPersisted/)
    assert.match(qlSource, /onQualityRunCompleted/)
  })
})
