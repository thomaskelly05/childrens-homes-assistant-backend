/**
 * Canonical ORB Residential output review lifecycle — user-facing statuses.
 * Backend persistence status (draft/saved/archived/pinned) remains stable in Phase 1;
 * professional review state lives in metadata.review_status until schema migration.
 */

/** User-facing review lifecycle — never implies ORB approval or compliance. */
export type OrbOutputReviewStatus =
  | 'draft'
  | 'needs_review'
  | 'reviewed_by_adult'
  | 'manager_reviewed'
  | 'exported'
  | 'archived'

export type OrbOutputReviewStatusLabel =
  | 'Draft'
  | 'Needs review'
  | 'Reviewed by adult'
  | 'Manager reviewed'
  | 'Exported'
  | 'Archived'

export const ORB_OUTPUT_REVIEW_STATUS_LABELS: Record<
  OrbOutputReviewStatus,
  OrbOutputReviewStatusLabel
> = {
  draft: 'Draft',
  needs_review: 'Needs review',
  reviewed_by_adult: 'Reviewed by adult',
  manager_reviewed: 'Manager reviewed',
  exported: 'Exported',
  archived: 'Archived'
}

/** Labels that must never appear in ORB Residential user-facing UI. */
export const ORB_FORBIDDEN_OUTPUT_STATUS_LABELS = [
  'Approved by ORB',
  'Compliant',
  'Safeguarding cleared',
  'Ofsted guaranteed',
  'Ofsted ready',
  'Ofsted-ready',
  'Inspection ready',
  'Safeguarding approved'
] as const

export function isForbiddenOutputStatusLabel(label: string): boolean {
  const normalised = label.trim().toLowerCase()
  return ORB_FORBIDDEN_OUTPUT_STATUS_LABELS.some(
    (forbidden) => forbidden.toLowerCase() === normalised
  )
}

export function orbOutputReviewStatusLabel(
  status: OrbOutputReviewStatus | string | null | undefined
): OrbOutputReviewStatusLabel {
  if (!status) return 'Draft'
  const key = String(status).trim().toLowerCase().replace(/\s+/g, '_') as OrbOutputReviewStatus
  if (key in ORB_OUTPUT_REVIEW_STATUS_LABELS) {
    return ORB_OUTPUT_REVIEW_STATUS_LABELS[key]
  }
  if (isForbiddenOutputStatusLabel(String(status))) {
    return 'Needs review'
  }
  return 'Draft'
}

/** Backend saved-output `status` enum — unchanged in Phase 1. */
export type OrbSavedOutputBackendStatus = 'draft' | 'saved' | 'archived' | 'pinned'

export type OrbSavedOutputMetadataReview = {
  review_status?: OrbOutputReviewStatus
  reviewed_by_adult_at?: string
  manager_reviewed_at?: string
  exported_at?: string
  /** Explicit: ORB never approves records. */
  orb_approval?: false
}

const REVIEW_METADATA_KEY = 'review_status'

export function readOutputReviewStatus(
  metadata: Record<string, unknown> | null | undefined
): OrbOutputReviewStatus {
  const raw = metadata?.[REVIEW_METADATA_KEY]
  if (typeof raw === 'string' && raw in ORB_OUTPUT_REVIEW_STATUS_LABELS) {
    return raw as OrbOutputReviewStatus
  }
  return 'draft'
}

export function buildOutputReviewMetadata(
  reviewStatus: OrbOutputReviewStatus,
  extras?: Partial<OrbSavedOutputMetadataReview>
): OrbSavedOutputMetadataReview {
  return {
    review_status: reviewStatus,
    orb_approval: false,
    ...extras
  }
}

/** Map legacy backend `saved` to professional review language for display. */
export function reviewStatusFromBackendSavedOutput(
  backendStatus: OrbSavedOutputBackendStatus | string | null | undefined,
  metadata?: Record<string, unknown> | null
): OrbOutputReviewStatus {
  const fromMeta = readOutputReviewStatus(metadata)
  if (fromMeta !== 'draft') return fromMeta
  switch (backendStatus) {
    case 'archived':
      return 'archived'
    case 'draft':
      return 'draft'
    case 'saved':
    case 'pinned':
      return 'needs_review'
    default:
      return 'draft'
  }
}

export function displayLabelForSavedOutput(
  backendStatus: OrbSavedOutputBackendStatus | string | null | undefined,
  metadata?: Record<string, unknown> | null
): OrbOutputReviewStatusLabel {
  return orbOutputReviewStatusLabel(
    reviewStatusFromBackendSavedOutput(backendStatus, metadata)
  )
}
