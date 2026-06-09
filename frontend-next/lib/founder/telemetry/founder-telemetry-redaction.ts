/** Strip identifiable or narrative fields before telemetry leaves the client. */

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
  'firstName',
  'last_name',
  'lastName',
  'display_name',
  'displayName',
  'home_name',
  'homeName',
  'email',
  'name',
  'prompt',
  'prompt_body',
  'promptBody',
  'message',
  'messages',
  'answer',
  'response',
  'transcript',
  'comment',
  'question',
  'question_snapshot',
  'questionSnapshot',
  'answer_snapshot',
  'answerSnapshot',
  'content',
  'body',
  'narrative',
  'safeguarding_narrative',
  'safeguardingNarrative',
  'record_text',
  'recordText',
  'child_record',
  'childRecord',
  'document_text',
  'documentText',
  'input_text',
  'inputText',
  'professional_note',
  'professionalNote'
])

const IDENTIFIABLE_PATTERNS = [
  /\bchild(?:ren)?['']?s?\s+name[s]?\b/i,
  /\bstaff\s+name[s]?\b/i,
  /\bprovider\s+name[s]?\b/i,
  /\byoung\s+person['']?s?\s+name\b/i
]

const MAX_STRING_LENGTH = 200
const MAX_DEPTH = 4

function containsIdentifiableText(value: string): boolean {
  return IDENTIFIABLE_PATTERNS.some((pattern) => pattern.test(value))
}

export function redactTelemetryMetadata(
  value: unknown,
  depth = 0
): Record<string, unknown> | unknown {
  if (depth > MAX_DEPTH) return null
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactTelemetryMetadata(item, depth + 1))
  }
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      if (BLOCKED_KEYS.has(key)) continue
      result[key] = redactTelemetryMetadata(inner, depth + 1)
    }
    return result
  }
  if (typeof value === 'string') {
    if (containsIdentifiableText(value)) return '[redacted]'
    if (value.length > MAX_STRING_LENGTH) return `${value.slice(0, MAX_STRING_LENGTH)}…`
    return value
  }
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return value
  }
  return String(value).slice(0, MAX_STRING_LENGTH)
}

export function findBlockedTelemetryKeys(
  value: unknown,
  prefix = ''
): string[] {
  const violations: string[] = []
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      const path = prefix ? `${prefix}.${key}` : key
      if (BLOCKED_KEYS.has(key)) violations.push(path)
      violations.push(...findBlockedTelemetryKeys(inner, path))
    }
  } else if (Array.isArray(value)) {
    value.slice(0, 20).forEach((item, index) => {
      violations.push(...findBlockedTelemetryKeys(item, `${prefix}[${index}]`))
    })
  }
  return violations
}

export function isSafeTelemetryMetadata(metadata: Record<string, unknown>): boolean {
  return findBlockedTelemetryKeys(metadata).length === 0
}
