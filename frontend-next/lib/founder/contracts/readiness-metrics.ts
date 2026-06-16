/**
 * Future live integration contract for Inspection evidence preparation metrics.
 * No API implementation yet — defines the shape for backend projections.
 */

export type ReadinessCategoryScore = {
  categoryId: string
  categoryName: string
  score: number
  weight: number
  gapCount: number
}

export type HomeReadinessMetric = {
  homeId: string
  homeName: string
  providerId: string
  overallScore: number
  categoryScores: ReadinessCategoryScore[]
  gaps: string[]
  lastAssessedAt: string
}

export type ReadinessMetrics = {
  assessedAt: string
  homes: HomeReadinessMetric[]
  platformAverageScore: number
  commonGaps: Array<{ gap: string; frequency: number }>
}
