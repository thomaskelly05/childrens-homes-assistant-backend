import type { FinanceCostEntry, FinanceForecast, FinanceSnapshot } from './finance-types'

let costEntries: FinanceCostEntry[] = []
let snapshots: FinanceSnapshot[] = []
let forecasts: FinanceForecast[] = []
let entryCounter = 0

function nextId(prefix: string): string {
  entryCounter += 1
  return `${prefix}-${Date.now()}-${entryCounter}`
}

export function getCostEntries(): FinanceCostEntry[] {
  return [...costEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addCostEntry(entry: Omit<FinanceCostEntry, 'id' | 'createdAt'>): FinanceCostEntry {
  const full: FinanceCostEntry = {
    ...entry,
    id: nextId('finance-cost'),
    createdAt: new Date().toISOString()
  }
  costEntries.unshift(full)
  return full
}

export function getFinanceSnapshots(): FinanceSnapshot[] {
  return [...snapshots].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addFinanceSnapshot(snapshot: FinanceSnapshot): FinanceSnapshot {
  snapshots.unshift(snapshot)
  if (snapshots.length > 100) snapshots = snapshots.slice(0, 100)
  return snapshot
}

export function getLatestFinanceSnapshot(): FinanceSnapshot | undefined {
  return getFinanceSnapshots()[0]
}

export function getFinanceForecasts(): FinanceForecast[] {
  return [...forecasts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function addFinanceForecast(forecast: FinanceForecast): FinanceForecast {
  forecasts.unshift(forecast)
  return forecast
}

export function resetFinanceStore(): void {
  costEntries = []
  snapshots = []
  forecasts = []
  entryCounter = 0
}
