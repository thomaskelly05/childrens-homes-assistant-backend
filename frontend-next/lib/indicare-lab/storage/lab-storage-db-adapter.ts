/**
 * Database adapter placeholder for IndiCare Lab persistent storage.
 *
 * The founder persistence layer (lib/founder/persistence/) provides a production-ready
 * pattern via BaseFounderRepository and /api/founder routes, but no lab-specific
 * entity types exist yet.
 *
 * TODO(database): When implementing:
 * 1. Add lab entity slugs to founder persistence types (review-event, lab-suggestion, etc.)
 * 2. Create LabDatabaseStorageRepository implementing LabStorageRepository
 * 3. Swap activeRepository in lab-storage.ts based on FOUNDER_PERSISTENCE_DEV_FALLBACK
 * 4. Apply lab-storage-guard.ts before every write — never bypass minimisation
 * 5. Do not introduce a new ORM; follow existing founderPersistenceApi pattern
 * 6. Add migrations only if the project establishes lab-specific DB tables
 */
import type { LabStorageRepository } from '@/lib/indicare-lab/storage/lab-storage-repository'

export type LabDatabaseAdapterStatus = 'not-implemented' | 'ready'

export function getLabDatabaseAdapterStatus(): LabDatabaseAdapterStatus {
  return 'not-implemented'
}

export function createLabDatabaseStorageRepository(): LabStorageRepository | null {
  return null
}
