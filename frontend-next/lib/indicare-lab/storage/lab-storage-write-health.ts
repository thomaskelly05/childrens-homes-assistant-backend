export type LabStorageWriteHealth = {
  lastSuccessfulWriteAt: string | null
  failedWriteCount: number
}

let writeHealth: LabStorageWriteHealth = {
  lastSuccessfulWriteAt: null,
  failedWriteCount: 0
}

export function getLabStorageWriteHealth(): LabStorageWriteHealth {
  return { ...writeHealth }
}

export function recordLabStorageWriteSuccess(): void {
  writeHealth = {
    ...writeHealth,
    lastSuccessfulWriteAt: new Date().toISOString()
  }
}

export function recordLabStorageWriteFailure(context: string, error: unknown): void {
  writeHealth = {
    ...writeHealth,
    failedWriteCount: writeHealth.failedWriteCount + 1
  }
  const message = error instanceof Error ? error.message : String(error)
  console.warn(`[indicare-lab/storage] ${context}: ${message}`)
}

export function resetLabStorageWriteHealthForTests(): void {
  writeHealth = {
    lastSuccessfulWriteAt: null,
    failedWriteCount: 0
  }
}
