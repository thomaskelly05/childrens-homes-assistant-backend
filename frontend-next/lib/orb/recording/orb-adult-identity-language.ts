/**
 * Adult identity, heading discipline and live-output wording rules for ORB Residential records.
 * Backend mirror: `assistant/knowledge/adult_identity_language.py`
 */

export const ORB_ADULT_IDENTITY_PRINCIPLE =
  "Do not default to 'staff' in child records. Where adult initials are supplied, use Adult [initials]. Where initials are not supplied, use 'the adult' or 'adults'. Do not invent initials."

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
  "Use 'appeared more settled' rather than 'was relaxed' or 'seemed relaxed'.",
  'Do not state internal emotion as fact unless the child said it.',
  "Preserve direct quotes with 'said'.",
  "Use 'appeared', 'was observed', 'not yet known' for presentation."
] as const

const ADULT_INITIALS_RE = /\bAdult\s+([A-Z]{1,3})\b/g

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

export function applyAdultIdentityLanguage(text: string, suppliedInitials?: string[]): string {
  const value = String(text || '')
  if (!value.trim()) return value
  const initials = suppliedInitials ?? extractSuppliedAdultInitials(value)
  if (initials.length) {
    return value.replace(/\bStaff\b/g, `Adult ${initials[0]}`)
  }
  return value.replace(/\bStaff\b/g, 'The adult')
}

export function sanitizeObservationInterpretationLanguage(text: string): string {
  return String(text || '')
    .replace(/\bmood improved\b/gi, 'appeared calmer')
    .replace(/\bseemed relaxed\b/gi, 'appeared more settled')
    .replace(/\bwas relaxed\b/gi, 'appeared more settled')
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
