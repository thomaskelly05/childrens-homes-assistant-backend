import { FORBIDDEN_IDENTIFIABLE_FIELDS } from './adapter-types'

const PROBE_TIMEOUT_MS = 4000

export function currentPeriodBounds(): { periodStart: string; periodEnd: string } {
  const now = new Date()
  const periodEnd = now.toISOString().slice(0, 10)
  const periodStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  return { periodStart, periodEnd }
}

export function anonymiseProviderLabel(index: number): string {
  return `Provider ${String.fromCharCode(65 + (index % 26))}`
}

export function anonymiseHomeLabel(index: number): string {
  return `Home ${String.fromCharCode(65 + (index % 26))}`
}

export async function probeEndpoint(path: string): Promise<boolean> {
  if (typeof window === 'undefined') return false

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const response = await fetch(path, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal
    })
    clearTimeout(timer)
    return response.ok
  } catch {
    return false
  }
}

export async function fetchJson<T>(path: string): Promise<T | null> {
  if (typeof window === 'undefined') return null

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    const response = await fetch(path, {
      credentials: 'include',
      cache: 'no-store',
      signal: controller.signal
    })
    clearTimeout(timer)
    if (!response.ok) return null
    const body = (await response.json()) as { data?: T } | T
    if (body && typeof body === 'object' && 'data' in body && body.data !== undefined) {
      return body.data as T
    }
    return body as T
  } catch {
    return null
  }
}

/** Recursively assert no forbidden identifiable fields are present in adapter output. */
export function assertNoIdentifiableFields(value: unknown, path = 'root'): string[] {
  const violations: string[] = []

  if (value === null || value === undefined) return violations

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      violations.push(...assertNoIdentifiableFields(item, `${path}[${index}]`))
    })
    return violations
  }

  if (typeof value !== 'object') return violations

  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (FORBIDDEN_IDENTIFIABLE_FIELDS.includes(key as (typeof FORBIDDEN_IDENTIFIABLE_FIELDS)[number])) {
      violations.push(`${path}.${key}`)
    }
    violations.push(...assertNoIdentifiableFields(nested, `${path}.${key}`))
  }

  return violations
}
