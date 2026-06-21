/** Phase 3O — ORB Dictate working document structure and local generation. */

import { ORB_DICTATE_RECORD_TYPE_SUGGESTIONS } from './orb-dictate-capture-copy'

export type OrbDictateWorkingDocumentSection = {
  heading: string
  body: string
}

export const ORB_DICTATE_UNSTRUCTURED_NOTE_LABEL = 'Unstructured note' as const

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

/** Section headings for the ORB working document by studio template id. */
export function workingDocumentSectionsForTemplate(templateId: string): readonly string[] {
  if (templateId === 'daily_record') return ORB_DICTATE_WORKING_SECTIONS_DAILY
  if (templateId === 'missing') return ORB_DICTATE_WORKING_SECTIONS_MISSING
  if (templateId === 'incident' || templateId === 'physical_intervention') return ORB_DICTATE_WORKING_SECTIONS_INCIDENT
  if (templateId === 'keywork') return ORB_DICTATE_WORKING_SECTIONS_KEYWORK
  if (templateId === 'safeguarding') return ORB_DICTATE_WORKING_SECTIONS_SAFEGUARDING
  if (templateId === 'handover') return ORB_DICTATE_WORKING_SECTIONS_HANDOVER
  if (templateId === 'supervision_prep') return ORB_DICTATE_WORKING_SECTIONS_SUPERVISION
  return ORB_DICTATE_WORKING_SECTIONS_UNSTRUCTURED
}

export function workingDocumentTypeLabel(templateId: string): string {
  const match = ORB_DICTATE_RECORD_TYPE_SUGGESTIONS.find((o) => o.templateId === templateId)
  if (match) return match.label
  if (templateId === 'general') return ORB_DICTATE_UNSTRUCTURED_NOTE_LABEL
  return ORB_DICTATE_UNSTRUCTURED_NOTE_LABEL
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
  const headings = workingDocumentSectionsForTemplate(templateId)
  const text = transcript.trim()
  const seedIndex = templateId === 'general' ? 1 : 0
  return headings
    .map((heading, index) => {
      const body = index === seedIndex ? text : index === 0 && seedIndex !== 0 ? text : ''
      return `## ${heading}\n\n${body}`.trimEnd()
    })
    .join('\n\n')
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
    .filter(Boolean)
    .join('\n\n')
  const seed = mergedBody || transcript.trim()
  const headings = workingDocumentSectionsForTemplate(templateId)
  const seedIndex = templateId === 'general' ? 1 : 0
  return headings
    .map((heading, index) => {
      const body = index === seedIndex ? seed : ''
      return `## ${heading}\n\n${body}`.trimEnd()
    })
    .join('\n\n')
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
