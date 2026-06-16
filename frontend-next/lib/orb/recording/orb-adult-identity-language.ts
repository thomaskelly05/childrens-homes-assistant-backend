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
  "Describe adult actions without claiming internal emotional impact unless the child said it or it was directly observed. Do not write that an adult's approach made the child feel safe, supported, reassured or regulated unless the child directly said this. Do not write 'feel safe and comfortable' or 'felt supported' unless supported by input — describe what the adult did and what was observed instead."

export const ORB_OUTCOME_INTERPRETATION_DISCIPLINE =
  "Keep observed outcomes observed. Do not add 'indicating a positive shift in mood' or 'showing emotional regulation' — use observed presentation such as 'appeared calmer'."

export const ORB_SENTENCE_PUNCTUATION_DISCIPLINE =
  'Use complete sentences in records. Do not join separate record sentences together without punctuation.'

export const ORB_INTERPRETIVE_FEELINGS_DISCIPLINE =
  "Do not use 'In response to Child A's feelings' unless the child directly stated a feeling. Prefer 'In response,' followed by the adult action."

export const ORB_TIMELINE_DISCIPLINE =
  "Do not add 'as the evening progressed' or similar timeline wording unless the user provided that chronology. Prefer timing from input such as 'before bedtime'."

export const ORB_TRAILING_MARKDOWN_DISCIPLINE =
  'Do not end record outputs with markdown separator lines such as em dashes (—), underscores (___) or asterisks (***) unless requested.'

export const ORB_DUPLICATE_HEADING_DISCIPLINE =
  'Do not duplicate Outcome and Outcome / Handover headings in simple daily records. Do not add separate Follow-up or Next Steps when handover already states the next action.'

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
  "Use 'appeared calmer' rather than 'seemed more relaxed', 'seemed relaxed' or 'seemed more settled'.",
  "Prefer 'appeared calmer before bedtime' where the input states this timing.",
  "Do not add 'indicating a positive shift in mood' or 'showing emotional regulation' after observed presentation.",
  'Do not state internal emotion as fact unless the child said it.',
  "Preserve direct quotes with 'said'.",
  "Use 'appeared', 'was observed', 'not yet known' for presentation.",
  'Use complete sentences — do not join record sentences without punctuation.'
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
  /\b(?:this approach|the approach) allowed\b[^.!?]*\b(?:feel|felt)\s+(?:safe|comfortable|supported|reassured|calm|secure)\b[^.!?]*[.!?]/gi,
  /\b(?:allowing|enabled|helped|this (?:allowed|helped|enabled))\s+[^.!?]*\b(?:feel|felt)\s+(?:safe|comfortable|supported|reassured|calm|secure)\b[^.!?]*[.!?]/gi,
  /\b(?:helping|allowing|enabling)\s+[^.!?]*\b(?:feel|felt)\s+(?:safe|comfortable|supported|reassured|calm|secure)\b[^.!?]*[.!?]/gi,
  /\b(?:made|making)\s+[^.!?]*\b(?:feel|felt)\s+(?:safe|comfortable|supported|reassured|calm|secure)\b[^.!?]*[.!?]/gi,
  /\b(?:Child|Young person|The child)\s+[A-Z]?\s*(?:felt|feel)\s+(?:safe|comfortable|supported|reassured|calm|secure|better)\b[^.!?]*[.!?]/gi,
  /\b(?:helped|supporting|supported)\s+[^.!?]*\b(?:regulate|regulation)\b[^.!?]*[.!?]/gi,
  /\b(?:allowed|enabling)\s+[^.!?]*\bto\s+regulate\b[^.!?]*[.!?]/gi,
  /\bhelped them regulate emotionally\b[^.!?]*[.!?]/gi,
  /\b(?:was|were)\s+emotionally\s+settled\b[^.!?]*[.!?]/gi,
  /\bfeel safe and comfortable\b/gi
]

const EMOTIONAL_IMPACT_CLAUSE_RE =
  /,?\s*(?:(?:this|the)\s+approach\s+)?(?:allowing|helping|enabling|which\s+(?:helped|allowed))\s+[^.!?]*\b(?:to\s+)?(?:feel|felt)\s+(?:safe|comfortable|supported|reassured|calm|secure)\b[^.!?]*/gi

const CHILD_STATED_FEELING_RE =
  /\b(?:said|shared|told|communicated|explained|mentioned)\b[^.!?]*(?:["'][^"']*(?:feel|felt)\s+(?:safe|comfortable|supported|reassured|calm|secure|better)[^"']*["']|(?:they|he|she)\s+(?:feel|felt)\s+(?:safe|comfortable|supported|reassured|calm|secure|better))/i

const OUTCOME_INTERPRETATION_CLAUSE_RES = [
  /,?\s*(?:indicating|suggesting|showing|demonstrating)\s+(?:a\s+)?(?:positive\s+)?shift\s+in\s+mood\b[^.!?]*/gi,
  /,?\s*(?:indicating|suggesting)\s+(?:their\s+)?mood\s+(?:had\s+)?improved\b[^.!?]*/gi,
  /,?\s*(?:suggesting|indicating)\s+(?:they\s+)?(?:were\s+)?(?:more\s+)?settled\s+emotionally\b[^.!?]*/gi,
  /,?\s*(?:showing|demonstrating|indicating)\s+emotional\s+regulation\b[^.!?]*/gi,
  /,?\s*(?:indicating|suggesting)\s+(?:they\s+)?felt\s+better\b[^.!?]*/gi,
  /,?\s*(?:showing|indicating)\s+(?:they\s+)?(?:were|felt)\s+(?:more\s+)?comfortable\b[^.!?]*/gi,
  /\bthis\s+(?:showed|demonstrated|indicated)\s+emotional\s+regulation\b[^.!?]*[.!?]/gi
]

const OUTCOME_INTERPRETATION_SENTENCE_RES = [
  /^[^.!?]*\b(?:indicating|suggesting|showing|demonstrating)\s+emotional\s+regulation\b[^.!?]*[.!?]$/i
]

const OUTCOME_ONLY_HEADING_RE = /^(?:#+\s+)?Outcome\s*:?\s*$/i
const OUTCOME_HANDOVER_HEADING_RE = /^(?:#+\s+)?Outcome\s*\/\s*Handover\s*:?\s*$/i
const REDUNDANT_FOLLOW_UP_HEADING_RE = /^(?:#+\s+)?(?:Follow-up(?:\s+for\s+next\s+shift)?|Next\s+Steps)\s*:?\s*$/i

const EMOTION_LABELS_REQUIRING_SOURCE = [
  'frustration',
  'frustrated',
  'dissatisfaction',
  'dissatisfied',
  'feel safe and comfortable',
  'feel supported',
  'felt supported',
  'felt reassured',
  'felt safe',
  'felt comfortable',
  'helped regulate',
  'helped child regulate',
  'allowed to feel',
  'made feel',
  'emotionally settled'
]

const OUTCOME_INTERPRETATION_LABELS = ['positive shift in mood', 'emotional regulation']

const FOLLOW_UP_HEADING_RE = /^#+\s*(?:Follow-up(?:\s+for\s+next\s+shift)?|Next\s+Steps)\s*$/gim
const HANDOVER_PRESENT_RE = /\b(?:hand(?:ed|over)|outcome\s*\/\s*handover|next\s+(?:shift|adults?|team))\b/i

const UNSUPPORTED_TIMELINE_PHRASES = [
  'as the evening progressed',
  'over the evening',
  'throughout the evening',
  'later in the evening'
] as const

const INTERPRETIVE_FEELINGS_RES: Array<{ label: string; pattern: RegExp }> = [
  {
    label: "in response to child a's feelings",
    pattern: /\bIn response to (?:Child|Young person|The child)\s+[A-Z]'s feelings,?\s*/gi
  },
  {
    label: "in response to child a's emotions",
    pattern: /\bIn response to (?:Child|Young person|The child)\s+[A-Z]'s emotions,?\s*/gi
  },
  {
    label: "in response to child a's emotional state",
    pattern: /\bIn response to (?:Child|Young person|The child)\s+[A-Z]'s emotional state,?\s*/gi
  },
  {
    label: "responding to child a's frustration",
    pattern: /\b[Rr]esponding to (?:Child|Young person|The child)\s+[A-Z]'s frustration,?\s*/g
  },
  {
    label: "responding to child a's dissatisfaction",
    pattern: /\b[Rr]esponding to (?:Child|Young person|The child)\s+[A-Z]'s dissatisfaction,?\s*/gi
  }
]

const ADULT_LABEL_BOUNDARY_RE = /(?<=[a-z\d"\)])(?<![A-Z])\s+(Adult\s+[A-Z]{1,3})\b/g
const QUOTE_ADULT_BOUNDARY_RE =
  /((?:said|shared|stated|communicated),?\s*["'][^"']*["'])\s+(Adult\s+[A-Z]{1,3}\b)/gi
const TRANSITION_BOUNDARY_RES = [
  /(?<=[a-z])\s+(Later,)\s*/g,
  /(?<=[a-z])\s+(During this time,)\s*/gi
]
const TRAILING_MD_ARTIFACTS_RE = /(?:[\n\r\s]*(?:—|___|\*\*\*)\s*)+$/

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

export function sanitizeObservationInterpretationLanguage(text: string, sourceText = ''): string {
  const bedtimeTiming = String(sourceText || '').toLowerCase().includes('before bedtime')
  return String(text || '')
    .replace(/\bmood improved\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
    .replace(/\bmood seemed better\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
    .replace(/\bseemed more relaxed\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
    .replace(/\bseemed relaxed\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
    .replace(/\bwas relaxed\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
    .replace(/\bseemed calmer\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
    .replace(/\bseemed more settled\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
    .replace(/\bappeared more relaxed\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
    .replace(/\bappeared settled emotionally\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
}

function sourceSupportsInterpretiveFeeling(sourceText: string, label: string): boolean {
  return String(sourceText || '').toLowerCase().includes(label.toLowerCase())
}

export function stripInterpretiveFeelingsPhrases(text: string, sourceText = ''): string {
  let result = String(text || '')
  for (const { label, pattern } of INTERPRETIVE_FEELINGS_RES) {
    if (sourceSupportsInterpretiveFeeling(sourceText, label)) continue
    result = result.replace(pattern, 'In response, ')
  }
  return result.replace(/\bIn response,\s*,/gi, 'In response,').replace(/\bIn response,\s*$/i, 'In response')
}

export function stripUnsupportedTimelineExpansion(text: string, sourceText = ''): string {
  let result = String(text || '')
  const sourceLower = String(sourceText || '').toLowerCase()
  for (const phrase of UNSUPPORTED_TIMELINE_PHRASES) {
    if (sourceLower.includes(phrase)) continue
    result = result.replace(new RegExp(`,?\\s*${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi'), '')
  }
  return result
    .split('\n')
    .map((line) => line.replace(/  +/g, ' ').trim())
    .join('\n')
    .trim()
}

function repairSentenceBoundariesInLine(line: string): string {
  let result = String(line || '')
  result = result.replace(QUOTE_ADULT_BOUNDARY_RE, '$1. $2')
  result = result.replace(ADULT_LABEL_BOUNDARY_RE, '. $1')
  for (const pattern of TRANSITION_BOUNDARY_RES) {
    result = result.replace(pattern, '. $1 ')
  }
  result = result.replace(/\bwatched TV\b/gi, 'watched television')
  result = result.replace(/\.{2,}/g, '.')
  return result.trim()
}

export function repairRecordSentenceBoundaries(text: string): string {
  if (!String(text || '').trim()) return String(text || '')
  return String(text)
    .split('\n')
    .map((line) => {
      const stripped = line.trim()
      if (!stripped || stripped.startsWith('#') || /^[A-Za-z][^:]{0,40}:\s*$/.test(stripped)) return line
      return repairSentenceBoundariesInLine(stripped)
    })
    .join('\n')
    .trim()
}

export function stripTrailingMarkdownArtefacts(text: string, sourceText = ''): string {
  let result = String(text || '').replace(/\s+$/, '')
  const source = String(sourceText || '').replace(/\s+$/, '')
  const userProvidedTrailingRule = ['—', '___', '***'].some((artifact) => source.endsWith(artifact))
  if (userProvidedTrailingRule) return result
  for (const artifact of ['—', '___', '***']) {
    if (result.endsWith(artifact)) {
      result = result.replace(new RegExp(`[\\n\\r\\s]*${artifact.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), '')
    }
  }
  return result.replace(TRAILING_MD_ARTIFACTS_RE, '').replace(/\s+$/, '')
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

function sentenceContainsChildStatedFeeling(sentence: string): boolean {
  return CHILD_STATED_FEELING_RE.test(String(sentence || ''))
}

function trimEmotionalImpactClauses(sentence: string): string {
  return String(sentence || '')
    .replace(EMOTIONAL_IMPACT_CLAUSE_RE, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[ ,;.]+$/, '')
}

function contentSimilarity(a: string, b: string): boolean {
  const normA = String(a || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  const normB = String(b || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  if (!normA || !normB) return false
  if (normA === normB) return true
  const shorter = normA.length <= normB.length ? normA : normB
  const longer = normA.length <= normB.length ? normB : normA
  return shorter.length >= 24 && longer.includes(shorter)
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
      .flatMap((sentence) => {
        if (sentenceContainsChildStatedFeeling(sentence)) return [sentence]
        const unsupportedEmotion = EMOTION_LABELS_REQUIRING_SOURCE.some(
          (label) =>
            sentence.toLowerCase().includes(label.toLowerCase()) &&
            !sourceSupportsEmotionLabel(sourceText, label)
        )
        const trimmed = trimEmotionalImpactClauses(sentence)
        if (unsupportedEmotion) {
          if (
            trimmed &&
            !EMOTION_LABELS_REQUIRING_SOURCE.some(
              (label) =>
                trimmed.toLowerCase().includes(label.toLowerCase()) &&
                !sourceSupportsEmotionLabel(sourceText, label)
            )
          ) {
            return [trimmed]
          }
          if (
            trimmed &&
            OUTCOME_INTERPRETATION_LABELS.some((label) => trimmed.toLowerCase().includes(label))
          ) {
            return [trimmed]
          }
          return []
        }
        return trimmed ? [trimmed] : []
      })
    if (kept.length) cleaned.push(kept.join(' '))
  }
  return cleaned.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function stripOutcomeInterpretation(text: string, sourceText = ''): string {
  if (hasSafeguardingCue(sourceText) && !isDailyRecordRequest(sourceText)) return String(text || '')
  let result = String(text || '')
  for (const pattern of OUTCOME_INTERPRETATION_SENTENCE_RES) {
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
      .map((sentence) => {
        let cleanedSentence = sentence
        for (const pattern of OUTCOME_INTERPRETATION_CLAUSE_RES) {
          cleanedSentence = cleanedSentence.replace(pattern, '')
        }
        return cleanedSentence.replace(/\s{2,}/g, ' ').trim().replace(/[ ,;.]+$/, '')
      })
      .filter(Boolean)
    if (kept.length) cleaned.push(kept.join(' '))
  }
  return cleaned.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function normalizeDuplicateDailyRecordHeadings(text: string, sourceText = ''): string {
  if (hasSafeguardingCue(sourceText) || !isDailyRecordRequest(sourceText)) return String(text || '')
  const lines = String(text || '').split('\n')
  const sections: Array<{ heading: string; body: string[] }> = []
  let currentHeading = ''
  let currentBody: string[] = []
  for (const line of lines) {
    const stripped = line.trim()
    const isHeading =
      /^#+\s+\S/.test(stripped) ||
      (!!stripped &&
        !stripped.startsWith('-') &&
        /^(?:Outcome|Follow-up|Next Steps)(?:\s*\/\s*Handover)?\s*:?\s*$/i.test(stripped))
    if (isHeading) {
      if (currentHeading || currentBody.length) sections.push({ heading: currentHeading, body: currentBody })
      currentHeading = stripped
      currentBody = []
      continue
    }
    currentBody.push(line)
  }
  if (currentHeading || currentBody.length) sections.push({ heading: currentHeading, body: currentBody })

  let outcomeIdx: number | null = null
  let handoverIdx: number | null = null
  sections.forEach((section, idx) => {
    if (OUTCOME_ONLY_HEADING_RE.test(section.heading)) outcomeIdx = idx
    if (OUTCOME_HANDOVER_HEADING_RE.test(section.heading)) handoverIdx = idx
  })

  if (outcomeIdx !== null && handoverIdx !== null && outcomeIdx !== handoverIdx) {
    const outcomeBody = sections[outcomeIdx].body.join('\n').trim()
    const handoverBody = sections[handoverIdx].body.join('\n').trim()
    let mergedBody = outcomeBody
    if (handoverBody && !contentSimilarity(outcomeBody, handoverBody)) {
      mergedBody = outcomeBody ? `${outcomeBody}\n\n${handoverBody}` : handoverBody
    } else if (handoverBody) {
      mergedBody = handoverBody || outcomeBody
    }
    let handoverHeading = sections[handoverIdx].heading
    if (!/^#+\s+/.test(handoverHeading.trim())) handoverHeading = '## Outcome / Handover'
    sections[handoverIdx] = { heading: handoverHeading, body: mergedBody.split('\n') }
    sections.splice(outcomeIdx, 1)
  }

  const resolvedHandoverIdx = sections.findIndex((section) => OUTCOME_HANDOVER_HEADING_RE.test(section.heading))
  if (resolvedHandoverIdx >= 0) {
    const handoverBody = sections[resolvedHandoverIdx].body.join('\n').trim()
    const filtered = sections.filter((section) => {
      if (!REDUNDANT_FOLLOW_UP_HEADING_RE.test(section.heading)) return true
      return !contentSimilarity(section.body.join('\n').trim(), handoverBody)
    })
    sections.splice(0, sections.length, ...filtered)
  }

  const outputLines: string[] = []
  for (const section of sections) {
    if (section.heading) outputLines.push(section.heading)
    outputLines.push(...section.body)
    if (section.body.length && section.body[section.body.length - 1]?.trim()) outputLines.push('')
  }
  return outputLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
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
  let cleaned = stripInterpretiveFeelingsPhrases(text, sourceText)
  cleaned = stripChildQuoteInterpretation(cleaned, sourceText)
  cleaned = stripInventedEmotionalImpact(cleaned, sourceText)
  cleaned = stripOutcomeInterpretation(cleaned, sourceText)
  cleaned = stripUnsupportedTimelineExpansion(cleaned, sourceText)
  cleaned = sanitizeObservationInterpretationLanguage(cleaned, sourceText)
  cleaned = sanitizeChildrensHomeTerminology(cleaned, sourceText)
  if (initials.length || /\b[Ss]taff\b/.test(cleaned)) {
    cleaned = applyAdultIdentityLanguage(cleaned, initials)
  }
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
  cleaned = normalizeDuplicateDailyRecordHeadings(cleaned, sourceText)
  if (isRecordGenerationRequest(sourceText) && !userExplicitlyRequestsExplanation(sourceText)) {
    cleaned = stripTrailingSelfCommentary(cleaned, sourceText)
    cleaned = stripTrailingMarkdownArtefacts(cleaned, sourceText)
    cleaned = repairRecordSentenceBoundaries(cleaned)
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
    'Outcome interpretation discipline:',
    `• ${ORB_OUTCOME_INTERPRETATION_DISCIPLINE}`,
    '',
    'Sentence punctuation discipline:',
    `• ${ORB_SENTENCE_PUNCTUATION_DISCIPLINE}`,
    '',
    'Interpretive feelings discipline:',
    `• ${ORB_INTERPRETIVE_FEELINGS_DISCIPLINE}`,
    '',
    'Timeline discipline:',
    `• ${ORB_TIMELINE_DISCIPLINE}`,
    '',
    'Trailing markdown discipline:',
    `• ${ORB_TRAILING_MARKDOWN_DISCIPLINE}`,
    '',
    'Duplicate heading discipline:',
    `• ${ORB_DUPLICATE_HEADING_DISCIPLINE}`,
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
