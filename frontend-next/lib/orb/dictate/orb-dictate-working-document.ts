/** Phase 3O / 3S — ORB Dictate working document structure and local generation. */

import { ORB_DICTATE_RECORD_TYPE_SUGGESTIONS } from './orb-dictate-capture-copy'

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

const ORB_DICTATE_PLACEHOLDER_VALUES = [
  ORB_DICTATE_SECTION_PLACEHOLDER_NOT_CAPTURED,
  ORB_DICTATE_SECTION_PLACEHOLDER_ADULT_SUPPORT,
  ORB_DICTATE_SECTION_PLACEHOLDER_CHILD_VOICE,
  ORB_DICTATE_SECTION_PLACEHOLDER_FOLLOWUP,
  ORB_DICTATE_SECTION_PLACEHOLDER_NEEDS_CONFIRMATION
] as const

export function isOrbDictateSectionPlaceholder(body: string): boolean {
  const trimmed = body.trim()
  return ORB_DICTATE_PLACEHOLDER_VALUES.some((value) => value === trimmed)
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

export function placeholderForSectionHeading(heading: string): string {
  const lower = heading.toLowerCase()
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

type SectionMatcher = {
  heading: string
  patterns: RegExp[]
}

function sectionMatchersForTemplate(templateId: string, headings: readonly string[]): SectionMatcher[] {
  const pick = (heading: string, patterns: RegExp[]): SectionMatcher => ({ heading, patterns })

  if (templateId === 'daily_record') {
    return [
      pick('Summary of the day', [/\btoday\b/i, /\boverall\b/i, /\bgeneral\b/i, /\bwithin the house\b/i, /\bnice time\b/i]),
      pick('Child\u2019s presentation', [
        /\bmood\b/i,
        /\bpresentation\b/i,
        /\bengaged\b/i,
        /\bbehaviou?r\b/i,
        /\bstruggled\b/i,
        /\bcalm\b/i,
        /\bupset\b/i,
        /\bpresentation\b/i
      ]),
      pick('Key interactions', [
        /\bfootball\b/i,
        /\bfriendship\b/i,
        /\bpeer\b/i,
        /\byoung people\b/i,
        /\bplayed\b/i,
        /\bclash(es)?\b/i,
        /\binteraction\b/i,
        /\bwith (the )?other\b/i
      ]),
      pick('Adult support', [/\bsupport(ed)?\b/i, /\breassur/i, /\bde-escalat/i, /\binterven/i, /\bstaff helped\b/i, /\badult\b/i]),
      pick('Child\u2019s voice', [/\bsaid\b/i, /\btold\b/i, /\bcommunicat/i, /\bvoice\b/i, /\bexpress/i, /\bshowed\b/i]),
      pick('Follow-up', [/\bfollow\b/i, /\bmonitor\b/i, /\brepair\b/i, /\bnext\b/i, /\bclash(es)?\b/i, /\bconcern\b/i, /\bnothing major\b/i])
    ].filter((matcher) => headings.includes(matcher.heading))
  }

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
    if (index === 0) return pick(heading, [/.*/])
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
      body: placeholderForSectionHeading(heading)
    }))
  }

  const sentences = splitSentences(text)
  const matchers = sectionMatchersForTemplate(templateId, headings)
  const buckets = new Map<string, string[]>(headings.map((heading) => [heading, []]))

  for (const sentence of sentences) {
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
    buckets.set(primaryHeading, [text])
  }

  return headings.map((heading) => {
    const body = (buckets.get(heading) ?? []).join(' ').trim()
    return {
      heading,
      body: body || placeholderForSectionHeading(heading)
    }
  })
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
