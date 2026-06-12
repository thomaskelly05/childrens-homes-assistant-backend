import {
  approveBenchmarkScenario,
  addScenarioToBenchmarkBank,
  getActiveBenchmarkScenarios,
  getAwaitingApprovalScenarios,
  rejectBenchmarkScenario
} from './learning-loop-benchmark-bank.ts'
import {
  formatLearningBuildBriefForCursor,
  generateLearningBuildBrief
} from './learning-loop-build-brief-generator.ts'
import {
  approveLearningProposal,
  createLearningProposal,
  rejectLearningProposal
} from './learning-loop-proposal-generator.ts'
import { generateSyntheticScenarios } from './learning-loop-scenario-generator.ts'
import { detectWeaknesses } from './learning-loop-weakness-detector.ts'
import {
  canGenerateScenariosToday,
  canRunExperimentalToday,
  getLearningLoopAutonomySettings,
  recordExperimentalRun,
  recordGeneratedScenarios,
  updateLearningLoopAutonomySettings
} from './learning-loop-autonomy.ts'
import {
  addBuildBrief,
  addLoop,
  addProposal,
  addWeakness,
  getActiveLoops,
  getAllBenchmarkScenarios,
  getAllLoops,
  getAllProposals,
  getAllWeaknesses,
  getBuildBrief,
  getBuildBriefForProposal,
  getLearningAuditTrail,
  getLoop,
  getPendingProposals,
  getProposal,
  nextLoopId,
  recordLearningAudit,
  updateLoop,
  updateProposal
} from './learning-loop-store.ts'
import type {
  LearningLoopOverview,
  LearningLoopRecord,
  LearningLoopTriggerType,
  LearningSignalInput
} from './learning-loop-types.ts'
import { LEARNING_LOOP_DISCLAIMER } from './learning-loop-types.ts'

function buildSignalInput(overrides: Partial<LearningSignalInput> = {}): LearningSignalInput {
  return {
    evaluationRuns: overrides.evaluationRuns ?? [],
    qualityRuns: overrides.qualityRuns ?? [],
    coverageWeakAreas: overrides.coverageWeakAreas,
    agentRecommendations: overrides.agentRecommendations,
    launchGateBlockers: overrides.launchGateBlockers
  }
}

export function buildLearningLoopOverview(): LearningLoopOverview {
  const weaknesses = getAllWeaknesses()
  const pendingProposals = getPendingProposals()
  const benchmarkBank = getAllBenchmarkScenarios()
  const settings = getLearningLoopAutonomySettings()

  const completedLoops = getAllLoops().filter((l) => l.status === 'completed')
  const recentlyImprovedAreas = completedLoops
    .flatMap((l) => l.affectedAreas)
    .slice(0, 5)

  return {
    activeLoops: getActiveLoops(),
    latestWeakness: weaknesses[0],
    pendingProposals,
    approvalRequired:
      pendingProposals.length +
      getAwaitingApprovalScenarios().length +
      getActiveLoops().filter((l) => l.approvalRequired && l.status === 'awaiting_approval').length,
    recentlyImprovedAreas,
    weaknessMap: weaknesses,
    benchmarkBank,
    autonomySettings: settings,
    disclaimer: LEARNING_LOOP_DISCLAIMER
  }
}

export function startLearningLoop(input: {
  triggerType: LearningLoopTriggerType
  sourceRunId?: string
  sourceEventId?: string
  actor?: string
  signals?: Partial<LearningSignalInput>
}): LearningLoopRecord {
  const loop: LearningLoopRecord = {
    id: nextLoopId(),
    createdAt: new Date().toISOString(),
    triggerType: input.triggerType,
    sourceRunId: input.sourceRunId,
    sourceEventId: input.sourceEventId,
    status: 'pending',
    affectedAreas: [],
    weakMarkers: [],
    scenarioCategories: [],
    evidenceSummary: '',
    approvalRequired: true,
    auditRecordIds: [],
    weaknessIds: [],
    proposalIds: [],
    scenarioIds: []
  }

  addLoop(loop)

  const audit = recordLearningAudit({
    loopId: loop.id,
    action: 'loop_started',
    summary: `Learning loop started: ${input.triggerType}`,
    actor: input.actor
  })

  updateLoop(loop.id, { auditRecordIds: [audit.id] })

  const settings = getLearningLoopAutonomySettings()
  if (settings.autoDetectWeaknesses) {
    return runWeaknessDetection(loop.id, input.actor, input.signals)
  }

  return getLoop(loop.id) ?? loop
}

export function runWeaknessDetection(
  loopId: string,
  actor?: string,
  signals?: Partial<LearningSignalInput>
): LearningLoopRecord {
  const loop = getLoop(loopId)
  if (!loop) throw new Error('Learning loop not found')

  updateLoop(loopId, { status: 'analysing' })

  const detected = detectWeaknesses(buildSignalInput(signals))
  const weaknessIds: string[] = []
  const auditIds = [...loop.auditRecordIds]

  for (const weakness of detected) {
    addWeakness(weakness)
    weaknessIds.push(weakness.id)
    const audit = recordLearningAudit({
      loopId,
      action: 'weakness_detected',
      summary: `${weakness.severity} weakness in ${weakness.category}: ${weakness.recommendedAction}`,
      actor,
      relatedIds: [weakness.id]
    })
    auditIds.push(audit.id)
  }

  const updated = updateLoop(loopId, {
    status: detected.length > 0 ? 'proposing_improvement' : 'completed',
    weaknessIds,
    affectedAreas: [...new Set(detected.map((w) => w.category))],
    weakMarkers: [...new Set(detected.flatMap((w) => w.evidence))],
    scenarioCategories: [...new Set(detected.map((w) => w.category))],
    evidenceSummary: detected.map((w) => w.evidence.join(' ')).join('; ').slice(0, 500),
    safetyRisk: detected.some((w) => w.severity === 'critical')
      ? 'critical'
      : detected.some((w) => w.severity === 'high')
        ? 'high'
        : 'medium',
    auditRecordIds: auditIds
  })

  const settings = getLearningLoopAutonomySettings()
  if (settings.autoCreateLearningProposals && detected.length > 0) {
    createProposalForLoop(loopId, actor)
  }

  return updated ?? loop
}

export function generateScenariosForLoop(
  loopId: string,
  input?: { areaId?: string; count?: number },
  actor?: string
): LearningLoopRecord {
  const loop = getLoop(loopId)
  if (!loop) throw new Error('Learning loop not found')

  const settings = getLearningLoopAutonomySettings()
  const count = input?.count ?? 1

  if (!canGenerateScenariosToday(count)) {
    throw new Error(`Daily scenario generation limit reached (${settings.maxGeneratedScenariosPerDay}).`)
  }

  updateLoop(loopId, { status: 'generating_scenarios' })

  const weaknesses = loop.weaknessIds.map((id) => getAllWeaknesses().find((w) => w.id === id)).filter(Boolean)
  const primaryWeakness = weaknesses[0]

  const scenarios = generateSyntheticScenarios({
    areaId: input?.areaId as import('../agents/autonomous/founder-agent-types').FounderCoverageAreaId | undefined,
    weakness: primaryWeakness,
    count,
    generationReason: loop.evidenceSummary
  })

  recordGeneratedScenarios(scenarios.length)

  const scenarioIds: string[] = [...loop.scenarioIds]
  const auditIds = [...loop.auditRecordIds]

  for (const scenario of scenarios) {
    const benchmark = addScenarioToBenchmarkBank(scenario, {
      whyGenerated: loop.evidenceSummary || `Learning loop ${loopId}`,
      recommendedByAgent: 'orb-quality-agent'
    })
    scenarioIds.push(benchmark.id)

    const audit = recordLearningAudit({
      loopId,
      action: 'scenario_generated',
      summary: `Synthetic scenario generated for ${scenario.area}: ${scenario.id}`,
      actor,
      relatedIds: [benchmark.id]
    })
    auditIds.push(audit.id)
  }

  if (settings.autoRunExperimentalScenarios && canRunExperimentalToday()) {
    recordExperimentalRun()
    recordLearningAudit({
      loopId,
      action: 'experimental_run',
      summary: 'Experimental scenario run recorded (sandbox mode).',
      actor
    })
  }

  const updated = updateLoop(loopId, {
    status: 'testing',
    scenarioIds,
    auditRecordIds: auditIds
  })

  return updated ?? loop
}

export function createProposalForLoop(loopId: string, actor?: string) {
  const loop = getLoop(loopId)
  if (!loop) throw new Error('Learning loop not found')

  const weaknesses = loop.weaknessIds
    .map((id) => getAllWeaknesses().find((w) => w.id === id))
    .filter((w): w is NonNullable<typeof w> => Boolean(w))

  const result = createLearningProposal({
    loopId,
    weaknesses,
    evidenceSummary: loop.evidenceSummary
  })

  if ('rejected' in result) {
    throw new Error(result.reason)
  }

  addProposal(result)

  const audit = recordLearningAudit({
    loopId,
    action: 'proposal_created',
    summary: `Learning proposal created: ${result.changeType}`,
    actor,
    relatedIds: [result.id]
  })

  updateLoop(loopId, {
    status: 'awaiting_approval',
    proposalIds: [...loop.proposalIds, result.id],
    proposedLearning: result.whatBrainShouldLearn,
    proposedFilesToChange: result.filesLikelyToChange,
    proposedTests: result.testsRequired,
    approvalRequired: true,
    auditRecordIds: [...loop.auditRecordIds, audit.id]
  })

  return result
}

export function approveScenario(
  scenarioId: string,
  actor: string,
  targetStatus: 'approved_for_testing' | 'active_benchmark' = 'approved_for_testing'
) {
  const scenario = approveBenchmarkScenario(scenarioId, actor, targetStatus)
  if (!scenario) throw new Error('Scenario not found or approval failed')

  recordLearningAudit({
    action: 'scenario_approved',
    summary: `Scenario ${scenarioId} approved for ${targetStatus}`,
    actor,
    relatedIds: [scenarioId]
  })

  return scenario
}

export function rejectScenario(scenarioId: string, actor: string, reason?: string) {
  const scenario = rejectBenchmarkScenario(scenarioId, actor, reason)
  if (!scenario) throw new Error('Scenario not found')

  recordLearningAudit({
    action: 'scenario_rejected',
    summary: `Scenario ${scenarioId} rejected: ${reason ?? 'no reason'}`,
    actor,
    relatedIds: [scenarioId]
  })

  return scenario
}

export function approveProposal(proposalId: string, actor: string, notes?: string) {
  const proposal = getProposal(proposalId)
  if (!proposal) throw new Error('Proposal not found')

  const approved = approveLearningProposal(proposal, actor, notes)
  updateProposal(proposalId, approved)

  const loop = getLoop(approved.loopId)
  if (loop) {
    updateLoop(loop.id, {
      status: 'approved',
      founderDecision: 'approved',
      founderDecisionAt: approved.founderDecisionAt,
      founderDecisionBy: actor
    })
  }

  recordLearningAudit({
    loopId: approved.loopId,
    action: 'founder_decision',
    summary: `Proposal ${proposalId} approved by founder`,
    actor,
    relatedIds: [proposalId]
  })

  return approved
}

export function rejectProposal(proposalId: string, actor: string, notes?: string) {
  const proposal = getProposal(proposalId)
  if (!proposal) throw new Error('Proposal not found')

  const rejected = rejectLearningProposal(proposal, actor, notes)
  updateProposal(proposalId, rejected)

  const loop = getLoop(rejected.loopId)
  if (loop) {
    updateLoop(loop.id, {
      status: 'rejected',
      founderDecision: 'rejected',
      founderDecisionAt: rejected.founderDecisionAt,
      founderDecisionBy: actor
    })
  }

  recordLearningAudit({
    loopId: rejected.loopId,
    action: 'founder_decision',
    summary: `Proposal ${proposalId} rejected by founder`,
    actor,
    relatedIds: [proposalId]
  })

  return rejected
}

export function createBuildBriefForProposal(proposalId: string, actor?: string) {
  const proposal = getProposal(proposalId)
  if (!proposal) throw new Error('Proposal not found')

  if (proposal.status !== 'approved') {
    throw new Error('Build brief requires approved learning proposal.')
  }

  const existing = getBuildBriefForProposal(proposalId)
  if (existing) return { brief: existing, formatted: formatLearningBuildBriefForCursor(existing) }

  const brief = generateLearningBuildBrief({
    proposal,
    loopId: proposal.loopId,
    evidenceFromFailedRuns: [proposal.evidenceSummary],
    affectedCategories: proposal.weaknessIds.map((id) => {
      const w = getAllWeaknesses().find((weak) => weak.id === id)
      return w?.category ?? id
    })
  })

  addBuildBrief(brief)

  const loop = getLoop(proposal.loopId)
  if (loop) {
    updateLoop(loop.id, {
      buildBriefId: brief.id,
      status: 'completed'
    })
  }

  recordLearningAudit({
    loopId: proposal.loopId,
    action: 'build_brief_created',
    summary: `Build brief created for proposal ${proposalId}`,
    actor,
    relatedIds: [brief.id, proposalId]
  })

  return { brief, formatted: formatLearningBuildBriefForCursor(brief) }
}

export function getLearningLoopAudit(loopId?: string) {
  return getLearningAuditTrail(loopId)
}

export function getBenchmarkBank() {
  return {
    active: getActiveBenchmarkScenarios(),
    awaitingApproval: getAwaitingApprovalScenarios(),
    all: getAllBenchmarkScenarios()
  }
}

export { updateLearningLoopAutonomySettings, getLearningLoopAutonomySettings }
