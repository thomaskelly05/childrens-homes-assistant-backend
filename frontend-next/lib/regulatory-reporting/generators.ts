import {
  filterChronology,
  getActionsFromChronology,
  getChronologyEvents,
  getEvidenceGapsFromChronology,
  getRegulationLinkedEvents,
  getSafeguardingChronology
} from '@/lib/chronology/selectors'
import { ChronologyEvent } from '@/lib/chronology/types'
import { getEvidenceItems } from '@/lib/evidence/selectors'
import { mapEventToRegulatoryReferences } from '@/lib/regulatory-framework/mapping'

import { getReportTemplate, reportTemplates } from './templates'
import { GeneratedReport, ReportGenerationContext, ReportSection, ReportSourceCitation, ReportTemplateId } from './types'

const disclaimer = 'Draft generated from structured records. Requires manager review before use, sharing, filing or professional judgement. The wording uses "records indicate" and "evidence suggests" and must not be treated as a final regulatory judgement.'

function citationsFor(events: ChronologyEvent[]): ReportSourceCitation[] {
  return events.map((event) => ({
    eventId: event.id,
    label: event.citationLabel,
    sourceType: event.sourceType,
    sourceId: event.sourceId
  }))
}

function sourceBody(events: ChronologyEvent[], fallback: string) {
  if (!events.length) return `${fallback} No source records were found for this section; evidence is required before this can be relied on.`
  return events.slice(0, 4).map((event) => `${event.summary} ${event.citationLabel}`).join(' ')
}

function section(id: string, title: string, events: ChronologyEvent[], fallback: string): ReportSection {
  const gaps = getEvidenceGapsFromChronology(events)
  const actions = getActionsFromChronology(events)
  const references = events.flatMap((event) => mapEventToRegulatoryReferences(event))
  const uniqueReferences = references.filter((reference, index, list) => list.findIndex((item) => item.id === reference.id) === index)
  const linkedRegulations = uniqueReferences.filter((reference) => reference.framework === 'children_homes_regulations_2015' || reference.framework === 'reg44' || reference.framework === 'reg45').map((reference) => reference.code)
  const linkedQualityStandards = uniqueReferences.filter((reference) => reference.framework === 'quality_standards').map((reference) => reference.title)
  const linkedSccifAreas = uniqueReferences.filter((reference) => reference.framework === 'sccif').map((reference) => reference.title)
  const missingEvidence = gaps.length ? gaps.map((gap) => gap.title) : events.length ? [] : ['No evidence found in current records for this section.']

  return {
    id,
    title,
    body: `${sourceBody(events, fallback)} ${events.length ? 'Records indicate this section is supported by current source records and remains draft pending manager review.' : 'No evidence found in current records; this section requires evidence before reliance.'}`,
    citations: citationsFor(events),
    evidenceGapIds: gaps.map((gap) => gap.id),
    actionIds: actions.map((action) => action.id),
    regulatoryReferenceIds: uniqueReferences.map((reference) => reference.id),
    linkedRegulations,
    linkedQualityStandards,
    linkedSccifAreas,
    evidenceGaps: missingEvidence,
    nextActions: actions.length ? actions.map((action) => action.title) : ['Manager to review this draft section and confirm whether further evidence is required.'],
    reviewRequired: true
  }
}

function scopedEvents(context: ReportGenerationContext) {
  return filterChronology(getChronologyEvents(), {
    homeId: context.homeId,
    youngPersonIds: context.youngPersonId ? [context.youngPersonId] : undefined,
    dateFrom: context.dateFrom,
    dateTo: context.dateTo,
    regulation: context.regulation
  })
}

function buildSections(templateId: ReportTemplateId, events: ChronologyEvent[]): ReportSection[] {
  const safeguarding = getSafeguardingChronology(events)
  const regulation44 = getRegulationLinkedEvents(events, 'Regulation 44')
  const regulation45 = getRegulationLinkedEvents(events, 'Regulation 45')
  const incidents = filterChronology(events, { eventTypes: ['incident', 'missing_episode', 'restraint', 'sanction', 'behaviour_observation'] })
  const dailyCare = filterChronology(events, { eventTypes: ['daily_log', 'positive_outcome', 'family_contact', 'education', 'health', 'medication'] })
  const actions = events.filter((event) => event.actionIds.length)

  if (templateId === 'reg44') {
    return [
      section('visit-details', 'Visit details', regulation44, 'Add visit date, visitor name, people spoken to and records sampled.'),
      section('young-people-spoken-to', 'Young people spoken to', dailyCare, 'Record children spoken to and their views.'),
      section('records-reviewed', 'Records reviewed', events, 'Record the records reviewed by the visitor.'),
      section('safeguarding-observations', 'Safeguarding observations', safeguarding, 'Record safeguarding observations.'),
      section('quality-of-care', 'Quality of care findings', dailyCare, 'Record quality of care findings.'),
      section('leadership', 'Leadership and management findings', actions, 'Record leadership and management oversight.'),
      section('shortfalls', 'Shortfalls and recommendations', getEvidenceGapsFromChronology(events).flatMap((gap) => gap.sourceEventIds.map((id) => events.find((event) => event.id === id)).filter((event): event is ChronologyEvent => Boolean(event))), 'Record shortfalls and recommendations.'),
      section('actions', 'Actions and evidence cited', actions, 'Record actions generated from the visit.')
    ]
  }

  if (templateId === 'reg44_action_plan') {
    return [
      section('findings', 'Extracted findings', regulation44, 'Paste or upload the Reg 44 report text to extract findings.'),
      section('actions-generated', 'Actions generated', actions, 'Create actions from each finding.'),
      section('evidence-required', 'Evidence requirements and gaps', regulation44, 'Link evidence requirements to actions and chronology events.')
    ]
  }

  if (templateId === 'reg45') {
    return [
      section('quality-of-care-review', 'Quality of care review', events, 'Summarise quality of care.'),
      section('safeguarding-effectiveness', 'Safeguarding effectiveness', safeguarding, 'Summarise safeguarding effectiveness.'),
      section('feedback', 'Feedback from children, families and professionals', regulation45, 'Attach feedback evidence before final review.'),
      section('incidents-analysis', 'Incidents, restraints and missing episodes analysis', incidents, 'Summarise incident and missing patterns.'),
      section('education-health', 'Education and health outcomes', dailyCare, 'Summarise education and health outcomes.'),
      section('leadership-development', 'Leadership evaluation and service development plan', actions, 'Summarise leadership oversight and development plan.')
    ]
  }

  if (templateId === 'lac_review') {
    return [
      section('child-voice', 'Child voice', filterChronology(events, { tags: ['child-voice'] }), 'Add direct child voice evidence.'),
      section('placement-progress', 'Placement progress', dailyCare, 'Summarise placement progress.'),
      section('education', 'Education', filterChronology(events, { searchText: 'education' }), 'Summarise education progress.'),
      section('health-wellbeing', 'Health and emotional wellbeing', filterChronology(events, { searchText: 'wellbeing' }), 'Summarise health and emotional wellbeing.'),
      section('family-time', 'Family time/contact', filterChronology(events, { eventTypes: ['family_contact'] }), 'Summarise family time.'),
      section('safeguarding-risk', 'Safeguarding, incidents and risk changes', [...safeguarding, ...incidents], 'Summarise safeguarding and risk.'),
      section('goals-recommendations', 'Goals, outcomes and recommendations', actions, 'Summarise goals and recommendations.')
    ]
  }

  if (templateId === 'safeguarding_chronology') {
    return [
      section('chronology', 'Safeguarding chronology', safeguarding, 'List safeguarding events.'),
      section('themes', 'Themes and risk changes', safeguarding, 'Summarise safeguarding themes.'),
      section('actions', 'Actions and gaps', actions, 'Summarise open safeguarding actions.')
    ]
  }

  if (templateId === 'ofsted_evidence_pack') {
    return [
      section('children-progress', 'Children progress and experiences', dailyCare, 'Add progress evidence.'),
      section('safeguarding', 'Safeguarding evidence', safeguarding, 'Add safeguarding evidence.'),
      section('leadership', 'Leadership and management evidence', [...actions, ...regulation44, ...regulation45], 'Add leadership evidence.'),
      section('evidence-gaps', 'Evidence gaps', actions, 'List evidence gaps.')
    ]
  }

  return [
    section('summary', 'Draft summary', events, 'Summarise matching chronology records.'),
    section('citations', 'Source citations', events, 'Citations will appear when source records are available.'),
    section('actions-gaps', 'Actions and evidence gaps', actions, 'No linked actions found.')
  ]
}

export function generateReport(context: ReportGenerationContext): GeneratedReport {
  const template = getReportTemplate(context.templateId) ?? reportTemplates[0]
  const events = scopedEvents({ ...context, regulation: context.regulation || template.regulation })
  const sections = buildSections(context.templateId, events)
  const citations = sections.flatMap((item) => item.citations)
  const citationIds = new Set<string>()

  return {
    id: `generated-${context.templateId}-${context.youngPersonId || context.homeId}`,
    templateId: context.templateId,
    title: template.title,
    status: 'draft',
    generatedAt: '2026-05-13T12:00:00.000Z',
    context,
    sections,
    citations: citations.filter((citation) => {
      if (citationIds.has(citation.eventId)) return false
      citationIds.add(citation.eventId)
      return true
    }),
    evidenceGaps: getEvidenceGapsFromChronology(events),
    linkedActions: getActionsFromChronology(events),
    sourcePanel: {
      chronologyEventIds: events.map((event) => event.id),
      documentIds: Array.from(new Set(events.filter((event) => event.sourceType === 'document' || event.sourceType === 'reg44_report' || event.sourceType === 'reg45_report' || event.sourceType === 'lac_review').map((event) => event.sourceId))),
      actionIds: Array.from(new Set(events.flatMap((event) => event.actionIds))),
      evidenceIds: Array.from(new Set(events.flatMap((event) => event.evidenceIds))),
      missingExpectedEvidence: Array.from(new Set(getEvidenceGapsFromChronology(events).map((gap) => gap.title))).concat(
        getEvidenceItems().filter((item) => item.quality === 'review_required').map((item) => `${item.title} requires manager review`)
      )
    },
    disclaimer
  }
}
