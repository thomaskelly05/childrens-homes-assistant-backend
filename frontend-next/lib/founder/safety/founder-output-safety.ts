/**
 * Safety layer for founder-facing outputs — drafts, posts, evidence packs.
 */

export type FounderSafetyIssue = {
  code: string
  message: string
  severity: 'low' | 'medium' | 'high'
}

export type FounderSafetyResult = {
  safe: boolean
  issues: FounderSafetyIssue[]
  redactedContent: string
  requiresReview: boolean
}

const CHILD_IDENTIFIABLE = [
  /\bchild(?:ren)?['']?s?\s+name[s]?\b/gi,
  /\byoung\s+person['']?s?\s+name\b/gi,
  /\bYP\s*[-#]?\d+\b/g
]

const STAFF_IDENTIFIABLE = [/\bstaff\s+name[s]?\b/gi, /\bkey\s*worker['']?s?\s+name\b/gi]

const PROVIDER_IDENTIFIABLE = [
  /\bprovider\s+name[s]?\b/gi,
  /\bProvider\s+[A-Z]\b/g,
  /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Care|Homes|Services|Group|Ltd)\b/g
]

const SAFEGUARDING_RISK = [
  /\bsafeguarding\s+narrative\b/gi,
  /\babuse\s+allegation\b/gi,
  /\bdisclosure\s+of\s+abuse\b/gi,
  /\bidentifiable\s+safeguarding\b/gi
]

const EXAGGERATED_CLAIMS = [
  /\b\d{3,}\+?\s*(?:providers?|homes?|users?)\b/gi,
  /\bmarket[- ]leading\b/gi,
  /\bdominant\s+player\b/gi,
  /\bexplosive\s+growth\b/gi
]

const FABRICATED_TRACTION = [
  /\bseveral\s+providers?\s+(?:have\s+)?signed\b/gi,
  /\bmultiple\s+LA[s]?\s+(?:are\s+)?interested\b/gi,
  /\bconfirmed\s+customer[s]?\b/gi,
  /\b\d+\s+paying\s+customers?\b/gi,
  /\bopenai\s+(?:is\s+)?interested\b/gi,
  /\bmicrosoft\s+(?:is\s+)?interested\b/gi,
  /\bofsted\s+(?:has\s+)?endorsed\b/gi,
  /\bofsted\s+endorsement\b/gi,
  /\binvestor\s+interest\s+confirmed\b/gi,
  /\bprovider\s+interest\s+confirmed\b/gi,
  /\bpilot\s+(?:is\s+)?(?:live|confirmed|signed)\b/gi
]

const INVENTED_METRICS = [
  /\b£\s*\d[\d,]*\s*(?:mrr|arr)\b/gi,
  /\b\d[\d,]*\s*(?:paid\s+)?users?\s+(?:on\s+)?(?:the\s+)?platform\b/gi,
  /\b\d[\d,]*\s*paying\s+users?\b/gi,
  /\bmarket\s+traction\b/gi
]

const LEGAL_ADVICE = [/\byou\s+must\s+legally\b/gi, /\bguaranteed\s+compliance\b/gi, /\blegal\s+requirement\s+is\b/gi]

const UNSUPPORTED_LIVE = [/\bwe\s+have\s+\d+\s+(?:users?|providers?|homes?)\b/gi]

function redactPatterns(text: string, patterns: RegExp[], replacement: string): string {
  let result = text
  for (const pattern of patterns) {
    result = result.replace(pattern, replacement)
  }
  return result
}

export function checkFounderOutputSafety(content: string): FounderSafetyResult {
  const issues: FounderSafetyIssue[] = []

  for (const pattern of CHILD_IDENTIFIABLE) {
    if (pattern.test(content)) {
      issues.push({
        code: 'child-identifiable',
        message: 'Content may contain identifiable child details.',
        severity: 'high'
      })
    }
  }

  for (const pattern of STAFF_IDENTIFIABLE) {
    if (pattern.test(content)) {
      issues.push({
        code: 'staff-identifiable',
        message: 'Content may contain identifiable staff details.',
        severity: 'high'
      })
    }
  }

  for (const pattern of PROVIDER_IDENTIFIABLE) {
    if (pattern.test(content)) {
      issues.push({
        code: 'provider-identifiable',
        message: 'Content may contain identifiable provider details.',
        severity: 'high'
      })
    }
  }

  for (const pattern of SAFEGUARDING_RISK) {
    if (pattern.test(content)) {
      issues.push({
        code: 'safeguarding-narrative',
        message: 'Content may contain safeguarding narrative unsuitable for external sharing.',
        severity: 'high'
      })
    }
  }

  for (const pattern of EXAGGERATED_CLAIMS) {
    if (pattern.test(content)) {
      issues.push({
        code: 'exaggerated-claim',
        message: 'Content may contain exaggerated or unsupported claims.',
        severity: 'medium'
      })
    }
  }

  for (const pattern of FABRICATED_TRACTION) {
    if (pattern.test(content)) {
      issues.push({
        code: 'fabricated-traction',
        message: 'Content may contain fabricated traction or customer claims.',
        severity: 'high'
      })
    }
  }

  for (const pattern of LEGAL_ADVICE) {
    if (pattern.test(content)) {
      issues.push({
        code: 'legal-advice-risk',
        message: 'Content may read as legal advice rather than operational guidance.',
        severity: 'medium'
      })
    }
  }

  for (const pattern of UNSUPPORTED_LIVE) {
    if (pattern.test(content)) {
      issues.push({
        code: 'unsupported-live-data',
        message: 'Content may claim live metrics without verified data basis.',
        severity: 'medium'
      })
    }
  }

  for (const pattern of INVENTED_METRICS) {
    if (pattern.test(content)) {
      issues.push({
        code: 'invented-metric',
        message: 'Content may invent revenue, user counts or traction metrics.',
        severity: 'high'
      })
    }
  }

  let redactedContent = content
  redactedContent = redactPatterns(redactedContent, CHILD_IDENTIFIABLE, '[redacted child detail]')
  redactedContent = redactPatterns(redactedContent, STAFF_IDENTIFIABLE, '[redacted staff detail]')
  redactedContent = redactPatterns(redactedContent, PROVIDER_IDENTIFIABLE, 'a provider')
  redactedContent = redactPatterns(redactedContent, SAFEGUARDING_RISK, '[safeguarding detail removed]')

  const hasHigh = issues.some((i) => i.severity === 'high')
  const requiresReview = issues.length > 0

  return {
    safe: !hasHigh,
    issues,
    redactedContent,
    requiresReview
  }
}
