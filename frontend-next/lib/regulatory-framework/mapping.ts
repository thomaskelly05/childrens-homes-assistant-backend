import { getChronologyEvents } from '@/lib/chronology/selectors'
import { ChronologyEvent } from '@/lib/chronology/types'
import { CareAction, EvidenceItem } from '@/lib/evidence/types'

import { findRegulatoryReferences, getReferenceIdsForReportType, getRegulatoryReferenceById, regulatoryReferences } from './selectors'
import { EvidenceStrength, RegulatoryCoverage, RegulatoryCoverageItem, RegulatoryReference } from './types'

function uniqueReferences(references: RegulatoryReference[]) {
  const seen = new Set<string>()
  return references.filter((reference) => {
    if (seen.has(reference.id)) return false
    seen.add(reference.id)
    return true
  })
}

function referencesFromText(values: Array<string | undefined>) {
  return uniqueReferences(values.flatMap((value) => (value ? findRegulatoryReferences(value) : [])))
}

function referencesForTags(tags: string[]) {
  const joined = tags.join(' ')
  const matches = regulatoryReferences.filter((reference) => {
    const haystack = [
      reference.code,
      reference.title,
      ...reference.riskIndicators,
      ...reference.qualityIndicators,
      ...reference.linkedRecordTypes,
      ...reference.linkedEventTypes
    ].join(' ').toLowerCase()
    return tags.some((tag) => haystack.includes(tag.toLowerCase())) || haystack.includes(joined.toLowerCase())
  })

  return matches
}

export function mapEventToRegulatoryReferences(event: ChronologyEvent) {
  return uniqueReferences([
    ...referencesFromText(event.regulationLinks.map((link) => link.regulation)),
    ...referencesForTags([...event.tags, ...event.riskFlags, ...event.safeguardingFlags, event.category, event.eventType]),
    ...regulatoryReferences.filter((reference) => reference.linkedEventTypes.includes(event.eventType))
  ])
}

export function mapEvidenceToRegulatoryReferences(evidence: EvidenceItem) {
  return uniqueReferences([
    ...referencesFromText([evidence.linkedRegulation, evidence.evidenceType, evidence.sourceType, evidence.title, evidence.description]),
    ...referencesForTags(evidence.tags)
  ])
}

export function mapActionToRegulatoryReferences(action: CareAction) {
  return uniqueReferences([
    ...referencesFromText([action.regulation, action.sourceType, action.title, action.description, ...action.evidenceRequired]),
    ...regulatoryReferences.filter((reference) => reference.linkedRecordTypes.includes('action'))
  ])
}

function evidenceStrength(events: ChronologyEvent[], evidence: EvidenceItem[], actions: CareAction[], reference: RegulatoryReference): EvidenceStrength {
  if (evidence.some((item) => item.quality === 'strong')) return 'strong'
  if (actions.some((action) => action.status === 'overdue' || action.status === 'blocked')) return 'review_required'
  if (evidence.some((item) => ['adequate'].includes(item.quality)) && events.length) return 'adequate'
  if (events.length || evidence.length || actions.length) return 'partial'
  if (reference.commonEvidenceGaps.length) return 'gap'
  return 'partial'
}

function gapsFor(reference: RegulatoryReference, events: ChronologyEvent[], evidence: EvidenceItem[], actions: CareAction[]) {
  const gaps: string[] = []
  if (!events.length) gaps.push(`No chronology event currently mapped to ${reference.code}.`)
  if (!evidence.length) gaps.push(`No evidence item currently mapped to ${reference.code}.`)
  if (events.some((event) => event.actionIds.length > 0) && !actions.length) gaps.push('Linked events indicate action is required, but no open action is mapped.')
  if (actions.some((action) => action.status === 'overdue')) gaps.push('At least one linked action is overdue.')
  if (evidence.some((item) => item.quality === 'review_required')) gaps.push('At least one evidence item requires review before relying on it.')
  return gaps.length ? gaps : reference.commonEvidenceGaps.slice(0, 1)
}

function suggestedNextAction(strength: EvidenceStrength, reference: RegulatoryReference) {
  if (strength === 'strong') return 'Keep evidence current and cite it in relevant reports.'
  if (strength === 'adequate') return 'Ask the manager to review whether this evidence is sufficient for the next report.'
  if (strength === 'review_required') return 'Complete overdue actions and record management oversight before report use.'
  return `Attach source evidence and create an owned action for ${reference.code}.`
}

export function getRegulatoryCoverage(events: ChronologyEvent[], evidence: EvidenceItem[], actions: CareAction[]): RegulatoryCoverage {
  const coverageItems: RegulatoryCoverageItem[] = regulatoryReferences.map((reference) => {
    const matchedEvents = events.filter((event) => mapEventToRegulatoryReferences(event).some((item) => item.id === reference.id))
    const matchedEvidence = evidence.filter((item) => mapEvidenceToRegulatoryReferences(item).some((mapped) => mapped.id === reference.id))
    const matchedActions = actions.filter((action) => mapActionToRegulatoryReferences(action).some((mapped) => mapped.id === reference.id))
    const strength = evidenceStrength(matchedEvents, matchedEvidence, matchedActions, reference)
    const gaps = gapsFor(reference, matchedEvents, matchedEvidence, matchedActions)

    return {
      reference,
      events: matchedEvents,
      evidence: matchedEvidence,
      actions: matchedActions,
      evidenceStrength: strength,
      gaps,
      suggestedNextAction: suggestedNextAction(strength, reference)
    }
  })

  return {
    items: coverageItems,
    strongEvidence: coverageItems.filter((item) => item.evidenceStrength === 'strong' || item.evidenceStrength === 'adequate'),
    needsReview: coverageItems.filter((item) => item.evidenceStrength === 'review_required' || item.actions.some((action) => action.status === 'overdue')),
    evidenceGaps: coverageItems.filter((item) => item.evidenceStrength === 'gap' || item.gaps.some((gap) => gap.startsWith('No evidence')))
  }
}

export function getSccifCoverage(events: ChronologyEvent[], evidence: EvidenceItem[], actions: CareAction[]) {
  const coverage = getRegulatoryCoverage(events, evidence, actions)
  return { ...coverage, items: coverage.items.filter((item) => item.reference.framework === 'sccif') }
}

export function getQualityStandardCoverage(events: ChronologyEvent[], evidence: EvidenceItem[], actions: CareAction[]) {
  const coverage = getRegulatoryCoverage(events, evidence, actions)
  return { ...coverage, items: coverage.items.filter((item) => item.reference.framework === 'quality_standards') }
}

export function getEvidenceGapsForReference(referenceId: string, events: ChronologyEvent[], evidence: EvidenceItem[], actions: CareAction[]) {
  const coverage = getRegulatoryCoverage(events, evidence, actions).items.find((item) => item.reference.id === referenceId)
  return coverage?.gaps ?? getRegulatoryReferenceById(referenceId)?.commonEvidenceGaps ?? []
}

export function getRecordsLinkedToReference(referenceId: string) {
  const reference = getRegulatoryReferenceById(referenceId)
  if (!reference) return []

  return getChronologyEvents()
    .filter((event) => mapEventToRegulatoryReferences(event).some((item) => item.id === referenceId))
    .map((event) => ({
      id: event.id,
      title: event.title,
      type: event.eventType,
      href: `/chronology/${event.id}`,
      date: event.dateTime,
      citationLabel: event.citationLabel
    }))
}

export function getRegulatoryReferencesForReport(reportType: string) {
  return getReferenceIdsForReportType(reportType)
    .map((id) => getRegulatoryReferenceById(id))
    .filter((reference): reference is RegulatoryReference => Boolean(reference))
}
