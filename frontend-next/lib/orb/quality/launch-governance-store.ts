export type OrbLaunchGovernanceRecord = {
  privacyRetentionReviewed: boolean
  reviewedAt?: string
  reviewedBy?: string
  reviewNotes?: string
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
    return {
      privacyRetentionReviewed: Boolean(parsed.privacyRetentionReviewed),
      reviewedAt: parsed.reviewedAt,
      reviewedBy: parsed.reviewedBy,
      reviewNotes: parsed.reviewNotes
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

export function recordPrivacyRetentionReview(input: {
  reviewedBy?: string
  reviewNotes?: string
}): OrbLaunchGovernanceRecord {
  return writeRecord({
    privacyRetentionReviewed: true,
    reviewedAt: new Date().toISOString(),
    reviewedBy: input.reviewedBy ?? 'founder',
    reviewNotes: input.reviewNotes?.trim() || undefined
  })
}

export function clearPrivacyRetentionReview(): OrbLaunchGovernanceRecord {
  return writeRecord(defaultRecord())
}
