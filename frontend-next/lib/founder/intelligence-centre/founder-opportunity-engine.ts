/**
 * Founder Opportunity Engine — opportunities from real relationship, evidence and product data.
 */

import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import type { FounderOpportunity } from './intelligence-centre-types'
import type { IntelligenceSourceBundle } from './intelligence-source-builder'

export function generateFounderOpportunities(sources: IntelligenceSourceBundle): FounderOpportunity[] {
  const opportunities: FounderOpportunity[] = []

  for (const pilot of sources.relationships.pilotOpportunities.slice(0, 3)) {
    opportunities.push({
      id: nextId('opportunity'),
      title: `Provider pilot: ${pilot.relationship.organisation}`,
      summary: pilot.opportunity.title,
      opportunityType: 'provider',
      valueEstimate:
        pilot.opportunity.valueEstimate === 'high'
          ? 'high'
          : pilot.opportunity.valueEstimate === 'low'
            ? 'low'
            : 'medium',
      confidence: 0.8,
      nextAction: 'Prepare pilot evidence pack and schedule discovery call.',
      linkedEntityType: 'relationship',
      linkedEntityId: pilot.relationship.id
    })
  }

  const investorPacks = sources.evidence.packs.filter(
    (p) => p.audience === 'investor' && (p.status === 'approved' || p.status === 'draft')
  )
  if (investorPacks.length > 0) {
    const pack = investorPacks[0]!
    opportunities.push({
      id: nextId('opportunity'),
      title: 'Investor evidence pack ready for review',
      summary: `"${pack.title}" — ${pack.status === 'approved' ? 'approved' : 'needs approval'} for fundraising conversations.`,
      opportunityType: 'investor',
      valueEstimate: 'high',
      confidence: pack.status === 'approved' ? 0.9 : 0.65,
      nextAction: pack.status === 'approved' ? 'Use in investor outreach.' : 'Approve before external use.',
      linkedEntityType: 'evidence_pack',
      linkedEntityId: pack.id
    })
  }

  if (sources.quality.latestRun && sources.quality.latestRun.passRate >= 80) {
    opportunities.push({
      id: nextId('opportunity'),
      title: 'Quality Lab as defensibility',
      summary: `ORB quality at ${sources.quality.latestRun.passRate}% pass rate supports responsible AI positioning.`,
      opportunityType: 'product',
      valueEstimate: 'medium',
      confidence: 0.75,
      nextAction: 'Reference Quality Lab methodology in investor and grant materials (with approval).'
    })
  }

  if (sources.strategicContext.primaryObjective.toLowerCase().includes('orb')) {
    opportunities.push({
      id: nextId('opportunity'),
      title: 'ORB Voice engagement opportunity',
      summary: "Voice dictation reduces documentation burden in children's homes — strong pilot narrative.",
      opportunityType: 'technology',
      valueEstimate: 'medium',
      confidence: 0.7,
      nextAction: 'Align product demo with active provider relationships.'
    })
  }

  const memoryGoals = [
    ...sources.strategicContext.secondaryObjectives,
    sources.strategicContext.primaryObjective
  ]
    .join(' ')
    .toLowerCase()

  if (memoryGoals.includes('grant') || memoryGoals.includes('innovate')) {
    opportunities.push({
      id: nextId('opportunity'),
      title: 'Innovate UK social impact grant angle',
      summary: "Children's homes safeguarding technology with measurable time returned to direct care.",
      opportunityType: 'grant',
      valueEstimate: 'medium',
      confidence: 0.6,
      nextAction: 'Draft grant narrative via evidence pack — requires approval before submission.'
    })
  }

  if (memoryGoals.includes('microsoft') || memoryGoals.includes('productivity')) {
    opportunities.push({
      id: nextId('opportunity'),
      title: 'Microsoft startup and productivity angle',
      summary: 'IndiCare OS integrates with care workflows — potential co-sell or startup programme fit.',
      opportunityType: 'partner',
      valueEstimate: 'unknown',
      confidence: 0.55,
      nextAction: 'Record as partnership relationship and track at /founder/relationships.'
    })
  }

  if (memoryGoals.includes('openai') || memoryGoals.includes('responsible')) {
    opportunities.push({
      id: nextId('opportunity'),
      title: 'OpenAI responsible AI positioning',
      summary: 'Quality Lab and safeguarding-first ORB design support responsible deployment narrative.',
      opportunityType: 'growth',
      valueEstimate: 'medium',
      confidence: 0.65,
      nextAction: 'Prepare approved evidence pack before external AI partnership outreach.'
    })
  }

  if (sources.operatingLoop?.recommendedFounderDecisions.length) {
    const decision = sources.operatingLoop.recommendedFounderDecisions[0]!
    opportunities.push({
      id: nextId('opportunity'),
      title: 'Operating loop recommendation',
      summary: decision.slice(0, 200),
      opportunityType: 'growth',
      valueEstimate: 'medium',
      confidence: 0.7,
      nextAction: 'Convert to founder action if not already tracked.'
    })
  }

  if (sources.revenue.snapshot.source === 'live' && sources.revenue.snapshot.mrr !== null) {
    opportunities.push({
      id: nextId('opportunity'),
      title: 'Live revenue traction narrative',
      summary: `Live MRR £${sources.revenue.snapshot.mrr.toLocaleString('en-GB')} — use only with approved investor materials.`,
      opportunityType: 'investor',
      valueEstimate: 'high',
      confidence: 0.85,
      nextAction: 'Ensure investor evidence pack is approved before citing figures externally.'
    })
  }

  return opportunities.slice(0, 10)
}
