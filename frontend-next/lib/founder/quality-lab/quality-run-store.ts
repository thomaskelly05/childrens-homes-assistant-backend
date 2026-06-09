import type { QualityRun, QualityRunItemResult, QualityRunStatus } from './quality-lab-types'
import { persistQualityRun } from './persistence-bridge'
import { getQualityRunsCache, prependQualityRun } from './quality-persistence-cache'

let runCounter = 0

function nextRunId(): string {
  runCounter += 1
  return `ql-run-${Date.now()}-${runCounter}`
}

export function getQualityRuns(): QualityRun[] {
  return getQualityRunsCache()
}

export function getQualityRun(id: string): QualityRun | undefined {
  return getQualityRunsCache().find((r) => r.id === id)
}

export function getLatestQualityRun(): QualityRun | undefined {
  return getQualityRunsCache()[0]
}

export function addQualityRun(
  partial: Omit<
    QualityRun,
    'id' | 'startedAt' | 'status' | 'passCount' | 'failCount' | 'totalCount' | 'passRate'
  > & {
    id?: string
    startedAt?: string
    status?: QualityRunStatus
    passCount?: number
    failCount?: number
    totalCount?: number
    passRate?: number
  }
): QualityRun {
  const passCount = partial.passCount ?? partial.results.filter((r) => r.passed).length
  const totalCount = partial.totalCount ?? partial.results.length
  const failCount = partial.failCount ?? totalCount - passCount
  const passRate = partial.passRate ?? (totalCount > 0 ? Math.round((passCount / totalCount) * 1000) / 10 : 0)

  const stored: QualityRun = {
    ...partial,
    id: partial.id ?? nextRunId(),
    status: partial.status ?? 'complete',
    startedAt: partial.startedAt ?? new Date().toISOString(),
    passCount,
    failCount,
    totalCount,
    passRate,
    completedAt: partial.completedAt ?? new Date().toISOString()
  }
  prependQualityRun(stored)
  void persistQualityRun(stored).catch(() => undefined)
  return stored
}

export function mapApiRunItem(item: {
  scenario_id: string
  title: string
  family: string
  role: string
  risk_level: string
  passed: boolean
  score: number
  missing_markers: string[]
  unsafe_phrases: string[]
  overclaims: string[]
  notes: string[]
  answer_source: QualityRunItemResult['answerSource']
  answer_excerpt: string
}): QualityRunItemResult {
  return {
    scenarioId: item.scenario_id,
    scenarioTitle: item.title,
    family: item.family,
    role: item.role,
    riskLevel: item.risk_level,
    passed: item.passed,
    score: item.score,
    missingMarkers: item.missing_markers,
    unsafePhrases: item.unsafe_phrases,
    overclaims: item.overclaims,
    notes: item.notes,
    answerSource: item.answer_source,
    answerExcerpt: item.answer_excerpt
  }
}

export function resetQualityRunStore(): void {
  runCounter = 0
}
