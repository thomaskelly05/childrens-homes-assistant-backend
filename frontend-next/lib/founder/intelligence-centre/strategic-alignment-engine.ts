/**
 * Strategic Alignment Engine — scores work against Founder Memory objectives.
 * Does not generate work for deferred objectives unless explicitly active.
 */

import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type { StrategicAlignmentResult } from './intelligence-centre-types'
import type { IntelligenceSourceBundle } from './intelligence-source-builder'

type GoalMatcher = {
  keywords: string[]
  label: string
}

const ACTIVE_GOAL_PATTERNS: GoalMatcher[] = [
  { keywords: ['orb residential', 'residential', 'launch'], label: 'Launch ORB Residential' },
  { keywords: ['pilot', 'pilots', 'secure pilot'], label: 'Secure pilots' },
  { keywords: ['provider', 'traction', 'commercial'], label: 'Build provider traction' },
  { keywords: ['funding', 'investor', 'support', 'raise'], label: 'Secure funding/support' },
  { keywords: ['live-only', 'live only', 'honest', 'metrics'], label: 'Maintain live-only honest metrics' },
  { keywords: ['safeguarding', 'privacy', 'quality', 'ofsted'], label: 'Protect safeguarding/privacy/quality' }
]

function normalise(text: string): string {
  return text.toLowerCase()
}

function matchesGoal(text: string, goal: GoalMatcher): boolean {
  const n = normalise(text)
  return goal.keywords.some((kw) => n.includes(kw))
}

function isDeferred(text: string, deferredObjectives: string[]): boolean {
  const n = normalise(text)
  return deferredObjectives.some((d) => {
    const dn = normalise(d)
    return n.includes(dn.slice(0, 20)) || dn.includes(n.slice(0, 20))
  })
}

function extractActiveGoals(context: IntelligenceSourceBundle['strategicContext']): string[] {
  const goals: string[] = []
  const sources = [
    context.primaryObjective,
    ...context.secondaryObjectives,
    context.currentProductFocus,
    context.currentCommercialFocus
  ].filter(Boolean)

  for (const pattern of ACTIVE_GOAL_PATTERNS) {
    if (sources.some((s) => matchesGoal(s, pattern))) {
      goals.push(pattern.label)
    }
  }

  if (goals.length === 0 && context.primaryObjective) {
    goals.push(context.primaryObjective.slice(0, 80))
  }

  return [...new Set(goals)]
}

function scoreAlignment(
  itemText: string,
  goals: string[],
  deferred: string[]
): { score: number; alignedTo: string; reason: string } | null {
  if (isDeferred(itemText, deferred)) {
    return { score: 20, alignedTo: 'Deferred objective', reason: 'Item relates to deferred work in Founder Memory.' }
  }

  for (const goal of goals) {
    const pattern = ACTIVE_GOAL_PATTERNS.find((p) => p.label === goal)
    if (pattern && matchesGoal(itemText, pattern)) {
      return { score: 85, alignedTo: goal, reason: `Directly supports: ${goal}.` }
    }
    if (normalise(itemText).includes(normalise(goal).slice(0, 12))) {
      return { score: 75, alignedTo: goal, reason: `Supports strategic objective: ${goal}.` }
    }
  }

  if (goals.length === 0) {
    return { score: 50, alignedTo: 'Unspecified strategy', reason: 'No active goals in Founder Memory — alignment uncertain.' }
  }

  return { score: 35, alignedTo: goals[0] ?? 'Strategy', reason: 'Weak or unclear alignment with current objectives.' }
}

export function generateStrategicAlignment(sources: IntelligenceSourceBundle): StrategicAlignmentResult {
  const { strategicContext: ctx } = sources
  const activeGoals = extractActiveGoals(ctx)
  const aligned: StrategicAlignmentResult['aligned'] = []
  const misaligned: StrategicAlignmentResult['misaligned'] = []
  const deferredWarnings: string[] = []
  const recommendedAdjustments: string[] = []

  if (ctx.deferredObjectives.length > 0) {
    deferredWarnings.push(
      `Deferred in Founder Memory: ${ctx.deferredObjectives.slice(0, 3).join('; ')}. Intelligence will not prioritise these unless made active.`
    )
  }

  for (const action of sources.actions.slice(0, 8)) {
    const text = `${action.title} ${action.description}`
    const result = scoreAlignment(text, activeGoals, ctx.deferredObjectives)
    if (!result) continue
    const item = {
      id: nextId('align'),
      entityType: 'action',
      entityId: action.id,
      title: action.title,
      alignedTo: result.alignedTo,
      alignmentScore: result.score,
      reason: result.reason
    }
    if (result.score >= 70) aligned.push(item)
    else {
      misaligned.push({
        ...item,
        recommendedAdjustment: 'Re-scope or defer until aligned with active Founder Memory objectives.'
      })
    }
  }

  for (const rel of sources.relationships.active.slice(0, 6)) {
    const text = `${rel.organisation} ${rel.relationshipType} ${rel.notes ?? ''}`
    const result = scoreAlignment(text, activeGoals, ctx.deferredObjectives)
    if (!result) continue
    const item = {
      id: nextId('align'),
      entityType: 'relationship',
      entityId: rel.id,
      title: rel.organisation,
      alignedTo: result.alignedTo,
      alignmentScore: result.score,
      reason: result.reason
    }
    if (result.score >= 65) aligned.push(item)
    else misaligned.push(item)
  }

  for (const pack of sources.evidence.packs.slice(0, 4)) {
    const text = `${pack.title} ${pack.audience} ${pack.purpose}`
    const result = scoreAlignment(text, activeGoals, ctx.deferredObjectives)
    if (!result) continue
    aligned.push({
      id: nextId('align'),
      entityType: 'evidence_pack',
      entityId: pack.id,
      title: pack.title,
      alignedTo: result.alignedTo,
      alignmentScore: result.score,
      reason: result.reason
    })
  }

  for (const brief of sources.buildBriefs.slice(0, 4)) {
    const text = `${brief.title} ${brief.goal}`
    if (isDeferred(text, ctx.deferredObjectives)) continue
    const result = scoreAlignment(text, activeGoals, ctx.deferredObjectives)
    if (!result) continue
    const item = {
      id: nextId('align'),
      entityType: 'build_brief',
      entityId: brief.id,
      title: brief.title,
      alignedTo: result.alignedTo,
      alignmentScore: result.score,
      reason: result.reason
    }
    if (result.score >= 60) aligned.push(item)
    else {
      misaligned.push({
        ...item,
        recommendedAdjustment: 'Confirm this build supports current product focus before committing engineering time.'
      })
    }
  }

  if (sources.operatingLoop?.strategicAlignment.length) {
    for (const line of sources.operatingLoop.strategicAlignment.slice(0, 3)) {
      aligned.push({
        id: nextId('align'),
        entityType: 'operating_loop_run',
        entityId: sources.operatingLoop.id,
        title: line.slice(0, 80),
        alignedTo: activeGoals[0] ?? 'Operating loop',
        alignmentScore: 80,
        reason: 'From latest operating loop strategic alignment.'
      })
    }
  }

  if (misaligned.length > 2) {
    recommendedAdjustments.push(
      'Review misaligned actions and build briefs — focus engineering on active Founder Memory objectives.'
    )
  }

  if (activeGoals.includes('Maintain live-only honest metrics') && sources.revenue.snapshot.source !== 'live') {
    recommendedAdjustments.push(
      'Live-only metrics principle active but billing not connected — connect before external commercial claims.'
    )
  }

  if (sources.relationships.summary.followUpsDue > 3 && activeGoals.includes('Build provider traction')) {
    recommendedAdjustments.push(
      'Provider traction goal active but follow-ups are overdue — prioritise relationship outreach.'
    )
  }

  return {
    aligned: aligned.slice(0, 12),
    misaligned: misaligned.slice(0, 8),
    deferredWarnings,
    recommendedAdjustments
  }
}
