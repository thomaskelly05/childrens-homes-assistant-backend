import { reportTemplates } from '@/lib/regulatory-reporting/templates'

import { childrenHomesRegulations } from './children-homes-regulations'
import { qualityStandards } from './quality-standards'
import { sccifReferences } from './sccif'
import { RegulatoryFramework, RegulatoryReference } from './types'

const operationalReferences: RegulatoryReference[] = [
  {
    id: 'reg44-action-plan',
    framework: 'reg44',
    code: 'Reg 44 action plan',
    title: 'Independent visitor findings and action plan',
    summary: 'Operational view of Reg 44 findings, actions, owners, evidence and completion.',
    plainEnglish: 'Use each independent visitor finding to create owned actions and evidence of completion.',
    evidenceExpectations: ['Extracted finding', 'Action owner and due date', 'Evidence of completion', 'Manager review'],
    whatGoodEvidenceLooksLike: ['Findings are linked to actions, evidence, chronology and Reg 45 learning.'],
    whatPoorEvidenceLooksLike: ['The report is uploaded but findings are not tracked to completion.'],
    linkedRecordTypes: ['reg44_report', 'action', 'evidence', 'manager_review', 'report'],
    linkedEventTypes: ['reg44_finding', 'manager_review', 'audit_event'],
    inspectionPrompts: ['Which findings remain open?', 'What evidence proves completion?', 'How has learning fed into quality assurance?'],
    qualityIndicators: ['Action ownership', 'Evidence traceability', 'Oversight and closure'],
    riskIndicators: ['reg44', 'action overdue', 'evidence-gap'],
    commonEvidenceGaps: ['Finding not linked to action', 'Completion evidence missing', 'Manager sign-off missing'],
    reportSections: ['Reg 44 action plan', 'Shortfalls', 'Actions', 'Evidence cited']
  },
  {
    id: 'reg45-quality-review',
    framework: 'reg45',
    code: 'Reg 45 quality review',
    title: 'Quality of care review preparation',
    summary: 'Annual review evidence gathering across child voice, outcomes, safeguarding, staff practice and service development.',
    plainEnglish: 'Use current records to draft a review but keep it marked as manager review required.',
    evidenceExpectations: ['Child voice', 'Family and professional feedback', 'Safeguarding and incidents analysis', 'Service development actions'],
    whatGoodEvidenceLooksLike: ['Draft sections cite source records and identify missing expected evidence before sign-off.'],
    whatPoorEvidenceLooksLike: ['The review states conclusions without citations, feedback or action tracking.'],
    linkedRecordTypes: ['reg45_report', 'report', 'evidence', 'action', 'manager_review'],
    linkedEventTypes: ['reg45_evidence', 'safeguarding', 'incident', 'positive_outcome', 'manager_review'],
    inspectionPrompts: ['What records support the review?', 'Which feedback sources are missing?', 'What improvement actions are open?'],
    qualityIndicators: ['Cited evidence', 'Balanced strengths and gaps', 'Service development plan'],
    riskIndicators: ['reg45', 'review_required', 'external feedback missing'],
    commonEvidenceGaps: ['External feedback missing', 'Child voice incomplete', 'No action plan for shortfalls'],
    reportSections: ['Reg 45 quality of care review', 'Feedback', 'Leadership evaluation', 'Service development plan']
  },
  {
    id: 'lac-review-care-planning',
    framework: 'lac_review',
    code: 'LAC review evidence',
    title: 'LAC review and care planning evidence',
    summary: 'Child-centred review evidence for placement progress, care planning, education, health, family time and safeguarding.',
    plainEnglish: 'Gather the child voice, progress evidence, risks and actions needed for the review meeting.',
    evidenceExpectations: ['Child voice', 'Placement progress', 'Education and health updates', 'Safeguarding and risk changes'],
    whatGoodEvidenceLooksLike: ['Review pack cites chronology, evidence and actions and names missing evidence.'],
    whatPoorEvidenceLooksLike: ['Review text is generic and does not show progress, risk changes or the child perspective.'],
    linkedRecordTypes: ['lac_review', 'report', 'daily_log', 'risk_assessment', 'evidence', 'action'],
    linkedEventTypes: ['lac_review', 'daily_log', 'education', 'health', 'family_contact', 'risk_review'],
    inspectionPrompts: ['Is the care plan current?', 'What has changed since the last review?', 'What does the child want adults to know?'],
    qualityIndicators: ['Review-ready citations', 'Progress from starting points', 'Clear actions'],
    riskIndicators: ['lac-review', 'care plan out of date', 'review action overdue'],
    commonEvidenceGaps: ['Education confirmation missing', 'Child voice missing', 'Risk plan update not attached'],
    reportSections: ['Child voice', 'Placement progress', 'Education', 'Health', 'Safeguarding', 'Recommendations']
  },
  {
    id: 'ofsted-evidence-readiness',
    framework: 'ofsted_evidence',
    code: 'Ofsted evidence pack',
    title: 'Ofsted evidence pack readiness',
    summary: 'Operational evidence pack grouped around SCCIF, Quality Standards, regulations, source citations, gaps and actions.',
    plainEnglish: 'Use this to see what evidence exists and what still needs review before inspection or external scrutiny.',
    evidenceExpectations: ['SCCIF coverage', 'Quality Standards coverage', 'Regulatory links', 'Evidence gaps', 'Overdue actions'],
    whatGoodEvidenceLooksLike: ['Every claim links to source records, citations, actions and management oversight where needed.'],
    whatPoorEvidenceLooksLike: ['A pack lists records without showing relevance, gaps, risk or review status.'],
    linkedRecordTypes: ['report', 'evidence', 'action', 'document', 'manager_review'],
    linkedEventTypes: ['daily_log', 'incident', 'safeguarding', 'manager_review', 'reg44_finding', 'reg45_evidence'],
    inspectionPrompts: ['What is strong?', 'What needs review?', 'Which gaps are actioned?', 'Where is management oversight missing?'],
    qualityIndicators: ['Traceability', 'Coverage by framework', 'Clear review status'],
    riskIndicators: ['evidence-gap', 'action overdue', 'management oversight missing'],
    commonEvidenceGaps: ['No citation', 'No owner', 'No manager review', 'No child voice'],
    reportSections: ['Children progress', 'Safeguarding', 'Leadership', 'Evidence gaps', 'Report source panel']
  }
]

export const regulatoryReferences: RegulatoryReference[] = [
  ...childrenHomesRegulations,
  ...qualityStandards,
  ...sccifReferences,
  ...operationalReferences
]

export function getRegulatoryReferences(framework?: RegulatoryFramework) {
  return framework ? regulatoryReferences.filter((reference) => reference.framework === framework) : regulatoryReferences
}

export function getRegulatoryReferenceById(id: string) {
  return regulatoryReferences.find((reference) => reference.id === id)
}

export function getRegulatoryReferenceByCode(code: string) {
  const normalised = code.toLowerCase()
  return regulatoryReferences.find((reference) => {
    return reference.code.toLowerCase() === normalised || reference.title.toLowerCase() === normalised
  })
}

export function findRegulatoryReferences(query: string) {
  const normalised = query.toLowerCase()
  return regulatoryReferences.filter((reference) => {
    return [
      reference.id,
      reference.framework,
      reference.code,
      reference.title,
      reference.summary,
      ...reference.riskIndicators,
      ...reference.qualityIndicators,
      ...reference.reportSections
    ].some((value) => value.toLowerCase().includes(normalised))
  })
}

export function getReferencesByReportSection(sectionTitle: string) {
  const normalised = sectionTitle.toLowerCase()
  return regulatoryReferences.filter((reference) =>
    reference.reportSections.some((section) => section.toLowerCase().includes(normalised) || normalised.includes(section.toLowerCase()))
  )
}

export function getReferenceIdsForReportType(reportType: string) {
  const normalised = reportType.toLowerCase()
  const template = reportTemplates.find((item) => item.id === reportType || item.title.toLowerCase().includes(normalised))
  const sectionRefs = template?.sections.flatMap((section) => getReferencesByReportSection(section)) ?? []
  const directRefs = findRegulatoryReferences(reportType)
  return Array.from(new Set([...sectionRefs, ...directRefs].map((reference) => reference.id)))
}

export function frameworkLabel(framework: RegulatoryFramework) {
  const labels: Record<RegulatoryFramework, string> = {
    children_homes_regulations_2015: 'Children Homes Regulations 2015',
    quality_standards: 'Quality Standards',
    sccif: 'SCCIF',
    reg44: 'Reg 44',
    reg45: 'Reg 45',
    lac_review: 'LAC review',
    ofsted_evidence: 'Ofsted evidence'
  }

  return labels[framework]
}
