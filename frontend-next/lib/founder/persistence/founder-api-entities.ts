/** Known founder persistence API entity slugs — must match backend ENTITY_ALIASES keys. */

export const FOUNDER_PERSISTENCE_ENTITY_SLUGS = [
  'actions',
  'approvals',
  'content',
  'build-briefs',
  'staff-team-runs',
  'agent-runs',
  'operating-loop-runs',
  'quality-runs',
  'quality-results',
  'quality-proposals',
  'expert-reviews',
  'safety-reviews',
  'memories',
  'evidence-packs',
  'audit-log'
] as const

export type FounderPersistenceEntitySlug = (typeof FOUNDER_PERSISTENCE_ENTITY_SLUGS)[number]

const ENTITY_SLUG_SET = new Set<string>(FOUNDER_PERSISTENCE_ENTITY_SLUGS)

export function isKnownPersistenceEntitySlug(slug: string): slug is FounderPersistenceEntitySlug {
  return ENTITY_SLUG_SET.has(slug)
}

export function unknownPersistenceEntityMessage(slug: string): string {
  return `Unknown founder persistence entity: ${slug}`
}
