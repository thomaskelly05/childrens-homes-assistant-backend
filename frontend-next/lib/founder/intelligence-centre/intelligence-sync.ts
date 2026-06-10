/**
 * Synchronous intelligence snapshot for client-side ORB Founder (no API round-trip).
 */

import { calculateFounderScore } from './founder-score-engine'
import { generateFounderBriefingFromSnapshot } from './founder-briefing-generator'
import { generateFounderNarratives } from './founder-narrative-engine'
import { generateFounderOpportunities } from './founder-opportunity-engine'
import { generateFounderPriorities } from './founder-priority-engine'
import { generateFounderRisks } from './founder-risk-engine'
import { generateStrategicAlignment } from './strategic-alignment-engine'
import {
  buildDataBasisFromSources,
  buildIntelligenceSourcesSync
} from './intelligence-source-builder'
import type {
  FounderBriefing,
  FounderBriefingType,
  FounderIntelligenceSnapshot
} from './intelligence-centre-types'
import { nextId } from '@/lib/founder/persistence/repositories/repository-base'
import { buildCompanyOperatingModel } from '@/lib/founder/company/company-service'

export function generateFounderIntelligenceSnapshotSync(): FounderIntelligenceSnapshot {
  const sources = buildIntelligenceSourcesSync()
  const founderScore = calculateFounderScore(sources)
  const topPriorities = generateFounderPriorities(sources)
  const risks = generateFounderRisks(sources)
  const opportunities = generateFounderOpportunities(sources)
  const strategicAlignment = generateStrategicAlignment(sources)

  const partial = { founderScore, topPriorities, risks, opportunities, limitations: sources.limitations }
  const narrative = generateFounderNarratives(sources, partial)

  let company: ReturnType<typeof buildCompanyOperatingModel> | null = null
  try {
    company = buildCompanyOperatingModel()
  } catch {
    /* company model optional */
  }

  return {
    id: nextId('intel-snap'),
    generatedAt: new Date().toISOString(),
    dataBasis: buildDataBasisFromSources(sources),
    founderScore,
    readinessScore: founderScore.overall,
    topPriorities,
    risks,
    opportunities,
    strategicAlignment,
    narrative,
    recommendedDecisions: topPriorities.slice(0, 3).map((p) => p.recommendedAction),
    briefingIds: [],
    limitations: sources.limitations,
    company: company
      ? {
          companyScore: company.scorecard.overallCompanyScore,
          companyConfidence: company.scorecard.overallConfidence,
          departmentScores: company.departments.map((d) => ({
            departmentId: d.id,
            name: d.name,
            score: d.score ?? 0,
            confidence: d.confidence ?? 0
          })),
          ceoAgendaCount: company.ceoAgenda.length,
          boardReportStatus: 'not-generated',
          departmentRisks: company.scorecard.risks,
          departmentOpportunities: company.scorecard.opportunities
        }
      : undefined
  }
}

export function generateBriefingSync(type: FounderBriefingType): FounderBriefing {
  const snapshot = generateFounderIntelligenceSnapshotSync()
  const sources = buildIntelligenceSourcesSync()
  return generateFounderBriefingFromSnapshot(type, snapshot, sources)
}
