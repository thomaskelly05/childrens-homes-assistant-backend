/**
 * Adult identity, heading discipline and live-output wording rules for ORB Residential records.
 * Backend mirror: `assistant/knowledge/adult_identity_language.py`
 */

export const ORB_ADULT_IDENTITY_PRINCIPLE =
  "Do not default to 'staff' in child records. Where adult initials are supplied, use Adult [initials] consistently throughout — do not revert to 'staff' later. Where initials are not supplied, use 'the adult' or 'adults'. Do not invent initials. Do not use 'Staff on Duty' — use 'Adults involved' when needed."

export const ORB_CHILDRENS_HOME_SAFEGUARDING_TERMINOLOGY =
  "Use children's home safeguarding language, not education-sector DSL defaults. Prefer manager, responsible manager, senior on shift, Registered Manager, local safeguarding procedure. Use DSL only when the user explicitly included DSL in their input."

export const ORB_DAILY_RECORD_PROPORTIONALITY =
  "For ordinary daily records without safeguarding cues, do not add Safeguarding Note, automatic manager escalation, or disproportionate safeguarding paragraphs."

export const ORB_DAILY_RECORD_OUTPUT_DISCIPLINE =
  "Daily records should be clean and record-like — avoid unnecessary Safeguarding Note, Child Voice, Next Steps or self-commentary unless asked."

export const ORB_SELF_COMMENTARY_PRINCIPLE =
  'When creating a record, provide the record itself. Do not add a self-assessment or explanation after the record unless the user explicitly asks.'

export const ORB_RECORD_HEADING_DISCIPLINE =
  "Match headings to the record type requested. Daily records use Daily Record, Presentation and Support, Child's Voice / Presentation, Adult Response, and Outcome / Handover — not Incident Summary unless an incident record was requested."

export const ORB_DAILY_RECORD_HEADINGS = [
  'Daily Record',
  'Presentation and Support',
  "Child's Voice / Presentation",
  'Adult Response',
  'Outcome / Handover'
] as const

export const ORB_INCIDENT_RECORD_HEADINGS = [
  'Incident Reflection',
  'Brief summary',
  'What was observed',
  'Adult response and de-escalation',
  'Outcome / follow-up'
] as const

export const ORB_THERAPEUTIC_RELATIONAL_PHRASES = [
  'gave Child A space',
  'did not place pressure on Child A to speak',
  'checked in gently',
  'remained nearby',
  'offered reassurance',
  'acknowledged what Child A shared',
  "supported Child A's sense of safety and choice",
  'appeared calmer',
  'this was handed over',
  'if Child A wishes to talk'
] as const

export const ORB_OBSERVATION_INTERPRETATION_RULES = [
  "Use 'appeared calmer' rather than 'mood improved' unless the input states mood improved.",
  "Use 'appeared calmer' rather than 'seemed more relaxed'.",
  "Use 'appeared more settled' rather than 'was relaxed' or 'seemed relaxed'.",
  'Do not state internal emotion as fact unless the child said it.',
  "Preserve direct quotes with 'said'.",
  "Use 'appeared', 'was observed', 'not yet known' for presentation."
] as const

const ADULT_INITIALS_RE = /\bAdult\s+([A-Z]{1,3})\b/g
const STAFF_ON_DUTY_RE = /\bStaff\s+on\s+Duty\b/gi
const DSL_USER_PROVIDED_RE = /\b(?:DSL|Designated\s+Safeguarding\s+Lead)\b/i

const SAFEGUARDING_CUE_RE =
  /\b(?:disclos\w*|allegat\w*|missing\s+from\s+care|went\s+missing|exploit\w*|self[\s-]?harm|suicid\w*|unexplained\s+injur\w*|bruise|abuse|unsafe|inappropriat\w*|sexualis\w*|weapon|peer[\s-]?on[\s-]?peer|substance|immediate\s+risk|historic\s+harm|safeguarding\s+concern|lado|mash|police\s+called|999)\b/i

export function extractSuppliedAdultInitials(text: string): string[] {
  const seen = new Set<string>()
  const initials: string[] = []
  for (const match of String(text || '').matchAll(ADULT_INITIALS_RE)) {
    const value = match[1]?.toUpperCase()
    if (value && !seen.has(value)) {
      seen.add(value)
      initials.push(value)
    }
  }
  return initials
}

export function userProvidedDslTerm(text: string): boolean {
  return DSL_USER_PROVIDED_RE.test(String(text || ''))
}

export function hasSafeguardingCue(text: string): boolean {
  return SAFEGUARDING_CUE_RE.test(String(text || ''))
}

export function sanitizeChildrensHomeTerminology(text: string, sourceText = ''): string {
  if (userProvidedDslTerm(sourceText)) return String(text || '')
  return String(text || '')
    .replace(/\bManager\s*\/\s*DSL\b/gi, 'manager')
    .replace(/\bDSL\s*\/\s*manager\b/gi, 'manager')
    .replace(/\bDSL\s+and\s+manager\b/gi, 'manager')
    .replace(/\bmanager\s+and\s+DSL\b/gi, 'manager')
    .replace(/\bDSL\s+pathway\b/gi, 'local safeguarding procedure')
    .replace(/\bpathway\s+to\s+DSL\b/gi, 'local safeguarding procedure')
    .replace(/\bDesignated\s+Safeguarding\s+Lead\b/gi, 'responsible manager')
    .replace(/\bDSL\b/g, 'manager')
}

export function applyAdultIdentityLanguage(text: string, suppliedInitials?: string[]): string {
  let value = String(text || '')
  if (!value.trim()) return value
  const initials = suppliedInitials ?? extractSuppliedAdultInitials(value)
  value = value.replace(STAFF_ON_DUTY_RE, () =>
    initials.length ? `Adults involved: ${initials.map((i) => `Adult ${i}`).join(', ')}` : 'Adults involved'
  )
  if (initials.length) {
    let staffIndex = 0
    return value.replace(/\b[Ss]taff\b/g, () => {
      const label = `Adult ${initials[staffIndex % initials.length]}`
      staffIndex += 1
      return label
    })
  }
  return value.replace(/\b[Ss]taff\b/g, 'The adult')
}

export function sanitizeObservationInterpretationLanguage(text: string): string {
  return String(text || '')
    .replace(/\bmood improved\b/gi, 'appeared calmer')
    .replace(/\bseemed more relaxed\b/gi, 'appeared calmer')
    .replace(/\bseemed relaxed\b/gi, 'appeared more settled')
    .replace(/\bwas relaxed\b/gi, 'appeared more settled')
}

export function sanitizeLiveRecordOutput(text: string, sourceText = ''): string {
  const initials = extractSuppliedAdultInitials(sourceText)
  let cleaned = sanitizeObservationInterpretationLanguage(text)
  cleaned = sanitizeChildrensHomeTerminology(cleaned, sourceText)
  if (isDailyRecordRequest(sourceText) && !hasSafeguardingCue(sourceText)) {
    cleaned = cleaned
      .replace(/^#+\s*Safeguarding\s+Note\s*$/gim, '')
      .replace(/^#+\s*Child\s+Voice\s*$/gim, '')
      .replace(/^#+\s*Next\s+Steps\s*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  }
  if (initials.length || /\b[Ss]taff\b/.test(cleaned)) {
    cleaned = applyAdultIdentityLanguage(cleaned, initials)
  }
  return cleaned
}

export function isDailyRecordRequest(text: string): boolean {
  const value = String(text || '')
  const lowered = value.toLowerCase()
  if (/\b(?:create|write|draft|turn|make)\b.{0,40}\b(?:a\s+)?daily\s+record\b/i.test(value)) return true
  return (
    lowered.includes('daily record') &&
    ['create', 'write', 'draft', 'from the following', 'rough notes'].some((needle) => lowered.includes(needle))
  )
}

export function isIncidentRecordRequest(text: string): boolean {
  return /\b(?:incident\s+(?:record|report|reflection|summary)|behaviour\s+incident|record\s+an?\s+incident)\b/i.test(
    String(text || '')
  )
}

const SELF_COMMENTARY_PATTERNS = [
  /\bthis record (?:maintains|uses|demonstrates|reflects) (?:a )?(?:factual|child-centred|therapeutic)/i,
  /\bthe (?:above )?record is (?:factual|child-centred|therapeutic|professional)\b/i,
  /\bthis (?:draft )?(?:is|remains) (?:factual|child-centred|therapeutic)\b/i
]

export function isSelfCommentaryParagraph(text: string): boolean {
  const value = String(text || '').trim()
  if (!value) return false
  return SELF_COMMENTARY_PATTERNS.some((pattern) => pattern.test(value))
}

export function buildAdultIdentityPromptBlock(): string {
  return [
    'Adult identity language:',
    `• ${ORB_ADULT_IDENTITY_PRINCIPLE}`,
    '• Adult TK gave Child A space and did not place pressure on them to speak before they were ready.',
    '• Adult JS checked in later in a calm and gentle way.',
    '• Adults continued to offer reassurance.',
    '• The adult handed over to the next shift.',
    '',
    "Children's home safeguarding terminology:",
    `• ${ORB_CHILDRENS_HOME_SAFEGUARDING_TERMINOLOGY}`,
    '',
    'Daily record proportionality:',
    `• ${ORB_DAILY_RECORD_PROPORTIONALITY}`,
    '',
    'Daily record output discipline:',
    `• ${ORB_DAILY_RECORD_OUTPUT_DISCIPLINE}`,
    '',
    'Record heading discipline:',
    `• ${ORB_RECORD_HEADING_DISCIPLINE}`,
    '',
    'Self-commentary:',
    `• ${ORB_SELF_COMMENTARY_PRINCIPLE}`,
    '',
    'Observation vs interpretation:',
    ...ORB_OBSERVATION_INTERPRETATION_RULES.map((rule) => `• ${rule}`)
  ].join('\n')
}
