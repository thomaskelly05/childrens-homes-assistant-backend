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
  "Preserve the child's direct words exactly — do not paraphrase or interpret them as fact. Avoid 'This indicates…' or 'This statement indicated…' after direct quotes in simple daily records. Do not create a separate Child Voice section in simple daily records."

export const ORB_EMOTIONAL_IMPACT_DISCIPLINE =
  "Describe adult actions without claiming internal emotional impact unless the child said it or it was directly observed. Do not write that an adult's approach made the child feel safe, supported, reassured or regulated unless the child directly said this. Do not write 'feel safe and comfortable' or 'felt supported' unless supported by input — describe what the adult did and what was observed instead."

export const ORB_OUTCOME_INTERPRETATION_DISCIPLINE =
  "Keep observed outcomes observed. Do not add 'indicating a positive shift in mood' or 'showing emotional regulation' — use observed presentation such as 'appeared calmer'."

export const ORB_SENTENCE_PUNCTUATION_DISCIPLINE =
  'Use complete sentences in records. Do not join separate record sentences together without punctuation. Do not insert a full stop before Child A when Child A is the object of a verb or preposition (gave Child A, offered Child A, checked in with Child A).'

export const ORB_INTERPRETIVE_FEELINGS_DISCIPLINE =
  "Do not use 'In response to Child A's feelings' unless the child directly stated a feeling. Prefer 'In response,' followed by the adult action."

export const ORB_TIMELINE_DISCIPLINE =
  "Do not add 'as the evening progressed' or similar timeline wording unless the user provided that chronology. Prefer timing from input such as 'before bedtime'."

export const ORB_TRAILING_MARKDOWN_DISCIPLINE =
  'Do not end record outputs with markdown separator lines such as em dashes (—), underscores (___) or asterisks (***) unless requested.'

export const ORB_DUPLICATE_HEADING_DISCIPLINE =
  'Do not duplicate Outcome and Outcome / Handover headings in simple daily records. Do not add separate Follow-up or Next Steps when handover already states the next action.'

export const ORB_REPEATED_OUTCOME_DISCIPLINE =
  "Do not repeat the same observed outcome in multiple sections. If Outcome / Handover already records a timed observation such as 'appeared calmer before bedtime', do not repeat it in Adult Response."

export const ORB_END_OF_RECORD_DISCIPLINE =
  "Do not include '[End of record]', 'END OF RECORD', '<end>' or any end marker in record outputs unless the user explicitly asked to include one."

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
  /(["'][\s\S]*?["'])\.?\s+(?:This|That)\s+(?:statement\s+)?(?:indicates?|indicated|suggests?|suggested|shows?|showed|demonstrates?|demonstrated|may indicate|could suggest|reflects?|reveals?)\s+[^.!?]*[.!?]/gi

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

const BROKEN_CHILD_OBJECT_REPAIRS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\bgave\.\s+Child\s+([A-Z])\b/gi, replacement: 'gave Child $1' },
  { pattern: /\boffered\.\s+Child\s+([A-Z])\b/gi, replacement: 'offered Child $1' },
  { pattern: /\bwith\.\s+Child\s+([A-Z])\b/gi, replacement: 'with Child $1' },
  { pattern: /\bwhile\.\s+Child\s+([A-Z])\b/gi, replacement: 'while Child $1' },
  { pattern: /\bthat\.\s+Child\s+([A-Z])\b/gi, replacement: 'that Child $1' },
  { pattern: /\band\.\s+Child\s+([A-Z])\b/gi, replacement: 'and Child $1' },
  { pattern: /\bsupport\.\s+Child\s+([A-Z])\b/gi, replacement: 'support Child $1' },
  { pattern: /\bto\.\s+Child\s+([A-Z])\b/gi, replacement: 'to Child $1' }
]

const ADULT_LABEL_BOUNDARY_RE = /(?<=[a-z\d"\)])(?<![A-Z])\s+(Adult\s+[A-Z]{1,3})\b/g
const QUOTE_ADULT_BOUNDARY_RE =
  /((?:said|shared|stated|communicated),?\s*["'][^"']*["'])\s+(Adult\s+[A-Z]{1,3}\b)/gi
const TRANSITION_BOUNDARY_RES = [
  /(?<=[a-z])\s+(Later,)\s*/g,
  /(?<=[a-z])\s+(During this time,)\s*/gi
]

const ACCEPTED_TOAST_CHILD_BOUNDARY_RE = /(accepted the toast)\s+(Child\s+[A-Z])\b/gi

const EXPLANATORY_DAILY_RECORD_CLAUSE_RES = [
  /,?\s*(?:This|That)\s+statement\s+indicated\b[^.!?]*[.!?]?/gi,
  /,?\s*(?:This|That)\s+(?:indicates?|indicated|suggests?|suggested)\b[^.!?]*[.!?]?/gi,
  /,?\s*\bprocessing\s+some\s+feelings\b[^.!?]*[.!?]?/gi,
  /,?\s*\bfeelings\s+related\s+to\b[^.!?]*[.!?]?/gi,
  /,?\s*This\s+provided\s+a\s+calm\s+and\s+supportive\s+environment\b[.!?]?/gi,
  /,?\s*This\s+approach\s+aims\b[^.!?]*[.!?]?/gi,
  /,?\s*\bencourage\s+open\s+communication\b[^.!?]?/gi,
  /,?\s*Child\s+[A-Z]'s\s+emotional\s+needs\b[^.!?]*[.!?]?/gi,
  /,?\s*\bto\s+see\s+how\s+they\s+were\s+feeling\b[.!?]?/gi,
  /,?\s*Child\s+[A-Z]\s+was\s*$/gi
]

const ORPHAN_FRAGMENT_CLEANUP_RES = [/\bChild\s+[A-Z]\s+was\s*\.?\s*$/gim, /\bthat\.\s*$/gim]

const EXPLANATORY_INLINE_BOUNDARY_RES = [
  /(watched television)\s+(This)\b/gi,
  /(to talk)\s+(This)\b/gi,
  /(environment)\s+(Child)\b/gi
]
const WATCHED_TV_CHILD_BOUNDARY_RE = /(watched television)\s+(Child\s+[A-Z])\b/gi
const WATCHED_TV_SHORT_CHILD_BOUNDARY_RE = /(watched TV)\s+(Child\s+[A-Z])\b/gi
const ACCEPTED_TOAST_BEFORE_BEDTIME_RE = /(accepted the toast)\s+(Before\s+bedtime)\b/gi
const SECTION_HEADING_INLINE_BOUNDARY_RES = [
  /(?<=[a-z])\s+(Next\s+Steps)\s*:/gi,
  /(?<=[a-z])\s+(Follow-up)\s*:/gi,
  /(?<=[a-z])\s+(Recommendations)\s*:/gi,
  /(?<=[a-z])\s+(Outcome\s*\/\s*Handover)\s*:/gi
]
const TRAILING_MD_ARTIFACTS_RE = /(?:[\n\r\s]*(?:—|___|\*\*\*)\s*)+$/
const TRAILING_HR_ARTIFACTS_RE = /(?:[\n\r\s]*^---+\s*)+$/m
const END_OF_RECORD_ARTEFACT_RES = [
  /\[End of record\]/gi,
  /\[End record\]/gi,
  /\bEnd of record\.?\s*$/gim,
  /\bEND OF RECORD\b/g,
  /[–-]\s*end\s*[–-]/gi,
  /<end>/gi
]
const REDUNDANT_NEXT_STEPS_HEADING_RE =
  /^(?:#+\s+)?(?:Next\s+Steps|Follow-up(?:\s+for\s+next\s+shift)?|Recommendations)\s*:?\s*$/i
const INLINE_REDUNDANT_NEXT_STEPS_RE =
  /^(?:#+\s+)?(?:Next\s+Steps|Follow-up|Recommendations)\s*:\s*(?:-\s*.+)+$/gim
const APPEARED_CALMER_RE = /\bappeared\s+calmer(?:\s+before\s+bedtime)?\b/i
const ADULT_RESPONSE_HEADING_RE = /^(?:#+\s+)?Adult\s+Response\s*:?\s*$/i
const ACTION_PLAN_REQUEST_RE =
  /\b(?:action\s+plan|follow-up\s+action|recommendations?\s+section|include\s+(?:next\s+steps|follow-up|action\s+plan)|end\s+of\s+record|end\s+marker|<end>)\b/i
const HANDOVER_ACTION_RE =
  /\b(?:hand(?:ed|over)|check\s+in|monitor|tomorrow(?:'s)?\s+adults?|next\s+(?:shift|adults?))\b/i

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

const STAFF_PHRASE_PROTECTED_RES: Array<{ pattern: RegExp; token: string }> = [
  { pattern: /\bhow staff responded\b/gi, token: '__ORB_STAFF_RESPONDED__' },
  { pattern: /\bstaff present\b/gi, token: '__ORB_STAFF_PRESENT__' },
  { pattern: /\bstaff response\b/gi, token: '__ORB_STAFF_RESPONSE__' },
  { pattern: /\bstaff supported\b/gi, token: '__ORB_STAFF_SUPPORTED__' },
  { pattern: /\bstaff names?\b/gi, token: '__ORB_STAFF_NAMES__' },
  { pattern: /\bstaff offered\b/gi, token: '__ORB_STAFF_OFFERED__' },
  { pattern: /\bstaff observed\b/gi, token: '__ORB_STAFF_OBSERVED__' },
  { pattern: /\bspecific staff interactions\b/gi, token: '__ORB_STAFF_INTERACTIONS__' },
  { pattern: /\bstaff interactions\b/gi, token: '__ORB_STAFF_INTERACTIONS_PLURAL__' }
]

const STAFF_PHRASE_RESTORE: Record<string, string> = {
  __ORB_STAFF_RESPONDED__: 'how staff responded',
  __ORB_STAFF_PRESENT__: 'staff present',
  __ORB_STAFF_RESPONSE__: 'Staff response',
  __ORB_STAFF_SUPPORTED__: 'Staff supported',
  __ORB_STAFF_NAMES__: 'staff names',
  __ORB_STAFF_OFFERED__: 'staff offered',
  __ORB_STAFF_OBSERVED__: 'staff observed',
  __ORB_STAFF_INTERACTIONS__: 'specific staff interactions',
  __ORB_STAFF_INTERACTIONS_PLURAL__: 'staff interactions'
}

const BLANK_TEMPLATE_REQUEST_RE =
  /\b(?:blank\s+template|blank\s+form|full\s+document|form\s+to\s+complete|structured\s+report|template\s+to\s+fill|empty\s+template|give\s+me\s+a\s+template|provide\s+a\s+template|report\s+template|(?:give|provide|need|want|show)\s+(?:me\s+)?(?:a\s+)?template\b|(?:form|record)\s+(?:structure|layout|fields)\b|fields\s+to\s+complete)\b/i

const ROUTINE_DAILY_BEFORE_SAVING_LIST =
  'To complete before saving:\n\n* Add the time.\n* Add who was present.\n* Add anything the young person said or communicated.\n* Add any relevant follow-up, if needed.'

const SELF_HARM_GENERIC_FILLER_RES: RegExp[] = [
  /\bAlways prioritise[^.!?]*[.!?]/gi,
  /\bIt is important to prioritise[^.!?]*[.!?]/gi,
  /\bIt is crucial[^.!?]*[.!?]/gi,
  /\bBy taking these steps[^.!?]*[.!?]/gi,
  /\bMental health is a complex[^.!?]*[.!?]/gi,
  /\bRemember that self-harm[^.!?]*[.!?]/gi,
  /\bIf you have concerns about (?:their\s+)?mental health[^.!?]*[.!?]/gi,
  /\bSeeking professional help is (?:always\s+)?important[^.!?]*[.!?]/gi
]

const SELF_HARM_GENERIC_OPENING_RES: RegExp[] = [
  /^It is crucial[^.!?]*[.!?]\s*/gim,
  /^Self-harm is a serious[^.!?]*[.!?]\s*/gim,
  /^Self-harm and suicidal ideation require[^.!?]*[.!?]\s*/gim
]

const DAILY_RECORD_FIELD_HEADING_RES: RegExp[] = [
  /^Daily Record:\s*/im,
  /^Young Person:\s*/im,
  /^(?:staff|Staff)\s+present:\s*/im,
  /^Manager Review:\s*/im,
  /^#{1,3}\s*Manager Review\s*$/im
]

function protectStaffPhrases(text: string): string {
  let result = String(text || '')
  for (const { pattern, token } of STAFF_PHRASE_PROTECTED_RES) {
    result = result.replace(pattern, token)
  }
  return result
}

function restoreStaffPhrases(text: string): string {
  let result = String(text || '')
  for (const [token, phrase] of Object.entries(STAFF_PHRASE_RESTORE)) {
    result = result.replaceAll(token, phrase)
  }
  return result
}

export function fixBrokenAdultHeadingWording(text: string): string {
  return String(text || '')
    .replace(/\b[Tt]he adult\s+Present\b/g, 'Staff present')
    .replace(/\b[Tt]he adult\s+Actions?\b/g, 'Staff response')
    .replace(/\b[Tt]he adult\s+facilitated\b/g, 'Staff supported')
    .replace(/\b[Tt]he adult\s+Response\b/g, 'Staff response')
    .replace(/\b[Tt]he adult\s+Observed\b/g, 'Staff observed')
    .replace(/\b[Tt]he adult\s+Supported\b/g, 'Staff supported')
    .replace(/\bhow\s+[Tt]he adult\s+responded\b/g, 'how staff responded')
    .replace(/\b[Tt]he adult\s+responded\b/g, 'staff responded')
    .replace(/\bspecific\s+[Tt]he adult interactions\b/g, 'specific staff interactions')
    .replace(/\b[Tt]he adult interactions\b/g, 'staff interactions')
    .replace(/\bengaging positively with the adult\b/gi, 'engaging calmly with staff')
    .replace(/\[Insert\s+[Tt]he adult Names?\]/gi, 'staff names, if known')
}

export function replaceClunkyPlaceholders(text: string, sourceText = ''): string {
  if (isDailyRecordDraftMode(sourceText)) return String(text || '')
  return String(text || '')
    .replace(/\[Young Person'?s Name\]/gi, 'the young person')
    .replace(/\[Child'?s Name\]/gi, 'the young person')
    .replace(/\[Name\]/gi, 'the young person')
    .replace(/\[Staff Names?\]/gi, 'staff')
    .replace(/\[Names of staff present\]/gi, 'staff')
    .replace(/\[Insert (?:staff|Staff) Names?\]/gi, 'staff names, if known')
    .replace(/\[Insert (?:young person'?s|Young Person'?s) [Nn]ame\]/gi, 'the young person')
    .replace(/\[Insert (?:The )?[Aa]dult Names?\]/gi, 'staff names, if known')
    .replace(/\[Manager'?s name\]/gi, "add the manager's name before saving")
    .replace(/\[Date\]/gi, 'add the date before saving')
    .replace(/\[Time\]/gi, 'add the time before saving')
    .replace(/\[Direct quote if available\]/gi, "record the young person's exact words where known")
    .replace(/\[Child'?s words not stated\]/gi, "record the young person's exact words where known")
}

export function userRequestedBlankTemplate(text: string): boolean {
  return BLANK_TEMPLATE_REQUEST_RE.test(String(text || ''))
}

function looksLikeFormStyleDailyRecord(text: string): boolean {
  const value = String(text || '')
  const markers = [
    /Daily Record:\s*(?:\[Date\]|add the date)/i,
    /Young Person:\s*(?:\[|add|insert)/i,
    /(?:staff|Staff)\s+present:\s*(?:\[|insert|add)/i,
    /Manager Review:\s*(?:\[Manager|$)/im,
    /\[Insert\s+/i
  ]
  return markers.filter((pattern) => pattern.test(value)).length >= 1
}

function placeholderHeavyForChat(text: string): boolean {
  const lower = String(text || '').toLowerCase()
  const markers = [
    '[name]',
    "[child's name]",
    "[young person's name]",
    '[date]',
    '[time]',
    "[manager's name]",
    '[names of staff present]',
    '[staff names]',
    '[insert'
  ]
  return markers.filter((marker) => lower.includes(marker)).length >= 1
}

export function isDailyRecordDraftMode(sourceText: string): boolean {
  const source = String(sourceText || '')
  return (
    isDailyRecordRequest(source) &&
    promptContainsDailyRecordingFacts(source) &&
    !userRequestedBlankTemplate(source) &&
    !hasSafeguardingCue(source)
  )
}

export function looksLikeDailyRecordDraftViolation(text: string): boolean {
  const value = String(text || '')
  if (looksLikeFormStyleDailyRecord(value) || placeholderHeavyForChat(value)) return true
  if (DAILY_RECORD_FIELD_HEADING_RES.some((pattern) => pattern.test(value))) return true
  if (/\[Insert\s+/i.test(value)) return true
  return false
}

export function isStructuredDailyRecordDraft(text: string): boolean {
  const value = String(text || '')
  const lower = value.toLowerCase()
  const markers = [
    'context / routine',
    'what happened',
    "young person's presentation",
    "young person's voice",
    'staff response',
    'outcome'
  ]
  const hits = markers.filter((marker) => lower.includes(marker)).length
  const hasCompletion = lower.includes('to complete before saving') || lower.includes('before saving')
  return hits >= 4 && (hasCompletion || lower.includes('daily record draft'))
}

const DAILY_SECTION_HEADING_CANONICAL: Record<string, string> = {
  'context / routine': 'Context / routine',
  'what happened': 'What happened',
  "young person's presentation": "Young person's presentation",
  "young person's voice or communication": "Young person's voice or communication",
  'staff response': 'Staff response',
  outcome: 'Outcome',
  'to complete before saving': 'To complete before saving'
}

const STRUCTURED_DAILY_SECTION_HEADING_ONLY_RE =
  /^(Context\s*\/\s*routine|What happened|Young person'?s presentation|Young person'?s voice or communication|Staff response|Outcome|To complete before saving)\s*:?\s*$/i

const STRUCTURED_DAILY_SECTION_INLINE_RE =
  /^(Context\s*\/\s*routine|What happened|Young person'?s presentation|Young person'?s voice or communication|Staff response|Outcome)\s*:\s*(.+)$/i

const STRUCTURED_DAILY_BODY_BOUNDARY_RES: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b(breakfast)\s+(They)\b/, replacement: '$1. $2' },
  { pattern: /\b(toast)\s+(They)\b/, replacement: '$1. $2' },
  { pattern: /\b(note)\s+(Add)\b/i, replacement: '$1. $2' },
  { pattern: /\b(period)\s+(Staff)\b/i, replacement: '$1. $2' },
  { pattern: /\b(handover)\s+(Staff)\b/i, replacement: '$1. $2' },
  { pattern: /\b(saving)\s+(Staff)\b/i, replacement: '$1. $2' }
]

function canonicalDailySectionHeading(raw: string): string {
  const key = String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
  return DAILY_SECTION_HEADING_CANONICAL[key] ?? String(raw || '').trim()
}

function expandDailyRecordBulletItems(line: string): string[] {
  const value = String(line || '').trim()
  if (!value) return []
  const stripped = value.startsWith('*') ? value.replace(/^\*\s*/, '').trim() : value
  const parts = stripped.split(/\s*\*\s+/).map((part) => part.trim()).filter(Boolean)
  return parts.map((part) => {
    if (/[.!?]$/.test(part)) return part
    return `${part}.`
  })
}

function repairStructuredDailyBodyPunctuation(body: string): string {
  let result = String(body || '').trim()
  if (!result) return result
  for (const { pattern, replacement } of STRUCTURED_DAILY_BODY_BOUNDARY_RES) {
    result = result.replace(pattern, replacement)
  }
  if (!/[.!?]$/.test(result)) result = `${result}.`
  return result
}

export function formatStructuredDailyRecordDraftForMarkdown(text: string): string {
  if (!isStructuredDailyRecordDraft(text)) return String(text || '')
  const rawLines = String(text || '')
    .split('\n')
    .map((line) => line.trimEnd())
  const sections: Array<{ heading: string; body: string[] }> = []
  let currentHeading = ''
  let currentBody: string[] = []

  const flush = () => {
    if (currentHeading || currentBody.length) {
      sections.push({ heading: currentHeading, body: currentBody })
    }
    currentHeading = ''
    currentBody = []
  }

  for (const line of rawLines) {
    const stripped = line.trim()
    if (!stripped || stripped.toLowerCase() === 'daily record draft') continue
    const headingOnly = stripped.match(STRUCTURED_DAILY_SECTION_HEADING_ONLY_RE)
    const headingInline = stripped.match(STRUCTURED_DAILY_SECTION_INLINE_RE)
    if (headingOnly) {
      flush()
      currentHeading = canonicalDailySectionHeading(headingOnly[1])
      continue
    }
    if (headingInline) {
      flush()
      currentHeading = canonicalDailySectionHeading(headingInline[1])
      currentBody = [headingInline[2].trim()]
      continue
    }
    if (currentHeading) currentBody.push(stripped)
  }
  flush()

  const output: string[] = ['## Daily Record Draft', '']
  for (const section of sections) {
    output.push(`### ${section.heading}`, '')
    if (section.heading.toLowerCase() === 'to complete before saving') {
      for (const line of section.body) {
        for (const item of expandDailyRecordBulletItems(line)) {
          output.push(`- ${item}`)
        }
      }
    } else {
      const bodyText = repairStructuredDailyBodyPunctuation(section.body.join(' ').trim())
      if (bodyText) output.push(bodyText)
    }
    output.push('')
  }
  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

function sourceSupportsComparativeCalm(sourceText: string): boolean {
  const lower = String(sourceText || '').toLowerCase()
  return ['calmer', 'more calm', 'settled more', 'improved', 'before and after', 'later settled', 'became calmer'].some(
    (term) => lower.includes(term)
  )
}

export function sanitizeDailyRecordDraftWording(text: string, sourceText = ''): string {
  if (!isDailyRecordDraftMode(sourceText)) return String(text || '')
  let result = String(text || '')
  if (!sourceSupportsComparativeCalm(sourceText)) {
    result = result.replace(/\bappeared calmer\b/gi, 'appeared calm')
  }
  const sourceLower = String(sourceText || '').toLowerCase()
  if (!sourceLower.includes('enjoy') && !sourceLower.includes('enjoyment')) {
    result = result.replace(/\bexpressed enjoyment\b[^.!?]*[.!?]?/gi, '')
  }
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

function stripDailyRecordDraftForbiddenSections(text: string, sourceText = ''): string {
  if (!isDailyRecordDraftMode(sourceText)) return String(text || '')
  let result = String(text || '')
  result = result.replace(/^#{0,3}\s*What this means in practice\s*$[\s\S]*?(?=\n#{1,3}\s|\Z)/gim, '')
  result = result.replace(/\bWhat this means in practice\b[\s\S]*$/gi, '')
  result = result.replace(/^#{0,3}\s*Follow-up prompts\s*$[\s\S]*?(?=\n#{1,3}\s|\Z)/gim, '')
  result = result.replace(/^#{0,3}\s*Manager Review\s*$[\s\S]*?(?=\n#{1,3}\s|\Z)/gim, '')
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

export function promptContainsDailyRecordingFacts(text: string): boolean {
  const source = String(text || '')
  if (!isDailyRecordRequest(source)) return false
  if (/\b(?:refused\s+breakfast|difficult\s+morning|calm\s+breakfast|chose\s+toast|watched\s+tv)\b/i.test(source)) {
    return true
  }
  if (/daily\s+record\s*[—\-:].+\w/i.test(source)) return true
  const lowered = source.toLowerCase()
  return (
    lowered.includes('rough notes') &&
    ['create', 'write', 'draft', 'turn', 'convert', 'record'].some((verb) => lowered.includes(verb))
  )
}

function extractDailyRecordFacts(sourceText: string): Record<string, string> {
  const lower = String(sourceText || '').toLowerCase()
  const facts: Record<string, string> = {}

  const happenedParts: string[] = []
  if (lower.includes('breakfast')) happenedParts.push('The young person had breakfast')
  if (lower.includes('chose toast')) happenedParts.push('They chose toast')
  if (lower.includes('watched tv') || lower.includes('watched television')) {
    happenedParts.push(
      lower.includes('handover') ? 'They then watched television before handover' : 'They then watched television'
    )
  }
  if (happenedParts.length) {
    facts.what_happened = `${happenedParts.join('. ')}.`
  }

  if (lower.includes('breakfast') && lower.includes('handover')) {
    facts.context = "The record relates to the young person's morning routine before handover."
  } else if (lower.includes('breakfast')) {
    facts.context = "The record relates to the young person's breakfast routine."
  } else if (lower.includes('handover')) {
    facts.context = 'The record relates to the period before handover.'
  } else {
    facts.context = 'The record relates to the shift period described.'
  }

  if (lower.includes('calm')) {
    facts.presentation = 'The young person appeared calm during this period.'
  }

  const childSpoke = [' said ', ' asked ', ' told ', ' spoke ', ' communicated ', ' shouted ', ' replied '].some(
    (term) => lower.includes(term)
  )
  if (!childSpoke) {
    facts.voice =
      'No direct words from the young person were provided in the note. Add anything they said, asked for or communicated before saving.'
  }

  if (lower.includes('breakfast') || lower.includes('toast')) {
    facts.staff_response =
      'Staff supported the routine, offered choice around breakfast and maintained a calm environment.'
  } else {
    facts.staff_response = 'Staff supported the routine and maintained a calm environment.'
  }

  if (lower.includes('calm')) {
    facts.outcome =
      lower.includes('breakfast') || lower.includes('morning')
        ? 'The morning period appears to have remained settled based on the information provided.'
        : 'The period appears to have remained settled based on the information provided.'
  }

  return facts
}

export function buildSimpleDailyRecordDraft(sourceText: string): string {
  const facts = extractDailyRecordFacts(sourceText)
  const sections: Array<[string, string]> = [
    ['Context / routine', facts.context || 'Describe the routine or context for this record.'],
    ['What happened', facts.what_happened || 'Add what happened during this period.'],
    [
      "Young person's presentation",
      facts.presentation || 'Add how the young person presented during this period.'
    ],
    [
      "Young person's voice or communication",
      facts.voice || 'Add what the young person said, asked for or communicated during this period.'
    ],
    ['Staff response', facts.staff_response || 'Add how staff responded and supported.'],
    ['Outcome', facts.outcome || 'Add what happened next or how the period ended.']
  ]
  const lines = ['Daily Record Draft', '']
  for (const [heading, body] of sections) {
    lines.push(`${heading}:`, body, '')
  }
  lines.push(ROUTINE_DAILY_BEFORE_SAVING_LIST)
  return lines.join('\n').trim()
}

export function reshapeRoutineDailyRecordChatAnswer(text: string, sourceText = ''): string {
  if (userRequestedBlankTemplate(sourceText) || !isDailyRecordRequest(sourceText)) return String(text || '')
  if (hasSafeguardingCue(sourceText)) return String(text || '')
  if (!promptContainsDailyRecordingFacts(sourceText)) return String(text || '')

  if (looksLikeDailyRecordDraftViolation(text)) {
    return buildSimpleDailyRecordDraft(sourceText)
  }

  let cleaned = String(text || '')
    .split('\n')
    .filter((line) => {
      const stripped = line.trim()
      return !(
        /^Daily Record:\s*/i.test(stripped) ||
        /^Young Person:\s*/i.test(stripped) ||
        /^(?:staff|Staff)\s+present:\s*/i.test(stripped) ||
        /^Manager Review:/i.test(stripped) ||
        /^#{1,3}\s*Follow-up prompts/i.test(stripped) ||
        /\[Insert\s+/i.test(stripped)
      )
    })
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  cleaned = stripDailyRecordDraftForbiddenSections(cleaned, sourceText)
  cleaned = sanitizeDailyRecordDraftWording(cleaned, sourceText)

  if (
    looksLikeDailyRecordDraftViolation(cleaned) ||
    (cleaned.split(/\s+/).length < 25 && promptContainsDailyRecordingFacts(sourceText))
  ) {
    cleaned = buildSimpleDailyRecordDraft(sourceText)
  } else if (!/before saving/i.test(cleaned) && cleaned.split(/\s+/).length >= 20) {
    cleaned = `${cleaned}\n\n${ROUTINE_DAILY_BEFORE_SAVING_LIST}`
  }
  return cleaned
}

export function stripSelfHarmGenericFillers(text: string, sourceText = ''): string {
  if (!/\b(?:self[\s-]?harm|suicid\w*|want(?:ed)?\s+to\s+die)\b/i.test(String(sourceText || ''))) {
    return String(text || '')
  }
  let result = String(text || '').replace(/\s+$/, '')
  for (const pattern of SELF_HARM_GENERIC_OPENING_RES) {
    result = result.replace(pattern, '').replace(/^\s+/, '')
  }
  for (const pattern of SELF_HARM_GENERIC_FILLER_RES) {
    result = result.replace(pattern, '').replace(/\s+$/, '')
  }
  return result.replace(/\n{3,}/g, '\n\n').trim()
}

export function applyAdultIdentityLanguage(text: string, suppliedInitials?: string[]): string {
  let value = String(text || '')
  if (!value.trim()) return value
  const initials = suppliedInitials ?? extractSuppliedAdultInitials(value)
  value = value.replace(STAFF_ON_DUTY_RE, () =>
    initials.length ? `Adults involved: ${initials.map((i) => `Adult ${i}`).join(', ')}` : 'Adults involved'
  )
  if (!initials.length) {
    value = protectStaffPhrases(value)
  }
  if (initials.length) {
    let staffIndex = 0
    value = value.replace(/\b[Ss]taff\b/g, () => {
      const label = `Adult ${initials[staffIndex % initials.length]}`
      staffIndex += 1
      return label
    })
  } else {
    value = value.replace(/\b[Ss]taff\b/g, 'the adult')
    value = restoreStaffPhrases(value)
  }
  return fixBrokenAdultHeadingWording(value)
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
    .replace(/\bappeared more settled\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
    .replace(/\bappeared more relaxed\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
    .replace(/\bappeared relaxed\b/gi, bedtimeTiming ? 'appeared calmer before bedtime' : 'appeared calmer')
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

function repairBrokenChildObjectPunctuation(line: string): string {
  let result = String(line || '')
  for (const { pattern, replacement } of BROKEN_CHILD_OBJECT_REPAIRS) {
    result = result.replace(pattern, replacement)
  }
  return result
}

function repairSentenceBoundariesInLine(line: string): string {
  let result = repairBrokenChildObjectPunctuation(line)
  result = result.replace(QUOTE_ADULT_BOUNDARY_RE, '$1. $2')
  result = result.replace(/\bwatched TV\b/gi, 'watched television')
  result = result.replace(WATCHED_TV_SHORT_CHILD_BOUNDARY_RE, '$1. $2')
  result = result.replace(WATCHED_TV_CHILD_BOUNDARY_RE, '$1. $2')
  result = result.replace(ACCEPTED_TOAST_BEFORE_BEDTIME_RE, '$1. $2')
  result = result.replace(ACCEPTED_TOAST_CHILD_BOUNDARY_RE, '$1. $2')
  for (const pattern of EXPLANATORY_INLINE_BOUNDARY_RES) {
    result = result.replace(pattern, '$1. $2')
  }
  result = result.replace(ADULT_LABEL_BOUNDARY_RE, '. $1')
  for (const pattern of TRANSITION_BOUNDARY_RES) {
    result = result.replace(pattern, '. $1 ')
  }
  for (const pattern of SECTION_HEADING_INLINE_BOUNDARY_RES) {
    result = result.replace(pattern, '. $1:')
  }
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

function trimExplanatoryClauses(sentence: string): string {
  let result = String(sentence || '')
  for (const pattern of EXPLANATORY_DAILY_RECORD_CLAUSE_RES) {
    result = result.replace(pattern, '')
  }
  return result.replace(/\s{2,}/g, ' ').trim().replace(/[ ,;.]+$/, '')
}

export function stripExplanatoryDailyRecordPhrases(text: string, sourceText = ''): string {
  if (hasSafeguardingCue(sourceText) || userExplicitlyRequestsExplanation(sourceText)) return String(text || '')
  if (!isDailyRecordRequest(sourceText)) return String(text || '')
  if (isStructuredDailyRecordDraft(text)) return String(text || '')
  const paragraphs = String(text || '').split(/\n\s*\n/)
  const cleaned: string[] = []
  for (const paragraph of paragraphs) {
    const stripped = paragraph.trim()
    if (!stripped) continue
    if (
      stripped.startsWith('#') ||
      /^(?:Presentation and Support|Adult Response|Outcome|Daily Record)(?:\s*\/\s*Handover)?\s*:?\s*$/i.test(
        stripped
      )
    ) {
      cleaned.push(stripped)
      continue
    }
    const kept = stripped
      .split(/(?<=[.!?])\s+/)
      .map((sentence) => trimExplanatoryClauses(sentence))
      .filter((sentence) => {
        if (!sentence) return false
        if (
          /\bemotional\s+state\b/i.test(sentence) &&
          !String(sourceText || '').toLowerCase().includes('emotional state')
        ) {
          return false
        }
        return true
      })
    if (kept.length) cleaned.push(kept.join(' '))
  }
  let result = cleaned.join('\n\n').replace(/\n{3,}/g, '\n\n').trim()
  for (const pattern of ORPHAN_FRAGMENT_CLEANUP_RES) {
    result = result.replace(pattern, '')
  }
  return result.replace(/\n{3,}/g, '\n\n').trim()
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
  const preserveFollowUp = userRequestedActionPlanOrEndMarker(sourceText)
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
      if (preserveFollowUp) return true
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
  if (hasSafeguardingCue(sourceText) || userRequestedActionPlanOrEndMarker(sourceText)) return String(text || '')
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

export function userRequestedActionPlanOrEndMarker(text: string): boolean {
  return ACTION_PLAN_REQUEST_RE.test(String(text || ''))
}

export function userRequestedEndMarker(text: string): boolean {
  const lower = String(text || '').toLowerCase()
  return ['end of record', '[end of record]', 'end marker', '<end>', 'end record'].some((marker) =>
    lower.includes(marker)
  )
}

function parseRecordSections(text: string): Array<{ heading: string; body: string[] }> {
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
        /^(?:Presentation and Support|Adult Response|Outcome|Follow-up|Next Steps|Recommendations)(?:\s*\/\s*Handover)?\s*:?\s*$/i.test(
          stripped
        ))
    if (isHeading) {
      if (currentHeading || currentBody.length) sections.push({ heading: currentHeading, body: currentBody })
      currentHeading = stripped
      currentBody = []
      continue
    }
    currentBody.push(line)
  }
  if (currentHeading || currentBody.length) sections.push({ heading: currentHeading, body: currentBody })
  return sections
}

function sectionsToText(sections: Array<{ heading: string; body: string[] }>): string {
  const outputLines: string[] = []
  for (const section of sections) {
    if (section.heading) outputLines.push(section.heading)
    outputLines.push(...section.body)
    if (section.body.length && section.body[section.body.length - 1]?.trim()) outputLines.push('')
  }
  return outputLines.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function stripRepeatedObservedOutcome(text: string, sourceText = ''): string {
  if (hasSafeguardingCue(sourceText) || !isDailyRecordRequest(sourceText)) return String(text || '')
  const sections = parseRecordSections(text)
  let adultIdx: number | null = null
  let outcomeIdx: number | null = null
  sections.forEach((section, idx) => {
    if (ADULT_RESPONSE_HEADING_RE.test(section.heading.trim())) adultIdx = idx
    if (OUTCOME_HANDOVER_HEADING_RE.test(section.heading) || OUTCOME_ONLY_HEADING_RE.test(section.heading)) {
      outcomeIdx = idx
    }
  })
  if (adultIdx === null || outcomeIdx === null) return String(text || '')
  const outcomeBody = sections[outcomeIdx].body.join('\n').trim()
  const adultBody = sections[adultIdx].body.join('\n').trim()
  if (!APPEARED_CALMER_RE.test(outcomeBody) || !APPEARED_CALMER_RE.test(adultBody)) return String(text || '')
  let cleanedAdult = adultBody
    .replace(/,?\s+and\s+appeared\s+calmer(?:\s+before\s+bedtime)?/gi, '')
    .replace(/,?\s+appeared\s+calmer(?:\s+before\s+bedtime)?/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/[ ,;.]+$/, '')
  if (!cleanedAdult) return String(text || '')
  sections[adultIdx] = { heading: sections[adultIdx].heading, body: cleanedAdult.split('\n') }
  return sectionsToText(sections)
}

export function stripRedundantNextStepsInDailyRecord(text: string, sourceText = ''): string {
  if (hasSafeguardingCue(sourceText) || !isDailyRecordRequest(sourceText)) return String(text || '')
  if (userRequestedActionPlanOrEndMarker(sourceText)) return String(text || '')
  const value = String(text || '')
  if (!HANDOVER_PRESENT_RE.test(value) || !HANDOVER_ACTION_RE.test(value)) return value
  let result = value.replace(INLINE_REDUNDANT_NEXT_STEPS_RE, '')
  const lines = result.split('\n')
  const output: string[] = []
  let skipUntilHeading = false
  for (const line of lines) {
    const stripped = line.trim()
    if (REDUNDANT_NEXT_STEPS_HEADING_RE.test(stripped)) {
      skipUntilHeading = true
      continue
    }
    if (skipUntilHeading) {
      if (
        /^#+\s+\S/.test(stripped) ||
        /^(?:Presentation and Support|Adult Response|Outcome|Daily Record)\b/i.test(stripped)
      ) {
        skipUntilHeading = false
      } else if (stripped.startsWith('-') || stripped.startsWith('•') || !stripped) {
        continue
      } else {
        skipUntilHeading = false
      }
    }
    if (!skipUntilHeading) output.push(line)
  }
  return output.join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

export function stripEndOfRecordArtefacts(text: string, sourceText = ''): string {
  if (userRequestedEndMarker(sourceText)) return String(text || '')
  let result = String(text || '').replace(/\s+$/, '')
  for (const pattern of END_OF_RECORD_ARTEFACT_RES) {
    result = result.replace(pattern, '')
  }
  result = result.replace(TRAILING_HR_ARTIFACTS_RE, '').replace(/\s+$/, '')
  return result.replace(/\s+$/, '')
}

export function sanitizeLiveRecordOutput(text: string, sourceText = ''): string {
  const initials = extractSuppliedAdultInitials(sourceText)
  let cleaned = String(text || '')

  if (isRecordGenerationRequest(sourceText) && !userExplicitlyRequestsExplanation(sourceText)) {
    cleaned = stripTrailingSelfCommentary(cleaned, sourceText)
  }

  cleaned = stripInterpretiveFeelingsPhrases(cleaned, sourceText)
  cleaned = stripUnsupportedTimelineExpansion(cleaned, sourceText)
  cleaned = sanitizeChildrensHomeTerminology(cleaned, sourceText)

  if (isDailyRecordRequest(sourceText) && !hasSafeguardingCue(sourceText)) {
    const preserveActionPlan = userRequestedActionPlanOrEndMarker(sourceText)
    cleaned = cleaned
      .replace(/^(?:#+\s*)?Safeguarding\s+Note\s*:?\s*$/gim, '')
      .replace(/^(?:#+\s*)?Child(?:'s|\s)Voice(?:\s*\/\s*Presentation)?\s*:?\s*$/gim, '')
      .replace(/^(?:#+\s*)?Professional\s+Reflection\s*:?\s*$/gim, '')
      .replace(/^(?:#+\s*)?Quality\s+Assurance\s+Note\s*:?\s*$/gim, '')
      .replace(/^(?:#+\s*)?Compliance\s+Note\s*:?\s*$/gim, '')
    if (!preserveActionPlan) {
      cleaned = cleaned
        .replace(/^(?:#+\s*)?Next\s+Steps\s*:?\s*$/gim, '')
        .replace(/^(?:#+\s*)?Follow-up(?:\s+for\s+next\s+shift)?\s*:?\s*$/gim, '')
    }
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()
  }

  cleaned = stripChildQuoteInterpretation(cleaned, sourceText)
  cleaned = stripExplanatoryDailyRecordPhrases(cleaned, sourceText)
  cleaned = stripInventedEmotionalImpact(cleaned, sourceText)
  cleaned = stripOutcomeInterpretation(cleaned, sourceText)
  cleaned = sanitizeObservationInterpretationLanguage(cleaned, sourceText)

  if (initials.length || /\b[Ss]taff\b/.test(cleaned)) {
    cleaned = applyAdultIdentityLanguage(cleaned, initials)
  }

  if (isDailyRecordRequest(sourceText) && !hasSafeguardingCue(sourceText)) {
    cleaned = stripRedundantNextStepsInDailyRecord(cleaned, sourceText)
    cleaned = stripUnnecessaryFollowUpSection(cleaned, sourceText)
  }

  cleaned = normalizeDuplicateDailyRecordHeadings(cleaned, sourceText)

  if (isDailyRecordRequest(sourceText) && !hasSafeguardingCue(sourceText)) {
    cleaned = stripRepeatedObservedOutcome(cleaned, sourceText)
  }

  if (isRecordGenerationRequest(sourceText)) {
    cleaned = repairRecordSentenceBoundaries(cleaned)
  }

  if (isRecordGenerationRequest(sourceText) && !userExplicitlyRequestsExplanation(sourceText)) {
    cleaned = stripTrailingSelfCommentary(cleaned, sourceText)
    cleaned = stripEndOfRecordArtefacts(cleaned, sourceText)
    cleaned = stripTrailingMarkdownArtefacts(cleaned, sourceText)
  }

  return cleaned
}

export function isDailyRecordRequest(text: string): boolean {
  const value = String(text || '')
  const lowered = value.toLowerCase()
  if (
    /\b(?:create|write|draft|turn|make|help\s+me\s+(?:write|record))\b.{0,40}\b(?:a\s+)?daily\s+record\b/i.test(
      value
    )
  ) {
    return true
  }
  if (
    /\b(?:write this as|turn this into|make this more child-centred).{0,40}\b(?:a\s+)?(?:daily\s+)?record\b/i.test(
      value
    )
  ) {
    return true
  }
  if (lowered.includes('child-centred') && lowered.includes('record')) return true
  return (
    lowered.includes('daily record') &&
    ['create', 'write', 'draft', 'from the following', 'rough notes', 'turn', 'make'].some((needle) =>
      lowered.includes(needle)
    )
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
    'Repeated outcome discipline:',
    `• ${ORB_REPEATED_OUTCOME_DISCIPLINE}`,
    '',
    'End-of-record discipline:',
    `• ${ORB_END_OF_RECORD_DISCIPLINE}`,
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
