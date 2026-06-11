import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, it } from 'node:test'

import { clearAgentAuditTrail, getAgentAuditTrail, recordAgentAuditEntry } from './founder-agent-audit.ts'
import { buildFounderCoverageMap, COVERAGE_AREA_DEFINITIONS } from './founder-agent-coverage-map.ts'
import { actionRequiresApproval, GLOBAL_FORBIDDEN_ACTIONS } from './founder-agent-permissions.ts'
import {
  FOUNDER_AGENT_DEFINITIONS,
  getAllFounderAgentDefinitions,
  REQUIRED_FOUNDER_AGENT_IDS
} from './founder-agent-registry.ts'
import {
  agentRefusesAutoMerge,
  agentRefusesThresholdWeakening,
  allAgentsRequireFounderApprovalForExternal,
  GOVERNANCE_COPY
} from './founder-agent-safety.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../../..')

function readSource(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8')
}

beforeEach(() => {
  clearAgentAuditTrail()
})

describe('Founder autonomous agent model', () => {
  it('includes all 13 required agents', () => {
    assert.equal(FOUNDER_AGENT_DEFINITIONS.length, 13)
    for (const id of REQUIRED_FOUNDER_AGENT_IDS) {
      assert.ok(FOUNDER_AGENT_DEFINITIONS.some((a) => a.id === id), `missing agent ${id}`)
    }
  })

  it('all agents expose permissions and forbidden actions', () => {
    for (const agent of getAllFounderAgentDefinitions()) {
      assert.ok(agent.permissions, `${agent.id} missing permissions`)
      assert.ok(agent.forbiddenActions.length > 0, `${agent.id} missing forbidden actions`)
      assert.equal(agent.requiresFounderApproval, true, `${agent.id} must require founder approval`)
      for (const forbidden of GLOBAL_FORBIDDEN_ACTIONS) {
        assert.ok(agent.forbiddenActions.includes(forbidden), `${agent.id} must forbid ${forbidden}`)
      }
    }
  })

  it('approval required for PR merge, external communication, launch gate, safeguarding changes', () => {
    assert.equal(actionRequiresApproval('create_draft_pr_summary'), true)
    assert.equal(actionRequiresApproval('draft_linkedin_post'), true)
    assert.equal(actionRequiresApproval('draft_provider_email'), true)
    assert.equal(actionRequiresApproval('prepare_launch_gate_evidence'), true)
    assert.equal(actionRequiresApproval('analyse_latest_run', { isSafeguarding: true }), true)
    assert.equal(actionRequiresApproval('prepare_privacy_review_prompt'), true)
  })

  it('agent refuses auto-merge', () => {
    assert.equal(agentRefusesAutoMerge(), true)
    const actionsSource = readSource('lib/founder/agents/autonomous/founder-agent-actions.ts')
    assert.match(actionsSource, /Auto-merge blocked/)
    assert.match(actionsSource, /agentRefusesAutoMerge/)
  })

  it('agent refuses threshold weakening', () => {
    assert.equal(agentRefusesThresholdWeakening('lower safety threshold'), true)
    assert.equal(agentRefusesThresholdWeakening('improve prompt clarity'), false)
  })

  it('chief of staff returns top 3–5 priorities only', () => {
    const source = readSource('lib/founder/agents/autonomous/founder-chief-of-staff.ts')
    assert.match(source, /prioritise\(priorityCandidates, 5\)/)
    assert.match(source, /topPriorities/)
  })

  it('coverage map tracks weak and untested areas', () => {
    const map = buildFounderCoverageMap({ qualityRuns: [], evaluationRuns: [] })
    assert.equal(map.areas.length, COVERAGE_AREA_DEFINITIONS.length)
    assert.ok(map.untestedAreas.length > 0)
    assert.equal(map.overallStrength, 'untested')
  })

  it('autonomous loop creates recommendation, not merge', () => {
    const source = readSource('lib/founder/agents/autonomous/founder-autonomous-loop.ts')
    assert.match(source, /autoMergeAttempted: false/)
    assert.match(source, /founderApprovalRequired/)
    assert.match(source, /autoCreateDraftPR/)
  })

  it('autonomous loop default settings disable auto triggers', () => {
    const source = readSource('lib/founder/agents/autonomous/founder-autonomous-loop.ts')
    assert.match(source, /autoRunAfterDeploy: false/)
    assert.match(source, /autoRunNightly: false/)
    assert.match(source, /autoCreateDraftPR: false/)
    assert.match(source, /requireApprovalForPRCreation: true/)
  })

  it('audit trail records agent actions', () => {
    recordAgentAuditEntry({
      agentId: 'evidence-agent',
      actionType: 'create_audit_note',
      summary: 'Test audit entry'
    })
    const trail = getAgentAuditTrail('evidence-agent')
    assert.equal(trail.length, 1)
    assert.equal(trail[0]?.agentId, 'evidence-agent')
  })

  it('external content requires approval in action executor', () => {
    const source = readSource('lib/founder/agents/autonomous/founder-agent-actions.ts')
    assert.match(source, /draft_linkedin_post/)
    assert.match(source, /approvalRequired/)
    assert.match(source, /queueApprovalIfNeeded/)
  })

  it('quality agent integrates with latest run', () => {
    const source = readSource('lib/founder/agents/autonomous/founder-agent-service.ts')
    assert.match(source, /findLatestFailedRun/)
    assert.match(source, /getQualityLabAgentIntegration/)
    assert.match(source, /orb-quality-agent/)
  })

  it('governance agent flags privacy/retention review if missing', () => {
    const source = readSource('lib/founder/agents/autonomous/founder-agent-actions.ts')
    assert.match(source, /Privacy review not recorded/)
    assert.match(source, /Retention review not recorded/)
  })

  it('all external actions require founder approval globally', () => {
    assert.equal(allAgentsRequireFounderApprovalForExternal(), true)
  })

  it('governance copy includes required safety wording', () => {
    assert.match(GOVERNANCE_COPY.agentDisclaimer, /professional judgement/)
    assert.match(GOVERNANCE_COPY.approvalGates, /require approval/)
    assert.match(GOVERNANCE_COPY.failedRunsVisible, /audit/)
    assert.match(GOVERNANCE_COPY.noRealChildData, /must not be used/)
  })
})

describe('Founder agents API routes', () => {
  it('exposes founder-gated agent routes', () => {
    const routes = [
      'app/api/founder/agents/route.ts',
      'app/api/founder/agents/brief/route.ts',
      'app/api/founder/agents/action/route.ts',
      'app/api/founder/agents/approve/route.ts',
      'app/api/founder/agents/reject/route.ts',
      'app/api/founder/agents/audit/route.ts',
      'app/api/founder/agents/coverage/route.ts',
      'app/api/founder/agents/coverage/generate-scenarios/route.ts',
      'app/api/founder/agents/autonomy-settings/route.ts'
    ]
    for (const route of routes) {
      assert.ok(readSource(route).length > 0, `missing route ${route}`)
    }
    const api = readSource('lib/founder/agents/autonomous/founder-agent-api.ts')
    assert.match(api, /requireFounderSession/)
  })
})

describe('Founder agents UI', () => {
  it('shows approval required badge', () => {
    const source = readSource('components/founder/founder-agents-page.tsx')
    assert.match(source, /approval-required-badge/)
    assert.match(source, /Approval required/)
  })

  it('founder agents page has required test ids', () => {
    const source = readSource('components/founder/founder-agents-page.tsx')
    assert.match(source, /founder-agents-page/)
    assert.match(source, /founder-chief-of-staff-brief/)
    assert.match(source, /founder-autonomy-settings/)
  })

  it('quality lab page shows agent integration', () => {
    const source = readSource('components/founder/founder-quality-lab-page.tsx')
    assert.match(source, /quality-lab-agent-integration/)
    assert.match(source, /getQualityLabAgentIntegration/)
  })
})
