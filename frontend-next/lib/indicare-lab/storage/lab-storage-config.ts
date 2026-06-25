import { isFounderPersistenceDevFallback } from '@/lib/founder/persistence/persistence-config'

export type LabStorageMode = 'memory' | 'database'

const VALID_MODES = new Set<LabStorageMode>(['memory', 'database'])

function readExplicitMode(): LabStorageMode | null {
  const raw = process.env.INDICARE_LAB_STORAGE_MODE?.trim().toLowerCase()
  if (!raw) return null
  if (VALID_MODES.has(raw as LabStorageMode)) return raw as LabStorageMode
  return null
}

/** Whether database persistence is configured safely for this environment. */
export function isLabDatabaseStorageConfiguredSafely(): boolean {
  if (process.env.NODE_ENV === 'test') return false
  if (isFounderPersistenceDevFallback()) return false
  return true
}

/** Resolved storage mode — explicit env wins, otherwise environment defaults. */
export function getLabStorageMode(): LabStorageMode {
  const explicit = readExplicitMode()
  if (explicit) return explicit

  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'development') {
    return 'memory'
  }

  if (process.env.NODE_ENV === 'production' && isLabDatabaseStorageConfiguredSafely()) {
    return 'database'
  }

  return 'memory'
}

/** Whether the database-backed adapter should be active. */
export function isLabDatabaseStorageEnabled(): boolean {
  return getLabStorageMode() === 'database' && isLabDatabaseStorageConfiguredSafely()
}

export function getLabStorageModeLabel(mode: LabStorageMode = getLabStorageMode()): string {
  return mode === 'database' ? 'Database-backed' : 'Memory fallback'
}
