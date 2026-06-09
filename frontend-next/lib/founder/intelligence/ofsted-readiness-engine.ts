/**
 * Ofsted Readiness Engine — calculates inspection readiness scores and gaps.
 * Designed to become the platform-wide readiness model for IndiCare.
 */

import type { ReadinessMetrics } from '@/lib/founder/contracts/readiness-metrics'

export const READINESS_CATEGORIES = [
  'child voice',
  'safeguarding',
  'chronology',
  'management oversight',
  'missing from home recording',
  'risk assessments',
  'evaluation quality',
  'action completion'
] as const

export type ReadinessStatus = 'Outstanding Ready' | 'Good' | 'Attention Required'

export type ReadinessGap = {
  category: string
  description: string
  severity: 'critical' | 'moderate' | 'minor'
}

export type HomeReadinessResult = {
  id: string
  name: string
  score: number
  status: ReadinessStatus
  statusTone: 'emerald' | 'amber' | 'red'
  gaps: ReadinessGap[]
}

export type OfstedReadinessResult = {
  score: number
  status: ReadinessStatus
  gaps: ReadinessGap[]
  homes: HomeReadinessResult[]
  commonGaps: string[]
  platformAverageScore: number
}

function scoreToStatus(score: number): ReadinessStatus {
  if (score >= 90) return 'Outstanding Ready'
  if (score >= 75) return 'Good'
  return 'Attention Required'
}

function scoreToTone(score: number): HomeReadinessResult['statusTone'] {
  if (score >= 90) return 'emerald'
  if (score >= 75) return 'emerald'
  if (score >= 65) return 'amber'
  return 'red'
}

function gapToSeverity(score: number): ReadinessGap['severity'] {
  if (score < 65) return 'critical'
  if (score < 80) return 'moderate'
  return 'minor'
}

function calculateHomeGaps(home: ReadinessMetrics['homes'][number]): ReadinessGap[] {
  return home.categoryScores
    .filter((c) => c.score < 85)
    .map((c) => ({
      category: c.categoryName,
      description: `${c.categoryName} scoring ${c.score}% — ${c.gapCount} gap(s) identified`,
      severity: gapToSeverity(c.score)
    }))
}

export function calculateOfstedReadiness(metrics: ReadinessMetrics): OfstedReadinessResult {
  const homes: HomeReadinessResult[] = metrics.homes.map((home) => ({
    id: home.homeId,
    name: home.homeName,
    score: home.overallScore,
    status: scoreToStatus(home.overallScore),
    statusTone: scoreToTone(home.overallScore),
    gaps: calculateHomeGaps(home)
  }))

  const platformGaps: ReadinessGap[] = metrics.commonGaps.map((g) => ({
    category: g.gap,
    description: `${g.gap} identified across ${g.frequency} homes`,
    severity: g.frequency >= 15 ? 'critical' : g.frequency >= 10 ? 'moderate' : 'minor'
  }))

  return {
    score: metrics.platformAverageScore,
    status: scoreToStatus(metrics.platformAverageScore),
    gaps: platformGaps,
    homes,
    commonGaps: metrics.commonGaps.map((g) => g.gap),
    platformAverageScore: metrics.platformAverageScore
  }
}
