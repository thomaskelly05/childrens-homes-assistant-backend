'use client'

export type OfflineQueueItem = {
  id: string
  operation: string
  endpoint: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body: unknown
  idempotencyKey: string
  attempts: number
  status: 'queued' | 'syncing' | 'failed'
  createdAt: string
  lastError?: string
}

const STORAGE_KEY = 'indicare.offline.outbox.v1'

function readQueue(): OfflineQueueItem[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]') as OfflineQueueItem[]
  } catch {
    return []
  }
}

function writeQueue(items: OfflineQueueItem[]) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(-100)))
}

function queueId(operation: string, endpoint: string, idempotencyKey: string) {
  return `${operation}:${endpoint}:${idempotencyKey}`.replace(/[^a-zA-Z0-9:_-]/g, '_')
}

export function enqueueOfflineOperation(input: Omit<OfflineQueueItem, 'id' | 'attempts' | 'status' | 'createdAt'>) {
  const items = readQueue()
  const id = queueId(input.operation, input.endpoint, input.idempotencyKey)
  if (items.some((item) => item.id === id && item.status !== 'failed')) return id
  writeQueue([
    ...items,
    {
      ...input,
      id,
      attempts: 0,
      status: 'queued',
      createdAt: new Date().toISOString()
    }
  ])
  return id
}

export function offlineOutboxSnapshot() {
  const items = readQueue()
  return {
    queued: items.filter((item) => item.status === 'queued').length,
    failed: items.filter((item) => item.status === 'failed').length,
    syncing: items.filter((item) => item.status === 'syncing').length,
    items
  }
}

export async function replayOfflineOutbox(fetcher: typeof fetch = fetch) {
  const items = readQueue()
  const remaining: OfflineQueueItem[] = []
  for (const item of items) {
    try {
      const response = await fetcher(item.endpoint, {
        method: item.method,
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': item.idempotencyKey
        },
        body: JSON.stringify(item.body)
      })
      if (!response.ok) {
        remaining.push({ ...item, attempts: item.attempts + 1, status: item.attempts >= 4 ? 'failed' : 'queued', lastError: `${response.status} ${response.statusText}` })
      }
    } catch (error) {
      remaining.push({ ...item, attempts: item.attempts + 1, status: item.attempts >= 4 ? 'failed' : 'queued', lastError: error instanceof Error ? error.message : 'Network error' })
    }
  }
  writeQueue(remaining)
  return offlineOutboxSnapshot()
}
