import type { FounderBootstrapPersistence } from '@/lib/founder/bootstrap/founder-bootstrap-client'

const SLUG_TO_BOOTSTRAP_KEY: Record<string, keyof FounderBootstrapPersistence> = {
  actions: 'actions',
  approvals: 'approvals',
  content: 'content',
  'build-briefs': 'buildBriefs',
  'quality-runs': 'qualityRuns',
  'quality-proposals': 'qualityProposals',
  'expert-reviews': 'expertReviews',
  memories: 'memories',
  'evidence-packs': 'evidencePacks',
  'operating-loop-runs': 'operatingLoopRuns'
}

let persistenceCache: Partial<FounderBootstrapPersistence> | null = null

export function setBootstrapPersistenceCache(data: FounderBootstrapPersistence): void {
  persistenceCache = data
}

export function clearBootstrapPersistenceCache(): void {
  persistenceCache = null
}

export function getBootstrapRecordsForSlug(slug: string): unknown[] | null {
  if (!persistenceCache) return null
  const key = SLUG_TO_BOOTSTRAP_KEY[slug]
  if (!key) return null
  const records = persistenceCache[key]
  return Array.isArray(records) ? records : []
}
