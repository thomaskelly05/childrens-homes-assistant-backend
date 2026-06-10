/**
 * Live-data guard for Founder Company Operating Model.
 * Ensures metrics shown as live come from connected sources only.
 */

export type MetricSourceStatus = 'live' | 'unavailable' | 'forecast' | 'manual'

export type LiveMetricBasis = {
  value: string | number | null
  source: string
  sourceStatus: MetricSourceStatus
  lastUpdated: string | null
  limitation?: string
}

export type LiveMetricInput = {
  value: string | number | null | undefined
  source: string
  sourceStatus?: MetricSourceStatus
  lastUpdated?: string | null
  limitation?: string
}

const UNAVAILABLE_LABEL = 'Unavailable'

export function isLiveSourceConnected(
  sourceKey: string,
  connections: Record<string, string> | undefined
): boolean {
  if (!connections) return false
  const status = connections[sourceKey]
  return status === 'connected' || status === 'no-records'
}

export function assertLiveMetric(input: LiveMetricInput): LiveMetricBasis {
  const status = input.sourceStatus ?? (input.value === null || input.value === undefined ? 'unavailable' : 'live')

  if (status === 'unavailable' || input.value === null || input.value === undefined) {
    return {
      value: null,
      source: input.source,
      sourceStatus: 'unavailable',
      lastUpdated: input.lastUpdated ?? null,
      limitation: input.limitation ?? 'Live source not connected'
    }
  }

  if (status === 'forecast') {
    return {
      value: input.value,
      source: input.source,
      sourceStatus: 'forecast',
      lastUpdated: input.lastUpdated ?? null,
      limitation: input.limitation ?? 'Modelled forecast, not live result'
    }
  }

  if (status === 'manual') {
    return {
      value: input.value,
      source: input.source,
      sourceStatus: 'manual',
      lastUpdated: input.lastUpdated ?? null,
      limitation: input.limitation ?? 'Manually recorded value'
    }
  }

  return {
    value: input.value,
    source: input.source,
    sourceStatus: 'live',
    lastUpdated: input.lastUpdated ?? new Date().toISOString(),
    limitation: input.limitation
  }
}

export function formatUnavailableMetric(source: string, limitation?: string): LiveMetricBasis {
  return assertLiveMetric({
    value: null,
    source,
    sourceStatus: 'unavailable',
    limitation: limitation ?? 'Live source not connected'
  })
}

export function formatForecastMetric(
  value: string | number,
  source: string,
  limitation?: string,
  lastUpdated?: string | null
): LiveMetricBasis {
  return assertLiveMetric({
    value,
    source,
    sourceStatus: 'forecast',
    lastUpdated: lastUpdated ?? null,
    limitation: limitation ?? 'Modelled forecast, not live result'
  })
}

export function formatMetricDisplay(basis: LiveMetricBasis, unit?: string): string {
  if (basis.sourceStatus === 'unavailable' || basis.value === null) {
    return UNAVAILABLE_LABEL
  }
  if (basis.sourceStatus === 'forecast') {
    const formatted = typeof basis.value === 'number' ? basis.value.toLocaleString('en-GB') : basis.value
    return unit ? `${formatted} ${unit} (forecast)` : `${formatted} (forecast)`
  }
  if (typeof basis.value === 'number') {
    const formatted = basis.value.toLocaleString('en-GB')
    return unit ? `${formatted} ${unit}` : formatted
  }
  return basis.value
}

export function buildMetricDataBasis(basis: LiveMetricBasis): string {
  const parts = [`Source: ${basis.source}`, `Status: ${basis.sourceStatus}`]
  if (basis.lastUpdated) parts.push(`Updated: ${basis.lastUpdated}`)
  if (basis.limitation) parts.push(`Note: ${basis.limitation}`)
  return parts.join(' · ')
}

export function companyKpiFromBasis(
  id: string,
  name: string,
  basis: LiveMetricBasis,
  unit?: string,
  target?: number
): import('./company-types').CompanyKpi {
  return {
    id,
    name,
    value: basis.value,
    unit: unit ?? '',
    sourceStatus: basis.sourceStatus,
    dataSource: basis.source,
    lastUpdated: basis.lastUpdated,
    target,
    limitation: basis.limitation
  }
}
