/** Strip identifiable child/staff/provider fields from founder API payloads. */

const BLOCKED_KEYS = new Set([
  'child_name',
  'childName',
  'staff_name',
  'staffName',
  'provider_name',
  'providerName',
  'young_person_name',
  'youngPersonName',
  'first_name',
  'last_name',
  'display_name',
  'firstName',
  'lastName',
  'displayName',
  'home_name',
  'homeName'
])

export function sanitiseFounderPayload<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map((item) => sanitiseFounderPayload(item)) as T
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (BLOCKED_KEYS.has(key)) continue
      result[key] = sanitiseFounderPayload(inner)
    }
    return result as T
  }
  return value
}

export function containsIdentifiableContent(text: string): boolean {
  const patterns = [
    /\bchild(?:ren)?['']?s?\s+name[s]?\b/i,
    /\bstaff\s+name[s]?\b/i,
    /\bprovider\s+name[s]?\b/i,
    /\byoung\s+person['']?s?\s+name\b/i
  ]
  return patterns.some((pattern) => pattern.test(text))
}
