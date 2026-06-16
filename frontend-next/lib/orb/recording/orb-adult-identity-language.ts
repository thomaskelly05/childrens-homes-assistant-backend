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

export const ORB_RECORD_ONLY_OUTPUT_PRINCIPLE =
  'When the user asks ORB to create a record, return the record only. Do not add commentary before or after the record unless the user explicitly asks why the wording is better.'

export const ORB_CHILD_VOICE_DISCIPLINE =
  "Preserve the child's direct words exactly — do not paraphrase or interpret them as fact. Avoid 'This indicates…' after direct quotes in simple daily records."

export const ORB_EMOTIONAL_IMPACT_DISCIPLINE =
  "Describe adult actions without claiming internal emotional impact unless the child said it or it was directly observed. Do not write 'feel safe and comfortable' or 'felt supported' unless supported by input."

export const ORB_DAILY_RECORD_SIMPLIFICATION =
  'For simple daily records, prefer a short narrative with no more than 2–3 content sections. Do not add Follow-up when Outcome / Handover already states the next action.'

export const ORB_RECORD_HEADING_DISCIPLINE =
  "Match headings to the record type requested. Daily records use Daily Record, Presentation and Support, Adult Response, Outcome / Handover — not Incident Summary unless an incident record was requested."

export const ORB_DAILY_RECORD_HEADINGS = [
  'Daily Record',
  'Presentation and Support',
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

const SELF_COMMENTARY_PATTERNS = [
  /\bthis record (?:maintains|uses|demonstrates|reflects|captures|ensures) (?:a )?(?:factual|child-centred|therapeutic|the child)/i,
  /\bthe (?:above )?record is (?:factual|child-centred|therapeutic|professional|suitable)\b/i,
  /\bthis (?:draft )?(?:is|remains) (?:factual|child-centred|therapeutic|suitable)\b/i,
  /\bthis (?:approach|wording) ensures\b/i,
  /\b(?:in conclusion|overall),?\s+this record\b/i
]

const SELF_COMMENTARY_STARTERS = [
  'this record captures',
  'this record maintains',
  'this record ensures',
  'this approach ensures',
  'this demonstrates',
  'this supports',
  'in conclusion',
  'overall,',
  'this wording',
  'this is suitable because',
  'the record is child-centred because'
]

const CHILD_QUOTE_INTERPRETATION_RE =
  /(["'][\s\S]*?["'])\.?\s+(?:This|That)\s+(?:indicates?|suggests?|shows?|demonstrates?|may indicate|could suggest|reflects?|reveals?)\s+[^.!?]*[.!?]/gi

const INVENTED_EMOTIONAL_IMPACT_RES = [
  /\b(?:allowing|enabled|helped|this (?:allowed|helped|enabled))\s+[^.!?]*\b(?:feel|felt)\s+(?:safe|comfortable|supported|reassured|calm|secure)\b[^.!?]*[.!?]/gi,
  /\b(?:Child|Young person|The child)\s+[A-Z]?\s*(?:felt|feel)\s+(?:safe|comfortable|supported|reassured|calm|secure|better)\b[^.!?]*[.!?]/gi,
  /\b(?:helped|supporting)\s+[^.!?]*\b(?:regulate|regulation)\b[^.!?]*[.!?]/gi,
  /\bfeel safe and comfortable\b/gi
]

const EMOTION_LABELS_REQUIRING_SOURCE = [
  'frustration',
  'frustrated',
  'dissatisfaction',
  'dissatisfied',
  'feel safe and comfortable',
  'felt supported',
  'felt reassured',
  'helped regulate'
]

const FOLLOW_UP_HEADING_RE = /^#+\s*(?:Follow-up(?:\s+for\s+next\s+shift)?|Next\s+Steps)\s*$/gim
const HANDOVER_PRESENT_RE = /\b(?:hand(?:ed|over)|outcome\s*\/\s*handover|next\s+(?:shift|adults?|team))\b/i

const EXPLANATION_REQUEST_RE =
  /\b(?:why\s+is\s+this\b.+?\bwording\s+better|why\s+is\s+this\s+better|explain\s+(?:the\s+)?(?:wording|record)|why\s+did\s+you\s+(?:write|choose))\b/i

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

export function userExplicitlyRequestsExplanation(text: string): boolean {
  return EXPLANATION_REQUEST_RE.test(String(text || ''))
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

function splitParagraphs(text: string): string[] {
  return String(text || '')
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function sourceSupportsEmotionLabel(sourceText: string, label: string): boolean {
  return String(sourceText || '').toLowerCase().includes(label.toLowerCase())
}

export function stripTrailingSelfCommentary(text: string, sourceText = ''): string {
  if (userExplicitlyRequestsExplanation(sourceText)) return String(text || '')
  const paragraphs = splitParagraphs(text)
  while (paragraphs.length) {
    const tail = paragraphs[paragraphs.length - 1]
    const tailLower = tail.toLowerCase().trim()
    if (isSelfCommentaryParagraph(tail) || SELF_COMMENTARY_STARTERS.some((starter) => tailLower.startsWith(starter))) {
      paragraphs.pop()
      continue
    }
    break
  }
  return paragraphs.join('\n\n').trim()
}

export function stripChildQuoteInterpretation(text: string, sourceText = ''): string {
  if (hasSafeguardingCue(sourceText) || userExplicitlyRequestsExplanation(sourceText)) return String(text || '')
  if (!isDailyRecordRequest(sourceText)) return String(text || '')
  return String(text || '')
    .replace(CHILD_QUOTE_INTERPRETATION_RE, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function stripInventedEmotionalImpact(text: string, sourceText = ''): string {
  let result = String(text || '')
  for (const pattern of INVENTED_EMOTIONAL_IMPACT_RES) {
    result = result.replace(pattern, '')
  }
  const paragraphs = result.split(/\n\s*\n/)
  const cleaned: string[] = []
  for (const paragraph of paragraphs) {
    const stripped = paragraph.trim()
    if (!stripped) continue
    if (stripped.startsWith('#')) {
      cleaned.push(stripped)
      continue
    }
    const kept = stripped
      .split(/(?<=[.!?])\s+/)
      .filter((sentence) =>
        EMOTION_LABELS_REQUIRING_SOURCE.every(
          (label) =>
            !sentence.toLowerCase().includes(label.toLowerCase()) ||
            sourceSupportsEmotionLabel(sourceText, label)
        )
      )
    if (kept.length) cleaned.push(kept.join(' '))
  }
  return cleaned.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function stripUnnecessaryFollowUpSection(text: string, sourceText = ''): string {
  if (hasSafeguardingCue(sourceText)) return String(text || '')
  if (!HANDOVER_PRESENT_RE.test(String(text || ''))) return String(text || '')
  const lines = String(text || '').split('\n')
  const output: string[] = []
  let skipUntilHeading = false
  for (const line of lines) {
    if (/^#+\s*(?:Follow-up(?:\s+for\s+next\s+shift)?|Next\s+Steps)\s*$/i.test(line.trim())) {
      skipUntilHeading = true
      continue
    }
    if (skipUntilHeading && /^#+\s+\S/.test(line.trim())) {
      skipUntilHeading = false
    }
    if (!skipUntilHeading) output.push(line)
  }
  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function countContentSections(text: string): number {
  const headings = [...String(text || '').matchAll(/^#+\s+(.+)$/gm)].map((match) => match[1]?.trim() ?? '')
  const mainTitles = new Set(['daily record', 'incident reflection', 'handover note', 'magic notes'])
  return headings.filter(
    (heading) =>
      !mainTitles.has(heading.toLowerCase()) && !heading.toLowerCase().startsWith('daily record')
  ).length
}

export function sanitizeLiveRecordOutput(text: string, sourceText = ''): string {
  const initials = extractSuppliedAdultInitials(sourceText)
  let cleaned = sanitizeObservationInterpretationLanguage(text)
  cleaned = stripChildQuoteInterpretation(cleaned, sourceText)
  cleaned = stripInventedEmotionalImpact(cleaned, sourceText)
  cleaned = sanitizeChildrensHomeTerminology(cleaned, sourceText)
  if (isDailyRecordRequest(sourceText) && !hasSafeguardingCue(sourceText)) {
    cleaned = cleaned
      .replace(/^#+\s*Safeguarding\s+Note\s*$/gim, '')
      .replace(/^#+\s*Child(?:'s|\s)Voice(?:\s*\/\s*Presentation)?\s*$/gim, '')
      .replace(/^#+\s*Next\s+Steps\s*$/gim, '')
      .replace(/^#+\s*Follow-up(?:\s+for\s+next\s+shift)?\s*$/gim, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
    cleaned = stripUnnecessaryFollowUpSection(cleaned, sourceText)
  }
  if (initials.length || /\b[Ss]taff\b/.test(cleaned)) {
    cleaned = applyAdultIdentityLanguage(cleaned, initials)
  }
  if (isRecordGenerationRequest(sourceText) && !userExplicitlyRequestsExplanation(sourceText)) {
    cleaned = stripTrailingSelfCommentary(cleaned, sourceText)
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

export function isRecordGenerationRequest(text: string): boolean {
  const value = String(text || '')
  if (
    /\b(?:create|write|draft|turn|make|convert|generate|produce|help\s+me\s+(?:write|record|create))\b.{0,80}\b(?:daily\s+record|incident\s+(?:record|report|reflection)|handover(?:\s+note)?|magic\s+notes?|behaviour\s+(?:record|reflection)|recording|(?:a\s+)?record)\b/i.test(
      value
    )
  ) {
    return true
  }
  if (/\bmagic\s+notes?\b/i.test(value)) return true
  if (isDailyRecordRequest(value) || isIncidentRecordRequest(value)) return true
  const lowered = value.toLowerCase()
  return (
    lowered.includes('rough notes') &&
    ['create', 'write', 'draft', 'turn', 'convert', 'record'].some((needle) => lowered.includes(needle))
  )
}

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
    'Record-only output:',
    `• ${ORB_RECORD_ONLY_OUTPUT_PRINCIPLE}`,
    '',
    'Child voice discipline:',
    `• ${ORB_CHILD_VOICE_DISCIPLINE}`,
    '',
    'Emotional impact discipline:',
    `• ${ORB_EMOTIONAL_IMPACT_DISCIPLINE}`,
    '',
    'Daily record simplification:',
    `• ${ORB_DAILY_RECORD_SIMPLIFICATION}`,
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

/** Manual regression prompt for live ORB daily-record retest after discipline passes. */
export const ORB_MANUAL_REGRESSION_DAILY_RECORD_PROMPT =
  'Create a daily record. Keep it factual, warm, therapeutic, child-centred and suitable for a children\'s home record.\n\n' +
  'Child A came back quieter after school. Adult TK gave Child A space. Adult JS checked in later. Child A said, "I\'m just annoyed about school." ' +
  'Adult JS offered toast and sat nearby while Child A watched TV. Child A ate the toast and appeared calmer before bedtime. ' +
  'Adult TK handed over that tomorrow\'s adults should check in gently about school if Child A wishes to talk.'
