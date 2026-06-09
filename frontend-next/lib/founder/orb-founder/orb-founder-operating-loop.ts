import {
  getLastOperatingLoopRun,
  getOperatingLoopRun,
  getOperatingLoopRuns
} from '@/lib/founder/operating-loop'
import { getOperatingLoopPlanForQuestion } from '@/lib/founder/operating-loop/operating-loop-plans'
import { getPendingApprovals } from '@/lib/founder/approvals'
import { getBuildBriefs } from '@/lib/founder/build-briefs/build-brief-store'
import type { FounderOrbAnswer } from './orb-founder-engine'

function normalise(question: string): string {
  return question.trim().toLowerCase().replace(/['']/g, "'")
}

function matches(question: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(question))
}

export function isExplicitOperatingLoopRequest(question: string): boolean {
  const q = normalise(question)
  return matches(q, [
    /run my operating loop/,
    /run (?:the |a )?operating loop/,
    /run (?:a |the )?brand loop/,
    /run (?:a |the )?quality loop/,
    /run (?:a |the )?technical loop/,
    /run (?:a |the )?product loop/,
    /run (?:my )?founder staff team/,
    /run founder staff team/,
    /run staff team/
  ])
}

export { getOperatingLoopPlanForQuestion }

export function answerLastOperatingLoop(): FounderOrbAnswer {
  const run = getLastOperatingLoopRun()
  if (!run) {
    return {
      answer:
        'No operating loop runs recorded yet. Ask me to "Run my operating loop" when you want the staff team to analyse live telemetry and queue approvals.',
      usedSources: ['Founder Operating Loop'],
      suggestedFollowUps: ['Run my operating loop', 'What approvals are waiting?', 'What should I decide today?'],
      confidence: 'high'
    }
  }

  return {
    answer: `Last operating loop (${run.status}) ran at ${new Date(run.startedAt).toLocaleString('en-GB')}. Created ${run.actionsCreated.length} actions, ${run.draftsCreated.length} drafts, ${run.buildBriefsCreated.length} build briefs, and ${run.approvalsCreated.length} approvals. ${run.recommendedFounderDecisions[0] ?? ''} Review details at /founder/operating-loop/${run.id}.`,
    usedSources: ['Founder Operating Loop', 'Audit Trail'],
    suggestedFollowUps: [
      'What did the CTO recommend?',
      'What build briefs were created?',
      'What approvals are waiting?'
    ],
    confidence: 'high'
  }
}

export function answerCtoRecommendation(): FounderOrbAnswer {
  const run = getLastOperatingLoopRun()
  const cto = run?.staffAgentsRun.find((agent) => agent.agentId === 'cto')
  if (!run || !cto) {
    return {
      answer: 'No recent CTO output from an operating loop. Run the technical loop or full operating loop first.',
      usedSources: ['CTO Agent', 'Founder Operating Loop'],
      suggestedFollowUps: ['Run a technical loop', 'Run my operating loop'],
      confidence: 'medium'
    }
  }

  const decisions = run.recommendedFounderDecisions.filter((item) => item.toLowerCase().includes('technical') || item.toLowerCase().includes('build'))
  return {
    answer: decisions[0] ?? run.recommendedFounderDecisions[0] ?? 'CTO agent completed in the last operating loop. Open /founder/operating-loop for full output.',
    usedSources: ['CTO Agent', 'Founder Operating Loop'],
    suggestedFollowUps: ['What build briefs were created?', 'Run a technical loop'],
    confidence: 'high'
  }
}

export function answerBuildBriefsCreated(): FounderOrbAnswer {
  const run = getLastOperatingLoopRun()
  const briefs = getBuildBriefs().slice(0, 3)
  if (!run && briefs.length === 0) {
    return {
      answer: 'No build briefs created yet. Run the technical loop to generate a Cursor-ready brief — it will queue in Approvals.',
      usedSources: ['Build Briefs', 'Founder Operating Loop'],
      suggestedFollowUps: ['Run a technical loop', 'What approvals are waiting?'],
      confidence: 'medium'
    }
  }

  const titles = briefs.map((brief) => brief.title).join('; ')
  return {
    answer: `Recent build briefs: ${titles || 'none yet'}. Last loop created ${run?.buildBriefsCreated.length ?? 0} brief(s). Review at /founder/build-briefs.`,
    usedSources: ['Build Briefs', 'Founder Operating Loop'],
    suggestedFollowUps: ['What did the CTO recommend?', 'What approvals are waiting?'],
    confidence: 'high'
  }
}

export function answerFounderDecisionsToday(): FounderOrbAnswer {
  const run = getLastOperatingLoopRun()
  const pending = getPendingApprovals()
  const decisions = run?.recommendedFounderDecisions ?? []

  const parts = [
    decisions.length > 0 ? `Recommended decisions: ${decisions.slice(0, 3).join(' ')}` : null,
    pending.length > 0 ? `${pending.length} approval(s) waiting for your decision.` : 'No approvals waiting.'
  ].filter(Boolean)

  return {
    answer: parts.join(' ') || 'Run the operating loop to generate founder decisions from live telemetry and Quality Lab results.',
    usedSources: ['Chief of Staff Agent', 'Approval Centre', 'Founder Operating Loop'],
    suggestedFollowUps: ['What happened in the last operating loop?', 'What approvals are waiting?'],
    confidence: 'high'
  }
}

export function answerOperatingLoopRunDetail(runId: string): FounderOrbAnswer | null {
  const run = getOperatingLoopRun(runId) ?? getOperatingLoopRuns().find((item) => item.id === runId)
  if (!run) return null
  return {
    answer: `Operating loop ${run.id} (${run.status}): ${run.actionsCreated.length} actions, ${run.approvalsCreated.length} approvals, ${run.draftsCreated.length} drafts, ${run.buildBriefsCreated.length} briefs. ${run.errors.length > 0 ? `Warnings: ${run.errors.join('; ')}` : 'No warnings.'}`,
    usedSources: ['Founder Operating Loop'],
    suggestedFollowUps: ['What should I decide today?', 'What approvals are waiting?'],
    confidence: 'high'
  }
}
