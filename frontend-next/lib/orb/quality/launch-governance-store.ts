import type { OrbEvaluationRun } from '@/lib/orb/evaluation/orb-evaluation-types'
import { INTERNAL_BRAIN_SCORING_VERSION_V2 } from '@/lib/orb/evaluation/orb-evaluation-types'

export type InternalBrainHighRiskGovernanceRecord = {
  runId: string
  completedAt: string
  passRate: number
  criticalFailures: number
  scenarioCount: number
  passed: boolean
  scoringVersion?: string
}

export type OrbLaunchGovernanceRecord = {
  privacyRetentionReviewed: boolean
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
  internalBrainHighRisk?: InternalBrainHighRiskGovernanceRecord
}

const STORAGE_KEY = 'orb-launch-governance-v1'

function defaultRecord(): OrbLaunchGovernanceRecord {
  return { privacyRetentionReviewed: false }
}

function readRecord(): OrbLaunchGovernanceRecord {
  if (typeof window === 'undefined') return defaultRecord()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultRecord()
    const parsed = JSON.parse(raw) as Partial<OrbLaunchGovernanceRecord>
    const internalBrainHighRisk = parsed.internalBrainHighRisk
    return {
      privacyRetentionReviewed: Boolean(parsed.privacyRetentionReviewed),
      reviewedAt: parsed.reviewedAt,
      reviewedBy: parsed.reviewedBy,
      reviewNotes: parsed.reviewNotes,
      internalBrainHighRisk:
        internalBrainHighRisk?.runId
          ? {
              runId: internalBrainHighRisk.runId,
              completedAt: internalBrainHighRisk.completedAt,
              passRate: Number(internalBrainHighRisk.passRate) || 0,
              criticalFailures: Number(internalBrainHighRisk.criticalFailures) || 0,
              scenarioCount: Number(internalBrainHighRisk.scenarioCount) || 0,
              passed: Boolean(internalBrainHighRisk.passed),
              scoringVersion: internalBrainHighRisk.scoringVersion
            }
          : undefined
    }
  } catch {
    return defaultRecord()
  }
}

function writeRecord(record: OrbLaunchGovernanceRecord): OrbLaunchGovernanceRecord {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
  }
  return record
}

export function getPrivacyRetentionReviewed(): boolean {
  return readRecord().privacyRetentionReviewed
}

export function getLaunchGovernanceRecord(): OrbLaunchGovernanceRecord {
  return readRecord()
}

export function getInternalBrainHighRiskGovernance(): InternalBrainHighRiskGovernanceRecord | undefined {
  return readRecord().internalBrainHighRisk
}

export function recordPrivacyRetentionReview(input: {
  reviewedBy?: string
  reviewNotes?: string
}): OrbLaunchGovernanceRecord {
  const current = readRecord()
  return writeRecord({
    ...current,
    privacyRetentionReviewed: true,
    reviewedAt: new Date().toISOString(),
    reviewedBy: input.reviewedBy ?? 'founder',
    reviewNotes: input.reviewNotes?.trim() || undefined
  })
}

export function clearPrivacyRetentionReview(): OrbLaunchGovernanceRecord {
  const current = readRecord()
  return writeRecord({
    ...current,
    privacyRetentionReviewed: false,
    reviewedAt: undefined,
    reviewedBy: undefined,
    reviewNotes: undefined
  })
}

export function recordInternalBrainHighRiskRun(run: OrbEvaluationRun): OrbLaunchGovernanceRecord {
  if (run.mode !== 'internal-brain' || run.packType !== 'high-risk' || run.status !== 'completed') {
    return readRecord()
  }

  const current = readRecord()
  const snapshot: InternalBrainHighRiskGovernanceRecord = {
    runId: run.id,
    completedAt: run.completedAt ?? run.startedAt,
    passRate: run.passRate,
    criticalFailures: run.criticalFailures,
    scenarioCount: run.scenarioCount,
    passed: run.criticalFailures === 0,
    scoringVersion: run.scoringVersion
  }

  return writeRecord({
    ...current,
    internalBrainHighRisk: snapshot
  })
}

function preferV2Run(runs: OrbEvaluationRun[]): OrbEvaluationRun | undefined {
  return (
    runs.find((run) => run.scoringVersion === INTERNAL_BRAIN_SCORING_VERSION_V2) ?? runs[0]
  )
}

export function syncLaunchGovernanceFromEvaluationRuns(
  evaluationRuns: OrbEvaluationRun[]
): OrbLaunchGovernanceRecord {
  const highRiskRuns = evaluationRuns.filter(
    (run) =>
      run.status === 'completed' &&
      run.mode === 'internal-brain' &&
      run.packType === 'high-risk'
  )
  const latest = preferV2Run(highRiskRuns)
  if (!latest) return readRecord()

  const current = readRecord()
  const existing = current.internalBrainHighRisk
  if (existing?.runId === latest.id) return current

  const existingTime = existing ? Date.parse(existing.completedAt) : 0
  const latestTime = Date.parse(latest.completedAt ?? latest.startedAt)
  if (existing && Number.isFinite(existingTime) && existingTime >= latestTime) {
    return current
  }

  return recordInternalBrainHighRiskRun(latest)
}
