import { getQualityRuns } from '@/lib/founder/quality-lab/quality-run-store'
import { getEvaluationRuns } from '@/lib/orb/evaluation/orb-evaluation-store'

import { executeFounderAgentAction } from './founder-agent-actions'
import { recordAgentAuditEntry } from './founder-agent-audit'
import { buildFounderCoverageMap } from './founder-agent-coverage-map'
import { generateFounderChiefOfStaffBrief } from './founder-chief-of-staff'
import type {
  FounderAutonomousLoopResult,
  FounderAutonomousLoopTrigger,
  FounderAutonomySettings
} from './founder-agent-types'

export const DEFAULT_AUTONOMY_SETTINGS: FounderAutonomySettings = {
  autoRunAfterDeploy: false,
  autoRunNightly: false,
  autoCreateDraftPR: false,
  requireApprovalForPRCreation: true,
  maxScenarioRunsPerDay: 50,
  allowedPacks: ['synthetic-safe', 'high-risk-sample', 'gold-sample']
}

let autonomySettings: FounderAutonomySettings = { ...DEFAULT_AUTONOMY_SETTINGS }

export function getAutonomySettings(): FounderAutonomySettings {
  return { ...autonomySettings }
}

export function updateAutonomySettings(patch: Partial<FounderAutonomySettings>): FounderAutonomySettings {
  autonomySettings = { ...autonomySettings, ...patch }
  recordAgentAuditEntry({
    agentId: 'founder-chief-of-staff',
    actionType: 'create_audit_note',
    summary: `Autonomy settings updated: ${Object.keys(patch).join(', ')}`,
    approvalStatus: 'not_required'
  })
  return getAutonomySettings()
}

export function resetAutonomySettings(): FounderAutonomySettings {
  autonomySettings = { ...DEFAULT_AUTONOMY_SETTINGS }
  return getAutonomySettings()
}

function triggerAllowed(trigger: FounderAutonomousLoopTrigger, settings: FounderAutonomySettings): boolean {
  if (trigger === 'manual_founder_trigger') return true
  if (trigger === 'after_deploy_completed') return settings.autoRunAfterDeploy
  if (trigger === 'scheduled_nightly_synthetic') return settings.autoRunNightly
  if (trigger === 'after_pr_merged') return settings.autoRunAfterDeploy
  return false
}

export function runAutonomousLoop(trigger: FounderAutonomousLoopTrigger): FounderAutonomousLoopResult {
  const startedAt = new Date().toISOString()
  const settings = getAutonomySettings()
  const recommendations: string[] = []

  if (!triggerAllowed(trigger, settings)) {
    const result: FounderAutonomousLoopResult = {
      trigger,
      startedAt,
      completedAt: new Date().toISOString(),
      syntheticRunRecommended: false,
      analysisSummary: `Autonomous loop not enabled for trigger: ${trigger}.`,
      coverageUpdated: false,
      failureClassified: false,
      buildBriefPrepared: false,
      draftPrPrepared: false,
      auditRecorded: true,
      founderApprovalRequired: false,
      autoMergeAttempted: false,
      recommendations: ['Enable autonomy settings if you want this trigger to run automatically.']
    }
    recordAgentAuditEntry({
      agentId: 'founder-chief-of-staff',
      actionType: 'orchestrate',
      summary: result.analysisSummary,
      approvalStatus: 'not_required'
    })
    return result
  }

  const qualityRuns = getQualityRuns()
  const evaluationRuns = getEvaluationRuns()
  const context = { qualityRuns, evaluationRuns, privacyRetentionReviewed: false }

  const syntheticResult = executeFounderAgentAction({
    agentId: 'orb-quality-agent',
    actionType: 'run_synthetic_evaluation',
    context
  })
  recommendations.push(syntheticResult.suggestedNextStep)

  const analysisResult = executeFounderAgentAction({
    agentId: 'orb-quality-agent',
    actionType: 'analyse_latest_run',
    context
  })
  const failureClassified = analysisResult.riskLevel === 'high' || analysisResult.riskLevel === 'critical'

  if (failureClassified) {
    executeFounderAgentAction({ agentId: 'safeguarding-agent', actionType: 'analyse_latest_run', context })
    executeFounderAgentAction({ agentId: 'technical-agent', actionType: 'analyse_latest_run', context })
    executeFounderAgentAction({ agentId: 'product-agent', actionType: 'create_product_build_brief', context })
    executeFounderAgentAction({ agentId: 'evidence-agent', actionType: 'create_audit_note', context })
  }

  const coverageResult = executeFounderAgentAction({
    agentId: 'orb-quality-agent',
    actionType: 'update_coverage_map',
    context
  })
  buildFounderCoverageMap({ qualityRuns, evaluationRuns })

  let buildBriefPrepared = false
  let draftPrPrepared = false
  let founderApprovalRequired = false

  if (failureClassified) {
    const briefResult = executeFounderAgentAction({
      agentId: 'orb-quality-agent',
      actionType: 'generate_build_brief',
      context
    })
    buildBriefPrepared = true
    recommendations.push(briefResult.suggestedNextStep)

    if (settings.autoCreateDraftPR) {
      const prResult = executeFounderAgentAction({
        agentId: 'orb-quality-agent',
        actionType: 'create_draft_pr_summary',
        context
      })
      draftPrPrepared = true
      founderApprovalRequired = settings.requireApprovalForPRCreation || prResult.approvalRequired
      recommendations.push('Draft PR prepared — Tom must approve before merge.')
    } else {
      recommendations.push('Draft PR not auto-created. Enable autoCreateDraftPR or prepare manually.')
    }
  } else {
    recommendations.push('Pass observed — recommend next launch gate step.')
    executeFounderAgentAction({ agentId: 'evidence-agent', actionType: 'prepare_launch_gate_evidence', context })
  }

  const brief = generateFounderChiefOfStaffBrief(context)
  recommendations.push(...brief.topPriorities.slice(0, 3))

  recordAgentAuditEntry({
    agentId: 'founder-chief-of-staff',
    actionType: 'orchestrate',
    summary: `Autonomous loop completed for ${trigger}. Founder approval required: ${founderApprovalRequired}.`,
    approvalStatus: founderApprovalRequired ? 'pending' : 'not_required'
  })

  return {
    trigger,
    startedAt,
    completedAt: new Date().toISOString(),
    syntheticRunRecommended: true,
    analysisSummary: analysisResult.summary,
    coverageUpdated: coverageResult.summary.includes('updated'),
    failureClassified,
    buildBriefPrepared,
    draftPrPrepared,
    auditRecorded: true,
    founderApprovalRequired,
    autoMergeAttempted: false,
    recommendations: recommendations.slice(0, 5)
  }
}
