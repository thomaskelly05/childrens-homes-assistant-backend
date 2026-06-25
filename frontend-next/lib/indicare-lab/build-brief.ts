import type { BuildBrief, LabGap, RiskLevel } from './types'

const RISK_RANK: Record<RiskLevel, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
}

export function generateBuildBrief(gaps: LabGap[]): BuildBrief {
  const id = `brief-${Date.now()}`
  const createdAt = new Date().toISOString()
  const title =
    gaps.length === 1
      ? `Build brief: ${gaps[0].title}`
      : `Build brief: ${gaps.length} improvement gaps`

  const categories = [...new Set(gaps.map((g) => g.category))]
  const highestRisk = gaps.reduce<RiskLevel>(
    (acc, g) => (RISK_RANK[g.riskLevel] > RISK_RANK[acc] ? g.riskLevel : acc),
    'low'
  )

  return {
    id,
    createdAt,
    title,
    gaps,
    objective: `Address ${gaps.length} identified gap${gaps.length === 1 ? '' : 's'} across ${categories.join(', ')} to strengthen ORB Residential internal evaluation readiness.`,
    scope: gaps.map((g) => `[${g.area}] ${g.title}: ${g.suggestedAction}`),
    constraints: [
      'Development mode only — no production deployment without founder approval',
      'Must not silently deploy high-risk changes',
      'Synthetic review board perspectives are AI-modelled, not human expert validation',
      'Language must use supports, reviews, flags, recommends — not compliance guarantees'
    ],
    acceptanceCriteria: gaps.map(
      (g) => `${g.title}: implement ${g.suggestedAction} and verify via internal evaluation`
    ),
    riskNotes: `Highest assessed risk: ${highestRisk}. All changes require explicit founder approval before staging.`
  }
}

export function formatLabDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(iso))
  } catch {
    return iso
  }
}
