import {
  FounderPersistenceApiError,
  founderPersistenceApi
} from '@/lib/founder/persistence/founder-api-client'
import type { LabPersistenceEntitySlug } from '@/lib/indicare-lab/storage/lab-storage-persistence-types'
import {
  recordLabStorageWriteFailure,
  recordLabStorageWriteSuccess
} from '@/lib/indicare-lab/storage/lab-storage-write-health'

const LAB_SOURCE = 'indicare-lab'

type LabPersistenceApi = Pick<typeof founderPersistenceApi, 'create' | 'update' | 'list'>

let apiOverride: LabPersistenceApi | null = null

function getApi(): LabPersistenceApi {
  return apiOverride ?? founderPersistenceApi
}

/** @internal test helper */
export function __setLabPersistenceApiForTests(api: LabPersistenceApi | null): void {
  apiOverride = api
}

function warnWriteFailure(context: string, error: unknown): void {
  recordLabStorageWriteFailure(context, error)
}

export async function persistLabRecord(
  entitySlug: LabPersistenceEntitySlug,
  record: Record<string, unknown>
): Promise<void> {
  try {
    await getApi().create(entitySlug, record, LAB_SOURCE)
    recordLabStorageWriteSuccess()
  } catch (error) {
    warnWriteFailure(`Failed to persist ${entitySlug}`, error)
  }
}

export async function updateLabRecord(
  entitySlug: LabPersistenceEntitySlug,
  id: string,
  patch: Record<string, unknown>,
  status?: string
): Promise<void> {
  try {
    await getApi().update(entitySlug, id, patch, status)
    recordLabStorageWriteSuccess()
  } catch (error) {
    warnWriteFailure(`Failed to update ${entitySlug}/${id}`, error)
  }
}

export async function upsertLabRecord(
  entitySlug: LabPersistenceEntitySlug,
  record: Record<string, unknown>,
  status?: string
): Promise<void> {
  const id = String(record.id ?? '')
  if (!id) {
    warnWriteFailure(`Missing id for ${entitySlug}`, 'record id required')
    return
  }

  try {
    await getApi().create(entitySlug, record, LAB_SOURCE)
    recordLabStorageWriteSuccess()
    return
  } catch (createError) {
    if (
      createError instanceof FounderPersistenceApiError &&
      (createError.status === 409 || createError.status === 500)
    ) {
      try {
        await getApi().update(entitySlug, id, record, status)
        recordLabStorageWriteSuccess()
        return
      } catch (updateError) {
        warnWriteFailure(`Failed to upsert ${entitySlug}/${id}`, updateError)
        return
      }
    }
    warnWriteFailure(`Failed to create ${entitySlug}/${id}`, createError)
  }
}

export async function listLabRecords<T>(
  entitySlug: LabPersistenceEntitySlug
): Promise<T[]> {
  try {
    const result = await getApi().list<T>(entitySlug)
    return result.items ?? []
  } catch (error) {
    if (error instanceof FounderPersistenceApiError && (error.status === 404 || error.status === 503)) {
      return []
    }
    warnWriteFailure(`Failed to list ${entitySlug}`, error)
    return []
  }
}
