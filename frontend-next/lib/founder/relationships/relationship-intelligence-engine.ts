/**
 * Founder Relationship Intelligence Engine — rule-based recommendations from recorded data only.
 */

import { getFounderStrategicContext } from '@/lib/founder/memory/founder-memory-store'
import { recommendEvidenceAudienceForRelationship } from './relationship-evidence'
import type {
  FounderRelationship,
  RelationshipBundle,
  RelationshipOpportunity,
  RelationshipPriority
} from './relationship-types'
import { getRelationshipBundles, getRelationships } from './relationship-store'

const MS_PER_DAY = 86_400_000

function daysSince(isoDate: string | undefined): number | null {
  if (!isoDate) return null
  const parsed = Date.parse(isoDate)
  if (Number.isNaN(parsed)) return null
  return Math.floor((Date.now() - parsed) / MS_PER_DAY)
}

function isDue(isoDate: string | undefined): boolean {
  if (!isoDate) return false
  const parsed = Date.parse(isoDate)
  if (Number.isNaN(parsed)) return false
  return parsed <= Date.now()
}

function memoryBoostsPriority(relationship: FounderRelationship): number {
  const memory = getFounderStrategicContext()
  let boost = 0
  const focus = `${memory.primaryObjective ?? ''} ${memory.currentCommercialFocus ?? ''}`.toLowerCase()
  const org = relationship.organisation.toLowerCase()
  const name = relationship.name.toLowerCase()

  if (focus && (focus.includes(org) || focus.includes(name))) boost += 2
  if (memory.currentCommercialFocus && relationship.relationshipType === 'investor') boost += 1
  if (memory.currentProductFocus && ['provider', 'tester', 'technology-partner'].includes(relationship.relationshipType)) {
    boost += 1
  }
  return boost
}

export type RelationshipIntelligence = {
  relationshipId: string
  priorityScore: number
  effectivePriority: RelationshipPriority
  followUpNeeded: boolean
  followUpReason?: string
  suggestedNextAction: string
  evidencePackRecommended: boolean
  recommendedEvidenceAudience?: string
  riskOfGoingCold: 'high' | 'medium' | 'low'
  opportunityScore: number
  openOpportunities: number
}

function basePriorityScore(priority: RelationshipPriority): number {
  switch (priority) {
    case 'critical':
      return 40
    case 'high':
      return 30
    case 'medium':
      return 20
    default:
      return 10
  }
}

function typeBoost(relationship: FounderRelationship): number {
  if (['investor', 'provider', 'technology-partner', 'partner'].includes(relationship.relationshipType)) {
    return 10
  }
  if (['local-authority', 'government', 'champion'].includes(relationship.relationshipType)) {
    return 6
  }
  return 3
}

function statusBoost(status: FounderRelationship['status']): number {
  if (status === 'meeting-booked' || status === 'active') return 12
  if (status === 'follow-up-needed' || status === 'contacted') return 8
  if (status === 'waiting') return 5
  return 0
}

function opportunityBoost(opportunities: RelationshipOpportunity[]): number {
  const active = opportunities.filter((o) => o.status === 'open' || o.status === 'progressing')
  if (active.length === 0) return 0
  let score = active.length * 8
  if (active.some((o) => ['pilot', 'investment', 'partnership', 'grant'].includes(o.opportunityType))) {
    score += 10
  }
  return score
}

function scoreToPriority(score: number): RelationshipPriority {
  if (score >= 55) return 'critical'
  if (score >= 40) return 'high'
  if (score >= 25) return 'medium'
  return 'low'
}

export function analyseRelationship(bundle: RelationshipBundle): RelationshipIntelligence {
  const { relationship, opportunities } = bundle
  const daysSinceContact = daysSince(relationship.lastContactAt)
  const activeStatuses: FounderRelationship['status'][] = ['active', 'waiting', 'contacted']
  const followUpNeeded =
    relationship.status !== 'archived' &&
    relationship.status !== 'closed' &&
    relationship.status !== 'converted' &&
    ((daysSinceContact !== null && daysSinceContact >= 7 && activeStatuses.includes(relationship.status)) ||
      relationship.status === 'follow-up-needed' ||
      isDue(relationship.nextActionDue))

  let followUpReason: string | undefined
  if (followUpNeeded) {
    if (isDue(relationship.nextActionDue)) {
      followUpReason = `Next action due: ${relationship.nextAction}`
    } else if (daysSinceContact !== null && daysSinceContact >= 7) {
      followUpReason = `No contact recorded for ${daysSinceContact} days`
    } else {
      followUpReason = 'Status indicates follow-up is needed'
    }
  }

  const openOpportunities = opportunities.filter((o) => o.status === 'open' || o.status === 'progressing')
  const evidencePackRecommended = openOpportunities.some((o) =>
    ['pilot', 'investment', 'partnership', 'grant'].includes(o.opportunityType)
  )
  const recommendedEvidenceAudience = recommendEvidenceAudienceForRelationship(relationship)

  const priorityScore =
    basePriorityScore(relationship.priority) +
    typeBoost(relationship) +
    statusBoost(relationship.status) +
    opportunityBoost(opportunities) +
    memoryBoostsPriority(relationship) +
    (followUpNeeded ? 8 : 0)

  const opportunityScore = opportunityBoost(opportunities)

  let riskOfGoingCold: 'high' | 'medium' | 'low' = 'low'
  if (relationship.status === 'archived' || relationship.status === 'closed') {
    riskOfGoingCold = 'low'
  } else if (daysSinceContact === null && relationship.status !== 'new') {
    riskOfGoingCold = 'medium'
  } else if (daysSinceContact !== null && daysSinceContact >= 14) {
    riskOfGoingCold = 'high'
  } else if (daysSinceContact !== null && daysSinceContact >= 7) {
    riskOfGoingCold = 'medium'
  }

  const suggestedNextAction = followUpNeeded
    ? relationship.nextAction || `Follow up with ${relationship.name} at ${relationship.organisation}`
    : openOpportunities[0]?.nextStep || relationship.nextAction || 'Review relationship status and plan next step'

  return {
    relationshipId: relationship.id,
    priorityScore,
    effectivePriority: scoreToPriority(priorityScore),
    followUpNeeded,
    followUpReason,
    suggestedNextAction,
    evidencePackRecommended,
    recommendedEvidenceAudience,
    riskOfGoingCold,
    opportunityScore,
    openOpportunities: openOpportunities.length
  }
}

export function getFollowUpRecommendations(): Array<{
  relationship: FounderRelationship
  intelligence: RelationshipIntelligence
}> {
  return getRelationshipBundles()
    .map((bundle) => ({
      relationship: bundle.relationship,
      intelligence: analyseRelationship(bundle)
    }))
    .filter((entry) => entry.intelligence.followUpNeeded)
    .sort((a, b) => b.intelligence.priorityScore - a.intelligence.priorityScore)
}

export function getTopRelationships(limit = 5): Array<{
  relationship: FounderRelationship
  intelligence: RelationshipIntelligence
}> {
  return getRelationshipBundles()
    .filter((b) => b.relationship.status !== 'archived')
    .map((bundle) => ({
      relationship: bundle.relationship,
      intelligence: analyseRelationship(bundle)
    }))
    .sort((a, b) => b.intelligence.priorityScore - a.intelligence.priorityScore)
    .slice(0, limit)
}

export function getColdRelationships(): Array<{
  relationship: FounderRelationship
  intelligence: RelationshipIntelligence
}> {
  return getRelationshipBundles()
    .filter((b) => b.relationship.status !== 'archived' && b.relationship.status !== 'closed')
    .map((bundle) => ({
      relationship: bundle.relationship,
      intelligence: analyseRelationship(bundle)
    }))
    .filter((entry) => entry.intelligence.riskOfGoingCold === 'high' || entry.intelligence.riskOfGoingCold === 'medium')
    .sort((a, b) => b.intelligence.priorityScore - a.intelligence.priorityScore)
}

export function getPilotOpportunityPriorities(): Array<{
  relationship: FounderRelationship
  opportunity: RelationshipOpportunity
}> {
  const results: Array<{ relationship: FounderRelationship; opportunity: RelationshipOpportunity }> = []
  for (const bundle of getRelationshipBundles()) {
    if (bundle.relationship.status === 'archived') continue
    for (const opportunity of bundle.opportunities) {
      if (
        opportunity.opportunityType === 'pilot' &&
        (opportunity.status === 'open' || opportunity.status === 'progressing')
      ) {
        results.push({ relationship: bundle.relationship, opportunity })
      }
    }
  }
  return results.sort((a, b) => {
    const scoreA = analyseRelationship(
      getRelationshipBundles().find((bnd) => bnd.relationship.id === a.relationship.id)!
    ).priorityScore
    const scoreB = analyseRelationship(
      getRelationshipBundles().find((bnd) => bnd.relationship.id === b.relationship.id)!
    ).priorityScore
    return scoreB - scoreA
  })
}

export function summariseRelationshipIntelligence(): {
  totalActive: number
  highPriority: number
  followUpsDue: number
  activeOpportunities: number
  pilotOpportunities: number
  investorConversations: number
} {
  const relationships = getRelationships()
  const bundles = getRelationshipBundles()
  const active = relationships.filter((r) => r.status !== 'archived')
  const intelligence = bundles
    .filter((b) => b.relationship.status !== 'archived')
    .map((b) => analyseRelationship(b))

  return {
    totalActive: active.length,
    highPriority: intelligence.filter((i) => i.effectivePriority === 'critical' || i.effectivePriority === 'high').length,
    followUpsDue: intelligence.filter((i) => i.followUpNeeded).length,
    activeOpportunities: bundles.reduce(
      (sum, b) =>
        sum + b.opportunities.filter((o) => o.status === 'open' || o.status === 'progressing').length,
      0
    ),
    pilotOpportunities: getPilotOpportunityPriorities().length,
    investorConversations: active.filter(
      (r) => r.relationshipType === 'investor' && ['contacted', 'meeting-booked', 'active', 'waiting'].includes(r.status)
    ).length
  }
}
