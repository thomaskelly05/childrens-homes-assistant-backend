/**
 * Strategic memory context helpers for Founder Staff Agents.
 */

import { getFounderStrategicContext } from './founder-memory-store'
import type { FounderStrategicContext } from './founder-memory-types'

export function getStaffAgentStrategicContext(): FounderStrategicContext {
  return getFounderStrategicContext()
}

export function strategicMemorySummary(): string {
  const ctx = getFounderStrategicContext()
  if (ctx.activeMemoryCount === 0) {
    return 'No founder strategic memory recorded yet.'
  }
  const parts: string[] = []
  if (ctx.primaryObjective) parts.push(`Primary objective: ${ctx.primaryObjective}`)
  if (ctx.currentProductFocus) parts.push(`Product focus: ${ctx.currentProductFocus}`)
  if (ctx.currentCommercialFocus) parts.push(`Commercial focus: ${ctx.currentCommercialFocus}`)
  if (ctx.deferredObjectives.length > 0) {
    parts.push(`Deferred: ${ctx.deferredObjectives.slice(0, 2).join('; ')}`)
  }
  return parts.join('. ')
}

export function alignRecommendationToProductFocus(recommendation: string, productFocus: string): string {
  if (!productFocus) return recommendation
  if (productFocus.toLowerCase().includes('orb residential')) {
    return recommendation.replace(/IndiCare OS/gi, 'ORB Residential (IndiCare OS deferred)')
  }
  return recommendation
}

export function filterDeferredRecommendations(
  recommendations: string[],
  deferredObjectives: string[]
): string[] {
  if (deferredObjectives.length === 0) return recommendations

  const deferredTerms = deferredObjectives
    .join(' ')
    .toLowerCase()
    .split(/\W+/)
    .filter((t) => t.length > 4)

  return recommendations.filter((rec) => {
    const lower = rec.toLowerCase()
    const isDeferredWork = deferredTerms.some(
      (term) => lower.includes('indicare os') && term.includes('indicare')
    )
    return !isDeferredWork
  })
}
