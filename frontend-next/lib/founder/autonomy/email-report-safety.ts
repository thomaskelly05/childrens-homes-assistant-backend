/**
 * Email report safeguarding — distinguishes synthetic founder content from identifiable records.
 * Sections may be redacted; the whole report is blocked only when safe redaction is not possible.
 */

export type EmailSafetyStatus = 'passed' | 'redacted' | 'blocked'

export type SectionSafetyResult = {
  sectionKey: string
  status: EmailSafetyStatus
  reason?: string
  technicalDetail?: string
}

export type EmailReportSafetyOutcome = {
  status: EmailSafetyStatus
  sections: SectionSafetyResult[]
  redactionCount: number
  sanitizedSections: Record<string, string[]>
  blockedReason?: string
  technicalMessage?: string
  noRealChildDataConfirmed: boolean
}

/** Lines that are explicit safeguarding disclaimers — never flag these. */
const SAFE_DISCLAIMER_PATTERNS = [
  /^synthetic evidence only/i,
  /^no real child data/i,
  /^orb supports adults/i,
  /confirmed:\s*no real child data/i
]

/** Content explicitly marked as synthetic evaluation material. */
const SYNTHETIC_MARKERS = [
  /\bsynthetic\b/i,
  /\bsyn-[a-z0-9_-]+\b/i,
  /\bscenario[-_]?pack[-_]?[a-z0-9]+\b/i,
  /\binternal[- ]brain\b/i,
  /\bevaluation[- ]run\b/i,
  /\bfictional\b/i,
  /\btest pack\b/i,
  /\bquality lab\b/i
]

/** High-level aggregates that are always permitted. */
const ALLOWED_AGGREGATE_PATTERNS = [
  /^\d+\s*%?\s*pass/i,
  /^\d+\s*critical/i,
  /^\d+\s*scenario/i,
  /^•\s*\[/,
  /^monthly burn/i,
  /^mrr/i,
  /^runway:/i,
  /^pipeline/i,
  /^demo requests:/i,
  /^no items awaiting tom approval/i,
  /^tom approval required:/i,
  /^review:\s*\/founder\//i,
  /^est\.\s*cost:/i
]

/** Critical identifiable data — blocks section or entire report. */
const CRITICAL_BLOCK_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(?:dob|date of birth)\s*[:\-]\s*\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b/i, label: 'date_of_birth' },
  { pattern: /\bnhs\s*(?:number|no\.?)?\s*[:\-]?\s*\d{3}\s?\d{3}\s?\d{4}\b/i, label: 'nhs_number' },
  { pattern: /\b0\d{10,11}\b/, label: 'phone_number' },
  { pattern: /\b\+44\s?\d{10,11}\b/, label: 'phone_number' },
  {
    pattern: /\b\d{1,4}\s+[A-Za-z]+(?:\s+[A-Za-z]+){1,3}\s+(?:street|road|lane|avenue|close|drive|way)\b/i,
    label: 'street_address'
  },
  {
    pattern: /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/,
    label: 'uk_postcode'
  },
  { pattern: /\bcase\s+note[s]?\s*[:\-]/i, label: 'case_notes' },
  { pattern: /\buploaded\s+(?:document|file)\s*[:\-]/i, label: 'uploaded_document' }
]

/** Sensitive free-text patterns — redact section unless clearly synthetic. */
const SECTION_REDACT_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bchild(?:ren)?'?s?\s+name\s*[:\-]\s*[A-Z][a-z]+/i, label: 'child_name_field' },
  { pattern: /\byoung\s+person\s+named\s+[A-Z][a-z]+/i, label: 'young_person_named' },
  { pattern: /\bsocial\s+worker\s+[A-Z][a-z]+\s+[A-Z][a-z]+/i, label: 'social_worker_name' },
  { pattern: /\bstaff\s+name\s*[:\-]\s*[A-Z]/i, label: 'staff_name_field' },
  { pattern: /\bprovider[- ]specific\s+confidential/i, label: 'provider_confidential' },
  { pattern: /\bidentifiable\s+young\s+person\s+record/i, label: 'identifiable_record' }
]

const SECTION_REDACTION_SUMMARY =
  'Section redacted: scenario detail contained possible identifiable text. Summary retained. No real child data included.'

const BLOCKED_REPORT_SUMMARY =
  'Safety checker blocked report: critical identifiable data detected in multiple sections. No email sent.'

function isDisclaimerLine(line: string): boolean {
  const trimmed = line.trim()
  return SAFE_DISCLAIMER_PATTERNS.some((p) => p.test(trimmed))
}

function isClearlySynthetic(text: string): boolean {
  return SYNTHETIC_MARKERS.some((p) => p.test(text))
}

function isAllowedAggregateLine(line: string): boolean {
  const trimmed = line.trim()
  if (!trimmed) return true
  if (isDisclaimerLine(trimmed)) return true
  if (isClearlySynthetic(trimmed)) return true
  if (/\byoung person\b/i.test(trimmed) && !/\bnamed\b/i.test(trimmed)) return true
  return ALLOWED_AGGREGATE_PATTERNS.some((p) => p.test(trimmed))
}

function findCriticalMatch(text: string): string | null {
  for (const { pattern, label } of CRITICAL_BLOCK_PATTERNS) {
    if (pattern.test(text)) return label
  }
  return null
}

function findRedactMatch(text: string): string | null {
  if (isClearlySynthetic(text)) return null
  for (const { pattern, label } of SECTION_REDACT_PATTERNS) {
    if (pattern.test(text)) return label
  }
  return null
}

function scanSection(sectionKey: string, lines: string[]): SectionSafetyResult {
  const content = lines.join('\n')
  if (!content.trim()) {
    return { sectionKey, status: 'passed' }
  }

  const scannableLines = lines.filter((l) => !isDisclaimerLine(l))
  const scannableText = scannableLines.join('\n')

  const critical = findCriticalMatch(scannableText)
  if (critical) {
    return {
      sectionKey,
      status: 'blocked',
      reason: 'Critical identifiable data detected.',
      technicalDetail: `Safety check flagged section: ${sectionKey}.${critical}`
    }
  }

  if (scannableLines.every(isAllowedAggregateLine)) {
    return { sectionKey, status: 'passed' }
  }

  const redact = findRedactMatch(scannableText)
  if (redact) {
    return {
      sectionKey,
      status: 'redacted',
      reason: 'Possible identifiable text in section detail.',
      technicalDetail: `Safety check flagged section: ${sectionKey}.${redact}`
    }
  }

  const hasSuspiciousFreeText = scannableLines.some((line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('•') || trimmed.startsWith('-')) return false
    if (isAllowedAggregateLine(trimmed)) return false
    return trimmed.length > 120 && /[A-Z][a-z]+\s+[A-Z][a-z]+/.test(trimmed)
  })

  if (hasSuspiciousFreeText) {
    return {
      sectionKey,
      status: 'redacted',
      reason: 'Free-text record content replaced with safe summary.',
      technicalDetail: `Safety check flagged section: ${sectionKey}.free_text_record`
    }
  }

  return { sectionKey, status: 'passed' }
}

function buildSectionSummary(sectionKey: string, originalLines: string[]): string[] {
  const nonEmpty = originalLines.filter((l) => l.trim())
  if (nonEmpty.length === 0) return ['No data for this section.']

  const counts = nonEmpty.filter((l) => /^\d|^[•\-]/.test(l.trim()))
  if (counts.length > 0) {
    return [`${sectionKey.replace(/([A-Z])/g, ' $1').trim()}: ${counts.length} item(s) summarised. High-level metrics retained.`]
  }

  return [`${sectionKey.replace(/([A-Z])/g, ' $1').trim()}: content summarised at high level only.`]
}

export function sanitizeEmailReportSections(
  sections: Record<string, string[]>
): EmailReportSafetyOutcome {
  const sectionResults: SectionSafetyResult[] = []
  const sanitizedSections: Record<string, string[]> = {}
  let redactionCount = 0
  let blockedCount = 0

  for (const [key, lines] of Object.entries(sections)) {
    const result = scanSection(key, lines)
    sectionResults.push(result)

    if (result.status === 'blocked') {
      blockedCount += 1
      sanitizedSections[key] = [SECTION_REDACTION_SUMMARY]
      redactionCount += 1
    } else if (result.status === 'redacted') {
      redactionCount += 1
      sanitizedSections[key] = [SECTION_REDACTION_SUMMARY, ...buildSectionSummary(key, lines)]
    } else {
      sanitizedSections[key] = lines
    }
  }

  const blockedResults = sectionResults.filter((s) => s.status === 'blocked')
  const firstBlocked = blockedResults[0]

  if (blockedCount >= 2 || (blockedCount === 1 && redactionCount > 2)) {
    return {
      status: 'blocked',
      sections: sectionResults,
      redactionCount,
      sanitizedSections,
      blockedReason: BLOCKED_REPORT_SUMMARY,
      technicalMessage: firstBlocked?.technicalDetail ?? 'Multiple sections contain critical identifiable data.',
      noRealChildDataConfirmed: false
    }
  }

  if (redactionCount > 0) {
    return {
      status: 'redacted',
      sections: sectionResults,
      redactionCount,
      sanitizedSections,
      technicalMessage: sectionResults
        .filter((s) => s.status === 'redacted' || s.status === 'blocked')
        .map((s) => s.technicalDetail)
        .filter(Boolean)
        .join('; '),
      noRealChildDataConfirmed: true
    }
  }

  return {
    status: 'passed',
    sections: sectionResults,
    redactionCount: 0,
    sanitizedSections,
    noRealChildDataConfirmed: true
  }
}

/** @internal test helper — scan raw text for legacy compatibility checks */
export function containsRealChildData(text: string): boolean {
  const scannable = text
    .split('\n')
    .filter((l) => !isDisclaimerLine(l))
    .join('\n')

  if (findCriticalMatch(scannable)) return true

  if (isClearlySynthetic(scannable)) return false

  const redact = findRedactMatch(scannable)
  return redact !== null
}
