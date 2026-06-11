/** Sanitise ORB closed-pilot feedback — no child names, staff names or safeguarding narratives. */

const UNSAFE_PATTERNS: RegExp[] = [
  /\bNHS\s*(?:number|no\.?|#)?\s*:?\s*\d{3}\s?\d{3}\s?\d{4}\b/i,
  /\b(court order|police report|social worker report|section 47|section 37)\b/i,
  /\b(full chronology|complete care record|full child record)\b/i,
  /\b(disclosed abuse|sexual abuse|self[- ]?harm|suicide|missing from care)\b/i,
  /\b\d{1,4}\s+[A-Za-z]+(?:\s+(?:Street|Road|Lane|Avenue|Close|Drive|Way|Court))\b/i,
  /\b(child|young person|yp)\s+(?:called|named)\s+[A-Z][a-z]{1,20}\b/i,
  /\b(staff|worker|manager)\s+(?:called|named)\s+[A-Z][a-z]{1,20}\b/i
]

const MAX_FIELD_LENGTH = 600

export type OrbPilotSanitiseResult = {
  sanitised: string
  rejected: boolean
  reason?: string
  redacted?: boolean
}

function cleanText(raw: string): string {
  return String(raw ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function sanitiseOrbPilotFeedbackField(
  raw: string,
  options?: { required?: boolean; fieldLabel?: string }
): OrbPilotSanitiseResult {
  const trimmed = cleanText(raw)
  const label = options?.fieldLabel ?? 'This field'

  if (!trimmed) {
    if (options?.required) {
      return { sanitised: '', rejected: true, reason: `${label} is required.` }
    }
    return { sanitised: '', rejected: false }
  }

  if (trimmed.length > MAX_FIELD_LENGTH) {
    return {
      sanitised: trimmed.slice(0, MAX_FIELD_LENGTH),
      rejected: true,
      reason: `${label} must be under ${MAX_FIELD_LENGTH} characters.`
    }
  }

  const unsafe = UNSAFE_PATTERNS.find((pattern) => pattern.test(trimmed))
  if (unsafe) {
    return {
      sanitised: '',
      rejected: true,
      reason:
        'Please do not include child names, staff names, full records or detailed safeguarding narratives in feedback. Describe the type of help or concern only.'
    }
  }

  return { sanitised: trimmed, rejected: false }
}

export function sanitiseOrbPilotFeedbackForDisplay(text: string): string {
  const result = sanitiseOrbPilotFeedbackField(text)
  if (result.rejected || !result.sanitised) {
    return '[redacted — unsafe or identifying content removed]'
  }
  return result.sanitised
}
