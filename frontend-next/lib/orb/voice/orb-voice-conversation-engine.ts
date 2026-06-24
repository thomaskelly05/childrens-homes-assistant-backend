/**
 * ORB Voice Conversation Engine — deterministic scaffolding for live UI, after-call
 * summaries and voice prompt hints. Pure and unit-testable; does not call LLMs.
 */

import type { VoiceTurn } from './orb-voice-types.ts'
import { ORB_VOICE_SAFEGUARDING_REFLECTIVE_OPENING } from './orb-voice-reflective-copy.ts'

/** Studio template labels — mirrors `orb-recording-framework.json` studio_template_id values. */
const STUDIO_TEMPLATE_LABELS: Record<string, string> = {
  general: 'Quick Record',
  daily_record: 'Daily Record',
  incident: 'Incident Reflection',
  missing: 'Missing Episode Note',
  safeguarding: 'Safeguarding Concern Record',
  physical_intervention: 'Physical Intervention Record',
  keywork: 'Key-work Summary',
  manager: 'Management Oversight Note',
  handover: 'Handover Note',
  reg_44: 'Regulation 44 Prep',
  reg_45: 'Regulation 45 Reflection',
  behaviour: 'Behaviour Support Record',
  supervision_prep: 'Supervision Prep',
  action_plan: 'Action Plan'
}

function studioTemplateLabel(templateId: string): string | null {
  return STUDIO_TEMPLATE_LABELS[templateId] ?? null
}

export type OrbVoiceConversationMove =
  | 'acknowledge'
  | 'ask_follow_up'
  | 'clarify'
  | 'reflect'
  | 'summarise'
  | 'suggest_record'
  | 'safety_prompt'
  | 'wait'
  | 'close_session'
  | 'error_repair'

export type OrbVoiceCoverageTopic =
  | 'what_happened'
  | 'where'
  | 'who_present'
  | 'child_voice'
  | 'presentation'
  | 'adult_response'
  | 'de_escalation'
  | 'outcome'
  | 'follow_up_actions'
  | 'management_oversight'
  | 'safeguarding_action'
  | 'informing_others'
  | 'immediate_safety'

export type OrbVoiceConversationEngineInput = {
  turns: VoiceTurn[]
  latestUtterance?: string
  voiceState?: string
  selectedRecordTypeId?: string | null
  silenceDurationMs?: number
  safetyIndicators?: boolean
  hasAskedFollowUp?: boolean
  userWantsRecord?: boolean
  bargeInSupported?: boolean
}

export type OrbVoiceAfterCallSections = {
  summary: string | null
  childVoicePresentation: string | null
  adultResponse: string | null
  recordingHints: string[]
  missingInformation: string[]
  followUpQuestions: string[]
  suggestedRecordTypeId: string | null
  suggestedRecordTypeLabel: string | null
  hasTranscript: boolean
  summaryPending: boolean
}

export type OrbVoiceConversationEngineOutput = {
  move: OrbVoiceConversationMove
  acknowledgement: string | null
  followUpQuestion: string | null
  clarificationQuestion: string | null
  shouldWait: boolean
  suggestRecordCreation: boolean
  safetyPrompt: string | null
  livePrompt: string | null
  suggestedRecordTypeId: string | null
  suggestedRecordTypeLabel: string | null
  bargeInFallback: string | null
  afterCallSections: OrbVoiceAfterCallSections | null
}

export const ORB_VOICE_ACKNOWLEDGEMENTS = [
  'I hear you.',
  'That sounds important.',
  'Go on.',
  "I'm with you.",
  'That feels worth noting.',
  'Take your time.',
  'That may need recording carefully.'
] as const

export const ORB_VOICE_CONVERSATION_STYLE_INSTRUCTIONS = [
  'You are ORB, an AI assistant for residential childcare. Introduce yourself as ORB when helpful.',
  'Keep spoken turns short — acknowledge, reflect briefly, then ask one to three useful questions.',
  'Residential childcare reflective support only — not therapy, coaching jargon, or compliance guarantees.',
  'Keep the child central. Separate facts, adult actions, child voice, and what may need recording.',
  'Do not make safeguarding decisions. Remind adults to follow local procedure when risk appears.',
  'Offer a practical next step (supervision, Dictate, ORB Write) without deciding outcomes.',
  'Adult review and professional judgement always come first — you support thinking, not replace it.'
].join(' ')

const SILENCE_SHORT_MS = 3_000
const SILENCE_MEDIUM_MS = 8_000
const SILENCE_LONG_MS = 15_000

const MIN_TRANSCRIPT_CHARS_FOR_RECORD = 80

const SAFETY_KEYWORDS = [
  'immediate danger',
  'immediate risk',
  'abuse',
  'disclosure',
  'missing child',
  'missing from',
  'self-harm',
  'self harm',
  'serious injury',
  'restraint',
  'physical intervention',
  'exploitation',
  'allegation',
  'police',
  'ambulance',
  'medication error',
  'overdose'
] as const

const TOPIC_PATTERNS: Record<OrbVoiceCoverageTopic, readonly RegExp[]> = {
  what_happened: [/\bhappened\b/i, /\bincident\b/i, /\bevent\b/i, /\bstarted when\b/i, /\bwas\b.+\bwhen\b/i],
  where: [/\broom\b/i, /\bhome\b/i, /\bgarden\b/i, /\bschool\b/i, /\bupstairs\b/i, /\bdownstairs\b/i, /\blounge\b/i, /\bkitchen\b/i, /\bwhere\b/i],
  who_present: [/\bstaff\b/i, /\bmanager\b/i, /\bkey\s*worker\b/i, /\bpresent\b/i, /\bwith me\b/i, /\banother\b/i, /\bcolleague\b/i],
  child_voice: [/\bsaid\b/i, /\btold me\b/i, /\bwords\b/i, /\bquote\b/i, /\bshouted\b/i, /\bcried\b/i, /\bown words\b/i],
  presentation: [/\bpresented\b/i, /\blooked\b/i, /\bappeared\b/i, /\bmood\b/i, /\banxious\b/i, /\bangry\b/i, /\bcalm\b/i, /\bwithdrawn\b/i],
  adult_response: [/\bi\b.+\b(spoke|said|told|asked|responded)\b/i, /\bwe\b.+\b(spoke|said|told|asked|responded)\b/i, /\bstaff\b.+\b(spoke|said|told|asked|responded)\b/i, /\bintervened\b/i, /\bredirected\b/i],
  de_escalation: [/\bde-?escalat/i, /\bspace\b/i, /\bcalm\b/i, /\bsoothed\b/i, /\bsupport\b/i, /\bcomfort\b/i, /\btime out\b/i],
  outcome: [/\bafter\b/i, /\boutcome\b/i, /\bsettled\b/i, /\bresolved\b/i, /\bended\b/i, /\bnow\b/i, /\bcurrently\b/i],
  follow_up_actions: [/\bfollow[- ]?up\b/i, /\baction\b/i, /\bplan\b/i, /\bnext\b/i, /\bwill\b/i, /\bneed to\b/i],
  management_oversight: [/\bmanager\b/i, /\boversight\b/i, /\breview\b/i, /\bdebrief\b/i, /\bsupervision\b/i],
  safeguarding_action: [/\bsafeguard/i, /\bDSL\b/i, /\bdesignated\b/i, /\bMASH\b/i, /\bchildren'?s services\b/i],
  informing_others: [/\bparent\b/i, /\bsocial worker\b/i, /\binformed\b/i, /\bnotified\b/i, /\bcalled\b/i],
  immediate_safety: [/\binjury\b/i, /\bhurt\b/i, /\bbled\b/i, /\brestraint\b/i, /\bmissing\b/i, /\bpolice\b/i, /\bambulance\b/i, /\bemergency\b/i]
}

const FOLLOW_UP_BY_TOPIC: Record<OrbVoiceCoverageTopic, string> = {
  what_happened: 'What happened, in the order you noticed it?',
  where: 'Where did this take place?',
  who_present: 'Who was present at the time?',
  child_voice: 'What did the young person say in their own words, if anything?',
  presentation: 'How did they present — mood, body language, anything you observed?',
  adult_response: 'What did staff do to support them at that point?',
  de_escalation: 'What de-escalation or support was offered?',
  outcome: 'What changed afterwards — how did things end or settle?',
  follow_up_actions: 'Does anything need follow-up action or review?',
  management_oversight: 'Does this need management review or follow-up?',
  safeguarding_action: 'Has anyone been informed under your safeguarding procedures?',
  informing_others: 'Do parents, the social worker or manager need informing?',
  immediate_safety: 'Was there any injury, restraint or immediate safety concern?'
}

const CLARIFICATION_RULES: Array<{ pattern: RegExp; question: string }> = [
  {
    pattern: /\bthey left\b|\bhe left\b|\bshe left\b/i,
    question: 'When you say they left, do you mean they left the room or left the home?'
  },
  {
    pattern: /\bit escalated\b|\bescalated\b/i,
    question: "When you say it escalated, what did you observe?"
  },
  {
    pattern: /\baggressive\b/i,
    question: "When you say 'aggressive', what did they actually do or say?"
  },
  {
    pattern: /\bupset\b|\bangry\b|\bdifficult\b/i,
    question: 'Was that your interpretation, or something the young person said?'
  },
  {
    pattern: /\brecord\b|\bnote\b|\bwrite\b/i,
    question: 'Do you want this written as a daily record, incident reflection or handover note?'
  }
]

const RECORD_TYPE_RULES: Array<{ templateId: string; patterns: RegExp[] }> = [
  { templateId: 'incident', patterns: [/\bincident\b/i, /\bescalat/i, /\brestraint\b/i, /\bdamage\b/i, /\bpolice\b/i, /\binjury\b/i] },
  { templateId: 'missing', patterns: [/\bmissing\b/i, /\babscond/i, /\bran away\b/i, /\bleft the home\b/i] },
  { templateId: 'safeguarding', patterns: [/\bsafeguard/i, /\bdisclosure\b/i, /\babuse\b/i, /\bexploitation\b/i, /\ballegation\b/i] },
  { templateId: 'physical_intervention', patterns: [/\brestraint\b/i, /\bphysical intervention\b/i, /\bhold\b/i] },
  { templateId: 'handover', patterns: [/\bhandover\b/i, /\bend of shift\b/i, /\bshift update\b/i] },
  { templateId: 'keywork', patterns: [/\bkey\s*work\b/i, /\b1:1\b/i, /\bdirect work\b/i, /\bconversation with\b/i] },
  { templateId: 'manager', patterns: [/\bmanager oversight\b/i, /\bmanagement review\b/i, /\bsignificant incident\b/i] },
  { templateId: 'reg_44', patterns: [/\breg(?:ulation)?\s*44\b/i, /\breg 44\b/i] },
  { templateId: 'reg_45', patterns: [/\breg(?:ulation)?\s*45\b/i, /\breg 45\b/i] },
  { templateId: 'daily_record', patterns: [/\bdaily\b/i, /\bmeal\b/i, /\bschool\b/i, /\beducation\b/i, /\bpresentation\b/i, /\broutine\b/i] }
]

const SAFETY_PROMPT_COPY = ORB_VOICE_SAFEGUARDING_REFLECTIVE_OPENING

function userTextFromTurns(turns: VoiceTurn[]): string {
  return turns
    .filter((t) => t.role === 'user')
    .map((t) => t.text.trim())
    .filter(Boolean)
    .join('\n')
}

function combinedDialogueText(turns: VoiceTurn[], latestUtterance?: string): string {
  const base = userTextFromTurns(turns)
  const extra = latestUtterance?.trim() ?? ''
  return [base, extra].filter(Boolean).join('\n')
}

function countUserTurns(turns: VoiceTurn[]): number {
  return turns.filter((t) => t.role === 'user' && t.text.trim()).length
}

export function orbVoiceTextHasSafetyConcern(text: string): boolean {
  const lower = text.toLowerCase()
  return SAFETY_KEYWORDS.some((k) => lower.includes(k))
}

export function detectMissingRecordingTopics(text: string): OrbVoiceCoverageTopic[] {
  const missing: OrbVoiceCoverageTopic[] = []
  for (const topic of Object.keys(TOPIC_PATTERNS) as OrbVoiceCoverageTopic[]) {
    const patterns = TOPIC_PATTERNS[topic]
    if (!patterns.some((p) => p.test(text))) {
      missing.push(topic)
    }
  }
  return missing
}

export function pickOrbVoiceAcknowledgement(turnCount: number, utterance?: string): string | null {
  if (turnCount < 1) return null
  // Avoid acknowledging every turn — every other user turn at most.
  if (turnCount % 2 === 0) return null
  const lower = (utterance ?? '').toLowerCase()
  if (orbVoiceTextHasSafetyConcern(lower)) {
    return 'That may need recording carefully.'
  }
  const idx = turnCount % ORB_VOICE_ACKNOWLEDGEMENTS.length
  return ORB_VOICE_ACKNOWLEDGEMENTS[idx] ?? ORB_VOICE_ACKNOWLEDGEMENTS[0]
}

export function findClarificationQuestion(text: string): string | null {
  for (const rule of CLARIFICATION_RULES) {
    if (rule.pattern.test(text)) return rule.question
  }
  return null
}

export function pickFollowUpQuestion(text: string, hasAskedFollowUp?: boolean): string | null {
  if (hasAskedFollowUp) return null
  const missing = detectMissingRecordingTopics(text)
  const lower = text.toLowerCase()
  const safetyCue =
    orbVoiceTextHasSafetyConcern(text) ||
    /\bincident\b/.test(lower) ||
    /\brestraint\b/.test(lower) ||
    /\bmissing\b/.test(lower)
  const priority: OrbVoiceCoverageTopic[] = [
    ...(safetyCue ? (['immediate_safety'] as const) : []),
    'child_voice',
    'what_happened',
    'adult_response',
    'outcome',
    'management_oversight',
    'safeguarding_action',
    'where',
    'who_present',
    'presentation',
    'de_escalation',
    'informing_others',
    'follow_up_actions'
  ]
  for (const topic of priority) {
    if (missing.includes(topic)) return FOLLOW_UP_BY_TOPIC[topic]
  }
  return null
}

export function recommendOrbVoiceRecordType(
  text: string
): { templateId: string; label: string } | null {
  const trimmed = text.trim()
  if (trimmed.length < 40) return null
  for (const rule of RECORD_TYPE_RULES) {
    if (rule.patterns.some((p) => p.test(trimmed))) {
      const label = studioTemplateLabel(rule.templateId)
      if (label) return { templateId: rule.templateId, label }
    }
  }
  return null
}

function excerptFromTurns(turns: VoiceTurn[], max = 220): string | null {
  const combined = userTextFromTurns(turns).replace(/\s+/g, ' ').trim()
  if (!combined) return null
  if (combined.length <= max) return combined
  return `${combined.slice(0, max - 1)}…`
}

function extractChildVoicePresentation(text: string): string | null {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const childLine = lines.find((l) =>
    /\b(said|told|shouted|cried|words|presented|looked|appeared|mood)\b/i.test(l)
  )
  return childLine ?? null
}

function extractAdultResponse(text: string): string | null {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const adultLine = lines.find((l) =>
    /\b(i |we |staff ).*(spoke|said|told|asked|responded|intervened|redirected|offered|supported)/i.test(l)
  )
  return adultLine ?? null
}

function recordingHintsFromText(text: string): string[] {
  const hints: string[] = []
  const keywords = ['incident', 'safeguard', 'missing', 'injury', 'behaviour', 'handover', 'concern', 'risk']
  const lower = text.toLowerCase()
  for (const kw of keywords) {
    if (lower.includes(kw)) hints.push(`Mentioned: ${kw}`)
  }
  if (!hints.length && text.trim()) {
    hints.push('General conversation — review whether a record is needed.')
  }
  return hints.slice(0, 4)
}

function missingInfoLabels(missing: OrbVoiceCoverageTopic[]): string[] {
  const labels: Record<OrbVoiceCoverageTopic, string> = {
    what_happened: 'What happened',
    where: 'Where it happened',
    who_present: 'Who was present',
    child_voice: "Young person's own words",
    presentation: 'Observable presentation',
    adult_response: 'Adult/staff response',
    de_escalation: 'De-escalation or support offered',
    outcome: 'Outcome or what changed',
    follow_up_actions: 'Follow-up actions',
    management_oversight: 'Management oversight',
    safeguarding_action: 'Safeguarding action taken',
    informing_others: 'Who was informed',
    immediate_safety: 'Immediate safety concerns'
  }
  return missing.slice(0, 5).map((t) => labels[t] ?? t)
}

export function buildOrbVoiceAfterCallSections(
  turns: VoiceTurn[],
  voiceSummary?: string | null,
  options?: { summaryPending?: boolean }
): OrbVoiceAfterCallSections {
  const userText = userTextFromTurns(turns)
  const hasTranscript = turns.some((t) => (t.role === 'user' || t.role === 'assistant') && t.text.trim())
  const summaryPending = Boolean(options?.summaryPending) && !voiceSummary?.trim()
  const summary = voiceSummary?.trim() || excerptFromTurns(turns)
  const missing = userText ? detectMissingRecordingTopics(userText) : []
  const followUp = userText ? (pickFollowUpQuestion(userText) ? [pickFollowUpQuestion(userText)!] : []) : []
  const extraMissing = missingInfoLabels(missing).slice(0, 3)
  const recordSuggestion = userText ? recommendOrbVoiceRecordType(userText) : null

  return {
    summary: hasTranscript ? summary : null,
    childVoicePresentation: userText ? extractChildVoicePresentation(userText) : null,
    adultResponse: userText ? extractAdultResponse(userText) : null,
    recordingHints: userText ? recordingHintsFromText(userText) : [],
    missingInformation: hasTranscript
      ? extraMissing.length
        ? extraMissing
        : ['Not clear from this session.']
      : [],
    followUpQuestions: hasTranscript
      ? followUp.length
        ? followUp
        : ['Not clear from this session.']
      : [],
    suggestedRecordTypeId: recordSuggestion?.templateId ?? null,
    suggestedRecordTypeLabel: recordSuggestion?.label ?? null,
    hasTranscript,
    summaryPending
  }
}

export function evaluateOrbVoiceConversation(
  input: OrbVoiceConversationEngineInput
): OrbVoiceConversationEngineOutput {
  const dialogueText = combinedDialogueText(input.turns, input.latestUtterance)
  const userTurnCount = countUserTurns(input.turns)
  const hasTranscript = dialogueText.trim().length > 0
  const safetyConcern = Boolean(input.safetyIndicators) || orbVoiceTextHasSafetyConcern(dialogueText)
  const silenceMs = input.silenceDurationMs ?? 0
  const voiceState = input.voiceState ?? 'listening'
  const recordSuggestion = hasTranscript ? recommendOrbVoiceRecordType(dialogueText) : null
  const enoughForRecord = dialogueText.trim().length >= MIN_TRANSCRIPT_CHARS_FOR_RECORD

  const afterCallSections = buildOrbVoiceAfterCallSections(input.turns)

  const base: OrbVoiceConversationEngineOutput = {
    move: 'wait',
    acknowledgement: null,
    followUpQuestion: null,
    clarificationQuestion: null,
    shouldWait: true,
    suggestRecordCreation: false,
    safetyPrompt: null,
    livePrompt: null,
    suggestedRecordTypeId: recordSuggestion?.templateId ?? null,
    suggestedRecordTypeLabel: recordSuggestion?.label ?? null,
    bargeInFallback: null,
    afterCallSections
  }

  if (!hasTranscript && voiceState === 'listening') {
    return {
      ...base,
      move: 'wait',
      livePrompt: "Start speaking when you're ready.",
      shouldWait: true
    }
  }

  if (safetyConcern) {
    return {
      ...base,
      move: 'safety_prompt',
      safetyPrompt: SAFETY_PROMPT_COPY,
      livePrompt: SAFETY_PROMPT_COPY,
      shouldWait: false
    }
  }

  if (voiceState === 'speaking' && !input.bargeInSupported) {
    return {
      ...base,
      move: 'wait',
      bargeInFallback: 'Tap to speak again',
      livePrompt: 'Tap to speak again when ORB finishes.',
      shouldWait: true
    }
  }

  if (silenceMs >= SILENCE_LONG_MS && hasTranscript) {
    return {
      ...base,
      move: 'suggest_record',
      livePrompt: "You can keep going, or I can help turn what you've said into a record.",
      suggestRecordCreation: enoughForRecord || Boolean(input.userWantsRecord),
      shouldWait: false
    }
  }

  if (silenceMs >= SILENCE_MEDIUM_MS && voiceState === 'listening') {
    return {
      ...base,
      move: 'acknowledge',
      acknowledgement: "I'm still here.",
      livePrompt: 'Take your time.',
      shouldWait: true
    }
  }

  if (silenceMs >= SILENCE_SHORT_MS && voiceState === 'listening') {
    return {
      ...base,
      move: 'wait',
      livePrompt: 'Take your time.',
      shouldWait: true
    }
  }

  const clarification = findClarificationQuestion(input.latestUtterance ?? dialogueText)
  if (clarification && voiceState !== 'speaking') {
    return {
      ...base,
      move: 'clarify',
      clarificationQuestion: clarification,
      livePrompt: clarification,
      shouldWait: false
    }
  }

  const followUp = pickFollowUpQuestion(dialogueText, input.hasAskedFollowUp)
  if (followUp && userTurnCount >= 1 && voiceState === 'thinking') {
    return {
      ...base,
      move: 'ask_follow_up',
      followUpQuestion: followUp,
      livePrompt: followUp,
      shouldWait: false
    }
  }

  if (voiceState === 'user_speaking' || voiceState === 'transcribing') {
    const ack = pickOrbVoiceAcknowledgement(userTurnCount, input.latestUtterance)
    return {
      ...base,
      move: ack ? 'acknowledge' : 'wait',
      acknowledgement: ack,
      livePrompt: ack ?? 'I heard that.',
      shouldWait: false
    }
  }

  if (enoughForRecord && input.userWantsRecord) {
    return {
      ...base,
      move: 'suggest_record',
      suggestRecordCreation: true,
      livePrompt: recordSuggestion
        ? `Suggested: ${recordSuggestion.label}. Turn into a record when you are ready.`
        : 'Enough to draft a record — review before saving.',
      shouldWait: false
    }
  }

  if (voiceState === 'listening' && hasTranscript) {
    return {
      ...base,
      move: 'reflect',
      livePrompt: "I'm listening.",
      shouldWait: true
    }
  }

  return base
}

export function orbVoiceConversationHasEnoughTranscript(turns: VoiceTurn[]): boolean {
  return userTextFromTurns(turns).trim().length >= MIN_TRANSCRIPT_CHARS_FOR_RECORD
}
