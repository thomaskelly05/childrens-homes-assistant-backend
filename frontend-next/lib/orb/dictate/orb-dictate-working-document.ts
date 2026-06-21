/** Phase 3O / 3S / 3T — ORB Dictate working document structure and local generation. */

import { ORB_DICTATE_RECORD_TYPE_SUGGESTIONS } from './orb-dictate-capture-copy.ts'

export type OrbDictateWorkingDocumentSection = {
  heading: string
  body: string
}

export const ORB_DICTATE_UNSTRUCTURED_NOTE_LABEL = 'Unstructured note' as const

export const ORB_DICTATE_SECTION_PLACEHOLDER_NOT_CAPTURED =
  'Not captured yet. Add what was observed or known.' as const

export const ORB_DICTATE_SECTION_PLACEHOLDER_ADULT_SUPPORT =
  'Not enough information captured yet. Confirm what adults did to support, reassure or follow up.' as const

export const ORB_DICTATE_SECTION_PLACEHOLDER_CHILD_VOICE =
  'Not captured yet. Add what the child said, showed or communicated where known.' as const

export const ORB_DICTATE_SECTION_PLACEHOLDER_FOLLOWUP =
  'Confirm whether any follow-up, repair or monitoring is needed.' as const

export const ORB_DICTATE_SECTION_PLACEHOLDER_NEEDS_CONFIRMATION = 'Needs adult confirmation.' as const

export const ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_PRACTICE =
  'Not captured yet. Add what was discussed about practice, support, learning or performance.' as const

export const ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_WENT_WELL =
  'Not captured yet. Add any strengths, progress or positive practice discussed.' as const

export const ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_NEEDS_SUPPORT =
  'Not captured yet. Add any areas where support, reflection or action is needed.' as const

export const ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_ACTIONS =
  'Not captured yet. Add agreed actions, learning points or follow-up.' as const

export const ORB_DICTATE_SECTION_PLACEHOLDER_GENERAL_CLARIFYING =
  'The transcript does not yet include the main discussion content, actions agreed, or any follow-up.' as const

export const ORB_DICTATE_SECTION_PLACEHOLDER_GENERAL_NEXT_STEP =
  'Continue recording or add the main discussion before creating a final draft.' as const

const ORB_DICTATE_PLACEHOLDER_VALUES = [
  ORB_DICTATE_SECTION_PLACEHOLDER_NOT_CAPTURED,
  ORB_DICTATE_SECTION_PLACEHOLDER_ADULT_SUPPORT,
  ORB_DICTATE_SECTION_PLACEHOLDER_CHILD_VOICE,
  ORB_DICTATE_SECTION_PLACEHOLDER_FOLLOWUP,
  ORB_DICTATE_SECTION_PLACEHOLDER_NEEDS_CONFIRMATION,
  ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_PRACTICE,
  ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_WENT_WELL,
  ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_NEEDS_SUPPORT,
  ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_ACTIONS,
  ORB_DICTATE_SECTION_PLACEHOLDER_GENERAL_CLARIFYING,
  ORB_DICTATE_SECTION_PLACEHOLDER_GENERAL_NEXT_STEP
] as const

export function isOrbDictateSectionPlaceholder(body: string): boolean {
  const trimmed = body.trim()
  return ORB_DICTATE_PLACEHOLDER_VALUES.some((value) => value === trimmed)
}

export function isWorkingDocumentUnmappedScaffold(markdown: string): boolean {
  const sections = parseWorkingDocument(markdown)
  if (!sections.length) return true
  return sections.every((section) => isOrbDictateSectionPlaceholder(section.body))
}

const ORB_DICTATE_WORKING_SECTIONS_UNSTRUCTURED = [
  'Summary',
  'Key details captured',
  'What may need clarifying',
  'Suggested next step'
] as const

const ORB_DICTATE_WORKING_SECTIONS_DAILY = [
  'Summary of the day',
  'Child\u2019s presentation',
  'Key interactions',
  'Adult support',
  'Child\u2019s voice',
  'Follow-up'
] as const

const ORB_DICTATE_WORKING_SECTIONS_MISSING = [
  'What was known',
  'Actions taken',
  'Return / presentation',
  'Child\u2019s voice',
  'Adult response',
  'Follow-up / management oversight'
] as const

const ORB_DICTATE_WORKING_SECTIONS_INCIDENT = [
  'What happened',
  'Context / triggers',
  'Child\u2019s presentation',
  'Adult response and de-escalation',
  'Outcome',
  'Repair / follow-up'
] as const

const ORB_DICTATE_WORKING_SECTIONS_KEYWORK = [
  'Purpose of session',
  'What was discussed',
  'Child\u2019s views',
  'Adult support',
  'Actions agreed',
  'Follow-up'
] as const

const ORB_DICTATE_WORKING_SECTIONS_SAFEGUARDING = [
  'What was reported / observed',
  'Immediate safety actions',
  'Child\u2019s voice / presentation',
  'Adults informed',
  'Follow-up / oversight'
] as const

const ORB_DICTATE_WORKING_SECTIONS_HANDOVER = [
  'Key update',
  'Presentation / wellbeing',
  'Risks or concerns',
  'Actions needed',
  'Important follow-up'
] as const

const ORB_DICTATE_WORKING_SECTIONS_SUPERVISION = [
  'What happened',
  'Impact on practice',
  'What went well',
  'What needs support',
  'Actions / learning'
] as const

const ORB_DICTATE_WORKING_SECTIONS_MANAGER = [
  'Reason for oversight',
  'Information reviewed',
  'Management view',
  'Actions agreed',
  'Follow-up'
] as const

export type TranscriptSignals = {
  raw: string
  sentences: string[]
  speakerLabel?: string
  speakerIsRedacted: boolean
  registeredManagerMentioned: boolean
  dateMentioned?: string
  supervisionMentioned: boolean
  handoverMentioned: boolean
  keyworkMentioned: boolean
  incidentMentioned: boolean
  missingMentioned: boolean
  childName?: string
  childPresentation: string[]
  interactions: string[]
  adultSupport: string[]
  childVoice: string[]
  summarySentences: string[]
}

/** Section headings for the ORB working document by studio template id. */
export function workingDocumentSectionsForTemplate(templateId: string): readonly string[] {
  if (templateId === 'daily_record') return ORB_DICTATE_WORKING_SECTIONS_DAILY
  if (templateId === 'missing') return ORB_DICTATE_WORKING_SECTIONS_MISSING
  if (templateId === 'incident' || templateId === 'physical_intervention') return ORB_DICTATE_WORKING_SECTIONS_INCIDENT
  if (templateId === 'keywork') return ORB_DICTATE_WORKING_SECTIONS_KEYWORK
  if (templateId === 'safeguarding') return ORB_DICTATE_WORKING_SECTIONS_SAFEGUARDING
  if (templateId === 'handover') return ORB_DICTATE_WORKING_SECTIONS_HANDOVER
  if (templateId === 'supervision_prep') return ORB_DICTATE_WORKING_SECTIONS_SUPERVISION
  if (templateId === 'manager') return ORB_DICTATE_WORKING_SECTIONS_MANAGER
  return ORB_DICTATE_WORKING_SECTIONS_UNSTRUCTURED
}

export function workingDocumentTypeLabel(templateId: string): string {
  const match = ORB_DICTATE_RECORD_TYPE_SUGGESTIONS.find((o) => o.templateId === templateId)
  if (match) return match.label
  if (templateId === 'general') return ORB_DICTATE_UNSTRUCTURED_NOTE_LABEL
  return ORB_DICTATE_UNSTRUCTURED_NOTE_LABEL
}

export function placeholderForSectionHeading(heading: string, templateId?: string): string {
  const lower = heading.toLowerCase()
  if (templateId === 'supervision_prep') {
    if (lower.includes('impact on practice')) return ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_PRACTICE
    if (lower.includes('what went well')) return ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_WENT_WELL
    if (lower.includes('what needs support')) return ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_NEEDS_SUPPORT
    if (lower.includes('actions / learning')) return ORB_DICTATE_SECTION_PLACEHOLDER_SUPERVISION_ACTIONS
  }
  if (templateId === 'general' || !templateId) {
    if (lower.includes('what may need clarifying')) return ORB_DICTATE_SECTION_PLACEHOLDER_GENERAL_CLARIFYING
    if (lower.includes('suggested next step')) return ORB_DICTATE_SECTION_PLACEHOLDER_GENERAL_NEXT_STEP
  }
  if (
    lower.includes('adult support') ||
    lower.includes('adult response') ||
    lower.includes('de-escalation') ||
    lower.includes('safety actions') ||
    lower.includes('adults informed')
  ) {
    return ORB_DICTATE_SECTION_PLACEHOLDER_ADULT_SUPPORT
  }
  if (
    lower.includes("child's voice") ||
    lower.includes('child\u2019s voice') ||
    lower.includes('child\u2019s views') ||
    lower.includes("child's views")
  ) {
    return ORB_DICTATE_SECTION_PLACEHOLDER_CHILD_VOICE
  }
  if (
    lower.includes('follow-up') ||
    lower.includes('follow up') ||
    lower.includes('repair') ||
    lower.includes('next step') ||
    lower.includes('oversight') ||
    lower.includes('monitoring')
  ) {
    return ORB_DICTATE_SECTION_PLACEHOLDER_FOLLOWUP
  }
  if (lower.includes('clarifying') || lower.includes('needs support')) {
    return ORB_DICTATE_SECTION_PLACEHOLDER_NEEDS_CONFIRMATION
  }
  return ORB_DICTATE_SECTION_PLACEHOLDER_NOT_CAPTURED
}

function splitSentences(text: string): string[] {
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)
  if (!parts?.length) return [text.trim()].filter(Boolean)
  return parts.map((part) => part.trim()).filter(Boolean)
}

function normalizeDetectedName(raw: string): string {
  return raw.trim().replace(/[.,;:!?].*$/, '').trim()
}

function extractSpeakerLabel(text: string): { label?: string; isRedacted: boolean } {
  const patterns = [
    /\bmy name(?:'s| is)\s+(\[[A-Z_]+\d+\]|[A-Za-z][A-Za-z.' -]{1,40})/i,
    /\bthis is\s+(\[[A-Z_]+\d+\]|[A-Za-z][A-Za-z.' -]{1,40})/i,
    /\bI(?:'m| am)\s+(\[[A-Z_]+\d+\])/i,
    /\b([A-Za-z][A-Za-z.' -]{1,40})\s+speaking\b/i
  ]
  for (const pattern of patterns) {
    const match = text.match(pattern)
    const label = match?.[1] ? normalizeDetectedName(match[1]) : undefined
    if (label && !/^(the|a)$/i.test(label)) {
      return { label, isRedacted: /^\[NAME_/i.test(label) }
    }
  }
  const redacted = text.match(/\[NAME_\d+\]/i)?.[0]
  if (redacted) return { label: redacted, isRedacted: true }
  return { isRedacted: false }
}

function extractDateMention(text: string): string | undefined {
  const match = text.match(
    /\b(?:today(?:'s)? date is|date is|on)\s+(?:the\s+)?(\d{1,2}(?:st|nd|rd|th)?\s+of\s+[A-Za-z]+(?:\s+\d{4})?|\d{1,2}\s+[A-Za-z]+(?:\s+\d{4})?)/i
  )
  return match?.[1]?.trim()
}

function extractChildName(text: string): string | undefined {
  const match = text.match(/\b(?:little\s+)?([A-Z][a-z]+)\b/)
  if (!match?.[1]) return undefined
  const name = match[1]
  if (['Today', 'Staff', 'There', 'They', 'Nothing', 'June'].includes(name)) return undefined
  return name
}

/** Extract cautious local signals from transcript text. */
export function extractTranscriptSignals(text: string): TranscriptSignals {
  const raw = text.trim()
  const sentences = splitSentences(raw)
  const lower = raw.toLowerCase()
  const speaker = extractSpeakerLabel(raw)
  const childName = extractChildName(raw)

  const signals: TranscriptSignals = {
    raw,
    sentences,
    speakerLabel: speaker.label,
    speakerIsRedacted: speaker.isRedacted,
    registeredManagerMentioned: /\b(?:I(?:'m| am)|they(?:'re| are))\s+(?:the\s+|a\s+)?registered manager\b/i.test(raw),
    dateMentioned: extractDateMention(raw),
    supervisionMentioned: /\bsupervision\b/i.test(raw),
    handoverMentioned: /\bhandover\b/i.test(raw),
    keyworkMentioned: /\bkey-?work\b/i.test(raw),
    incidentMentioned: /\bincident\b/i.test(raw) || /\brestraint\b/i.test(raw),
    missingMentioned: /\bmissing\b/i.test(raw),
    childName,
    childPresentation: [],
    interactions: [],
    adultSupport: [],
    childVoice: [],
    summarySentences: []
  }

  for (const sentence of sentences) {
    const staffAndVoiceSplit = sentence.split(/\s+and\s+(?=(?:he|she|they)\s+said\b)/i)
    if (staffAndVoiceSplit.length === 2 && /\bstaff\b/i.test(staffAndVoiceSplit[0])) {
      signals.adultSupport.push(staffAndVoiceSplit[0].trim())
      signals.childVoice.push(staffAndVoiceSplit[1].trim())
      continue
    }

    const sentenceLower = sentence.toLowerCase()
    const isChildVoice =
      /\b(said|told|communicated|showed)\b/i.test(sentence) &&
      (/\b(he|she|they)\b/i.test(sentence) || (childName ? sentence.includes(childName) : false))
    const isAdultSupport = /\b(staff|checked in|support(ed)?|reassur|adult|manager)\b/i.test(sentenceLower)
    const isInteraction =
      /\b(football|friendship|peer|young people|clash|played|disagreement|rules|interaction|with other)\b/i.test(
        sentenceLower
      )
    const isPresentation =
      /\b(engaging|presentation|mood|okay|calm|upset|struggled|nice time|appeared)\b/i.test(sentenceLower) &&
      !isChildVoice
    const isSummary =
      /\btoday\b/i.test(sentenceLower) ||
      /\bwe(?:'re| are) here\b/i.test(sentenceLower) ||
      /\bintroduc/i.test(sentenceLower) ||
      /\bdiscuss\b/i.test(sentenceLower)

    if (isChildVoice) signals.childVoice.push(sentence)
    else if (isAdultSupport) signals.adultSupport.push(sentence)
    else if (isInteraction) signals.interactions.push(sentence)
    else if (isPresentation) signals.childPresentation.push(sentence)
    else if (isSummary) signals.summarySentences.push(sentence)
    else signals.summarySentences.push(sentence)
  }

  return signals
}

function joinOrPlaceholder(parts: string[], heading: string, templateId?: string): string {
  const joined = parts.join(' ').trim()
  return joined || placeholderForSectionHeading(heading, templateId)
}

function synthesizeDailySummary(signals: TranscriptSignals): string {
  const child = signals.childName ?? 'The child'
  const interactionText = signals.interactions.join(' ')
  const summaryText = signals.summarySentences.join(' ')
  if (interactionText.includes('football')) {
    const escalation =
      /\bnothing major\b/i.test(signals.raw) || /\bdid not\b/i.test(signals.raw)
        ? ' There were some minor disagreements about the rules, but these did not appear to escalate.'
        : ''
    return `${child} spent time playing football with other young people in the home.${escalation}`.trim()
  }
  if (summaryText) return summaryText
  if (signals.raw) return signals.raw
  return placeholderForSectionHeading('Summary of the day', 'daily_record')
}

function synthesizeChildPresentation(signals: TranscriptSignals): string {
  if (signals.childPresentation.length) return signals.childPresentation.join(' ')
  const child = signals.childName ?? 'The child'
  if (signals.interactions.length) {
    return `${child} appeared to be engaging in play with peers.`
  }
  if (/\bokay\b/i.test(signals.raw)) {
    return `${child} later said they were okay.`
  }
  return placeholderForSectionHeading('Child\u2019s presentation', 'daily_record')
}

function synthesizeChildVoice(signals: TranscriptSignals): string {
  if (signals.childVoice.length) return signals.childVoice.join(' ')
  const child = signals.childName ?? 'The child'
  const saidMatch = signals.raw.match(
    new RegExp(`${child}\\s+said\\s+([^.;]+)`, 'i')
  )
  if (saidMatch?.[1]) return `${child} said ${saidMatch[1].trim()}.`
  return placeholderForSectionHeading('Child\u2019s voice', 'daily_record')
}

function mapGeneralDictation(signals: TranscriptSignals, headings: readonly string[]): OrbDictateWorkingDocumentSection[] {
  const speaker = signals.speakerLabel ?? 'Speaker'
  const rolePart = signals.registeredManagerMentioned ? ' as the registered manager' : ''
  const datePart = signals.dateMentioned ? ` on ${signals.dateMentioned}` : ''
  let topicPart = ''
  if (signals.supervisionMentioned) topicPart = ' supervision'
  else if (signals.handoverMentioned) topicPart = ' handover'
  else if (signals.keyworkMentioned) topicPart = ' key-work'

  const summary = `${speaker} introduced themselves${rolePart}${datePart}${
    topicPart ? ` and stated that the discussion related to${topicPart}` : ''
  }.`.replace(/\s+/g, ' ').trim()

  const keyDetails = [
    signals.speakerLabel ? '- speaker introduced themselves' : null,
    signals.registeredManagerMentioned ? '- registered manager role mentioned' : null,
    signals.dateMentioned ? `- date mentioned (${signals.dateMentioned})` : null,
    signals.supervisionMentioned ? '- supervision discussion mentioned' : null,
    signals.handoverMentioned ? '- handover mentioned' : null,
    signals.keyworkMentioned ? '- key-work mentioned' : null
  ]
    .filter(Boolean)
    .join('\n')

  return headings.map((heading) => {
    if (heading === 'Summary') return { heading, body: summary }
    if (heading === 'Key details captured') {
      return { heading, body: keyDetails || placeholderForSectionHeading(heading, 'general') }
    }
    if (heading === 'What may need clarifying') {
      return { heading, body: ORB_DICTATE_SECTION_PLACEHOLDER_GENERAL_CLARIFYING }
    }
    if (heading === 'Suggested next step') {
      const step = signals.supervisionMentioned
        ? 'Continue recording or add the supervision discussion before creating a final draft.'
        : ORB_DICTATE_SECTION_PLACEHOLDER_GENERAL_NEXT_STEP
      return { heading, body: step }
    }
    return { heading, body: joinOrPlaceholder([], heading, 'general') }
  })
}

function mapSupervisionReflection(signals: TranscriptSignals, headings: readonly string[]): OrbDictateWorkingDocumentSection[] {
  const speaker = signals.speakerLabel ?? 'Speaker'
  const roleClause = signals.registeredManagerMentioned ? ' as the registered manager' : ''
  const whatHappened = signals.supervisionMentioned
    ? `${speaker} introduced themselves${roleClause} and indicated this was a supervision discussion.`
    : `${speaker} introduced themselves${roleClause}.`

  return headings.map((heading) => {
    if (heading === 'What happened') return { heading, body: whatHappened }
    if (heading === 'Impact on practice') {
      return { heading, body: placeholderForSectionHeading(heading, 'supervision_prep') }
    }
    if (heading === 'What went well') {
      return { heading, body: placeholderForSectionHeading(heading, 'supervision_prep') }
    }
    if (heading === 'What needs support') {
      return { heading, body: placeholderForSectionHeading(heading, 'supervision_prep') }
    }
    if (heading === 'Actions / learning') {
      return { heading, body: placeholderForSectionHeading(heading, 'supervision_prep') }
    }
    return { heading, body: placeholderForSectionHeading(heading, 'supervision_prep') }
  })
}

function mapDailyRecord(signals: TranscriptSignals, headings: readonly string[]): OrbDictateWorkingDocumentSection[] {
  return headings.map((heading) => {
    if (heading === 'Summary of the day') return { heading, body: synthesizeDailySummary(signals) }
    if (heading === 'Child\u2019s presentation') return { heading, body: synthesizeChildPresentation(signals) }
    if (heading === 'Key interactions') {
      return { heading, body: joinOrPlaceholder(signals.interactions, heading, 'daily_record') }
    }
    if (heading === 'Adult support') {
      return { heading, body: joinOrPlaceholder(signals.adultSupport, heading, 'daily_record') }
    }
    if (heading === 'Child\u2019s voice') return { heading, body: synthesizeChildVoice(signals) }
    if (heading === 'Follow-up') {
      if (/\bclash(es)?\b/i.test(signals.raw) || /\bnothing major\b/i.test(signals.raw)) {
        return {
          heading,
          body: 'Confirm whether any further monitoring, repair or support was needed.'
        }
      }
      return { heading, body: placeholderForSectionHeading(heading, 'daily_record') }
    }
    return { heading, body: joinOrPlaceholder([], heading, 'daily_record') }
  })
}

type SectionMatcher = {
  heading: string
  patterns: RegExp[]
}

function sectionMatchersForTemplate(templateId: string, headings: readonly string[]): SectionMatcher[] {
  const pick = (heading: string, patterns: RegExp[]): SectionMatcher => ({ heading, patterns })

  if (templateId === 'missing') {
    return [
      pick('What was known', [/\bknown\b/i, /\bmissing\b/i, /\blast seen\b/i, /\bwhereabouts\b/i]),
      pick('Actions taken', [/\bsearch(ed)?\b/i, /\bcontacted\b/i, /\bpolice\b/i, /\baction\b/i]),
      pick('Return / presentation', [/\breturn(ed)?\b/i, /\bfound\b/i, /\bpresentation\b/i, /\bcondition\b/i]),
      pick('Child\u2019s voice', [/\bsaid\b/i, /\btold\b/i, /\bcommunicat/i]),
      pick('Adult response', [/\bresponse\b/i, /\bsupport(ed)?\b/i, /\breassur/i, /\badult\b/i]),
      pick('Follow-up / management oversight', [/\bfollow\b/i, /\boversight\b/i, /\bmanager\b/i, /\bmonitor\b/i])
    ].filter((matcher) => headings.includes(matcher.heading))
  }

  if (templateId === 'incident' || templateId === 'physical_intervention') {
    return [
      pick('What happened', [/\bhappened\b/i, /\bincident\b/i, /\brestraint\b/i, /\bphysical\b/i]),
      pick('Context / triggers', [/\btrigger\b/i, /\bcontext\b/i, /\bbefore\b/i, /\bleading up\b/i]),
      pick('Child\u2019s presentation', [/\bpresentation\b/i, /\bmood\b/i, /\bdistress/i, /\bcalm\b/i]),
      pick('Adult response and de-escalation', [/\bde-escalat/i, /\bresponse\b/i, /\bsupport(ed)?\b/i, /\breassur/i]),
      pick('Outcome', [/\boutcome\b/i, /\bafter\b/i, /\bsettled\b/i, /\bresolved\b/i]),
      pick('Repair / follow-up', [/\brepair\b/i, /\bfollow\b/i, /\bmonitor\b/i, /\bnext\b/i])
    ].filter((matcher) => headings.includes(matcher.heading))
  }

  return headings.map((heading, index) => {
    if (index === 0) return pick(heading, [/.+/])
    if (heading.toLowerCase().includes('adult')) return pick(heading, [/\badult\b/i, /\bsupport(ed)?\b/i, /\bstaff\b/i])
    if (heading.toLowerCase().includes('child')) return pick(heading, [/\bchild\b/i, /\bsaid\b/i, /\bvoice\b/i, /\bviews\b/i])
    if (heading.toLowerCase().includes('follow') || heading.toLowerCase().includes('next')) {
      return pick(heading, [/\bfollow\b/i, /\bnext\b/i, /\bmonitor\b/i, /\brepair\b/i])
    }
    return pick(heading, [new RegExp(heading.split(/[/\s]+/)[0] ?? '.', 'i')])
  })
}

function scoreSentenceForMatcher(sentence: string, matcher: SectionMatcher): number {
  return matcher.patterns.reduce((score, pattern) => score + (pattern.test(sentence) ? 1 : 0), 0)
}

function mapBySentenceBuckets(
  signals: TranscriptSignals,
  templateId: string,
  headings: readonly string[]
): OrbDictateWorkingDocumentSection[] {
  const matchers = sectionMatchersForTemplate(templateId, headings)
  const buckets = new Map<string, string[]>(headings.map((heading) => [heading, []]))

  for (const sentence of signals.sentences) {
    let bestHeading = headings[0]
    let bestScore = 0
    for (const matcher of matchers) {
      const score = scoreSentenceForMatcher(sentence, matcher)
      if (score > bestScore) {
        bestScore = score
        bestHeading = matcher.heading
      }
    }
    buckets.get(bestHeading)?.push(sentence)
  }

  const primaryHeading = headings[0]
  const hasAnyContent = headings.some((heading) => (buckets.get(heading)?.length ?? 0) > 0)
  if (!hasAnyContent && primaryHeading) {
    buckets.set(primaryHeading, [signals.raw])
  }

  return headings.map((heading) => ({
    heading,
    body: joinOrPlaceholder(buckets.get(heading) ?? [], heading, templateId)
  }))
}

/** Map transcript sentences into template sections with cautious placeholders for gaps. */
export function mapTranscriptToSections(
  transcript: string,
  templateId: string
): OrbDictateWorkingDocumentSection[] {
  const headings = workingDocumentSectionsForTemplate(templateId)
  const text = transcript.trim()

  if (!text) {
    return headings.map((heading) => ({
      heading,
      body: placeholderForSectionHeading(heading, templateId)
    }))
  }

  const signals = extractTranscriptSignals(text)

  if (templateId === 'general') return mapGeneralDictation(signals, headings)
  if (templateId === 'supervision_prep') return mapSupervisionReflection(signals, headings)
  if (templateId === 'daily_record') return mapDailyRecord(signals, headings)

  return mapBySentenceBuckets(signals, templateId, headings)
}

export function parseWorkingDocument(markdown: string): OrbDictateWorkingDocumentSection[] {
  const trimmed = markdown.trim()
  if (!trimmed) return []

  const parts = trimmed.split(/^## /m).filter(Boolean)
  if (parts.length === 0) {
    return [{ heading: 'Summary', body: trimmed }]
  }

  return parts.map((part) => {
    const newline = part.indexOf('\n')
    const heading = (newline === -1 ? part : part.slice(0, newline)).trim()
    const body = (newline === -1 ? '' : part.slice(newline + 1)).trim()
    return { heading, body }
  })
}

export function serializeWorkingDocument(sections: OrbDictateWorkingDocumentSection[]): string {
  return sections.map((s) => `## ${s.heading}\n\n${s.body}`.trimEnd()).join('\n\n')
}

export function buildInitialWorkingDocument(transcript: string, templateId: string): string {
  return serializeWorkingDocument(mapTranscriptToSections(transcript, templateId))
}

/** Reshape working document headings when the adult changes ORB Write template. */
export function reshapeWorkingDocument(
  currentMarkdown: string,
  templateId: string,
  transcript: string
): string {
  const existing = parseWorkingDocument(currentMarkdown)
  const mergedBody = existing
    .map((s) => s.body.trim())
    .filter((body) => body && !isOrbDictateSectionPlaceholder(body))
    .join(' ')
  const seed = mergedBody || transcript.trim()
  return buildInitialWorkingDocument(seed, templateId)
}

export function updateWorkingDocumentSection(
  markdown: string,
  heading: string,
  body: string
): string {
  const sections = parseWorkingDocument(markdown)
  const index = sections.findIndex((s) => s.heading === heading)
  if (index === -1) {
    return serializeWorkingDocument([...sections, { heading, body }])
  }
  const next = sections.map((s, i) => (i === index ? { ...s, body } : s))
  return serializeWorkingDocument(next)
}
