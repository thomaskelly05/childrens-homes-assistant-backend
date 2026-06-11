/** Sanitise privacy request narratives — discourage safeguarding detail submission. */

const UNSAFE_PATTERNS: RegExp[] = [
  /\bNHS\s*(?:number|no\.?|#)?\s*:?\s*\d{3}\s?\d{3}\s?\d{4}\b/i,
  /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/i,
  /\b(court order|police report|social worker report|section 47|section 37)\b/i,
  /\b(full chronology|complete care record|full child record)\b/i,
  /\b(disclosed abuse|sexual abuse|self[- ]?harm|suicide|missing from care)\b/i,
  /\b\d{1,4}\s+[A-Za-z]+(?:\s+(?:Street|Road|Lane|Avenue|Close|Drive|Way|Court))\b/i
]

const MAX_SUMMARY_LENGTH = 800

export type OrbPrivacySanitiseResult = {
  sanitised: string
  rejected: boolean
  reason?: string
}

export function sanitiseOrbPrivacyRequestSummary(raw: string): OrbPrivacySanitiseResult {
  const trimmed = String(raw ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!trimmed) {
    return { sanitised: '', rejected: true, reason: 'Please describe your request briefly.' }
  }

  if (trimmed.length > MAX_SUMMARY_LENGTH) {
    return {
      sanitised: trimmed.slice(0, MAX_SUMMARY_LENGTH),
      rejected: true,
      reason: `Please keep your request under ${MAX_SUMMARY_LENGTH} characters.`
    }
  }

  const unsafe = UNSAFE_PATTERNS.find((pattern) => pattern.test(trimmed))
  if (unsafe) {
    return {
      sanitised: '',
      rejected: true,
      reason:
        'Please do not include child-identifying details, safeguarding narratives or formal record content in privacy requests. Describe the type of request only.'
    }
  }

  return { sanitised: trimmed, rejected: false }
}

/** Founder/admin list — strip anything that slipped through. */
export function sanitiseOrbPrivacyRequestForDisplay(summary: string): string {
  const result = sanitiseOrbPrivacyRequestSummary(summary)
  if (result.rejected) return '[redacted — contact support@indicare.co.uk]'
  return result.sanitised
}
